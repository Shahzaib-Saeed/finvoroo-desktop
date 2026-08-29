/** Shared in-page sticky section nav (paths relative under /workspace/:id). */
export const BASE_SECTION_NAV = [
  {
    key: 'sales',
    matches: [
      '/accounting/invoices',
      '/accounting/quotations',
      '/accounting/sales-orders',
      '/accounting/delivery-notes',
      '/accounting/payments',
      '/accounting/credit-notes',
      '/accounting/customers',
      '/accounting/pos',
    ],
    links: [
      { title: 'Customers', path: '/accounting/customers', permission: 'customers.view' },
      { title: 'Invoices', path: '/accounting/invoices', permission: 'invoices.view' },
      { title: 'Create Invoice', path: '/accounting/invoices/create', permission: 'invoices.create' },
      { title: 'Quotations', path: '/accounting/quotations', permission: 'quotations.view' },
      { title: 'Sales Orders', path: '/accounting/sales-orders', permission: 'sales_orders.view' },
      { title: 'Delivery Notes', path: '/accounting/delivery-notes', permission: 'delivery_notes.view' },
      { title: 'Receipts', path: '/accounting/payments', permission: 'payments.view' },
      { title: 'Credit Notes', path: '/accounting/credit-notes', permission: 'credit_notes.view' },
      {
        title: 'Point of Sale',
        path: '/accounting/pos',
        permission: 'pos.view',
        feature: 'pos_menu',
      },
    ],
  },
  {
    key: 'purchases',
    matches: [
      '/accounting/bills',
      '/accounting/purchase-orders',
      '/accounting/bill-payments',
      '/accounting/vendor-credits',
      '/accounting/vendors',
    ],
    links: [
      { title: 'Vendors', path: '/accounting/vendors', permission: 'vendors.view' },
      { title: 'Bills', path: '/accounting/bills', permission: 'bills.view' },
      { title: 'Create Bill', path: '/accounting/bills/create', permission: 'bills.create' },
      {
        title: 'Purchase Orders',
        path: '/accounting/purchase-orders',
        permission: 'purchase_orders.view',
      },
      { title: 'Bill Payments', path: '/accounting/bill-payments', permission: 'bill_payments.view' },
      { title: 'Debit Notes', path: '/accounting/vendor-credits', permission: 'vendor_credits.view' },
    ],
  },
  {
    key: 'job-orders',
    matches: ['/accounting/job-orders'],
    links: [
      { title: 'Jobs', path: '/accounting/job-orders', permission: 'job_orders.view' },
      { title: 'Create job', path: '/accounting/job-orders/create', permission: 'job_orders.create' },
    ],
  },
  {
    key: 'inventory',
    matches: ['/accounting/inventory', '/accounting/products', '/pharmacy'],
    links: [
      { title: 'Products', path: '/accounting/products', permission: 'products.view' },
      { title: 'Inventory', path: '/accounting/inventory', permission: 'inventory_dashboard.view' },
      {
        title: 'Stock Adjustments',
        path: '/accounting/inventory/adjustments',
        permission: 'inventory_adjustments.view',
      },
      {
        title: 'Stock Transfers',
        path: '/accounting/inventory/stock-transfers',
        permission: 'inventory_transfers.view',
      },
      { title: 'Warehouses', path: '/accounting/inventory/warehouses', permission: 'warehouses.view' },
    ],
  },
  {
    key: 'banking',
    matches: ['/accounting/bank-accounts', '/accounting/transfers'],
    links: [
      { title: 'Bank Accounts', path: '/accounting/bank-accounts', permission: 'bank_accounts.view' },
      { title: 'Transfers', path: '/accounting/transfers', permission: 'transfers.view' },
    ],
  },
  {
    key: 'reports',
    matches: ['/accounting/reports', '/accounting/inventory/reports'],
    links: [{ title: 'Reports Hub', path: '/accounting/reports', permission: 'reports.view' }],
    groups: [
      {
        title: 'Financial',
        links: [
          { title: 'Financial Summary', path: '/accounting/reports/financial-summary' },
          { title: 'Category Sales & Purchases', path: '/accounting/reports/category-trading' },
          { title: 'Income Statement', path: '/accounting/reports/income-statement' },
          { title: 'Profit & Loss', path: '/accounting/reports/profit-loss' },
          { title: 'P&L by Job', path: '/accounting/reports/profit-loss-by-job' },
          { title: 'Balance Sheet', path: '/accounting/reports/balance-sheet' },
          { title: 'Cash Flow', path: '/accounting/reports/cash-flow' },
        ],
      },
      {
        title: 'Ledger',
        links: [
          { title: 'General Ledger', path: '/accounting/reports/general-ledger' },
          { title: 'Trial Balance', path: '/accounting/reports/trial-balance' },
          { title: 'Account Balances', path: '/accounting/reports/account-balances' },
          { title: 'Account Statement', path: '/accounting/reports/account-statement' },
          { title: 'Customer Ledger', path: '/accounting/reports/customer-ledger' },
          { title: 'Vendor Ledger', path: '/accounting/reports/vendor-ledger' },
        ],
      },
      {
        title: 'Receivables',
        links: [
          { title: 'Customer Ledger', path: '/accounting/reports/customer-ledger' },
          { title: 'Accounts Receivable', path: '/accounting/reports/accounts-receivable' },
          { title: 'Aged Receivables', path: '/accounting/reports/aged-receivables' },
        ],
      },
      {
        title: 'Payables',
        links: [
          { title: 'Vendor Ledger', path: '/accounting/reports/vendor-ledger' },
          { title: 'Accounts Payable', path: '/accounting/reports/accounts-payable' },
          { title: 'Aged Payables', path: '/accounting/reports/aged-payables' },
        ],
      },
      {
        title: 'Inventory',
        links: [
          { title: 'Inventory Activity', path: '/accounting/inventory/reports/movements' },
          { title: 'Category Sales & Purchases', path: '/accounting/reports/category-trading' },
          { title: 'Stock Summary', path: '/accounting/inventory/reports/stock-summary' },
          { title: 'All Inventory Reports', path: '/accounting/inventory/reports' },
        ],
      },
      {
        title: 'Compliance',
        links: [
          { title: 'VAT / Tax Summary', path: '/accounting/reports/tax-summary' },
          { title: 'Audit Logs', path: '/accounting/audit-logs' },
          { title: 'Document Explorer', path: '/accounting/reports/document-explorer' },
        ],
      },
    ],
  },
];

export function cloneSections(sections) {
  return (sections ?? []).map((section) => ({
    ...section,
    links: section.links ? section.links.map((l) => ({ ...l })) : undefined,
    groups: section.groups
      ? section.groups.map((g) => ({
          ...g,
          links: (g.links ?? []).map((l) => ({ ...l })),
        }))
      : undefined,
    matches: section.matches ? [...section.matches] : undefined,
  }));
}
