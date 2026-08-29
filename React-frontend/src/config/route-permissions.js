/**
 * Maps workspace route paths (same `:param` syntax as app-routing-setup.jsx)
 * to the permission slug required to view them. Consumed by
 * <WorkspacePermissionGate> (layouts/workspace/layout.jsx) via react-router's
 * `matchPath`, so each entry's `pattern` must exactly match a route declared
 * there. A path with no entry here is always allowed (opt-in gating, same
 * rule as filter-menu-by-permission.js) — this list only needs to grow as
 * pages get mapped, never shrink to stay "safe".
 *
 * This is a UX guard (avoid rendering a dead page), not the security
 * boundary — the backend's EnforceWorkspaceApiPermission is what actually
 * blocks unauthorized data access regardless of what renders here.
 */
export const ROUTE_PERMISSIONS = [
  { pattern: '/workspace/:id', permission: 'dashboard.view' },

  { pattern: '/workspace/:id/accounting/invoices', permission: 'invoices.view' },
  { pattern: '/workspace/:id/accounting/pos', permission: 'pos.view' },
  { pattern: '/workspace/:id/accounting/invoices/create', permission: 'invoices.create' },
  { pattern: '/workspace/:id/accounting/invoices/:invoiceId', permission: 'invoices.view' },
  { pattern: '/workspace/:id/accounting/invoices/:invoiceId/edit', permission: 'invoices.edit' },

  { pattern: '/workspace/:id/accounting/quotations', permission: 'quotations.view' },
  { pattern: '/workspace/:id/accounting/quotations/create', permission: 'quotations.create' },
  { pattern: '/workspace/:id/accounting/quotations/:quotationId', permission: 'quotations.view' },
  { pattern: '/workspace/:id/accounting/quotations/:quotationId/edit', permission: 'quotations.edit' },

  { pattern: '/workspace/:id/accounting/sales-orders', permission: 'sales_orders.view' },
  { pattern: '/workspace/:id/accounting/sales-orders/create', permission: 'sales_orders.create' },
  { pattern: '/workspace/:id/accounting/sales-orders/:salesOrderId', permission: 'sales_orders.view' },
  { pattern: '/workspace/:id/accounting/sales-orders/:salesOrderId/edit', permission: 'sales_orders.edit' },

  { pattern: '/workspace/:id/accounting/delivery-notes', permission: 'delivery_notes.view' },
  { pattern: '/workspace/:id/accounting/delivery-notes/create', permission: 'delivery_notes.create' },
  { pattern: '/workspace/:id/accounting/delivery-notes/:deliveryNoteId', permission: 'delivery_notes.view' },

  { pattern: '/workspace/:id/accounting/job-orders', permission: 'job_orders.view' },
  { pattern: '/workspace/:id/accounting/job-orders/dashboard', permission: 'job_orders.view' },
  { pattern: '/workspace/:id/accounting/job-orders/create', permission: 'job_orders.create' },
  { pattern: '/workspace/:id/accounting/job-orders/:jobOrderId', permission: 'job_orders.view' },
  { pattern: '/workspace/:id/accounting/job-orders/:jobOrderId/edit', permission: 'job_orders.edit' },

  { pattern: '/workspace/:id/accounting/payments', permission: 'payments.view' },
  { pattern: '/workspace/:id/accounting/payments/:paymentId', permission: 'payments.view' },
  { pattern: '/workspace/:id/accounting/payments/:paymentId/edit', permission: 'payments.edit' },

  { pattern: '/workspace/:id/accounting/credit-notes', permission: 'credit_notes.view' },
  { pattern: '/workspace/:id/accounting/credit-notes/:creditNoteId', permission: 'credit_notes.view' },
  { pattern: '/workspace/:id/accounting/credit-notes/:creditNoteId/edit', permission: 'credit_notes.edit' },

  { pattern: '/workspace/:id/accounting/bills', permission: 'bills.view' },
  { pattern: '/workspace/:id/accounting/bills/create', permission: 'bills.create' },
  { pattern: '/workspace/:id/accounting/bills/:billId', permission: 'bills.view' },
  { pattern: '/workspace/:id/accounting/bills/:billId/edit', permission: 'bills.edit' },

  { pattern: '/workspace/:id/accounting/purchase-orders', permission: 'purchase_orders.view' },
  { pattern: '/workspace/:id/accounting/purchase-orders/create', permission: 'purchase_orders.create' },
  { pattern: '/workspace/:id/accounting/purchase-orders/:purchaseOrderId', permission: 'purchase_orders.view' },
  { pattern: '/workspace/:id/accounting/purchase-orders/:purchaseOrderId/edit', permission: 'purchase_orders.view' },

  { pattern: '/workspace/:id/accounting/bill-payments', permission: 'bill_payments.view' },
  { pattern: '/workspace/:id/accounting/bill-payments/create', permission: 'bill_payments.create' },
  { pattern: '/workspace/:id/accounting/bill-payments/:paymentId', permission: 'bill_payments.view' },

  { pattern: '/workspace/:id/accounting/vendor-credits', permission: 'vendor_credits.view' },
  { pattern: '/workspace/:id/accounting/vendor-credits/create', permission: 'vendor_credits.create' },
  { pattern: '/workspace/:id/accounting/vendor-credits/:vendorCreditId', permission: 'vendor_credits.view' },
  { pattern: '/workspace/:id/accounting/vendor-credits/:vendorCreditId/edit', permission: 'vendor_credits.view' },

  { pattern: '/workspace/:id/accounting/customers', permission: 'customers.view' },
  { pattern: '/workspace/:id/accounting/customers/create', permission: 'customers.create' },
  { pattern: '/workspace/:id/accounting/customers/:customerId', permission: 'customers.view' },
  { pattern: '/workspace/:id/accounting/customers/:customerId/edit', permission: 'customers.edit' },

  { pattern: '/workspace/:id/accounting/vendors', permission: 'vendors.view' },
  { pattern: '/workspace/:id/accounting/vendors/create', permission: 'vendors.create' },
  { pattern: '/workspace/:id/accounting/vendors/:vendorId', permission: 'vendors.view' },
  { pattern: '/workspace/:id/accounting/vendors/:vendorId/edit', permission: 'vendors.edit' },

  { pattern: '/workspace/:id/accounting/products', permission: 'products.view' },
  { pattern: '/workspace/:id/accounting/products/create', permission: 'products.create' },
  { pattern: '/workspace/:id/accounting/products/:productId', permission: 'products.view' },
  { pattern: '/workspace/:id/accounting/products/:productId/edit', permission: 'products.edit' },

  { pattern: '/workspace/:id/accounting/taxes', permission: 'taxes.view' },
  { pattern: '/workspace/:id/accounting/chart-of-accounts', permission: 'chart_of_accounts.view' },

  { pattern: '/workspace/:id/accounting/journal', permission: 'journal_entries.view' },
  { pattern: '/workspace/:id/accounting/journal/create', permission: 'journal_entries.create' },
  { pattern: '/workspace/:id/accounting/journal/:journalId', permission: 'journal_entries.view' },
  { pattern: '/workspace/:id/accounting/journal/:journalId/edit', permission: 'journal_entries.edit' },

  { pattern: '/workspace/:id/accounting/fixed-assets', permission: 'fixed_assets.view' },
  { pattern: '/workspace/:id/accounting/fixed-assets/create', permission: 'fixed_assets.create' },
  { pattern: '/workspace/:id/accounting/fixed-assets/reports/asset-register', permission: 'fixed_assets.view' },
  { pattern: '/workspace/:id/accounting/fixed-assets/reports/depreciation-schedule', permission: 'fixed_assets.view' },
  { pattern: '/workspace/:id/accounting/fixed-assets/reports/net-book-value', permission: 'fixed_assets.view' },
  { pattern: '/workspace/:id/accounting/fixed-assets/:assetId', permission: 'fixed_assets.view' },
  { pattern: '/workspace/:id/accounting/fixed-assets/:assetId/edit', permission: 'fixed_assets.edit' },
  { pattern: '/workspace/:id/accounting/fixed-assets/:assetId/audit-trail', permission: 'fixed_assets.view' },

  { pattern: '/workspace/:id/accounting/expenses', permission: 'expenses.view' },
  { pattern: '/workspace/:id/accounting/expenses/create', permission: 'expenses.create' },
  { pattern: '/workspace/:id/accounting/expenses/:expenseId', permission: 'expenses.view' },
  { pattern: '/workspace/:id/accounting/expenses/:expenseId/edit', permission: 'expenses.view' },

  { pattern: '/workspace/:id/accounting/recurring-expenses', permission: 'recurring_expenses.view' },
  { pattern: '/workspace/:id/accounting/recurring-expenses/create', permission: 'recurring_expenses.create' },
  { pattern: '/workspace/:id/accounting/recurring-expenses/:recurringId/edit', permission: 'recurring_expenses.edit' },

  { pattern: '/workspace/:id/accounting/bank-accounts', permission: 'bank_accounts.view' },
  { pattern: '/workspace/:id/accounting/bank-accounts/create', permission: 'bank_accounts.create' },
  { pattern: '/workspace/:id/accounting/bank-accounts/:bankAccountId/edit', permission: 'bank_accounts.edit' },

  { pattern: '/workspace/:id/accounting/transfers', permission: 'transfers.view' },
  { pattern: '/workspace/:id/accounting/transfers/create', permission: 'transfers.create' },

  { pattern: '/workspace/:id/accounting/inventory', permission: 'inventory_dashboard.view' },

  { pattern: '/workspace/:id/accounting/inventory/warehouses', permission: 'warehouses.view' },
  { pattern: '/workspace/:id/accounting/inventory/warehouses/create', permission: 'warehouses.create' },
  { pattern: '/workspace/:id/accounting/inventory/warehouses/:warehouseId/stock', permission: 'warehouses.view' },
  { pattern: '/workspace/:id/accounting/inventory/warehouses/:warehouseId/edit', permission: 'warehouses.edit' },

  { pattern: '/workspace/:id/accounting/inventory/adjustments', permission: 'inventory_adjustments.view' },
  { pattern: '/workspace/:id/accounting/inventory/adjustments/create', permission: 'inventory_adjustments.create' },
  { pattern: '/workspace/:id/accounting/inventory/adjustments/:adjustmentId', permission: 'inventory_adjustments.view' },
  { pattern: '/workspace/:id/accounting/inventory/adjustments/:adjustmentId/edit', permission: 'inventory_adjustments.edit' },

  { pattern: '/workspace/:id/accounting/inventory/stock-transfers', permission: 'inventory_transfers.view' },
  { pattern: '/workspace/:id/accounting/inventory/stock-transfers/create', permission: 'inventory_transfers.create' },
  { pattern: '/workspace/:id/accounting/inventory/stock-transfers/:transferId', permission: 'inventory_transfers.view' },
  { pattern: '/workspace/:id/accounting/inventory/stock-transfers/:transferId/edit', permission: 'inventory_transfers.edit' },

  { pattern: '/workspace/:id/accounting/inventory/reports', permission: 'inventory_reports.view' },
  { pattern: '/workspace/:id/accounting/inventory/reports/stock-summary', permission: 'inventory_reports.view' },
  { pattern: '/workspace/:id/accounting/inventory/reports/valuation', permission: 'inventory_reports.view' },
  { pattern: '/workspace/:id/accounting/inventory/reports/movements', permission: 'inventory_reports.view' },
  { pattern: '/workspace/:id/accounting/inventory/reports/low-stock', permission: 'inventory_reports.view' },

  { pattern: '/workspace/:id/accounting/reports', permission: 'reports.view' },
  { pattern: '/workspace/:id/accounting/reports/financial-summary', permission: 'reports.view' },
  { pattern: '/workspace/:id/accounting/reports/category-trading', permission: 'reports.view' },
  { pattern: '/workspace/:id/accounting/reports/income-statement', permission: 'reports.view' },
  { pattern: '/workspace/:id/accounting/reports/profit-loss', permission: 'reports.view' },
  { pattern: '/workspace/:id/accounting/reports/profit-loss-by-job', permission: 'reports.view' },
  { pattern: '/workspace/:id/accounting/reports/balance-sheet', permission: 'reports.view' },
  { pattern: '/workspace/:id/accounting/reports/cash-flow', permission: 'reports.view' },
  { pattern: '/workspace/:id/accounting/reports/trial-balance', permission: 'reports.view' },
  { pattern: '/workspace/:id/accounting/reports/general-ledger', permission: 'reports.view' },
  { pattern: '/workspace/:id/accounting/reports/builder', permission: 'report_definitions.create' },
  { pattern: '/workspace/:id/accounting/reports/account-balances', permission: 'reports.view' },
  { pattern: '/workspace/:id/accounting/reports/tax-summary', permission: 'reports.view' },
  { pattern: '/workspace/:id/accounting/reports/account-statement', permission: 'reports.view' },
  { pattern: '/workspace/:id/accounting/reports/accounts-payable', permission: 'reports.view' },
  { pattern: '/workspace/:id/accounting/reports/accounts-receivable', permission: 'reports.view' },
  { pattern: '/workspace/:id/accounting/reports/customer-ledger', permission: 'reports.view' },
  { pattern: '/workspace/:id/accounting/reports/customer-aging', permission: 'reports.view' },
  { pattern: '/workspace/:id/accounting/reports/aged-receivables', permission: 'reports.view' },
  { pattern: '/workspace/:id/accounting/reports/vendor-aging', permission: 'reports.view' },
  { pattern: '/workspace/:id/accounting/reports/aged-payables', permission: 'reports.view' },
  { pattern: '/workspace/:id/accounting/reports/vendor-ledger', permission: 'reports.view' },
  { pattern: '/workspace/:id/accounting/reports/document-explorer', permission: 'reports.view' },
  { pattern: '/workspace/:id/accounting/reports/document-explorer/:docType/:docId', permission: 'reports.view' },

  { pattern: '/workspace/:id/accounting/integrity-check', permission: 'accounting_overview.view' },
  { pattern: '/workspace/:id/accounting/audit-logs', permission: 'audit_logs.view' },
  { pattern: '/workspace/:id/accounting/sync-admin', permission: 'invoices.view' },
  { pattern: '/workspace/:id/accounting/backup', permission: 'backup.view' },
  { pattern: '/workspace/:id/accounting/permissions', permission: 'permissions.view' },
  { pattern: '/workspace/:id/accounting/settings', permission: 'accounting_settings.view' },

  { pattern: '/workspace/:id/pharmacy', permission: 'dashboard.view' },
  { pattern: '/workspace/:id/pharmacy/medicines', permission: 'products.view' },
  { pattern: '/workspace/:id/pharmacy/receive', permission: 'bills.create' },
  { pattern: '/workspace/:id/pharmacy/receive/:billId', permission: 'bills.view' },
  { pattern: '/workspace/:id/pharmacy/pos', permission: 'pos.view' },
  { pattern: '/workspace/:id/pharmacy/batch-expiry', permission: 'dashboard.view' },
  { pattern: '/workspace/:id/pharmacy/reports', permission: 'reports.view' },
  { pattern: '/workspace/:id/pharmacy/reports/item-sales', permission: 'reports.view' },
  { pattern: '/workspace/:id/pharmacy/reports/manufacturer-expiry', permission: 'reports.view' },
  { pattern: '/workspace/:id/pharmacy/reports/stock-valuation', permission: 'reports.view' },
  { pattern: '/workspace/:id/pharmacy/medicine-reports', permission: 'reports.view' },
  { pattern: '/workspace/:id/pharmacy/settings', permission: 'accounting_settings.view' },
  { pattern: '/workspace/:id/pharmacy/import', permission: 'bills.view' },
  { pattern: '/workspace/:id/pharmacy/purchase-entry', permission: 'bills.create' },
  { pattern: '/workspace/:id/pharmacy/loose-purchase', permission: 'bills.create' },
  { pattern: '/workspace/:id/pharmacy/loose-sale-return', permission: 'credit_notes.create' },

  { pattern: '/workspace/:id/accounting/invoice-templates', permission: 'accounting_settings.view' },
  { pattern: '/workspace/:id/accounting/invoice-templates/:templateId/edit', permission: 'accounting_settings.edit' },

  { pattern: '/workspace/:id/accounting/document-output/designer', permission: 'accounting_settings.view' },
  { pattern: '/workspace/:id/accounting/document-output/designer/:layoutId/edit', permission: 'accounting_settings.edit' },

  { pattern: '/workspace/:id/production-orders', permission: 'production_orders.view' },
  { pattern: '/workspace/:id/production-orders/create', permission: 'production_orders.create' },
  { pattern: '/workspace/:id/production-orders/:orderId', permission: 'production_orders.view' },
  { pattern: '/workspace/:id/production-orders/:orderId/edit', permission: 'production_orders.edit' },

  { pattern: '/workspace/:id/employee', permission: 'employees.view' },
  { pattern: '/workspace/:id/employee/create', permission: 'employees.create' },
];
