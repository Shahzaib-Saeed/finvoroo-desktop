import { getOfflineDb, getMeta, setMeta } from './db';
import { isOnline, isReallyOnline, subscribeConnectivity } from './connectivity';
import {
  listPendingOutbox,
  markOutboxFailed,
  markOutboxStatus,
  markOutboxSynced,
  OUTBOX_STATUS,
  countPendingOutbox,
} from './outbox';
import { syncApi } from './sync.api';
import { getOrCreateDeviceUuid } from './uuid';

const listeners = new Set();
const running = new Map();
let connectivityBound = false;
let backoffUntil = 0;
let getActiveCompanyId = () => null;

function emit(event) {
  listeners.forEach((fn) => {
    try {
      fn(event);
    } catch {
      /* ignore subscriber errors */
    }
  });
}

export function subscribeSyncEvents(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * 'desktop' identifies this as the Finvoroo Desktop shell (Tauri), which the
 * backend hard-enforces to at most one active device per workspace. Ordinary
 * browser tabs stay 'browser' — unrestricted, exactly as before.
 */
function getSyncDeviceType() {
  return import.meta.env?.VITE_DESKTOP_BUILD === 'true' ? 'desktop' : 'browser';
}

async function ensureDeviceRegistered(companyId) {
  const deviceUuid = getOrCreateDeviceUuid();
  const registered = await getMeta(companyId, 'device_registered', false);
  if (registered) {
    return deviceUuid;
  }
  await syncApi.registerDevice({
    device_uuid: deviceUuid,
    device_type: getSyncDeviceType(),
    name: typeof navigator !== 'undefined' ? navigator.userAgent?.slice(0, 120) : 'browser',
  });
  await setMeta(companyId, 'device_registered', true);
  await setMeta(companyId, 'device_uuid', deviceUuid);
  return deviceUuid;
}

async function putCustomer(db, payload) {
  if (!payload?.id && !payload?.uuid) return;
  const id = Number(payload.id);
  const row = {
    id,
    uuid: payload.uuid || null,
    name: payload.name,
    customer_code: payload.customer_code,
    email: payload.email,
    phone: payload.phone,
    currency: payload.currency,
    is_active: payload.is_active !== false,
    updated_at: Date.now(),
    raw: payload,
  };
  if (Number.isFinite(id) && id > 0) {
    await db.customers.put(row);
  }
}

async function putProduct(db, payload) {
  if (!payload?.id && !payload?.uuid) return;
  const id = Number(payload.id);
  const row = {
    id,
    uuid: payload.uuid || null,
    name: payload.name,
    sku: payload.sku,
    barcode: payload.barcode,
    type: payload.type,
    unit: payload.unit,
    unit_price: payload.unit_price,
    tax_rate_id: payload.tax_rate_id,
    quantity_on_hand: payload.quantity_on_hand,
    is_active: payload.is_active !== false,
    updated_at: Date.now(),
    raw: payload,
  };
  if (Number.isFinite(id) && id > 0) {
    await db.products.put(row);
  }
}

async function putTaxRate(db, payload) {
  if (!payload?.id) return;
  const id = Number(payload.id);
  await db.tax_rates.put({
    id,
    uuid: payload.uuid || null,
    name: payload.name,
    rate: payload.rate,
    type: payload.type,
    is_default: Boolean(payload.is_default),
    is_active: payload.is_active !== false,
    raw: payload,
  });
}

async function applyPullChanges(companyId, changes) {
  const db = getOfflineDb(companyId);
  for (const change of changes || []) {
    if (!change?.uuid && !change?.server_id) continue;
    const payload = change.payload || {};
    const op = change.op || 'update';

    if (change.entity === 'invoice') {
      if (op === 'delete') {
        if (change.uuid) await db.invoices.delete(change.uuid);
        continue;
      }
      const existing = change.uuid ? await db.invoices.get(change.uuid) : null;
      await db.invoices.put({
        ...(existing || {}),
        uuid: change.uuid,
        server_id: payload.id ?? payload.server_id ?? change.server_id ?? existing?.server_id ?? null,
        invoice_number: payload.invoice_number || existing?.invoice_number,
        customer_id: payload.customer_id ?? existing?.customer_id,
        status: payload.status || existing?.status || 'draft',
        lock_version: change.version ?? payload.lock_version ?? existing?.lock_version ?? 0,
        payload: {
          ...(existing?.payload || {}),
          ...payload,
        },
        sync_status: 'synced',
        updated_at: Date.now(),
      });
      continue;
    }

    if (change.entity === 'customer') {
      if (op === 'delete' || payload.is_active === false) {
        const id = Number(payload.id ?? change.server_id);
        if (Number.isFinite(id) && id > 0) await db.customers.delete(id);
        continue;
      }
      await putCustomer(db, { ...payload, uuid: payload.uuid || change.uuid, id: payload.id ?? change.server_id });
      continue;
    }

    if (change.entity === 'product') {
      if (op === 'delete' || payload.is_active === false) {
        const id = Number(payload.id ?? change.server_id);
        if (Number.isFinite(id) && id > 0) await db.products.delete(id);
        continue;
      }
      await putProduct(db, { ...payload, uuid: payload.uuid || change.uuid, id: payload.id ?? change.server_id });
      continue;
    }

    if (change.entity === 'tax_rate') {
      if (op === 'delete' || payload.is_active === false) {
        const id = Number(payload.id ?? change.server_id);
        if (Number.isFinite(id) && id > 0) await db.tax_rates.delete(id);
        continue;
      }
      await putTaxRate(db, { ...payload, uuid: payload.uuid || change.uuid, id: payload.id ?? change.server_id });
      continue;
    }

    const docStore =
      change.entity === 'quotation'
        ? 'quotations'
        : change.entity === 'bill'
          ? 'bills'
          : change.entity === 'purchase_order'
            ? 'purchase_orders'
            : change.entity === 'expense'
              ? 'expenses'
              : null;
    if (docStore && db[docStore] && change.uuid) {
      if (op === 'delete') {
        await db[docStore].delete(change.uuid);
        continue;
      }
      const existing = await db[docStore].get(change.uuid);
      await db[docStore].put({
        ...(existing || {}),
        uuid: change.uuid,
        server_id: payload.id ?? change.server_id ?? existing?.server_id,
        number:
          payload.quote_number ||
          payload.bill_number ||
          payload.po_number ||
          payload.reference ||
          existing?.number,
        status: payload.status || existing?.status || 'draft',
        lock_version: change.version ?? payload.lock_version ?? existing?.lock_version ?? 0,
        payload: { ...(existing?.payload || {}), ...payload },
        sync_status: 'synced',
        entity: change.entity,
        updated_at: Date.now(),
      });
    }
  }
}

/**
 * Apply full bootstrap snapshot into Dexie (Phase 1 masters + draft invoices).
 */
export async function applyBootstrapSnapshot(companyId, snapshot) {
  if (!companyId || !snapshot) return;
  const db = getOfflineDb(companyId);

  const tables = [db.customers, db.products, db.tax_rates, db.invoices, db.meta];
  if (db.vendors) tables.splice(3, 0, db.vendors);

  await db.transaction('rw', tables, async () => {
      const customers = snapshot.customers || [];
      const products = snapshot.products || [];
      const taxRates = snapshot.tax_rates || [];
      const vendors = snapshot.vendors || [];
      const drafts = snapshot.draft_invoices || [];

      if (customers.length) {
        await db.customers.clear();
        await db.customers.bulkPut(
          customers.map((c) => ({
            id: Number(c.id),
            uuid: c.uuid || null,
            name: c.name,
            customer_code: c.customer_code,
            email: c.email,
            phone: c.phone,
            currency: c.currency,
            is_active: c.is_active !== false,
            updated_at: Date.now(),
            raw: c,
          })),
        );
      }
      if (products.length) {
        await db.products.clear();
        await db.products.bulkPut(
          products.map((p) => ({
            id: Number(p.id),
            uuid: p.uuid || null,
            name: p.name,
            sku: p.sku,
            barcode: p.barcode,
            type: p.type,
            unit: p.unit,
            unit_price: p.unit_price,
            tax_rate_id: p.tax_rate_id,
            quantity_on_hand: p.quantity_on_hand,
            is_active: p.is_active !== false,
            updated_at: Date.now(),
            raw: p,
          })),
        );
      }
      if (taxRates.length) {
        await db.tax_rates.clear();
        await db.tax_rates.bulkPut(
          taxRates.map((t) => ({
            id: Number(t.id),
            uuid: t.uuid || null,
            name: t.name,
            rate: t.rate,
            type: t.type,
            is_default: Boolean(t.is_default),
            is_active: t.is_active !== false,
            raw: t,
          })),
        );
      }
      if (db.vendors && vendors.length) {
        await db.vendors.clear();
        await db.vendors.bulkPut(
          vendors.map((v) => ({
            id: Number(v.id),
            name: v.name,
            email: v.email,
            currency: v.currency,
            updated_at: Date.now(),
            raw: v,
          })),
        );
      }
      for (const inv of drafts) {
        if (!inv.uuid) continue;
        await db.invoices.put({
          uuid: inv.uuid,
          server_id: inv.id,
          invoice_number: inv.invoice_number,
          customer_id: inv.customer_id,
          status: inv.status || 'draft',
          lock_version: inv.lock_version || 0,
          payload: inv,
          sync_status: 'synced',
          updated_at: Date.now(),
          created_at: Date.now(),
        });
      }

      if (typeof snapshot.cursor === 'number') {
        await db.meta.put({ key: 'pull_cursor', value: snapshot.cursor, updated_at: Date.now() });
      }
      await db.meta.put({ key: 'bootstrap_at', value: Date.now(), updated_at: Date.now() });
      await db.meta.put({ key: 'offline_sync_enabled', value: true, updated_at: Date.now() });
      if (Array.isArray(snapshot.vendors)) {
        await db.meta.put({ key: 'vendors_bootstrapped', value: true, updated_at: Date.now() });
      }
  });
}

/**
 * Bootstrap masters from server when cache is empty / stale (Phase 1).
 */
export async function bootstrapMasters(companyId, { force = false } = {}) {
  if (!companyId || !isOnline()) return { ok: false, reason: 'offline' };
  const bootstrappedAt = await getMeta(companyId, 'bootstrap_at', 0);
  const stale = !bootstrappedAt || Date.now() - Number(bootstrappedAt) > 6 * 60 * 60 * 1000;
  if (!force && !stale) {
    const db = getOfflineDb(companyId);
    const count = await db.customers.count();
    const vendorsBootstrapped = await getMeta(companyId, 'vendors_bootstrapped', false);
    // Re-bootstrap once if vendors were never cached (older clients).
    if (count > 0 && vendorsBootstrapped) return { ok: true, reason: 'fresh' };
  }

  const deviceUuid = await ensureDeviceRegistered(companyId);
  const res = await syncApi.bootstrap({
    device_uuid: deviceUuid,
    device_type: getSyncDeviceType(),
    name: typeof navigator !== 'undefined' ? navigator.userAgent?.slice(0, 120) : 'browser',
  });
  const snapshot = res?.data?.data || {};
  await applyBootstrapSnapshot(companyId, snapshot);
  emit({ type: 'bootstrap:done', companyId, counts: {
    customers: (snapshot.customers || []).length,
    products: (snapshot.products || []).length,
    tax_rates: (snapshot.tax_rates || []).length,
    vendors: (snapshot.vendors || []).length,
  }});
  return { ok: true, snapshot };
}

async function pushPending(companyId) {
  const deviceUuid = await ensureDeviceRegistered(companyId);
  const pending = await listPendingOutbox(companyId, 25);
  if (!pending.length) return { pushed: 0 };

  for (const item of pending) {
    await markOutboxStatus(companyId, item.client_mutation_id, OUTBOX_STATUS.Syncing);
  }

  const mutations = pending.map((item) => ({
    client_mutation_id: item.client_mutation_id,
    entity: item.entity,
    op: item.op,
    uuid: item.uuid,
    base_version: item.base_version,
    payload: item.payload,
  }));

  const res = await syncApi.push({ device_uuid: deviceUuid, mutations });
  const results = res?.data?.data?.results || [];
  const db = getOfflineDb(companyId);

  for (const result of results) {
    const mutationId = result.client_mutation_id;
    const status = result.status;
    if (status === 'synced' || status === 'ok') {
      await markOutboxSynced(companyId, mutationId, result);
      if (result.uuid) {
        const existing = await db.invoices.get(result.uuid);
        if (existing) {
          await db.invoices.put({
            ...existing,
            server_id: result.server_id ?? existing.server_id,
            invoice_number: result.invoice_number || existing.invoice_number,
            lock_version: result.lock_version ?? existing.lock_version,
            sync_status: 'synced',
            provisional_number: existing.provisional_number || existing.invoice_number,
            updated_at: Date.now(),
          });
        }
        // Phase 2–6 local doc stores
        for (const store of [
          'quotations',
          'bills',
          'purchase_orders',
          'expenses',
          'credit_notes',
          'debit_notes',
        ]) {
          if (!db[store]) continue;
          const row = await db[store].get(result.uuid);
          if (!row) continue;
          await db[store].put({
            ...row,
            server_id: result.server_id ?? row.server_id,
            number:
              result.quote_number ||
              result.bill_number ||
              result.po_number ||
              result.reference ||
              result.credit_note_number ||
              result.credit_number ||
              row.number,
            lock_version: result.lock_version ?? row.lock_version,
            sync_status: 'synced',
            updated_at: Date.now(),
          });
        }
        if (result.server_id && result.name) {
          // customer.create ack
          await db.customers.put({
            id: Number(result.server_id),
            uuid: result.uuid,
            name: result.name,
            customer_code: result.customer_code,
            updated_at: Date.now(),
            raw: result,
          });
        }
      }
    } else {
      await markOutboxFailed(
        companyId,
        mutationId,
        result.message || result.error_code || 'Sync failed',
      );
    }
  }

  return { pushed: results.length };
}

async function pullChanges(companyId) {
  const deviceUuid = await ensureDeviceRegistered(companyId);
  const cursor = Number(await getMeta(companyId, 'pull_cursor', 0)) || 0;
  const res = await syncApi.pull({ device_uuid: deviceUuid, cursor, limit: 100 });
  const page = res?.data?.data || {};
  await applyPullChanges(companyId, page.changes || []);
  if (typeof page.cursor === 'number') {
    await setMeta(companyId, 'pull_cursor', page.cursor);
  }
  return page;
}

/**
 * Prefetch invoice form masters into Dexie for offline create.
 */
export async function prefetchInvoiceLookups(companyId, formOptions) {
  if (!companyId || !formOptions) return;
  const db = getOfflineDb(companyId);
  const customers = formOptions.customers || [];
  const products = formOptions.products || [];
  const taxRates = formOptions.tax_rates || [];
  const vendors = formOptions.vendors || [];
  const tables = [db.customers, db.products, db.tax_rates, db.meta];
  if (db.vendors) tables.push(db.vendors);

  await db.transaction('rw', tables, async () => {
    if (customers.length) {
      await db.customers.bulkPut(
        customers.map((c) => ({
          id: Number(c.id),
          uuid: c.uuid || null,
          name: c.name,
          email: c.email,
          phone: c.phone,
          currency: c.currency,
          updated_at: Date.now(),
          raw: c,
        })),
      );
    }
    if (products.length) {
      await db.products.bulkPut(
        products.map((p) => ({
          id: Number(p.id),
          uuid: p.uuid || null,
          name: p.name,
          sku: p.sku,
          unit_price: p.unit_price,
          tax_rate_id: p.tax_rate_id,
          quantity_on_hand: p.quantity_on_hand ?? p.current_stock,
          updated_at: Date.now(),
          raw: p,
        })),
      );
    }
    if (taxRates.length) {
      await db.tax_rates.bulkPut(
        taxRates.map((t) => ({
          id: Number(t.id),
          name: t.name,
          rate: t.rate,
          type: t.type,
          raw: t,
        })),
      );
    }
    if (db.vendors && vendors.length) {
      await db.vendors.bulkPut(
        vendors.map((v) => ({
          id: Number(v.id),
          name: v.name,
          email: v.email,
          currency: v.currency,
          updated_at: Date.now(),
          raw: v,
        })),
      );
      await db.meta.put({
        key: 'vendors_bootstrapped',
        value: true,
        updated_at: Date.now(),
      });
    }
    if (formOptions.base_currency) {
      await db.meta.put({
        key: 'base_currency',
        value: formOptions.base_currency,
        updated_at: Date.now(),
      });
    }
    // Templates / line columns needed so invoice & bill grids render offline.
    if (Array.isArray(formOptions.templates) && formOptions.templates.length) {
      await db.meta.put({
        key: 'form_templates',
        value: formOptions.templates,
        updated_at: Date.now(),
      });
    }
    if (formOptions.default_template_id != null) {
      await db.meta.put({
        key: 'default_template_id',
        value: formOptions.default_template_id,
        updated_at: Date.now(),
      });
    }
    const lineColumns =
      formOptions.line_columns ||
      formOptions.templates?.find((t) => String(t.id) === String(formOptions.default_template_id))
        ?.line_columns ||
      formOptions.templates?.[0]?.line_columns ||
      null;
    if (Array.isArray(lineColumns) && lineColumns.length) {
      await db.meta.put({
        key: 'line_columns',
        value: lineColumns,
        updated_at: Date.now(),
      });
    }
    await db.meta.put({
      key: 'form_options_cached_at',
      value: Date.now(),
      updated_at: Date.now(),
    });
    await db.meta.put({
      key: 'offline_sync_enabled',
      value: Boolean(formOptions.company?.offline_sync_enabled),
      updated_at: Date.now(),
    });
  });
}

/** Alias — bill form options use the same Dexie masters (+ vendors). */
export const prefetchBillLookups = prefetchInvoiceLookups;

export async function getOfflinePendingCount(companyId) {
  if (!companyId) return 0;
  try {
    return await countPendingOutbox(companyId);
  } catch {
    return 0;
  }
}

export async function runSyncCycle(companyId, { reason = 'manual' } = {}) {
  if (!companyId) return { ok: false, reason: 'no_company' };
  if (!isOnline()) return { ok: false, reason: 'offline' };
  if (Date.now() < backoffUntil) return { ok: false, reason: 'backoff' };
  if (running.get(String(companyId))) return { ok: false, reason: 'busy' };

  running.set(String(companyId), true);
  emit({ type: 'sync:start', companyId, reason });
  try {
    const enabled = await getMeta(companyId, 'offline_sync_enabled', null);
    if (enabled === false) {
      return { ok: false, reason: 'flag_off' };
    }

    // Confirm with server when unknown / stale.
    if (enabled == null) {
      const statusRes = await syncApi.status();
      const on = Boolean(statusRes?.data?.data?.offline_sync_enabled);
      await setMeta(companyId, 'offline_sync_enabled', on);
      if (!on) return { ok: false, reason: 'flag_off' };
    }

    // Phase 1: ensure masters are cached before incremental pull.
    await bootstrapMasters(companyId, { force: reason === 'manual' || reason === 'workspace-entry' });

    const pushResult = await pushPending(companyId);
    let pullResult = { changes: [] };
    // Drain pull pages while has_more (masters + invoices).
    for (let i = 0; i < 10; i += 1) {
      pullResult = await pullChanges(companyId);
      if (!pullResult?.has_more) break;
    }
    const pending = await countPendingOutbox(companyId);
    emit({
      type: 'sync:done',
      companyId,
      pushResult,
      pullResult,
      pending,
    });
    backoffUntil = 0;
    return { ok: true, pushResult, pullResult, pending };
  } catch (err) {
    const status = err?.response?.status;
    if (status === 403) {
      await setMeta(companyId, 'offline_sync_enabled', false);
    }
    // Simple exponential-ish backoff: 5s → 30s cap
    const wait = Math.min(30_000, Math.max(5_000, (backoffUntil ? 10_000 : 5_000)));
    backoffUntil = Date.now() + wait;
    emit({
      type: 'sync:error',
      companyId,
      message: err?.response?.data?.message || err?.message || 'Sync failed',
    });
    return { ok: false, reason: 'error', error: err };
  } finally {
    running.delete(String(companyId));
  }
}

export function bindConnectivitySync(getCompanyId) {
  if (typeof getCompanyId === 'function') {
    getActiveCompanyId = getCompanyId;
  }
  if (connectivityBound) return () => {};
  connectivityBound = true;
  return subscribeConnectivity((online) => {
    if (!online) {
      emit({ type: 'connectivity', online: false });
      return;
    }

    const companyId = getActiveCompanyId?.();
    if (!companyId) {
      // No workspace context yet (e.g. still on the sign-in screen) — nothing
      // to sync, and the reachability probe needs an authenticated company
      // context to be meaningful, so just trust the browser signal.
      emit({ type: 'connectivity', online: true });
      return;
    }

    // navigator.onLine only reflects the link layer; confirm the API is
    // actually reachable before trusting the transition and kicking off a
    // sync cycle (matters most on the desktop app, which has no browser
    // chrome to hint at captive portals / VPN blips).
    (async () => {
      const reallyOnline = await isReallyOnline();
      emit({ type: 'connectivity', online: reallyOnline });
      if (reallyOnline) {
        runSyncCycle(companyId, { reason: 'online' });
      }
    })();
  });
}
