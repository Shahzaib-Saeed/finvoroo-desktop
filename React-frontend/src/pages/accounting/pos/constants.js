export const POS_RAIL_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'recent', label: 'Recently sold' },
  { id: 'low_stock', label: 'Low stock' },
];

export const FAVORITES_KEY = 'finvoroo.pos.favorites';
export const RECENT_KEY = 'finvoroo.pos.recent';
export const BARCODE_CACHE_KEY = 'finvoroo.pos.barcode_cache';

export { SHORTCUT_LABELS as SHORTCUTS } from './lib/shortcuts';

export function loadIdSet(key) {
  try {
    const raw = localStorage.getItem(key);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
}

export function saveIdSet(key, set) {
  try {
    localStorage.setItem(key, JSON.stringify([...set].slice(0, 200)));
  } catch {
    /* ignore quota */
  }
}

export function pushRecent(productId) {
  const set = loadIdSet(RECENT_KEY);
  const next = [String(productId), ...[...set].filter((id) => id !== String(productId))];
  saveIdSet(RECENT_KEY, new Set(next.slice(0, 80)));
}

export function rememberBarcode(code, product) {
  try {
    const raw = localStorage.getItem(BARCODE_CACHE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[String(code).toLowerCase()] = {
      id: product.id,
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      unit_price: product.unit_price,
      selling_price: product.selling_price,
      unit: product.unit,
      unit_label: product.unit_label,
      tax_rate_id: product.tax_rate_id || product.tax_id,
      tax_rate: product.tax_rate,
      image_url: product.image_url,
      current_stock: product.current_stock ?? product.quantity_on_hand,
      qty_conversion: product.qty_conversion,
      type: product.type,
      purchase_price: product.purchase_price,
      cached_at: Date.now(),
    };
    const keys = Object.keys(map);
    if (keys.length > 200) {
      keys
        .sort((a, b) => (map[a].cached_at || 0) - (map[b].cached_at || 0))
        .slice(0, keys.length - 200)
        .forEach((k) => delete map[k]);
    }
    localStorage.setItem(BARCODE_CACHE_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function lookupCachedBarcode(code) {
  try {
    const raw = localStorage.getItem(BARCODE_CACHE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    return map[String(code).toLowerCase()] || null;
  } catch {
    return null;
  }
}
