import { invoicesApi } from '@/pages/accounting/invoices/api/invoices.api';
import { buildInvoicePayload } from '@/pages/accounting/invoices/constants';
import { getOfflineDb } from './db';
import { isOnline } from './connectivity';
import { enqueueOutbox } from './outbox';
import { runSyncCycle } from './sync-manager';
import { newUuid, provisionalInvoiceLabel } from './uuid';

function withLineUuids(form, existingInvoice) {
  const existingLines = existingInvoice?.payload?.lines || existingInvoice?.lines || [];
  const byIndex = new Map(existingLines.map((l, i) => [i, l]));
  return {
    ...form,
    uuid: form.uuid || existingInvoice?.uuid || newUuid(),
    lines: (form.lines || []).map((line, index) => ({
      ...line,
      uuid: line.uuid || byIndex.get(index)?.uuid || newUuid(),
    })),
  };
}

function payloadWithUuids(form) {
  // Stamp line uuids onto form lines before filtering so buildInvoicePayload
  // and the sync payload stay aligned.
  const stampedLines = (form.lines || []).map((line) => ({
    ...line,
    uuid: line.uuid || newUuid(),
  }));
  const stamped = { ...form, lines: stampedLines, uuid: form.uuid || newUuid() };
  const payload = buildInvoicePayload(stamped);
  payload.uuid = stamped.uuid;

  const meaningful = stampedLines.filter((line) => {
    const qty = Number(line.quantity);
    const price = Number(line.unit_price);
    return (
      line.product_id ||
      (line.description && String(line.description).trim()) ||
      (Number.isFinite(qty) && qty > 0) ||
      (Number.isFinite(price) && price > 0)
    );
  });
  payload.lines = (payload.lines || []).map((line, index) => ({
    ...line,
    uuid: meaningful[index]?.uuid || newUuid(),
  }));
  return payload;
}

/**
 * Save a draft invoice — online via API when possible; otherwise Dexie + outbox.
 *
 * @returns {Promise<{ offline: boolean, invoice: object, formPatch?: object }>}
 */
export async function saveDraftInvoice({
  companyId,
  form,
  isEdit,
  invoiceId,
  existingLocalUuid,
  lockVersion,
  offlineSyncEnabled,
}) {
  const formWithIds = withLineUuids(form, {
    uuid: existingLocalUuid || form.uuid,
  });

  const shouldQueueOffline =
    Boolean(offlineSyncEnabled) && (!isOnline() || form.force_offline_queue);

  if (!shouldQueueOffline) {
    const payload = payloadWithUuids(formWithIds);
    const res =
      isEdit && invoiceId
        ? await invoicesApi.update(invoiceId, payload)
        : await invoicesApi.create(payload);
    const saved = res?.data?.data;
    if (offlineSyncEnabled && isOnline()) {
      // Best-effort background sync / pull after live write.
      runSyncCycle(companyId, { reason: 'after-online-save' }).catch(() => {});
    }
    return { offline: false, invoice: saved, response: res };
  }

  // Offline / queue path — draft only
  const db = getOfflineDb(companyId);
  const uuid = formWithIds.uuid;
  const existing = await db.invoices.get(uuid);
  const provisional = existing?.provisional_number || provisionalInvoiceLabel(uuid);
  const payload = payloadWithUuids(formWithIds);
  const op = (existing?.server_id || (isEdit && invoiceId)) ? 'update' : 'create';

  const localInvoice = {
    uuid,
    server_id: existing?.server_id || (isEdit && invoiceId ? Number(invoiceId) : null),
    invoice_number: existing?.invoice_number || provisional,
    provisional_number: provisional,
    customer_id: Number(form.customer_id),
    status: 'draft',
    lock_version: existing?.lock_version ?? lockVersion ?? 0,
    payload,
    sync_status: 'pending',
    updated_at: Date.now(),
    created_at: existing?.created_at || Date.now(),
  };

  await db.invoices.put(localInvoice);

  await enqueueOutbox(companyId, {
    entity: 'invoice',
    op,
    uuid,
    base_version: op === 'update' ? localInvoice.lock_version : null,
    payload,
  });

  if (isOnline()) {
    runSyncCycle(companyId, { reason: 'after-offline-save' }).catch(() => {});
  }

  return {
    offline: true,
    invoice: {
      id: localInvoice.server_id,
      uuid,
      invoice_number: localInvoice.invoice_number,
      status: 'draft',
      lock_version: localInvoice.lock_version,
      offline_pending: true,
    },
    formPatch: {
      uuid,
      lines: formWithIds.lines,
    },
  };
}

export async function loadCachedLookups(companyId) {
  const db = getOfflineDb(companyId);
  const [customers, products, taxRates, vendors, metaCurrency, metaTemplates, metaDefaultTpl, metaLineCols] =
    await Promise.all([
      db.customers.toArray(),
      db.products.toArray(),
      db.tax_rates.toArray(),
      db.vendors ? db.vendors.toArray() : Promise.resolve([]),
      db.meta.get('base_currency'),
      db.meta.get('form_templates'),
      db.meta.get('default_template_id'),
      db.meta.get('line_columns'),
    ]);
  const templates = Array.isArray(metaTemplates?.value) ? metaTemplates.value : [];
  const lineColumns = Array.isArray(metaLineCols?.value)
    ? metaLineCols.value
    : templates[0]?.line_columns || [];
  return {
    customers: customers.map((c) => c.raw || c),
    products: products.map((p) => p.raw || p),
    tax_rates: taxRates.map((t) => t.raw || t),
    vendors: vendors.map((v) => v.raw || v),
    base_currency: metaCurrency?.value || 'USD',
    warehouses: [],
    templates,
    default_template_id: metaDefaultTpl?.value ?? templates[0]?.id ?? null,
    line_columns: lineColumns,
  };
}
