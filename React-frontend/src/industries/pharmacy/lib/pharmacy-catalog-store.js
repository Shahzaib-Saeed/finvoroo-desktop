/**
 * Pharmacy POS catalog store.
 *
 * Loads the compact catalog once, keeps it in module memory, persists a snapshot
 * to IndexedDB so a till reopens instantly, and owns the in-memory search index.
 * After this has loaded, typing in the POS performs no network work at all.
 *
 *   Laravel /pos/catalog-index  ->  decode  ->  rows + search index
 *                                     |
 *                                     +->  IndexedDB snapshot (Dexie)
 */
import api from '@/lib/api';
import { authCookies } from '@/auth/auth-cookies';
import { getOfflineDb } from '@/offline/db';
import { subscribeOutboxChange } from '@/offline/outbox';
import { buildCatalogIndex, resolveScanCode, searchCatalog } from './pharmacy-catalog-index';
import { getMedicinePricing, formatPackStock } from './pharmacy-pricing';
import { ensurePharmacyBatchCache, syncPharmacyBatchCache } from './pharmacy-batch-store';

/** Same resolution order as the axios interceptor, so the snapshot is scoped to
 *  the company whose data the request will actually return. */
function activeCompanyId() {
  const fromPath =
    typeof window !== 'undefined'
      ? window.location.pathname.match(/^\/workspace\/(\d+)(?:\/|$)/)?.[1]
      : null;
  return String(fromPath || authCookies.getCompanyId() || '');
}

const SNAPSHOT_KEY = 'pharmacy_pos_catalog';

/** Snapshot layout version. Bump to force every till to re-download. */
const SNAPSHOT_FORMAT = 6;

/** Re-check the server for changes at most this often. */
const SYNC_INTERVAL_MS = 5 * 60 * 1000;

let rows = [];
let index = null;
let rowsGeneration = 0;
let syncedAt = 0;
let catalogRevision = 0;
let companyKey = null;
let lastSyncCheck = 0;
let inflight = null;

const timings = {
  fetchMs: 0,
  decodeMs: 0,
  indexMs: 0,
  hydrateMs: 0,
  source: 'none',
  count: 0,
};

const listeners = new Set();

function notify() {
  for (const listener of listeners) {
    try {
      listener(rows);
    } catch {
      /* a bad subscriber must not break the catalog */
    }
  }
}

/** Subscribe to catalog swaps (initial load, sync, stock refresh). */
export function onPharmacyCatalogChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Turn one columnar server row into the product shape the POS already uses.
 *
 * The display strings under `_lookup` are computed here, once per load, instead
 * of per keystroke. The `pharmacy` sub-object mirrors the API resource so cart,
 * checkout and receipt code keeps working untouched.
 */
function decodeRow(row, at) {
  const id = row[at.id];
  if (id == null) return null;

  const name = row[at.name] || '';
  const generic = at.generic >= 0 ? row[at.generic] || '' : '';
  const strength = at.strength >= 0 ? row[at.strength] || '' : '';
  const maker = at.maker >= 0 ? row[at.maker] || '' : '';
  const form = at.form >= 0 ? row[at.form] || '' : '';
  const pack = at.pack >= 0 ? row[at.pack] || 0 : 0;
  const price = at.price >= 0 ? row[at.price] : null;
  const purchase = at.purchase >= 0 ? row[at.purchase] : null;
  const mrp = at.mrp >= 0 ? row[at.mrp] : null;
  const stock = at.stock >= 0 ? Number(row[at.stock] ?? 0) : 0;
  const tracks = at.tracks >= 0 ? row[at.tracks] === 1 : true;
  const rx = at.rx >= 0 ? row[at.rx] === 1 : false;
  const cd = at.cd >= 0 ? row[at.cd] === 1 : false;
  const barcodes = at.barcodes >= 0 ? row[at.barcodes] || '' : '';
  const primaryBarcode = barcodes ? barcodes.split(' ')[0] : '';
  const image = at.image >= 0 ? row[at.image] || null : null;

  const product = {
    id,
    name,
    sku: at.sku >= 0 ? row[at.sku] || '' : '',
    // Every known code, space separated. The index splits this, so scanning any
    // of a product's barcodes resolves it.
    barcode: barcodes,
    primary_barcode: primaryBarcode,
    generic,
    strength,
    maker,
    unit_price: price,
    purchase_price: purchase,
    mrp,
    tax_rate_id: at.tax_rate_id >= 0 ? row[at.tax_rate_id] : null,
    current_stock: tracks ? stock : null,
    track_inventory: tracks,
    image_url: image,
    pharmacy: {
      generic_name: generic,
      strength_text: strength,
      manufacturer_name: maker,
      dosage_form_name: form,
      pack_size: pack || null,
      units_per_pack: pack || null,
      prescription_required: rx,
      controlled_drug: cd,
    },
  };

  const pricing = getMedicinePricing(product);
  const stockN = tracks ? stock : 0;

  return {
    ...product,
    _lookup: buildCatalogLookup(product, pricing, stockN, tracks, primaryBarcode, at, row),
  };
}

