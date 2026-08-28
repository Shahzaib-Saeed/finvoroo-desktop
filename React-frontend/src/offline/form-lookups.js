import { toast } from 'sonner';
import { isOnline } from './connectivity';
import { getMeta, setMeta } from './db';
import { loadCachedLookups } from './invoices-repository';
import { prefetchInvoiceLookups } from './sync-manager';
import { DEFAULT_LINE_COLUMNS } from '@/pages/accounting/invoices/invoice-template-constants';

/**
 * Persist form-options masters after a successful online load.
 */
export async function cacheOnlineFormLookups(companyId, data) {
  if (!companyId || !data) return;
  const offlineEnabled = Boolean(data.company?.offline_sync_enabled);
  await setMeta(companyId, 'offline_sync_enabled', offlineEnabled);
  if (offlineEnabled) {
    await prefetchInvoiceLookups(companyId, data);
  }
}

/**
 * Try to hydrate lookups from Dexie when offline.
 * @returns {Promise<object|null>}
 */
export async function tryHydrateOfflineLookups(companyId, { requireParty = 'any' } = {}) {
  if (!companyId || isOnline()) return null;
  const enabled = await getMeta(companyId, 'offline_sync_enabled', false);
  if (!enabled) return null;
  const cached = await loadCachedLookups(companyId);
  const hasCustomers = cached.customers?.length > 0;
  const hasVendors = cached.vendors?.length > 0;
  const hasProducts = cached.products?.length > 0;
  if (!hasProducts && !hasCustomers && !hasVendors) return null;
  if (requireParty === 'customer' && !hasCustomers && !hasProducts) return null;
  if (requireParty === 'vendor' && !hasVendors && !hasProducts) return null;

  return {
    ...cached,
    line_columns: cached.line_columns?.length ? cached.line_columns : DEFAULT_LINE_COLUMNS,
    company: {
      ...(cached.company || {}),
      offline_sync_enabled: true,
    },
  };
}

export function offlineCustomerContextFromCache(customer) {
  if (!customer) return null;
  const bill = [
    customer.bill_address1,
    customer.bill_address2,
    [customer.bill_city, customer.bill_state, customer.bill_postal_code].filter(Boolean).join(', '),
    customer.bill_country,
  ]
    .filter(Boolean)
    .join('\n');
  return {
    name: customer.name,
    email: customer.email,
    contact_person: customer.contact_person || customer.name || '',
    currency: customer.currency,
    billing_address: bill || customer.billing_address || '',
    billing_address_display:
      bill || customer.billing_address_display || customer.billing_address || '',
    shipping_address: customer.shipping_address || bill || '',
    payment_terms_type: customer.payment_terms_type || 'net_days',
    payment_terms_days: customer.payment_terms_days ?? 30,
    payment_terms_fixed_day: customer.payment_terms_fixed_day ?? '',
    invoice_template_id: customer.invoice_template_id || null,
  };
}

export function toastOfflineConversionBlocked(targetLabel = 'document') {
  toast.error(
    `Converting to a ${targetLabel} needs a connection. Create a blank ${targetLabel} offline instead, or reconnect and try again.`,
  );
}

export function toastOfflineLookups(message = 'Working offline — using cached masters') {
  toast.message(message);
}

/** Cache expense picker accounts for offline create. */
export async function cacheExpenseFormOptions(companyId, {
  vendors = [],
  expenseAccounts = [],
  paymentAccounts = [],
  currencies = [],
  baseCurrency = 'USD',
  multiCurrency = false,
  customFieldDefinitions = [],
} = {}) {
  if (!companyId) return;
  const enabled = await getMeta(companyId, 'offline_sync_enabled', false);
  if (!enabled) return;
  await setMeta(companyId, 'expense_form_options', {
    vendors,
    expenseAccounts,
    paymentAccounts,
    currencies,
    baseCurrency,
    multiCurrency,
    customFieldDefinitions,
  });
  if (vendors.length) {
    await prefetchInvoiceLookups(companyId, { vendors, company: { offline_sync_enabled: true } });
  }
}

export async function loadCachedExpenseFormOptions(companyId) {
  if (!companyId) return null;
  const enabled = await getMeta(companyId, 'offline_sync_enabled', false);
  if (!enabled) return null;
  const cached = await getMeta(companyId, 'expense_form_options', null);
  if (!cached) {
    // Fall back to vendor list from Dexie masters only.
    const masters = await loadCachedLookups(companyId);
    if (!masters.vendors?.length) return null;
    return {
      vendors: masters.vendors,
      expenseAccounts: [],
      paymentAccounts: [],
      currencies: [masters.base_currency || 'USD'],
      baseCurrency: masters.base_currency || 'USD',
      multiCurrency: false,
      customFieldDefinitions: [],
    };
  }
  return cached;
}

/**
 * When a list API fails offline, return local pending drafts (or null).
 */
export async function tryLoadOfflineDocumentList(companyId, entity, {
  search = '',
  status = 'all',
} = {}) {
  if (!companyId || isOnline()) return null;
  const enabled = await getMeta(companyId, 'offline_sync_enabled', false);
  if (!enabled) return null;
  const { listOfflineDocuments } = await import('./documents-repository');
  let local = await listOfflineDocuments(companyId, entity);
  if (search) {
    const q = String(search).toLowerCase();
    local = local.filter((row) =>
      [
        row.quote_number,
        row.po_number,
        row.bill_number,
        row.invoice_number,
        row.reference,
        row.customer?.name,
        row.vendor?.name,
        row.description,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }
  if (status && status !== 'all') {
    local = local.filter((row) => row.status === status);
  }
  return local;
}
