const today = () => new Date().toISOString().slice(0, 10);

export const ASSET_CATEGORIES = [
  'Machinery',
  'Vehicle',
  'Furniture',
  'IT Equipment',
  'Building',
  'Other',
];

export const ASSET_STATUSES = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'retired', label: 'Retired' },
  { value: 'sold', label: 'Sold' },
  { value: 'lost', label: 'Lost' },
  { value: 'under_maintenance', label: 'Under maintenance' },
];

export const EDITABLE_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'under_maintenance', label: 'Under maintenance' },
];

export const DEPRECIATION_METHODS = [
  { value: 'straight_line', label: 'Straight line' },
  { value: 'reducing_balance', label: 'Reducing balance' },
];

export const STATUS_COLORS = {
  active: 'text-emerald-700 border-emerald-200 bg-emerald-50',
  retired: 'text-muted-foreground border-border bg-muted/50',
  sold: 'text-sky-700 border-sky-200 bg-sky-50',
  lost: 'text-destructive border-destructive/20 bg-destructive/5',
  under_maintenance: 'text-amber-700 border-amber-200 bg-amber-50',
};

export const EMPTY_FIXED_ASSET_FORM = {
  asset_name: '',
  asset_code: '',
  category: 'Machinery',
  purchase_date: today(),
  purchase_cost: '',
  vendor_id: '',
  location: '',
  serial_number: '',
  registration_number: '',
  warranty_expiry: '',
  notes: '',
  status: 'active',
  useful_life_years: '5',
  salvage_value: '0',
  depreciation_method: 'straight_line',
  payment_account_id: '',
};

export function formatCurrency(amount, currency = 'USD') {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '—';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return n.toFixed(2);
  }
}

export function formatStatus(status) {
  if (!status) return '—';
  return String(status)
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function depreciationMethodLabel(method) {
  if (method === 'reducing_balance') return 'Reducing balance';
  return 'Straight line';
}

export function currentYearMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Mirrors FixedAssetDepreciationService::straightLineMonthly */
export function straightLineMonthly(asset) {
  const depreciable = Number(asset.purchase_cost) - Number(asset.salvage_value || 0);
  const months = Math.max(1, Number(asset.useful_life_years || 1) * 12);
  return Math.round((depreciable / months) * 100) / 100;
}

/** Mirrors FixedAssetDepreciationService::reducingBalanceAmount */
export function reducingBalanceAmount(asset, openingBookValue) {
  const cost = Number(asset.purchase_cost);
  const salvage = Number(asset.salvage_value || 0);
  const months = Math.max(1, Number(asset.useful_life_years || 1) * 12);
  if (cost <= 0 || openingBookValue <= 0) return 0;
  const rate = 1 - Math.pow(Math.max(0.0001, salvage / cost), 1 / months);
  const amount = openingBookValue * rate;
  const minNbv = Math.max(salvage, 0);
  const maxDep = Math.max(0, openingBookValue - minNbv);
  return Math.round(Math.min(amount, maxDep) * 100) / 100;
}

/** Mirrors FixedAssetDepreciationService::calculateForPeriod */
export function calculateDepreciationForPeriod(asset, yearMonth) {
  if (asset.status !== 'active') return 0;
  const accum = Number(asset.accumulated_depreciation || 0);
  const cost = Number(asset.purchase_cost || 0);
  const nbv = cost - accum;
  if (nbv <= 0) return 0;
  if (asset.depreciation_method === 'straight_line') {
    return straightLineMonthly(asset);
  }
  return reducingBalanceAmount(asset, nbv);
}

export function buildFixedAssetPayload(form, { includePayment = true } = {}) {
  const payload = {
    asset_name: form.asset_name.trim(),
    asset_code: form.asset_code?.trim() || null,
    category: form.category,
    purchase_date: form.purchase_date,
    purchase_cost: parseFloat(form.purchase_cost),
    vendor_id: form.vendor_id ? parseInt(form.vendor_id, 10) : null,
    location: form.location?.trim() || null,
    serial_number: form.serial_number?.trim() || null,
    registration_number: form.registration_number?.trim() || null,
    warranty_expiry: form.warranty_expiry || null,
    notes: form.notes?.trim() || null,
    useful_life_years: parseInt(form.useful_life_years, 10),
    salvage_value: form.salvage_value === '' ? 0 : parseFloat(form.salvage_value),
    depreciation_method: form.depreciation_method || 'straight_line',
  };
  if (form.status) payload.status = form.status;
  if (includePayment && form.payment_account_id) {
    payload.payment_account_id = parseInt(form.payment_account_id, 10);
  }
  return payload;
}

export function formFromAsset(asset) {
  return {
    asset_name: asset.asset_name || '',
    asset_code: asset.asset_code || '',
    category: asset.category || 'Machinery',
    purchase_date: asset.purchase_date || today(),
    purchase_cost: asset.purchase_cost != null ? String(asset.purchase_cost) : '',
    vendor_id: asset.vendor_id ? String(asset.vendor_id) : '',
    location: asset.location || '',
    serial_number: asset.serial_number || '',
    registration_number: asset.registration_number || '',
    warranty_expiry: asset.warranty_expiry || '',
    notes: asset.notes || '',
    status: asset.status || 'active',
    useful_life_years:
      asset.useful_life_years != null ? String(asset.useful_life_years) : '5',
    salvage_value: asset.salvage_value != null ? String(asset.salvage_value) : '0',
    depreciation_method: asset.depreciation_method || 'straight_line',
    payment_account_id: asset.payment_account_id ? String(asset.payment_account_id) : '',
  };
}

export function accountLabel(acc) {
  if (!acc) return '';
  const code = acc.code ?? '';
  const name = acc.name ?? '';
  return code ? `${code} — ${name}` : name;
}
