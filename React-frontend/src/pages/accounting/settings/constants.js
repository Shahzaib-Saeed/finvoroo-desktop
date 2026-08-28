import {
  DEFAULT_DOCUMENT_FOOTER_PAGES,
  normalizeDocumentFooterPages,
  companyDocumentFooterFor,
} from '../lib/documentFooter';

export {
  DEFAULT_DOCUMENT_FOOTER_PAGES,
  normalizeDocumentFooterPages,
  companyDocumentFooterFor,
};

export const SETTINGS_TABS = [
  {
    id: 'profile',
    label: 'Profile',
    title: 'Company profile',
    description: 'Legal identity, branding, fiscal calendar, and address used on documents and reports.',
    section: 'Company',
    icon: 'building',
  },
  {
    id: 'footer',
    label: 'Footer settings',
    title: 'Footer settings',
    description: 'Bank/legal footer, invoice & bill notices, and which documents show them.',
    section: 'Company',
    icon: 'footer',
  },
  {
    id: 'print',
    label: 'Print & Devices',
    title: 'Print preferences',
    description:
      'Default document layouts for invoices and POS receipts (A4, thermal, PDF), plus the Print Agent and Finvoroo Desktop downloads for this PC.',
    section: 'Company',
    icon: 'layout',
  },
  {
    id: 'inventory',
    label: 'Inventory',
    title: 'Inventory costing',
    description: 'Choose how stock value is calculated when items are sold or adjusted.',
    section: 'Accounting',
    icon: 'box',
  },
  {
    id: 'approval',
    label: 'Approvals',
    title: 'Approval workflow',
    description: 'Require manager approval before posting or sending selected document types.',
    section: 'Accounting',
    icon: 'shield',
  },
  {
    id: 'posting',
    label: 'Posting',
    title: 'Posting & billing',
    description: 'Offline sync, automatic journal entries, chart visibility, and billing rules.',
    section: 'Accounting',
    icon: 'zap',
  },
  {
    id: 'portal-color',
    label: 'Portal color',
    title: 'Portal appearance',
    description: 'Accent color for buttons and highlights across this workspace.',
    section: 'Appearance',
    icon: 'palette',
  },
  {
    id: 'navigation',
    label: 'Navigation',
    title: 'Navigation layout',
    description: 'Sidebar layout and which modules appear in navigation (including POS).',
    section: 'Appearance',
    icon: 'layout',
  },
  {
    id: 'custom-fields',
    label: 'Custom fields',
    title: 'Transaction custom fields',
    description: 'Shared fields for job orders, quotes, orders, expenses, invoices, and bills.',
    section: 'System',
    icon: 'fields',
  },
];

export const APPROVAL_GROUPS = {
  'Sales & receivables': ['invoice', 'payment'],
  'Purchasing & payables': ['purchase_order', 'bill', 'bill_payment', 'vendor', 'vendor_credit'],
  'Banking & cash': ['transfer', 'deposit', 'withdrawal'],
  'Expenses & inventory': ['expense', 'recurring_expense', 'stock_adjustment'],
};

export const INVENTORY_MODELS = [
  { value: 'fifo', label: 'FIFO (First In, First Out)' },
  { value: 'lifo', label: 'LIFO (Last In, First Out)' },
  { value: 'average', label: 'Average Cost' },
];

export const PORTAL_COLORS = [
  { value: 'blue', label: 'Blue (default)' },
  { value: 'green', label: 'Green' },
  { value: 'orange', label: 'Orange' },
  { value: 'pink', label: 'Pink' },
  { value: 'purple', label: 'Purple' },
];

export const CURRENCIES = [
  { code: 'USD', label: 'USD — US Dollar' },
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'GBP', label: 'GBP — British Pound' },
  { code: 'PKR', label: 'PKR — Pakistani Rupee' },
  { code: 'AED', label: 'AED — UAE Dirham' },
  { code: 'SAR', label: 'SAR — Saudi Riyal' },
  { code: 'INR', label: 'INR — Indian Rupee' },
  { code: 'CAD', label: 'CAD — Canadian Dollar' },
  { code: 'AUD', label: 'AUD — Australian Dollar' },
];

const PORTAL_COLOR_STORAGE_KEY = 'appColor';