function buildCatalogLookup(product, pricing, stockN, tracks, primaryBarcode, at, row) {
  const pharmacy = product.pharmacy || {};
  const pack = pharmacy.pack_size || pharmacy.units_per_pack || 0;
  return {
    generic: pharmacy.generic_name || '',
    strength: pharmacy.strength_text || '',
    manufacturer: pharmacy.manufacturer_name || '—',
    form: pharmacy.dosage_form_name || '—',
    packPcs: pack ? String(pack) : '—',
    packCount: pricing.packCount,
    saleLabel: formatMoney(product.unit_price),
    purchaseLabel: formatMoney(product.purchase_price),
    unitSaleLabel: formatMoney(pricing.unitPrice),
    unitPurchaseLabel:
      pricing.unitPurchase != null ? formatMoney(pricing.unitPurchase) : '—',
    packStockLabel: tracks ? formatPackStock(stockN, pricing.packCount) : '—',
    stock: tracks ? String(stockN) : '—',
    image: product.image_url,
    rx: !!pharmacy.prescription_required,
    controlled: !!pharmacy.controlled_drug,
    code: primaryBarcode || (at.sku >= 0 ? row[at.sku] : '') || '—',
    outOfStock: tracks && stockN <= 0,
  };
}

function fieldPositions(fields) {
  const at = {};
  const wanted = [
    'id', 'name', 'sku', 'barcodes', 'generic', 'strength', 'maker', 'form',
    'pack', 'price', 'purchase', 'mrp', 'tax_rate_id', 'stock', 'tracks', 'rx', 'cd', 'image',
  ];
  for (const key of wanted) at[key] = fields.indexOf(key);
  return at;
}

function decodePayload(payload) {
  const fields = payload?.fields;
  const list = payload?.rows;
  if (!Array.isArray(fields) || !Array.isArray(list)) return [];
  const at = fieldPositions(fields);
  const out = new Array(list.length);
  let n = 0;
  for (let i = 0; i < list.length; i += 1) {
    const decoded = decodeRow(list[i], at);
    if (decoded) out[n++] = decoded;
  }
  out.length = n;
  return out;
}

function rebuildIndex() {
  const started = performance.now();
  index = buildCatalogIndex(rows);
  timings.indexMs = performance.now() - started;
  timings.count = rows.length;
  // `rows` was just replaced/rebuilt from a fresh, true source (server load,
  // incremental sync, or snapshot) — any offline-overlay delta previously
  // diffed against the OLD rows no longer applies to these objects.
  rowsGeneration += 1;
}

/* ---------------- IndexedDB snapshot ---------------- */

async function readSnapshot(companyId) {
  try {
    const db = getOfflineDb(companyId);
    const record = await db.pos_catalog.get(SNAPSHOT_KEY);
    if (!record || record.format !== SNAPSHOT_FORMAT) return null;
    if (!Array.isArray(record.rows) || !record.rows.length) return null;
    return record;
  } catch {
    // A blocked or upgrading IndexedDB must never stop the POS from opening.
    return null;
  }
}

