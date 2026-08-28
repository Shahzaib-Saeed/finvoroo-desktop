/**
 * POS local cart/holds IndexedDB (separate from company Dexie ERP sync DB).
 * Checkout while offline is queued via React-frontend/src/offline outbox as
 * pos.checkout → draft invoice (no stock/GL/payment offline).
 */

const DB_NAME = 'finvoroo.pos.offline';
const DB_VERSION = 1;
const CART_KEY = 'active_cart';
const PHARMACY_CART_KEY = 'pharmacy_active_cart';
const HOLDS_KEY = 'local_holds';
const CATALOG_KEY = 'catalog_cache';
const PHARMACY_BOOTSTRAP_KEY = 'pharmacy_bootstrap_cache';

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('kv')) {
        db.createObjectStore('kv');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function kvGet(key) {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('kv', 'readonly');
      const req = tx.objectStore('kv').get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function kvSet(key, value) {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('kv', 'readwrite');
      tx.objectStore('kv').put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    return false;
  }
}

export const PosOfflineStore = {
  async saveCart(state) {
    return kvSet(CART_KEY, { ...state, saved_at: Date.now() });
  },
  async loadCart() {
    return kvGet(CART_KEY);
  },
  async clearCart() {
    return kvSet(CART_KEY, null);
  },
  async savePharmacyCart(state) {
    return kvSet(PHARMACY_CART_KEY, { ...state, saved_at: Date.now() });
  },
  async loadPharmacyCart() {
    return kvGet(PHARMACY_CART_KEY);
  },
  async clearPharmacyCart() {
    return kvSet(PHARMACY_CART_KEY, null);
  },
  async savePharmacyBootstrap(data) {
    return kvSet(PHARMACY_BOOTSTRAP_KEY, { data, saved_at: Date.now() });
  },
  async loadPharmacyBootstrap() {
    const row = await kvGet(PHARMACY_BOOTSTRAP_KEY);
    return row?.data ?? null;
  },
  async saveCatalogCache(products) {
    return kvSet(CATALOG_KEY, { products, saved_at: Date.now() });
  },
  async loadCatalogCache() {
    return kvGet(CATALOG_KEY);
  },
  async listLocalHolds() {
    const rows = (await kvGet(HOLDS_KEY)) || [];
    return Array.isArray(rows) ? rows : [];
  },
  async upsertLocalHold(hold) {
    const rows = await this.listLocalHolds();
    const idx = rows.findIndex((h) => h.client_uuid === hold.client_uuid);
    if (idx >= 0) rows[idx] = hold;
    else rows.unshift(hold);
    await kvSet(HOLDS_KEY, rows.slice(0, 50));
    return hold;
  },
  async removeLocalHold(clientUuid) {
    const rows = (await this.listLocalHolds()).filter((h) => h.client_uuid !== clientUuid);
    await kvSet(HOLDS_KEY, rows);
  },
};
