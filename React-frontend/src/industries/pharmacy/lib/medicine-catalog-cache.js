import api from '@/lib/api';
import { posApi } from '@/pages/accounting/pos/api/pos.api';
import { getMedicinePricing, formatPackStock } from './pharmacy-pricing';
import {
  applyPharmacyCatalogPricing,
  applyPharmacyStock,
  ensurePharmacyCatalog,
  getPharmacyCatalogRows,
  isPharmacyCatalogReady,
  resolvePharmacyScan,
  searchPharmacyCatalog,
} from './pharmacy-catalog-store';

const VISIBLE_LIMIT = 48;

/** Cap for the legacy fallback cache only — the real catalog lives in the store. */
const CACHE_CAP = 400;

let rows = [];
let loadedAt = 0;

function unwrap(res) {
  return res?.data?.data ?? res?.data ?? null;
}

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function formatMoney(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Shared lookup display fields for POS / purchase medicine sheets. */
export function buildMedicineLookupFields(row) {
  const pharmacy = row?.pharmacy || {};
  const generic = pharmacy?.generic_name || row?.generic || '';
  const strength = pharmacy?.strength_text || row?.strength || '';
  const manufacturer =
    pharmacy?.manufacturer?.name ||
    pharmacy?.manufacturer_name ||
    row?.manufacturer?.name ||
    row?.manufacturer_name ||
    row?.manufacturer ||
    '';
  const form =
    pharmacy?.dosage_form?.name || pharmacy?.dosage_form_name || row?.unit || '';
  const packRaw = pharmacy?.pack_size || pharmacy?.units_per_pack || row?.unit || '';
  const packMatch = String(packRaw).match(/(\d+(?:\.\d+)?)/);
  const packPcs = packMatch ? packMatch[1] : packRaw || '—';
  const pricing = getMedicinePricing(row);
  const stock = row?.current_stock ?? row?.stock_qty ?? row?.quantity_on_hand ?? row?.qty_on_hand ?? 0;
  const stockN = Number(stock) || 0;
  const image = row?.image_url || row?.images?.[0]?.url || row?.image || null;

  return {
    generic,
    strength,
    manufacturer: manufacturer || '—',
    form: form || '—',
    packPcs,
    packCount: pricing.packCount,
    stock: String(stockN),
    packStockLabel: formatPackStock(stockN, pricing.packCount),
    saleLabel: formatMoney(pricing.packPrice),
    purchaseLabel: formatMoney(pricing.packPurchase),
    unitSaleLabel: formatMoney(pricing.unitPrice),
    unitPurchaseLabel:
      pricing.unitPurchase != null ? formatMoney(pricing.unitPurchase) : '—',
    image,
    rx: !!pharmacy?.prescription_required,
    controlled: !!pharmacy?.controlled_drug,
    outOfStock: stockN <= 0,
  };
}

function compactAlnum(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

/** Slim + precompute display fields so the lookup sheet stays cheap to render. */
export function indexMedicineRow(p) {
  if (!p || p.id == null) return null;
  if (p._lookup) return p;

  const pharmacy = p.pharmacy || null;
  const lookupFields = buildMedicineLookupFields({ ...p, pharmacy });
  const stock = p.current_stock ?? p.stock_qty ?? p.quantity_on_hand ?? p.qty_on_hand ?? 0;
  const image = lookupFields.image;
  const haystack = [
    p.name,
    p.sku,
    p.barcode,
    lookupFields.generic,
    lookupFields.strength,
    lookupFields.manufacturer,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const compact = compactAlnum(haystack);

  return {
    id: p.id,
    name: p.name,
    sku: p.sku || '',
    barcode: p.barcode || '',
    image_url: image,
    unit_price: p.unit_price ?? null,
    purchase_price: p.purchase_price ?? p.cost_price ?? null,
    mrp: p.mrp ?? null,
    tax_rate_id: p.tax_rate_id ?? null,
    tax_rate: p.tax_rate ?? null,
    pharmacy,
    current_stock: stock,
    track_inventory: p.track_inventory !== false && p.type !== 'service',
    _lookup: {
      haystack,
      compact,
      ...lookupFields,
      code: p.barcode || p.sku || '—',
    },
  };
}

/** Apply stock count to a cached/indexed row (updates lookup display). */
export function applyStockToMedicineRow(row, stock) {
  if (!row) return row;
  const n = Math.max(0, Number(stock) || 0);
  row.current_stock = n;
  if (row._lookup) {
    row._lookup.stock = String(n);
    row._lookup.outOfStock = n <= 0;
    const packCount = row._lookup.packCount || getMedicinePricing(row).packCount;
    row._lookup.packStockLabel = formatPackStock(n, packCount);
  }
  return row;
}

function rememberRows(list) {
  if (!list?.length) return;
  const map = new Map();
  for (const row of list) {
    if (row?.id == null) continue;
    map.set(String(row.id), row);
  }
  for (const row of rows) {
    const key = String(row.id);
    if (!map.has(key)) map.set(key, row);
  }
  rows = [...map.values()].slice(0, CACHE_CAP);
  loadedAt = Date.now();
}

/** Merge live stock from POS catalog into the local catalog and fallback cache. */
export function mergeFreshStockIntoCatalog(freshRows) {
  if (!freshRows?.length) return;
  rememberRows(freshRows);
  const byId = new Map(freshRows.map((r) => [String(r.id), r]));
  for (const row of rows) {
    const fresh = byId.get(String(row.id));
    if (fresh) applyStockToMedicineRow(row, fresh.current_stock);
  }
  applyPharmacyStock(
    Object.fromEntries(freshRows.map((r) => [String(r.id), r.current_stock])),
  );
  applyPharmacyCatalogPricing(freshRows);
}

/** Fetch current stock from POS catalog (same source as checkout). */
export async function fetchFreshMedicineStock({ search, ids, limit = VISIBLE_LIMIT, warehouseId } = {}) {
  const params = { per_page: Math.min(100, limit), page: 1, is_active: 1 };
  const term = String(search || '').trim();
  if (term) params.search = term;
  if (warehouseId) params.warehouse_id = Number(warehouseId);
  if (ids?.length) {
    params.ids = ids.join(',');
    params.per_page = Math.min(100, ids.length);
  }
  const res = await posApi.catalog(params);
  const payload = unwrap(res);
  const list = normalizeList(payload?.data ?? payload);
  return list.map(indexMedicineRow).filter(Boolean);
}

/** Refresh cache stock for specific product ids (after sale / cross-terminal). */
export async function refreshMedicineStockByIds(ids, warehouseId) {
  const unique = [...new Set((ids || []).map(String))].filter(Boolean);
  if (!unique.length) return;
  const fresh = await fetchFreshMedicineStock({ ids: unique, limit: unique.length, warehouseId });
  mergeFreshStockIntoCatalog(fresh);
  return fresh;
}

/** Row with available stock after subtracting qty already in cart. */
export function withAvailableStock(row, available) {
  if (!row) return row;
  const n = Math.max(0, Number(available) || 0);
  const next = { ...row, current_stock: n };
  if (row._lookup) {
    next._lookup = {
      ...row._lookup,
      stock: String(n),
      outOfStock: n <= 0,
      packStockLabel: formatPackStock(n, row._lookup.packCount || getMedicinePricing(row).packCount),
    };
  }
  return next;
}

function scoreRow(row, q, tokens, compactQ) {
  const label = String(row.name || '').toLowerCase();
  const compactName = compactAlnum(row.name);
  let score = 0;
  if (label === q || compactName === compactQ) score += 80;
  else if (label.startsWith(q) || (compactQ && compactName.startsWith(compactQ))) score += 40;
  else if (label.includes(q) || (compactQ && compactName.includes(compactQ))) score += 20;
  if (tokens[0] && label.startsWith(tokens[0])) score += 15;
  if (String(row.barcode || '').toLowerCase() === q) score += 50;
  if (String(row.sku || '').toLowerCase() === q) score += 35;
  return score;
}

/**
 * Search the catalog. When `list` is the loaded catalog we go through the
 * in-memory index, which is where the speed comes from. Callers that pass their
 * own array (purchase and GRN grids) keep the original scan.
 */
export function filterMedicineCatalog(list, term, limit = VISIBLE_LIMIT) {
  if (isPharmacyCatalogReady() && (list == null || list === getPharmacyCatalogRows())) {
    return searchPharmacyCatalog(term, limit);
  }
  return scanMedicineList(list, term, limit);
}

function scanMedicineList(list, term, limit = VISIBLE_LIMIT) {
  const source = list || [];
  const q = String(term || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  if (!q) return source.slice(0, limit);

  const tokens = q.split(' ').filter(Boolean);
  const compactQ = compactAlnum(q);
  const scored = [];
  for (const row of source) {
    const hay = row._lookup?.haystack || String(row.name || '').toLowerCase();
    const compact =
      row._lookup?.compact ||
      compactAlnum(`${hay} ${row.name || ''} ${row.sku || ''} ${row.barcode || ''}`);
    const tokensHit = tokens.every((t) => hay.includes(t) || compact.includes(compactAlnum(t)));
    const gluedHit = compactQ.length >= 2 && compact.includes(compactQ);
    if (!tokensHit && !gluedHit) continue;
    scored.push({ row, score: scoreRow(row, q, tokens, compactQ) });
  }
  scored.sort(
    (a, b) => b.score - a.score || String(a.row.name || '').localeCompare(String(b.row.name || '')),
  );
  return scored.slice(0, limit).map((s) => s.row);
}

export function mergeMedicineHits(primary, secondary, limit = VISIBLE_LIMIT) {
  const seen = new Set();
  const out = [];
  for (const list of [primary || [], secondary || []]) {
    for (const row of list) {
      if (row?.id == null) continue;
      const key = String(row.id);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(row);
      if (out.length >= limit) return out;
    }
  }
  return out;
}

/** Load the full compact catalog and build the local search index. */
export async function loadMedicineCatalog({ force = false, warehouseId } = {}) {
  const loaded = await ensurePharmacyCatalog({ force, warehouseId });
  loadedAt = Date.now();
  return loaded;
}

export function prefetchMedicineCatalog() {
  if (isPharmacyCatalogReady()) return;
  const run = () => void loadMedicineCatalog();
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(run, { timeout: 2500 });
    return;
  }
  setTimeout(run, 200);
}

export function getCachedMedicineCatalog() {
  return isPharmacyCatalogReady() ? getPharmacyCatalogRows() : rows;
}

/** Exact barcode/SKU straight from the local index — no request, no waiting. */
export function resolveMedicineCode(code) {
  return resolvePharmacyScan(code);
}

export function medicineCatalogLoadedAt() {
  return loadedAt;
}

export async function searchMedicineCatalogRemote(
  term,
  limit = VISIBLE_LIMIT,
  { withStock = true, warehouseId } = {},
) {
  const q = String(term || '').trim();
  if (!q) return [];
  if (!withStock) {
    const res = await api.get('/workspace/products', {
      params: { per_page: Math.min(48, limit), page: 1, is_active: 1, search: q },
    });
    const list = normalizeList(unwrap(res)).map(indexMedicineRow).filter(Boolean).slice(0, limit);
    rememberRows(list);
    return list;
  }
  const list = await fetchFreshMedicineStock({ search: q, limit, warehouseId });
  rememberRows(list);
  return list;
}

export const MEDICINE_LOOKUP_VISIBLE = VISIBLE_LIMIT;