async function writeSnapshot(companyId) {
  try {
    const db = getOfflineDb(companyId);
    await db.pos_catalog.put({
      key: SNAPSHOT_KEY,
      format: SNAPSHOT_FORMAT,
      rows,
      syncedAt,
      catalogRevision,
      savedAt: Date.now(),
    });
  } catch {
    /* persistence is an optimisation, not a requirement */
  }
}

/* ---------------- loading and syncing ---------------- */

async function fetchCatalog(params) {
  const started = performance.now();
  const res = await api.get('/workspace/pos/catalog-index', { params });
  timings.fetchMs = performance.now() - started;
  return res?.data?.data ?? res?.data ?? null;
}

function applyRemovals(removed) {
  if (!removed?.length) return;
  const drop = new Set(removed.map(String));
  rows = rows.filter((row) => !drop.has(String(row.id)));
}

function upsertRows(incoming) {
  if (!incoming.length) return;
  const at = new Map();
  for (let i = 0; i < rows.length; i += 1) at.set(String(rows[i].id), i);
  for (const row of incoming) {
    const key = String(row.id);
    const existing = at.get(key);
    if (existing === undefined) {
      at.set(key, rows.length);
      rows.push(row);
    } else {
      rows[existing] = row;
    }
  }
  rows.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

async function loadFull(companyId, warehouseId) {
  const payload = await fetchCatalog(
    warehouseId ? { warehouse_id: Number(warehouseId) } : {},
  );
  const started = performance.now();
  rows = decodePayload(payload);
  timings.decodeMs = performance.now() - started;
  syncedAt = Number(payload?.synced_at) || Math.floor(Date.now() / 1000);
  catalogRevision = Number(payload?.catalog_revision) || catalogRevision;
  timings.source = 'network';
  rebuildIndex();
  notify();
  void writeSnapshot(companyId);
  void ensurePharmacyBatchCache({ companyId: companyId ?? companyKey });
}

function revisionMismatch(payload) {
  const remote = Number(payload?.catalog_revision) || 0;
  return remote > 0 && catalogRevision > 0 && remote !== catalogRevision;
}

/**
 * Pull only what changed since the last sync. Cheap enough to run whenever the
 * POS regains focus, and never blocks typing.
 */
export async function syncPharmacyCatalog({ companyId, warehouseId, force = false } = {}) {
  if (!index || !syncedAt) return false;
  const now = Date.now();
  if (!force && now - lastSyncCheck < SYNC_INTERVAL_MS) return false;
  lastSyncCheck = now;

  try {
    const params = { since: syncedAt };
    if (warehouseId) params.warehouse_id = Number(warehouseId);
    const payload = await fetchCatalog(params);
    if (revisionMismatch(payload)) {
      await loadFull(companyId ?? companyKey, warehouseId);
      return true;
    }
    const changed = decodePayload(payload);
    const removed = payload?.removed || [];
    syncedAt = Number(payload?.synced_at) || syncedAt;
    catalogRevision = Number(payload?.catalog_revision) || catalogRevision;

    if (!changed.length && !removed.length) return false;

    applyRemovals(removed);
    upsertRows(changed);
    rebuildIndex();
    notify();
    void writeSnapshot(companyId ?? companyKey);
    void syncPharmacyBatchCache({ companyId: companyId ?? companyKey });
    return true;
  } catch {
    return false;
  }
}

/**
 * Make sure the catalog and its index are ready. Safe to call repeatedly and from
 * several components at once; concurrent callers share one request.
 */
export function ensurePharmacyCatalog({ companyId, warehouseId, force = false } = {}) {
  const key = String(companyId || activeCompanyId() || '');
  ensureOfflineOverlaySubscribed();

  if (!force && index && companyKey === key) return Promise.resolve(rows);
  if (!force && inflight && companyKey === key) return inflight;

  companyKey = key;
  const hydrateStarted = performance.now();

  inflight = (async () => {
    // Show the snapshot immediately, then reconcile with the server behind it.
    if (!force && key) {
      const snapshot = await readSnapshot(key);
      if (snapshot) {
        rows = snapshot.rows;
        syncedAt = Number(snapshot.syncedAt) || 0;
        catalogRevision = Number(snapshot.catalogRevision) || 0;
        timings.hydrateMs = performance.now() - hydrateStarted;
        timings.source = 'indexeddb';
        rebuildIndex();
        notify();
        void ensurePharmacyBatchCache({ companyId: key });
        void syncPharmacyCatalog({ companyId: key, warehouseId, force: true });
        return rows;
      }
    }

    await loadFull(key, warehouseId);
    return rows;
  })()
    .then((result) => {
      // Best-effort: reapply any offline-sale stock adjustments that
      // occurred before this load/refresh completed (e.g. app reopened
      // with pending outbox mutations from a previous offline session).
      refreshPharmacyOfflineStockOverlay(key).catch(() => {});
      return result;
    })
    .catch(() => rows)
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

/* ---------------- reads ---------------- */

export function getPharmacyCatalogRows() {
  return rows;
}

export function getPharmacyCatalogIndex() {
  return index;
}

export function isPharmacyCatalogReady() {
  return Boolean(index);
}

/** Local search. Synchronous, no network — call it straight from onChange. */
export function searchPharmacyCatalog(term, limit) {
  if (!index) return [];
  return searchCatalog(index, term, { limit });
}

/** Exact barcode or SKU, or null. O(1). */
export function resolvePharmacyScan(code) {
  if (!index) return null;
  return resolveScanCode(index, code);
}

/**
 * Update stock in place after a sale or a cross-terminal change. Mutates the
 * existing rows so the index stays valid and no rebuild is needed.
 */
export function applyPharmacyStock(stockById) {
  if (!index || !stockById) return;
  let touched = false;
  for (const [id, qty] of Object.entries(stockById)) {
    const at = index.byId.get(String(id));
    if (at === undefined) continue;
    const row = rows[at];
    if (!row.track_inventory) continue;
    const n = Math.max(0, Number(qty) || 0);
    if (row.current_stock === n) continue;
    row.current_stock = n;
    const packCount = row._lookup?.packCount ?? getMedicinePricing(row).packCount;
    row._lookup = {
      ...row._lookup,
      stock: String(n),
      outOfStock: n <= 0,
      packStockLabel: formatPackStock(n, packCount),
    };
    touched = true;
  }
  if (touched) notify();
}

/**
 * Offline effective-stock overlay (Finvoroo Desktop Phase 6b): reads pending
 * outbox mutations via the existing generic offline layer and patches
 * displayed stock in place — same mechanism `applyPharmacyStock` already
 * uses for a real server-confirmed quantity, just fed a derived number
 * instead. Never writes a stock-movement row, never touches the server.
 *
 * Idempotent and reversible: tracks the delta it applied last time so a
 * second call (e.g. after another offline sale) adjusts relative to the
 * true underlying quantity, not the already-adjusted displayed one, and a
 * pull that refreshes the real quantity (via applyPharmacyStock elsewhere)
 * naturally becomes the new baseline the next time this runs.
 */
let lastAppliedOfflineDeltas = new Map();
let lastAppliedGeneration = -1;

export async function refreshPharmacyOfflineStockOverlay(companyId) {
  if (!index) return;
  const cid = companyId || activeCompanyId();
  if (!cid) return;

  if (lastAppliedGeneration !== rowsGeneration) {
    // rows were replaced by a fresh load/sync since we last applied an
    // overlay — that fresh data is already true, un-adjusted stock.
    lastAppliedOfflineDeltas = new Map();
    lastAppliedGeneration = rowsGeneration;
  }

  const { getOfflineStockDeltas } = await import('@/offline/masters-repository');
  const deltas = await getOfflineStockDeltas(cid);

  const stockById = {};
  const touchedIds = new Set([...deltas.keys(), ...lastAppliedOfflineDeltas.keys()]);
  for (const id of touchedIds) {
    const at = index.byId.get(String(id));
    if (at === undefined) continue;
    const row = rows[at];
    if (!row?.track_inventory) continue;

    const prevDelta = lastAppliedOfflineDeltas.get(id) || 0;
    const newDelta = deltas.get(id) || 0;
    if (prevDelta === newDelta) continue;

    // Undo the previously-applied adjustment to recover the true underlying
    // quantity, then apply the current one against that, not against
    // whatever's already showing on screen.
    const displayed = Number(row.current_stock) || 0;
    const trueBase = displayed + prevDelta;
    stockById[id] = Math.max(0, trueBase - newDelta);
  }

  lastAppliedOfflineDeltas = deltas;
  if (Object.keys(stockById).length) {
    applyPharmacyStock(stockById);
  }
}

let offlineOverlaySubscribed = false;
function ensureOfflineOverlaySubscribed() {
  if (offlineOverlaySubscribed) return;
  offlineOverlaySubscribed = true;
  subscribeOutboxChange((companyId) => {
    refreshPharmacyOfflineStockOverlay(companyId).catch(() => {
      /* best-effort display overlay — a failure here must not affect POS */
    });
  });
}

/** Patch last pack sale / purchase after a GRN or catalog refresh. */
export function applyPharmacyCatalogPricing(freshRows) {
  if (!index || !freshRows?.length) return;
  let touched = false;
  for (const fresh of freshRows) {
    if (fresh?.id == null) continue;
    const at = index.byId.get(String(fresh.id));
    if (at === undefined) continue;
    const row = rows[at];
    const nextSale = fresh.unit_price ?? row.unit_price;
    const nextPurchase = fresh.purchase_price ?? row.purchase_price;
    const nextMrp = fresh.mrp ?? row.mrp;
    if (
      Number(row.unit_price) === Number(nextSale) &&
      Number(row.purchase_price) === Number(nextPurchase) &&
      Number(row.mrp) === Number(nextMrp)
    ) {
      continue;
    }
    row.unit_price = nextSale;
    row.purchase_price = nextPurchase;
    row.mrp = nextMrp;
    const pricing = getMedicinePricing(row);
    row._lookup = {
      ...row._lookup,
      saleLabel: formatMoney(nextSale),
      purchaseLabel: formatMoney(nextPurchase),
      unitSaleLabel: formatMoney(pricing.unitPrice),
      unitPurchaseLabel:
        pricing.unitPurchase != null ? formatMoney(pricing.unitPurchase) : '—',
      packCount: pricing.packCount,
    };
    touched = true;
  }
  if (touched) {
    notify();
    void writeSnapshot(companyKey);
  }
}

/** Patch a product photo in the local catalog after upload (no full re-download). */
export function applyPharmacyProductImage(productId, imageUrl) {
  if (!index || productId == null) return;
  const at = index.byId.get(String(productId));
  if (at === undefined) return;
  const row = rows[at];
  const url = imageUrl || null;
  row.image_url = url;
  row._lookup = { ...row._lookup, image: url };
  notify();
}

export function isProductInPharmacyCatalog(productId) {
  if (productId == null || productId === '') return false;
  return index?.byId?.has?.(String(productId)) ?? false;
}

/** Force a full catalog download (e.g. after stale product ids on checkout). */
export function reloadPharmacyCatalog({ companyId, warehouseId } = {}) {
  const key = String(companyId || activeCompanyId() || '');
  companyKey = key;
  catalogRevision = 0;
  syncedAt = 0;
  index = null;
  return ensurePharmacyCatalog({ companyId: key, warehouseId, force: true });
}

/** Dev-only timings for the POS performance overlay. */
export function getPharmacyCatalogTimings() {
  return { ...timings, syncedAt, catalogRevision };
}