export function readPortalColor() {
  if (typeof window === 'undefined') return 'blue';
  try {
    const stored = localStorage.getItem(PORTAL_COLOR_STORAGE_KEY);
    if (stored && PORTAL_COLORS.some((c) => c.value === stored)) return stored;
  } catch {
    // ignore
  }
  const attr = document.documentElement.getAttribute('data-color-theme');
  if (attr && PORTAL_COLORS.some((c) => c.value === attr)) return attr;
  return 'blue';
}

export function applyPortalColor(color) {
  const value = PORTAL_COLORS.some((c) => c.value === color) ? color : 'blue';
  if (typeof window === 'undefined') return value;
  try {
    localStorage.setItem(PORTAL_COLOR_STORAGE_KEY, value);
  } catch {
    // ignore
  }
  document.documentElement.setAttribute('data-color-theme', value);
  return value;
}

export const DOCUMENT_FOOTER_PAGE_OPTIONS = [
  {
    key: 'invoice',
    label: 'Invoices',
    description: 'Customer invoices (view, print, and payment details field).',
  },
  {
    key: 'bill',
    label: 'Bills',
    description: 'Vendor bills / purchase invoices.',
  },
  {
    key: 'payment_receipt',
    label: 'Payment receipts',
    description: 'Customer payment receipts.',
  },
  {
    key: 'credit_note',
    label: 'Credit notes',
    description: 'Customer credit notes.',
  },
  {
    key: 'bill_payment',
    label: 'Bill payments',
    description: 'Vendor bill payment records.',
  },
];

export function mapCompanyToFooterForm(company = {}) {
  return {
    document_footer: company.document_footer ?? '',
    document_footer_pages: normalizeDocumentFooterPages(company.document_footer_pages),
    document_invoice_notice: company.document_invoice_notice ?? '',
    document_bill_notice: company.document_bill_notice ?? '',
    document_closing_message: company.document_closing_message ?? '',
    document_signoff: company.document_signoff ?? '',
  };
}

export function mapCompanyToProfileForm(company = {}) {
  return {
    name: company.name ?? '',
    industry: company.industry ?? '',
    industry_key: company.industry_key ?? 'universal',
    industry_label: company.industry_label ?? company.industry ?? 'Universal',
    tax_id: company.tax_id ?? '',
    registration_number: company.registration_number ?? '',
    fiscal_year_start: company.fiscal_year_start?.slice?.(0, 10) ?? company.fiscal_year_start ?? '',
    fiscal_year_end: company.fiscal_year_end?.slice?.(0, 10) ?? company.fiscal_year_end ?? '',
    email: company.email ?? '',
    phone: company.phone ?? '',
    currency: company.currency ?? 'USD',
    timezone: company.timezone ?? 'UTC',
    multi_currency_enabled: !!company.multi_currency_enabled,
    address_line1: company.address_line1 ?? '',
    address_line2: company.address_line2 ?? '',
    city: company.city ?? '',
    state: company.state ?? '',
    postal_code: company.postal_code ?? '',
    country: company.country ?? '',
  };
}

/** Prefer field-level API validation text over the generic "Validation failed." message. */
export function getSettingsApiErrorMessage(err, fallback = 'Save failed.') {
  const data = err?.response?.data;
  if (!data) return fallback;
  const errors = data.errors;
  if (errors && typeof errors === 'object') {
    const parts = Object.values(errors).flat().filter(Boolean);
    if (parts.length) return parts.join(' ');
  }
  return data.message || fallback;
}

export function buildProfileFormData(form, logoFile) {
  const fd = new FormData();
  fd.append('name', form.name);
  fd.append('industry', form.industry || '');
  fd.append('tax_id', form.tax_id || '');
  fd.append('registration_number', form.registration_number || '');
  fd.append('fiscal_year_start', form.fiscal_year_start || '');
  fd.append('fiscal_year_end', form.fiscal_year_end || '');
  fd.append('email', form.email || '');
  fd.append('phone', form.phone || '');
  fd.append('currency', form.currency || 'USD');
  fd.append('timezone', form.timezone || 'UTC');
  fd.append('multi_currency_enabled', form.multi_currency_enabled ? '1' : '0');
  fd.append('address_line1', form.address_line1 || '');
  fd.append('address_line2', form.address_line2 || '');
  fd.append('city', form.city || '');
  fd.append('state', form.state || '');
  fd.append('postal_code', form.postal_code || '');
  fd.append('country', form.country || '');
  if (logoFile) fd.append('logo', logoFile);
  return fd;
}
