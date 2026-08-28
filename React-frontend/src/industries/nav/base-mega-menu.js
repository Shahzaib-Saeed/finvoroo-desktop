import { resolveMegaPath } from './paths';

/** Shared mega-menu column definitions (paths use :id until resolved). */
export function getBaseMegaMenuColumns(companyId) {
  const p = (path) => resolveMegaPath(path, companyId);

  return [
    {
      sections: [
        {
          id: 'core',
          title: 'Core & system',
          links: [
            { title: 'Dashboard', path: p('/workspace/:id'), permission: 'dashboard.view' },
            { title: 'Help & Support', path: p('/workspace/:id/help') },
            {
              title: 'Roles & Access Control',
              path: p('/workspace/:id/accounting/permissions'),
              permission: 'permissions.view',
            },
          ],
        },
        {
          id: 'setup',
          title: 'Accounting setup',
          links: [
            {
              title: 'Chart of Accounts',
              path: p('/workspace/:id/accounting/chart-of-accounts'),
              permission: 'chart_of_accounts.view',
            },
            {
              title: 'System Settings',
              path: p('/workspace/:id/accounting/settings'),
              permission: 'accounting_settings.view',
            },
            {
              title: 'Custom Fields',
              path: p('/workspace/:id/accounting/settings?tab=custom-fields'),
              permission: 'accounting_settings.view',
            },
            {
              title: 'Invoice Templates',
              path: p('/workspace/:id/accounting/invoice-templates'),
              permission: 'accounting_settings.view',
            },
            {
              title: 'Invoice Print Designer',
              path: p('/workspace/:id/accounting/document-output/designer'),
              permission: 'accounting_settings.view',
            },
            {
              title: 'Approvals',
              path: p('/workspace/:id/accounting/approvals'),
              permission: 'approvals.view',
            },
            {
              title: 'Audit Logs',
              path: p('/workspace/:id/accounting/audit-logs'),
              permission: 'audit_logs.view',
            },
            {
              title: 'System Health Check',
              path: p('/workspace/:id/accounting/integrity-check'),
              permission: 'accounting_overview.view',
            },
            {
              title: 'Offline Sync',
              path: p('/workspace/:id/accounting/sync-admin'),
              permission: 'invoices.view',
            },
            {
              title: 'Data Backup',
              path: p('/workspace/:id/accounting/backup'),
              permission: 'backup.view',
            },
          ],
        },
      ],
    },
    {
      sections: [
        {
          id: 'sales',
          title: 'Sales & receivables',
          links: [
            {
              title: 'Point of Sale',
              path: p('/workspace/:id/accounting/pos'),
              permission: 'pos.view',
              feature: 'pos_menu',
            },
            {
              title: 'All Invoices',
              path: p('/workspace/:id/accounting/invoices'),
              permission: 'invoices.view',
            },
            {
              title: 'Create Invoice',
              path: p('/workspace/:id/accounting/invoices/create'),
              permission: 'invoices.create',
              shortcut: 'mod+n',
              highlight: 'action',
            },
            {
              title: 'Quotations',
              path: p('/workspace/:id/accounting/quotations'),
              permission: 'quotations.view',
            },
            {
              title: 'Sales Orders',
              path: p('/workspace/:id/accounting/sales-orders'),
              permission: 'sales_orders.view',
            },
            {
              title: 'Delivery Notes',
              path: p('/workspace/:id/accounting/delivery-notes'),
              permission: 'delivery_notes.view',
            },
            {
              title: 'Customer Payments',
              path: p('/workspace/:id/accounting/payments'),
              permission: 'payments.view',
            },
            {
              title: 'Credit Notes',
              path: p('/workspace/:id/accounting/credit-notes'),
              permission: 'credit_notes.view',
            },
            {
              title: 'Customer Aging Analysis',
              path: p('/workspace/:id/accounting/reports/aged-receivables'),
              permission: 'reports.view',
            },
          ],
        },
        {
          id: 'people',
          title: 'Customers & team',
          links: [
            {
              title: 'Customers Directory',
              path: p('/workspace/:id/accounting/customers'),
              permission: 'customers.view',
            },
            {
              title: 'All Employees',
              path: p('/workspace/:id/employee'),
              permission: 'employees.view',
            },
            {
              title: 'Add Team Member',
              path: p('/workspace/:id/employee/create'),
              permission: 'employees.create',
            },
          ],
        },
      ],
    },
    {
      sections: [
        {
          id: 'purchasing',
          title: 'Purchasing & payables',
          links: [
            {
              title: 'Vendors Directory',
              path: p('/workspace/:id/accounting/vendors'),
              permission: 'vendors.view',
            },
            {
              title: 'Purchase Orders',
              path: p('/workspace/:id/accounting/purchase-orders'),
              permission: 'purchase_orders.view',
            },
            {
              title: 'All Bills & Expenses',
              path: p('/workspace/:id/accounting/bills'),
              permission: 'bills.view',
            },
            {
              title: 'Create Bill',
              path: p('/workspace/:id/accounting/bills/create'),
              permission: 'bills.create',
            },
            {
              title: 'Bill Payments',
              path: p('/workspace/:id/accounting/bill-payments'),
              permission: 'bill_payments.view',
            },
            {
              title: 'Vendor Credits',
              path: p('/workspace/:id/accounting/vendor-credits'),
              permission: 'vendor_credits.view',
            },
            {
              title: 'Vendor Ledger',
              path: p('/workspace/:id/accounting/reports/vendor-ledger'),
              permission: 'reports.view',
            },
            {
              title: 'Aged Payables',
              path: p('/workspace/:id/accounting/reports/aged-payables'),
              permission: 'reports.view',
            },
          ],
        },
        {
          id: 'inventory',
          title: 'Inventory & operations',
          links: [
            {
              title: 'Stock Overview',
              path: p('/workspace/:id/accounting/inventory'),
              permission: 'inventory_dashboard.view',
            },
            {
              title: 'Warehouses',
              path: p('/workspace/:id/accounting/inventory/warehouses'),
              permission: 'warehouses.view',
            },
            {
              title: 'Stock Transfers',
              path: p('/workspace/:id/accounting/inventory/stock-transfers'),
              permission: 'inventory_transfers.view',
            },
            {
              title: 'Stock Adjustments',
              path: p('/workspace/:id/accounting/inventory/adjustments'),
              permission: 'inventory_adjustments.view',
            },
            {
              title: 'Products & Services Catalog',
              path: p('/workspace/:id/accounting/products'),
              permission: 'products.view',
            },
            {
              title: 'Job Orders',
              path: p('/workspace/:id/accounting/job-orders/dashboard'),
              permission: 'job_orders.view',
            },
            {
              title: 'Create Job Order',
              path: p('/workspace/:id/accounting/job-orders/create'),
              permission: 'job_orders.create',
            },
            {
              title: 'Production Orders',
              path: p('/workspace/:id/production-orders'),
              permission: 'production_orders.view',
            },
            {
              title: 'Inventory Reports',
              path: p('/workspace/:id/accounting/inventory/reports'),
              permission: 'inventory_reports.view',
            },
            {
              title: 'Tax Rates',
              path: p('/workspace/:id/accounting/taxes'),
              permission: 'taxes.view',
            },
          ],
        },
      ],
    },
    {
      sections: [
        {
          id: 'banking',
          title: 'Banking & GL',
          links: [
            {
              title: 'Bank Accounts & Reconcile',
              path: p('/workspace/:id/accounting/bank-accounts'),
              permission: 'bank_accounts.view',
            },
            {
              title: 'Bank Transfers',
              path: p('/workspace/:id/accounting/transfers'),
              permission: 'transfers.view',
            },
            {
              title: 'Journal Entries',
              path: p('/workspace/:id/accounting/journal'),
              permission: 'journal_entries.view',
            },
            {
              title: 'New Journal Entry',
              path: p('/workspace/:id/accounting/journal/create'),
              permission: 'journal_entries.create',
            },
            {
              title: 'Fixed Assets Register',
              path: p('/workspace/:id/accounting/fixed-assets'),
              permission: 'fixed_assets.view',
            },
          ],
        },
        {
          id: 'reports',
          title: 'Financial reports',
          links: [
            {
              title: 'Reports Center Overview',
              path: p('/workspace/:id/accounting/reports'),
              permission: 'reports.view',
              emphasis: true,
            },
            {
              title: 'Profit & Loss (Income Statement)',
              path: p('/workspace/:id/accounting/reports/profit-loss'),
              permission: 'reports.view',
            },
            {
              title: 'Balance Sheet',
              path: p('/workspace/:id/accounting/reports/balance-sheet'),
              permission: 'reports.view',
            },
            {
              title: 'Cash Flow Statement',
              path: p('/workspace/:id/accounting/reports/cash-flow'),
              permission: 'reports.view',
            },
            {
              title: 'Trial Balance',
              path: p('/workspace/:id/accounting/reports/trial-balance'),
              permission: 'reports.view',
            },
            {
              title: 'General Ledger',
              path: p('/workspace/:id/accounting/reports/general-ledger'),
              permission: 'reports.view',
            },
            {
              title: 'Accounts Receivable',
              path: p('/workspace/:id/accounting/reports/accounts-receivable'),
              permission: 'reports.view',
            },
            {
              title: 'Accounts Payable',
              path: p('/workspace/:id/accounting/reports/accounts-payable'),
              permission: 'reports.view',
            },
            {
              title: 'Financial Summary',
              path: p('/workspace/:id/accounting/reports/financial-summary'),
              permission: 'reports.view',
            },
            {
              title: 'P&L by Job',
              path: p('/workspace/:id/accounting/reports/profit-loss-by-job'),
              permission: 'reports.view',
            },
          ],
        },
      ],
    },
  ];
}
