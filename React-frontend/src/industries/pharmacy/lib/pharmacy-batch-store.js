/**
 * Pharmacy batch/expiry cache — the offline data source for client-side FEFO
 * batch selection (industries/pharmacy/lib/fefo.js) when nothing has already
 * supplied a product's `batches` array (notably: offline).
 *
 * Same two-tier pattern as pharmacy-catalog-store.js on purpose — snapshot in
 * the existing IndexedDB (Dexie) for instant reopen, incremental `since`
 * sync layered on top, in-place patch, no rebuild — and reuses the same
 * `pos_catalog` key-value store (a different `key`, no new Dexie schema
 * needed) rather than inventing a second cache mechanism.
 *
 *   Laravel /workspace/pharmacy/batches/index  ->  decode  ->  byId / byProduct
 *                                                     |
 *                                                     +->  IndexedDB snapshot (Dexie)
 *
 * Deliberately piggybacks on pharmacy-catalog-store.js's own sync calls
 * (ensurePharmacyCatalog / syncPharmacyCatalog) rather than polling on a
 * separate schedule, so this stays part of the one existing sync cadence
 * instead of becoming a second one. No new business logic: this is a cache
 * of App\Services\Pharmacy\BatchInventoryService::listAllBatchesForCompany(),
 * the same data + ordering FEFO allocation already uses server-side.
 */
import { getOfflineDb } from '@/offline/db';
import { pharmacyApi } from '../api/pharmacy.api';

const SNAPSHOT_KEY = 'pharmacy_batches';
const SNAPSHOT_FORMAT = 1;

let byId = new Map();
let byProduct = new Map();
let syncedAt = 0;
let companyKey = null;
let loaded = false;
let inflight = null;

function indexRow(row) {
  if (row?.id == null) return;
  byId.set(Number(row.id), row);
}

function rebuildByProduct() {
  const next = new Map();
  for (const row of byId.values()) {
    const pid = Number(row.product_id);
    if (!pid) continue;
    const list = next.get(pid) || [];
    list.push(row);
    next.set(pid, list);
  }
  byProduct = next;
}

async function readSnapshot(companyId) {
  try {
    const db = getOfflineDb(companyId);
    const record = await db.pos_catalog.get(SNAPSHOT_KEY);
    if (!record || record.format !== SNAPSHOT_FORMAT) return null;
    return record;
  } catch {
    // A blocked/upgrading IndexedDB must never stop POS from opening.
    return null;
  }
}

async function writeSnapshot(companyId) {
  try {
    const db = getOfflineDb(companyId);
    await db.pos_catalog.put({
      key: SNAPSHOT_KEY,
      format: SNAPSHOT_FORMAT,
      batches: Array.from(byId.values()),
      syncedAt,
      savedAt: Date.now(),
    });
  } catch {
    /* persistence is an optimisation, not a requirement */
  }
}

/**
 * Load the cached snapshot (instant, IndexedDB) then reconcile with the
 * server in the background. Safe to call repeatedly / from multiple
 * components — concurrent callers share one in-flight sync.
 */
export async function ensurePharmacyBatchCache({ companyId } = {}) {
  const key = String(companyId || '');
  if (!key) return;

  if (companyKey !== key) {
    companyKey = key;
    loaded = false;
    byId = new Map();
    byProduct = new Map();
    syncedAt = 0;

    const snapshot = await readSnapshot(key);
    if (snapshot?.batches?.length) {
      for (const row of snapshot.batches) indexRow(row);
      syncedAt = Number(snapshot.syncedAt) || 0;
      rebuildByProduct();
      loaded = true;
    }
  }

  // Reconcile with the server, but never make the caller wait on network —
  // whatever's already cached (possibly empty on first run) is available
  // immediately via getCachedBatchesForProduct().
  void syncPharmacyBatchCache({ companyId: key });
}

export function syncPharmacyBatchCache({ companyId } = {}) {
  const key = String(companyId || companyKey || '');
  if (!key) return Promise.resolve(false);
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return Promise.resolve(false);
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const params = syncedAt ? { since: syncedAt } : {};
      const res = await pharmacyApi.batchesIndex(params);
      const payload = res?.data?.data || {};
      const incoming = Array.isArray(payload.batches) ? payload.batches : [];
      for (const row of incoming) indexRow(row);
      syncedAt = Number(payload.synced_at) || syncedAt;
      rebuildByProduct();
      loaded = true;
      void writeSnapshot(key);
      return true;
    } catch {
      return false;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

/** Cached batches for one product — [] if none cached (or cache not loaded yet). */
export function getCachedBatchesForProduct(productId) {
  return byProduct.get(Number(productId)) || [];
}

export function isPharmacyBatchCacheReady() {
  return loaded;
}
