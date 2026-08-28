import { getOfflineDb, getMeta } from './db';
import { isOnline } from './connectivity';
import { OUTBOX_STATUS } from './outbox';

function matchesSearch(row, search) {
  if (!search) return true;
  const q = String(search).trim().toLowerCase();
  if (!q) return true;
  const hay = [
    row.name,
    row.customer_code,
    row.email,
    row.phone,
    row.sku,
    row.barcode,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(q);
}

/**
 * Offline-capable customer list (Dexie). Returns API-shaped page.
 */
export async function listCustomersFromCache(companyId, {
  page = 1,
  perPage = 15,
  search = '',
  status = 'all',
} = {}) {
  const db = getOfflineDb(companyId);
  let rows = await db.customers.toArray();
  rows = rows.map((r) => r.raw || {
    id: r.id,
    uuid: r.uuid,
    name: r.name,
    customer_code: r.customer_code,
    email: r.email,
    phone: r.phone,
    currency: r.currency,
    is_active: r.is_active !== false,
  });

  if (status === 'active') rows = rows.filter((r) => r.is_active !== false);
  if (status === 'inactive') rows = rows.filter((r) => r.is_active === false);
  rows = rows.filter((r) => matchesSearch(r, search));
  rows.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));

  const total = rows.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage) || 1);
  const start = (Math.max(1, page) - 1) * perPage;
  const data = rows.slice(start, start + perPage);

  return {
    data,
    meta: { total, last_page: lastPage, current_page: page, per_page: perPage },
    offline: true,
  };
}

/**
 * Sum of not-yet-synced quantity effects per product_id, derived purely from
 * pending/failed/syncing outbox mutations — not a new stock ledger, just a
 * read-time projection over data that already exists (cached qty + the
 * existing outbox). Positive = stock consumed since the last sync (a sale);
 * negative = stock returned to the warehouse. Reconciles to zero automatically
 * once a pull refreshes the cached quantity after sync. See
 * finvoroo-desktop/README.md's "immediate vs deferred" table.
 *
 * Only invoice/pos (sale) and credit_note/debit_note (product-linked returns)
 * move stock in this system — bill/purchase_order/quotation/expense creation
 * do not touch quantity_on_hand at create time (receiving/GRN is a separate,
 * still-online-only flow), so they're intentionally excluded here.
 */
export async function getOfflineStockDeltas(companyId) {
  const db = getOfflineDb(companyId);
  const pending = await db.outbox
    .where('status')
    .anyOf([OUTBOX_STATUS.Pending, OUTBOX_STATUS.Syncing, OUTBOX_STATUS.Failed])
    .toArray();

  const deltas = new Map();
  const add = (productId, qty) => {
    const id = Number(productId);
    if (!id || !Number.isFinite(qty) || qty === 0) return;
    deltas.set(id, (deltas.get(id) || 0) + qty);
  };

  for (const item of pending) {
    const payload = item.payload || {};
    const lines = Array.isArray(payload.lines) ? payload.lines : [];
    if (!lines.length) continue;

    if (item.entity === 'invoice' || item.entity === 'pos') {
      lines.forEach((line) => add(line.product_id, Number(line.quantity) || 0));
    } else if (item.entity === 'credit_note') {
      // Only lines returned against a specific invoice line restock — a pure
      // price-adjustment credit-note line (no invoice_line_id) never moved
      // physical stock, matching CreditNoteInventoryService::applyReturnForLine.
      lines.forEach((line) => {
        if (!line.invoice_line_id) return;
        add(line.product_id, -(Number(line.quantity) || 0));
      });
    } else if (item.entity === 'debit_note') {
      lines.forEach((line) => add(line.product_id, Number(line.quantity) || 0));
    }
  }

  return deltas;
}

/**
 * Overlays getOfflineStockDeltas() onto a list of cached products. Read-time
 * only — never writes a stock-movement row locally, never mutates the cache.
 */
export async function applyEffectiveStock(companyId, products) {
  const deltas = await getOfflineStockDeltas(companyId);
  if (!deltas.size) return products;
  return products.map((p) => {
    const delta = deltas.get(Number(p.id));
    if (!delta) return p;
    const base = Number(p.quantity_on_hand ?? p.current_stock ?? 0);
    const effective = base - delta;
    return {
      ...p,
      quantity_on_hand: effective,
      current_stock: effective,
      _offline_stock_adjusted: true,
    };
  });
}

/**
 * Offline-capable product list (Dexie).
 */
export async function listProductsFromCache(companyId, {
  page = 1,
  perPage = 15,
  search = '',
} = {}) {
  const db = getOfflineDb(companyId);
  let rows = await db.products.toArray();
  rows = rows.map((r) => r.raw || {
    id: r.id,
    uuid: r.uuid,
    name: r.name,
    sku: r.sku,
    barcode: r.barcode,
    type: r.type,
    unit: r.unit,
    unit_price: r.unit_price,
    tax_rate_id: r.tax_rate_id,
    quantity_on_hand: r.quantity_on_hand,
    current_stock: r.quantity_on_hand,
    is_active: r.is_active !== false,
  });

  rows = rows.filter((r) => r.is_active !== false);
  rows = rows.filter((r) => matchesSearch(r, search));
  rows = await applyEffectiveStock(companyId, rows);
  rows.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));

  const total = rows.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage) || 1);
  const start = (Math.max(1, page) - 1) * perPage;
  const data = rows.slice(start, start + perPage);

  return {
    data,
    meta: { total, last_page: lastPage, current_page: page, per_page: perPage },
    offline: true,
  };
}

export async function shouldUseOfflineBrowse(companyId) {
  if (isOnline()) return false;
  if (!companyId) return false;
  return Boolean(await getMeta(companyId, 'offline_sync_enabled', false));
}
