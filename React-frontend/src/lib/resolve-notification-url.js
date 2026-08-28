const REDIRECT_SLUGS = {
  expenses: 'accounting/expenses',
  bills: 'accounting/bills',
  'purchase-orders': 'accounting/purchase-orders',
  invoices: 'accounting/invoices',
  payments: 'accounting/payments',
  'bill-payments': 'accounting/bill-payments',
  transfers: 'accounting/transfers',
  deposits: 'accounting/deposits',
  withdrawals: 'accounting/withdrawals',
  'vendor-credits': 'accounting/vendor-credits',
  'recurring-expenses': 'accounting/recurring-expenses',
};

const REDIRECT_ID_PARAMS = [
  'expense_id',
  'bill_id',
  'po_id',
  'invoice_id',
  'payment_id',
  'bill_payment_id',
  'transfer_id',
  'deposit_id',
  'withdrawal_id',
  'vendor_credit_id',
  'recurring_expense_id',
];

/**
 * Normalize legacy Blade/dashboard notification links to React SPA paths.
 */
export function resolveNotificationUrl(url, notification) {
  if (!url || url === '#') return null;

  if (url.startsWith('/workspace/') || url.startsWith('/companies')) {
    return url;
  }

  const companyId = notification?.company_id;

  try {
    const parsed = new URL(url, window.location.origin);
    const redirect = parsed.searchParams.get('redirect');

    if (redirect && companyId) {
      const basePath = REDIRECT_SLUGS[redirect];
      if (basePath) {
        for (const param of REDIRECT_ID_PARAMS) {
          const recordId = parsed.searchParams.get(param);
          if (recordId) {
            return `/workspace/${companyId}/${basePath}/${recordId}`;
          }
        }
        return `/workspace/${companyId}/${basePath}`;
      }
    }

    const path = parsed.pathname;
    const patterns = [
      { re: /\/accounting\/invoices\/(\d+)/i, build: (id) => `/workspace/${companyId}/accounting/invoices/${id}` },
      { re: /\/accounting\/bills\/(\d+)/i, build: (id) => `/workspace/${companyId}/accounting/bills/${id}` },
      { re: /\/accounting\/customers\/(\d+)/i, build: (id) => `/workspace/${companyId}/accounting/customers/${id}` },
      { re: /\/employee/i, build: () => `/workspace/${companyId}/employee` },
      { re: /\/companies/i, build: () => '/companies' },
    ];

    if (companyId) {
      for (const { re, build } of patterns) {
        const match = path.match(re);
        if (match) {
          return build(match[1]);
        }
      }
    }

    if (parsed.origin === window.location.origin) {
      return parsed.pathname + parsed.search + parsed.hash;
    }

    return url;
  } catch {
    return url;
  }
}
