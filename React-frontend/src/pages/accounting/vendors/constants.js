export const EMPTY_VENDOR_FORM = {
  vendor_code: '',
  name: '',
  email: '',
  phone: '',
  tax_id: '',
  currency: '',
  payment_terms_type: 'net_days',
  payment_terms_days: 30,
  payment_terms_fixed_day: '',
  payable_account_id: '',
  default_expense_account_id: '',
  invoice_template_id: '',
  also_use_as_customer: false,
  address_line1: '',
  opening_balance: '',
  balance_date: new Date().toISOString().slice(0, 10),
  notes: '',
  is_active: true,
};

export function resolveVendorCurrency(currency, baseCurrency = 'USD') {
  const base = String(baseCurrency || 'USD').toUpperCase();
  const stored = String(currency || '').trim().toUpperCase();
  if (!stored) return base;
  if (stored === 'USD' && base !== 'USD') return base;
  return stored;
}

export function mapVendorToForm(vendor, { baseCurrency = 'USD' } = {}) {
  if (!vendor) return { ...EMPTY_VENDOR_FORM, currency: resolveVendorCurrency('', baseCurrency) };

  return {
    ...EMPTY_VENDOR_FORM,
    vendor_code: vendor.vendor_code || '',
    name: vendor.name || '',
    email: vendor.email || '',
    phone: vendor.phone || '',
    tax_id: vendor.tax_id || '',
    currency: resolveVendorCurrency(vendor.currency, baseCurrency),
    payment_terms_type: vendor.payment_terms_type || 'net_days',
    payment_terms_days: vendor.payment_terms_days ?? 30,
    payment_terms_fixed_day: vendor.payment_terms_fixed_day ?? '',
    payable_account_id: vendor.payable_account_id ? String(vendor.payable_account_id) : '',
    default_expense_account_id: vendor.default_expense_account_id
      ? String(vendor.default_expense_account_id)
      : '',
    invoice_template_id: vendor.invoice_template_id
      ? String(vendor.invoice_template_id)
      : '',
    also_use_as_customer: !!vendor.also_use_as_customer,
    // Address is now a single free-text field, same as the customer sheet. Vendors
    // saved before this change may still have data spread across the old split
    // fields (address_line1 was just "line 1" back then) — join everything so
    // existing data isn't hidden until the vendor is next saved, at which point
    // the backend clears the legacy fields and this collapses to address_line1 alone.
    address_line1:
      [vendor.address_line1, vendor.address_line2, vendor.city, vendor.state, vendor.postal_code, vendor.country]
        .filter(Boolean)
        .join(', ') || '',
    opening_balance: vendor.opening_balance ?? '',
    balance_date:
      vendor.balance_date || new Date().toISOString().slice(0, 10),
    notes: vendor.notes || '',
    is_active: vendor.is_active !== false,
  };
}

export function buildVendorPayload(form, { isEdit = false, baseCurrency = 'USD' } = {}) {
  const payload = {
    vendor_code: form.vendor_code || null,
    name: form.name.trim(),
    email: form.email || null,
    phone: form.phone || null,
    tax_id: form.tax_id || null,
    payment_terms_type: form.payment_terms_type,
    payment_terms_days:
      form.payment_terms_days === '' ? null : Number(form.payment_terms_days),
    payment_terms_fixed_day:
      form.payment_terms_fixed_day === '' ? null : Number(form.payment_terms_fixed_day),
    payable_account_id: form.payable_account_id ? Number(form.payable_account_id) : null,
    default_expense_account_id: form.default_expense_account_id
      ? Number(form.default_expense_account_id)
      : null,
    invoice_template_id: form.invoice_template_id
      ? Number(form.invoice_template_id)
      : null,
    also_use_as_customer: !!form.also_use_as_customer,
    address_line1: form.address_line1 || null,
    opening_balance:
      form.opening_balance === '' ? null : Number(form.opening_balance),
    balance_date: form.balance_date || null,
    notes: form.notes || null,
  };

  if (isEdit) {
    payload.currency = resolveVendorCurrency(form.currency, baseCurrency);
    payload.is_active = !!form.is_active;
  }

  return payload;
}

export function extractApiListItems(res) {
  const payload = res?.data;
  const data = payload?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export function formatVendorAddress(vendor) {
  if (!vendor) return '';
  return [
    vendor.address_line1,
    vendor.address_line2,
    vendor.city,
    vendor.state,
    vendor.postal_code,
    vendor.country,
  ]
    .filter(Boolean)
    .join(', ');
}

export function formatMoney(value, currency = 'USD') {
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function vendorInitials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
