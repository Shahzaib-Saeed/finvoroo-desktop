import Dexie from 'dexie';

const dbCache = new Map();

/**
 * Company-scoped offline DB. Separate from POS IndexedDB (finvoroo.pos.offline).
 */
export function getOfflineDb(companyId) {
  const id = String(companyId || '');
  if (!id) {
    throw new Error('companyId is required for offline DB');
  }
  if (dbCache.has(id)) {
    return dbCache.get(id);
  }

  const db = new Dexie(`finvoroo.offline.${id}`);
  db.version(1).stores({
    meta: 'key',
    customers: 'id, uuid, name, updated_at',
    products: 'id, uuid, name, sku, updated_at',
    tax_rates: 'id, name',
    invoices: 'uuid, server_id, status, updated_at, sync_status',
    outbox: 'client_mutation_id, status, created_at, entity, op',
    sync_state: 'key',
  });

  // Phase 2–4 document caches
  db.version(2).stores({
    meta: 'key',
    customers: 'id, uuid, name, updated_at',
    products: 'id, uuid, name, sku, updated_at',
    tax_rates: 'id, name',
    invoices: 'uuid, server_id, status, updated_at, sync_status',
    quotations: 'uuid, server_id, status, updated_at, sync_status',
    bills: 'uuid, server_id, status, updated_at, sync_status',
    purchase_orders: 'uuid, server_id, status, updated_at, sync_status',
    expenses: 'uuid, server_id, status, updated_at, sync_status',
    outbox: 'client_mutation_id, status, created_at, entity, op',
    sync_state: 'key',
    number_pools: 'pool_id, document_type',
  });

  // Vendors for offline bill / PO / expense pickers
  db.version(3).stores({
    meta: 'key',
    customers: 'id, uuid, name, updated_at',
    products: 'id, uuid, name, sku, updated_at',
    tax_rates: 'id, name',
    vendors: 'id, name, updated_at',
    invoices: 'uuid, server_id, status, updated_at, sync_status',
    quotations: 'uuid, server_id, status, updated_at, sync_status',
    bills: 'uuid, server_id, status, updated_at, sync_status',
    purchase_orders: 'uuid, server_id, status, updated_at, sync_status',
    expenses: 'uuid, server_id, status, updated_at, sync_status',
    outbox: 'client_mutation_id, status, created_at, entity, op',
    sync_state: 'key',
    number_pools: 'pool_id, document_type',
  });

  // Pharmacy POS compact search catalog. One snapshot record rather than a row
  // per product: writing and reading thousands of individual records costs far
  // more than a single structured clone.
  db.version(4).stores({
    meta: 'key',
    customers: 'id, uuid, name, updated_at',
    products: 'id, uuid, name, sku, updated_at',
    tax_rates: 'id, name',
    vendors: 'id, name, updated_at',
    invoices: 'uuid, server_id, status, updated_at, sync_status',
    quotations: 'uuid, server_id, status, updated_at, sync_status',
    bills: 'uuid, server_id, status, updated_at, sync_status',
    purchase_orders: 'uuid, server_id, status, updated_at, sync_status',
    expenses: 'uuid, server_id, status, updated_at, sync_status',
    outbox: 'client_mutation_id, status, created_at, entity, op',
    sync_state: 'key',
    number_pools: 'pool_id, document_type',
    pos_catalog: 'key',
  });

  // Phase 6 (Finvoroo Desktop): credit notes / debit notes now sync offline
  // too. Additive only — every store from version 4 stays exactly as-is.
  db.version(5).stores({
    meta: 'key',
    customers: 'id, uuid, name, updated_at',
    products: 'id, uuid, name, sku, updated_at',
    tax_rates: 'id, name',
    vendors: 'id, name, updated_at',
    invoices: 'uuid, server_id, status, updated_at, sync_status',
    quotations: 'uuid, server_id, status, updated_at, sync_status',
    bills: 'uuid, server_id, status, updated_at, sync_status',
    purchase_orders: 'uuid, server_id, status, updated_at, sync_status',
    expenses: 'uuid, server_id, status, updated_at, sync_status',
    credit_notes: 'uuid, server_id, status, updated_at, sync_status',
    debit_notes: 'uuid, server_id, status, updated_at, sync_status',
    outbox: 'client_mutation_id, status, created_at, entity, op',
    sync_state: 'key',
    number_pools: 'pool_id, document_type',
    pos_catalog: 'key',
  });

  dbCache.set(id, db);
  return db;
}

export async function setMeta(companyId, key, value) {
  const db = getOfflineDb(companyId);
  await db.meta.put({ key, value, updated_at: Date.now() });
}

export async function getMeta(companyId, key, fallback = null) {
  const db = getOfflineDb(companyId);
  const row = await db.meta.get(key);
  return row ? row.value : fallback;
}
