export const TAX_TYPE_COLORS = {
  percentage: 'bg-blue-100 text-blue-700 border-blue-200',
  fixed: 'bg-secondary text-secondary-foreground',
};

export const TYPE_OPTIONS = [
  { value: 'percentage', label: 'Percentage (%)' },
  { value: 'fixed', label: 'Fixed amount' },
];

export const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active only' },
  { value: 'inactive', label: 'Inactive only' },
];

export const EMPTY_TAX_FORM = {
  name: '',
  rate: '',
  type: 'percentage',
  is_default: false,
  is_active: true,
};

export function formatTaxRate(tax) {
  if (!tax) return '—';
  const rate = Number(tax.rate) || 0;
  if (tax.type === 'percentage') {
    return `${rate.toFixed(2)}%`;
  }
  return rate.toFixed(2);
}

export function mapTaxToForm(tax) {
  if (!tax) return { ...EMPTY_TAX_FORM };
  return {
    name: tax.name || '',
    rate: tax.rate != null ? String(tax.rate) : '',
    type: tax.type || 'percentage',
    is_default: !!tax.is_default,
    is_active: tax.is_active !== false,
  };
}

export function buildTaxPayload(form, isEdit) {
  const payload = {
    name: form.name.trim(),
    rate: Number(form.rate) || 0,
    type: form.type,
    is_default: !!form.is_default,
  };
  if (isEdit) {
    payload.is_active = !!form.is_active;
  }
  return payload;
}
