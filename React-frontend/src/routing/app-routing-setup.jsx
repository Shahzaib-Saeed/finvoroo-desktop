import { Navigate, Route, Routes } from 'react-router';
import { AuthGuard } from '@/auth/guards/auth-guard';
import { EnterpriseTrialLayout } from '@/auth/layouts/enterprise-trial-layout';
import { SignInPage } from '@/auth/pages/signin-page';
import { SignUpPage } from '@/auth/pages/signup-page';
import { VerifyEmailPage } from '@/auth/pages/verify-email-page';
import { OnboardingPage } from '@/pages/auth/OnboardingPage';
import { CompanySelectorPage } from '@/pages/auth/CompanySelectorPage';
import { Demo1Layout } from '@/layouts/demo1/layout';
import { WorkspaceLayout } from '@/layouts/workspace/layout';
import { PharmacyIndustryRoutes } from '@/industries/pharmacy/routes';
import { ErpDashboardPage } from '@/pages/dashboards/erp/erp-dashboard-page';
import { ComingSoonPage } from '@/pages/coming-soon-page';
import { CompaniesPage } from '@/pages/companies/companies-page';
import { CreateCompanyPage } from '@/pages/companies/create-company-page';
import { ProfilePage } from '@/pages/profile/profile-page';
import { WorkspaceDashboardPage } from '@/pages/workspace/workspace-dashboard-page';
import { WorkspaceComingSoonPage } from '@/pages/workspace/workspace-coming-soon-page';
import { WorkspaceHelpPage } from '@/pages/workspace/help';
import { ChartOfAccountsPage } from '@/pages/accounting/chart-of-accounts';
import { InvoicesPage } from '@/pages/accounting/invoices';
import { InvoiceShowPage } from '@/pages/accounting/invoices/show';
import { InvoiceCreatePage } from '@/pages/accounting/invoices/create';
import { InvoiceEditPage } from '@/pages/accounting/invoices/edit';
import { PosPage } from '@/pages/accounting/pos';
import { CustomersPage } from '@/pages/accounting/customers';
import { ProductsPage } from '@/pages/accounting/products';
import { ProductCreatePage } from '@/pages/accounting/products/create';
import { ProductEditPage } from '@/pages/accounting/products/edit';
import { ProductShowPage } from '@/pages/accounting/products/show';
import { CustomerCreatePage } from '@/pages/accounting/customers/create';
import { CustomerEditPage } from '@/pages/accounting/customers/edit';
import { CustomerShowPage } from '@/pages/accounting/customers/show';
import { VendorsPage } from '@/pages/accounting/vendors';
import { VendorCreatePage } from '@/pages/accounting/vendors/create';
import { VendorEditPage } from '@/pages/accounting/vendors/edit';
import { VendorShowPage } from '@/pages/accounting/vendors/show';
import { QuotationsPage } from '@/pages/accounting/quotations';
import { QuotationShowPage } from '@/pages/accounting/quotations/show';
import { QuotationCreatePage } from '@/pages/accounting/quotations/create';
import { QuotationEditPage } from '@/pages/accounting/quotations/edit';
import { DeliveryNotesPage } from '@/pages/accounting/delivery-notes';
import { DeliveryNoteCreatePage } from '@/pages/accounting/delivery-notes/create';
import { DeliveryNoteShowPage } from '@/pages/accounting/delivery-notes/show';
import { JobOrdersPage } from '@/pages/accounting/job-orders';
import { JobOrderShowPage } from '@/pages/accounting/job-orders/show';
import { JobOrderCreatePage } from '@/pages/accounting/job-orders/create';
import { JobOrderEditPage } from '@/pages/accounting/job-orders/edit';
import { SalesOrdersPage } from '@/pages/accounting/sales-orders';
import { SalesOrderShowPage } from '@/pages/accounting/sales-orders/show';
import { SalesOrderCreatePage } from '@/pages/accounting/sales-orders/create';
import { SalesOrderEditPage } from '@/pages/accounting/sales-orders/edit';
import { PaymentsPage } from '@/pages/accounting/payments';
import { PaymentShowPage } from '@/pages/accounting/payments/show';
import { PaymentEditPage } from '@/pages/accounting/payments/edit';
import { CreditNotesPage } from '@/pages/accounting/credit-notes';
import { CreditNoteShowPage } from '@/pages/accounting/credit-notes/show';
import { CreditNoteEditPage } from '@/pages/accounting/credit-notes/edit';
import { BillsPage } from '@/pages/accounting/bills';
import { BillShowPage } from '@/pages/accounting/bills/show';
import { BillCreatePage } from '@/pages/accounting/bills/create';
import { BillEditPage } from '@/pages/accounting/bills/edit';
import { PurchaseOrdersPage } from '@/pages/accounting/purchase-orders';
import { PurchaseOrderShowPage } from '@/pages/accounting/purchase-orders/show';
import { BillPaymentsPage } from '@/pages/accounting/bill-payments';
import { BillPaymentCreatePage } from '@/pages/accounting/bill-payments/create';
import { BillPaymentShowPage } from '@/pages/accounting/bill-payments/show';
import { VendorCreditsPage } from '@/pages/accounting/vendor-credits';
import { VendorCreditCreatePage } from '@/pages/accounting/vendor-credits/create';
import { VendorCreditEditPage } from '@/pages/accounting/vendor-credits/edit';
import { VendorCreditShowPage } from '@/pages/accounting/vendor-credits/show';
import { TaxesPage } from '@/pages/accounting/taxes';
import { BankAccountsPage } from '@/pages/accounting/bank-accounts/index';
import { BankAccountCreatePage } from '@/pages/accounting/bank-accounts/create';
import { BankAccountEditPage } from '@/pages/accounting/bank-accounts/edit';
import { TransfersPage } from '@/pages/accounting/transfers/index';
import { TransferCreatePage } from '@/pages/accounting/transfers/create';
import { PurchaseOrderCreatePage } from '@/pages/accounting/purchase-orders/create';
import { PurchaseOrderEditPage } from '@/pages/accounting/purchase-orders/edit';
import { InventoryDashboardPage } from '@/pages/accounting/inventory';
import { WarehousesPage } from '@/pages/accounting/inventory/warehouses';
import { WarehouseCreatePage } from '@/pages/accounting/inventory/warehouses/create';
import { WarehouseEditPage } from '@/pages/accounting/inventory/warehouses/edit';
import { WarehouseStockPage } from '@/pages/accounting/inventory/warehouses/stock';
import { StockAdjustmentsPage } from '@/pages/accounting/inventory/adjustments';
import { StockAdjustmentCreatePage } from '@/pages/accounting/inventory/adjustments/create';
import { StockAdjustmentEditPage } from '@/pages/accounting/inventory/adjustments/edit';
import { StockAdjustmentShowPage } from '@/pages/accounting/inventory/adjustments/show';
import { StockTransfersPage } from '@/pages/accounting/inventory/stock-transfers';
import { StockTransferCreatePage } from '@/pages/accounting/inventory/stock-transfers/create';
import { StockTransferEditPage } from '@/pages/accounting/inventory/stock-transfers/edit';
import { StockTransferShowPage } from '@/pages/accounting/inventory/stock-transfers/show';
import { InventoryReportsHubPage } from '@/pages/accounting/inventory/reports';
import { InventoryStockSummaryReportPage } from '@/pages/accounting/inventory/reports/stock-summary';
import { InventoryValuationReportPage } from '@/pages/accounting/inventory/reports/valuation';
import { InventoryMovementsReportPage } from '@/pages/accounting/inventory/reports/movements';
import { InventoryLowStockReportPage } from '@/pages/accounting/inventory/reports/low-stock';
import { JournalEntriesPage } from '@/pages/accounting/journal/index';
import { JournalCreatePage } from '@/pages/accounting/journal/create';
import { JournalEditPage } from '@/pages/accounting/journal/edit';
import { JournalShowPage } from '@/pages/accounting/journal/show';
import { FixedAssetsPage } from '@/pages/accounting/fixed-assets';
import { FixedAssetCreatePage } from '@/pages/accounting/fixed-assets/create';
import { FixedAssetEditPage } from '@/pages/accounting/fixed-assets/edit';
import { FixedAssetShowPage } from '@/pages/accounting/fixed-assets/show';
import { FixedAssetAuditTrailPage } from '@/pages/accounting/fixed-assets/audit-trail';
import { FixedAssetRegisterReportPage } from '@/pages/accounting/fixed-assets/reports/asset-register';
import { FixedAssetDepreciationSchedulePage } from '@/pages/accounting/fixed-assets/reports/depreciation-schedule';
import { FixedAssetNbvByCategoryPage } from '@/pages/accounting/fixed-assets/reports/net-book-value';
import { ExpensesPage } from '@/pages/accounting/expenses';
import { ExpenseCreatePage } from '@/pages/accounting/expenses/create';
import { ExpenseEditPage } from '@/pages/accounting/expenses/edit';
import { ExpenseShowPage } from '@/pages/accounting/expenses/show';
import { RecurringExpensesPage } from '@/pages/accounting/recurring-expenses';
import { RecurringExpenseCreatePage } from '@/pages/accounting/recurring-expenses/create';
import { RecurringExpenseEditPage } from '@/pages/accounting/recurring-expenses/edit';
import { AccountingSettingsPage } from '@/pages/accounting/settings';
import { InvoiceTemplatesPage } from '@/pages/accounting/invoice-templates';
import { InvoiceTemplateEditPage } from '@/pages/accounting/invoice-templates/edit';
import DocumentDesignerListPage from '@/pages/accounting/document-output/designer';
import DocumentDesignerEditPage from '@/pages/accounting/document-output/designer/edit';
import { AccountingReportsHubPage } from '@/pages/accounting/reports';
import { ProfitLossReportPage } from '@/pages/accounting/reports/profit-loss';
import { IncomeStatementReportPage } from '@/pages/accounting/reports/income-statement';
import { FinancialSummaryReportPage } from '@/pages/accounting/reports/financial-summary';
import { CategoryTradingReportPage } from '@/pages/accounting/reports/category-trading';
import { ProfitLossByJobReportPage } from '@/pages/accounting/reports/profit-loss-by-job';
import { BalanceSheetReportPage } from '@/pages/accounting/reports/balance-sheet';
import { CashFlowReportPage } from '@/pages/accounting/reports/cash-flow';
import { TrialBalanceReportPage } from '@/pages/accounting/reports/trial-balance';
import { GeneralLedgerReportPage } from '@/pages/accounting/reports/general-ledger';
import { ReportBuilderPage } from '@/pages/accounting/reports/builder/BuilderPage';
import { ReportCreationWizard } from '@/pages/accounting/reports/builder/wizard/ReportCreationWizard';
import { ReportViewerPage } from '@/pages/accounting/reports/viewer/ReportViewerPage';
import { AccountStatementReportPage } from '@/pages/accounting/reports/account-statement';
import { AccountBalancesReportPage } from '@/pages/accounting/reports/account-balances';
import { TaxSummaryReportPage } from '@/pages/accounting/reports/tax-summary';
import { AccountsPayableReportPage } from '@/pages/accounting/reports/accounts-payable';
import { AccountsReceivableReportPage } from '@/pages/accounting/reports/accounts-receivable';
import { CustomerLedgerReportPage } from '@/pages/accounting/reports/customer-ledger';
import { CustomerAgingReportPage } from '@/pages/accounting/reports/customer-aging';
import { VendorAgingReportPage } from '@/pages/accounting/reports/vendor-aging';
import { DocumentExplorerPage } from '@/pages/accounting/reports/document-explorer';
import { DocumentExplorerShowPage } from '@/pages/accounting/reports/document-explorer/show';
import { VendorLedgerReportPage } from '@/pages/accounting/reports/vendor-ledger';
import { AccountingIntegrityCheckPage } from '@/pages/accounting/integrity-check';
import { AuditLogsPage } from '@/pages/accounting/audit-logs';
import { SyncAdminPage } from '@/pages/accounting/sync-admin';
import { ApprovalsHubPage } from '@/pages/accounting/approvals';
import { WorkflowDesignerPage } from '@/pages/accounting/workflows';
import { DataBackupPage } from '@/pages/accounting/backup';
import { RolesPermissionsPage } from '@/pages/accounting/permissions';
import { EmployeesPage } from '@/pages/employee';
import { EmployeeCreatePage } from '@/pages/employee/create';
import { ProductionOrdersPage } from '@/pages/production-orders';
import { ProductionOrderCreatePage } from '@/pages/production-orders/create';
import { ProductionOrderEditPage } from '@/pages/production-orders/edit';
import { ProductionOrderShowPage } from '@/pages/production-orders/show';
import { SuperAdminGuard } from '@/auth/guards/superadmin-guard';
import { SuperAdminLayout } from '@/layouts/superadmin/layout';
import { SuperAdminBrandedLayout } from '@/pages/superadmin/auth/superadmin-branded-layout';
import { SuperAdminLoginPage } from '@/pages/superadmin/auth/login-page';
import { SuperAdminDashboardPage } from '@/pages/superadmin/dashboard/dashboard-page';
import { SuperAdminUsersPage } from '@/pages/superadmin/users/users-page';
import { SuperAdminCreateAccountOwnerPage } from '@/pages/superadmin/users/create-account-owner-page';
import { SuperAdminAccountOwnersPage } from '@/pages/superadmin/account-owners/account-owners-page';
import { SuperAdminOwnerCompaniesPage } from '@/pages/superadmin/account-owners/owner-companies-page';

export function AppRoutingSetup() {
  return (
    <Routes>
      <Route element={<AuthGuard />}>
        <Route element={<Demo1Layout />}>
          <Route path="/" element={<ErpDashboardPage />} />
          <Route path="/dashboard" element={<ErpDashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/companies" element={<CompaniesPage />} />
          <Route path="/companies/create" element={<CreateCompanyPage />} />
          <Route path="/help" element={<WorkspaceHelpPage accountOwner />} />
        </Route>
        <Route element={<WorkspaceLayout />}>
          <Route path="/workspace/:id" element={<WorkspaceDashboardPage />} />
          {PharmacyIndustryRoutes()}
          <Route path="/workspace/:id/accounting" element={<WorkspaceComingSoonPage title="Accounting Overview" />} />
          <Route path="/workspace/:id/accounting/pos" element={<PosPage />} />
          <Route path="/workspace/:id/accounting/invoices" element={<InvoicesPage />} />
          <Route path="/workspace/:id/accounting/invoices/create" element={<InvoiceCreatePage />} />
          <Route path="/workspace/:id/accounting/invoices/:invoiceId" element={<InvoiceShowPage />} />
          <Route path="/workspace/:id/accounting/invoices/:invoiceId/edit" element={<InvoiceEditPage />} />
          <Route path="/workspace/:id/accounting/quotations" element={<QuotationsPage />} />
          <Route path="/workspace/:id/accounting/quotations/create" element={<QuotationCreatePage />} />
          <Route path="/workspace/:id/accounting/quotations/:quotationId" element={<QuotationShowPage />} />
          <Route path="/workspace/:id/accounting/quotations/:quotationId/edit" element={<QuotationEditPage />} />
          <Route path="/workspace/:id/accounting/sales-orders" element={<SalesOrdersPage />} />
          <Route path="/workspace/:id/accounting/sales-orders/create" element={<SalesOrderCreatePage />} />
          <Route path="/workspace/:id/accounting/sales-orders/:salesOrderId" element={<SalesOrderShowPage />} />
          <Route path="/workspace/:id/accounting/sales-orders/:salesOrderId/edit" element={<SalesOrderEditPage />} />
          <Route path="/workspace/:id/accounting/delivery-notes" element={<DeliveryNotesPage />} />
          <Route path="/workspace/:id/accounting/delivery-notes/create" element={<DeliveryNoteCreatePage />} />
          <Route path="/workspace/:id/accounting/delivery-notes/:deliveryNoteId" element={<DeliveryNoteShowPage />} />
          <Route path="/workspace/:id/accounting/job-orders" element={<JobOrdersPage />} />
          <Route
            path="/workspace/:id/accounting/job-orders/dashboard"
            element={<Navigate to=".." replace relative="path" />}
          />
          <Route path="/workspace/:id/accounting/job-orders/create" element={<JobOrderCreatePage />} />
          <Route path="/workspace/:id/accounting/job-orders/:jobOrderId/edit" element={<JobOrderEditPage />} />
          <Route path="/workspace/:id/accounting/job-orders/:jobOrderId" element={<JobOrderShowPage />} />
          <Route path="/workspace/:id/accounting/payments" element={<PaymentsPage />} />
          <Route path="/workspace/:id/accounting/payments/:paymentId" element={<PaymentShowPage />} />
          <Route path="/workspace/:id/accounting/payments/:paymentId/edit" element={<PaymentEditPage />} />
          <Route path="/workspace/:id/accounting/credit-notes" element={<CreditNotesPage />} />
          <Route path="/workspace/:id/accounting/credit-notes/:creditNoteId/edit" element={<CreditNoteEditPage />} />
          <Route path="/workspace/:id/accounting/credit-notes/:creditNoteId" element={<CreditNoteShowPage />} />
          <Route path="/workspace/:id/accounting/bills" element={<BillsPage />} />
          <Route path="/workspace/:id/accounting/bills/create" element={<BillCreatePage />} />
          <Route path="/workspace/:id/accounting/bills/:billId/edit" element={<BillEditPage />} />
          <Route path="/workspace/:id/accounting/bills/:billId" element={<BillShowPage />} />
          <Route path="/workspace/:id/accounting/purchase-orders" element={<PurchaseOrdersPage />} />
          <Route path="/workspace/:id/accounting/purchase-orders/create" element={<PurchaseOrderCreatePage />} />
          <Route path="/workspace/:id/accounting/purchase-orders/:purchaseOrderId/edit" element={<PurchaseOrderEditPage />} />
          <Route path="/workspace/:id/accounting/purchase-orders/:purchaseOrderId" element={<PurchaseOrderShowPage />} />
          <Route path="/workspace/:id/accounting/bill-payments" element={<BillPaymentsPage />} />
          <Route path="/workspace/:id/accounting/bill-payments/create" element={<BillPaymentCreatePage />} />
          <Route path="/workspace/:id/accounting/bill-payments/:paymentId" element={<BillPaymentShowPage />} />
          <Route path="/workspace/:id/accounting/vendor-credits" element={<VendorCreditsPage />} />
          <Route path="/workspace/:id/accounting/vendor-credits/create" element={<VendorCreditCreatePage />} />
          <Route path="/workspace/:id/accounting/vendor-credits/:vendorCreditId/edit" element={<VendorCreditEditPage />} />
          <Route path="/workspace/:id/accounting/vendor-credits/:vendorCreditId" element={<VendorCreditShowPage />} />
          <Route path="/workspace/:id/accounting/customers" element={<CustomersPage />} />
          <Route path="/workspace/:id/accounting/customers/create" element={<CustomerCreatePage />} />
          <Route path="/workspace/:id/accounting/customers/:customerId" element={<CustomerShowPage />} />
          <Route path="/workspace/:id/accounting/customers/:customerId/edit" element={<CustomerEditPage />} />
          <Route path="/workspace/:id/accounting/vendors" element={<VendorsPage />} />
          <Route path="/workspace/:id/accounting/vendors/create" element={<VendorCreatePage />} />
          <Route path="/workspace/:id/accounting/vendors/:vendorId/edit" element={<VendorEditPage />} />
          <Route path="/workspace/:id/accounting/vendors/:vendorId" element={<VendorShowPage />} />
          <Route path="/workspace/:id/accounting/products" element={<ProductsPage />} />
          <Route path="/workspace/:id/accounting/products/create" element={<ProductCreatePage />} />
          <Route path="/workspace/:id/accounting/products/:productId" element={<ProductShowPage />} />
          <Route path="/workspace/:id/accounting/products/:productId/edit" element={<ProductEditPage />} />
          <Route path="/workspace/:id/accounting/taxes" element={<TaxesPage />} />
          <Route path="/workspace/:id/accounting/chart-of-accounts" element={<ChartOfAccountsPage />} />
          <Route path="/workspace/:id/accounting/journal/create" element={<JournalCreatePage />} />
          <Route path="/workspace/:id/accounting/journal/:journalId/edit" element={<JournalEditPage />} />
          <Route path="/workspace/:id/accounting/journal/:journalId" element={<JournalShowPage />} />
          <Route path="/workspace/:id/accounting/journal" element={<JournalEntriesPage />} />
          <Route path="/workspace/:id/accounting/fixed-assets/create" element={<FixedAssetCreatePage />} />
          <Route
            path="/workspace/:id/accounting/fixed-assets/reports/asset-register"
            element={<FixedAssetRegisterReportPage />}
          />
          <Route
            path="/workspace/:id/accounting/fixed-assets/reports/depreciation-schedule"
            element={<FixedAssetDepreciationSchedulePage />}
          />
          <Route
            path="/workspace/:id/accounting/fixed-assets/reports/net-book-value"
            element={<FixedAssetNbvByCategoryPage />}
          />
          <Route
            path="/workspace/:id/accounting/fixed-assets/:assetId/edit"
            element={<FixedAssetEditPage />}
          />
          <Route
            path="/workspace/:id/accounting/fixed-assets/:assetId/audit-trail"
            element={<FixedAssetAuditTrailPage />}
          />
          <Route path="/workspace/:id/accounting/fixed-assets/:assetId" element={<FixedAssetShowPage />} />
          <Route path="/workspace/:id/accounting/fixed-assets" element={<FixedAssetsPage />} />
          <Route path="/workspace/:id/accounting/expenses/create" element={<ExpenseCreatePage />} />
          <Route path="/workspace/:id/accounting/expenses/:expenseId/edit" element={<ExpenseEditPage />} />
          <Route path="/workspace/:id/accounting/expenses/:expenseId" element={<ExpenseShowPage />} />
          <Route path="/workspace/:id/accounting/expenses" element={<ExpensesPage />} />
          <Route
            path="/workspace/:id/accounting/recurring-expenses/create"
            element={<RecurringExpenseCreatePage />}
          />
          <Route
            path="/workspace/:id/accounting/recurring-expenses/:recurringId/edit"
            element={<RecurringExpenseEditPage />}
          />
          <Route path="/workspace/:id/accounting/recurring-expenses" element={<RecurringExpensesPage />} />
          <Route path="/workspace/:id/accounting/bank-accounts/create" element={<BankAccountCreatePage />} />
          <Route path="/workspace/:id/accounting/bank-accounts/:bankAccountId/edit" element={<BankAccountEditPage />} />
          <Route path="/workspace/:id/accounting/bank-accounts" element={<BankAccountsPage />} />
          <Route path="/workspace/:id/accounting/transfers/create" element={<TransferCreatePage />} />
          <Route path="/workspace/:id/accounting/transfers" element={<TransfersPage />} />
          <Route path="/workspace/:id/accounting/inventory/warehouses/create" element={<WarehouseCreatePage />} />
          <Route path="/workspace/:id/accounting/inventory/warehouses/:warehouseId/stock" element={<WarehouseStockPage />} />
          <Route path="/workspace/:id/accounting/inventory/warehouses/:warehouseId/edit" element={<WarehouseEditPage />} />
          <Route path="/workspace/:id/accounting/inventory/warehouses" element={<WarehousesPage />} />
          <Route path="/workspace/:id/accounting/inventory/adjustments/create" element={<StockAdjustmentCreatePage />} />
          <Route path="/workspace/:id/accounting/inventory/adjustments/:adjustmentId/edit" element={<StockAdjustmentEditPage />} />
          <Route path="/workspace/:id/accounting/inventory/adjustments/:adjustmentId" element={<StockAdjustmentShowPage />} />
          <Route path="/workspace/:id/accounting/inventory/adjustments" element={<StockAdjustmentsPage />} />
          <Route path="/workspace/:id/accounting/inventory/stock-transfers/create" element={<StockTransferCreatePage />} />
          <Route path="/workspace/:id/accounting/inventory/stock-transfers/:transferId/edit" element={<StockTransferEditPage />} />
          <Route path="/workspace/:id/accounting/inventory/stock-transfers/:transferId" element={<StockTransferShowPage />} />
          <Route path="/workspace/:id/accounting/inventory/stock-transfers" element={<StockTransfersPage />} />
          <Route path="/workspace/:id/accounting/inventory/reports/stock-summary" element={<InventoryStockSummaryReportPage />} />
          <Route path="/workspace/:id/accounting/inventory/reports/valuation" element={<InventoryValuationReportPage />} />
          <Route path="/workspace/:id/accounting/inventory/reports/movements" element={<InventoryMovementsReportPage />} />
          <Route path="/workspace/:id/accounting/inventory/reports/low-stock" element={<InventoryLowStockReportPage />} />
          <Route path="/workspace/:id/accounting/inventory/reports" element={<InventoryReportsHubPage />} />
          <Route path="/workspace/:id/accounting/inventory" element={<InventoryDashboardPage />} />
          <Route path="/workspace/:id/accounting/reports/financial-summary" element={<FinancialSummaryReportPage />} />
          <Route path="/workspace/:id/accounting/reports/category-trading" element={<CategoryTradingReportPage />} />
          <Route path="/workspace/:id/accounting/reports/income-statement" element={<IncomeStatementReportPage />} />
          <Route path="/workspace/:id/accounting/reports/profit-loss" element={<ProfitLossReportPage />} />
          <Route
            path="/workspace/:id/accounting/reports/profit-loss-by-job"
            element={<ProfitLossByJobReportPage />}
          />
          <Route path="/workspace/:id/accounting/reports/balance-sheet" element={<BalanceSheetReportPage />} />
          <Route path="/workspace/:id/accounting/reports/cash-flow" element={<CashFlowReportPage />} />
          <Route path="/workspace/:id/accounting/reports/trial-balance" element={<TrialBalanceReportPage />} />
          <Route path="/workspace/:id/accounting/reports/general-ledger" element={<GeneralLedgerReportPage />} />
          <Route path="/workspace/:id/accounting/reports/view/:definitionId" element={<ReportViewerPage />} />
          <Route path="/workspace/:id/accounting/reports/create" element={<ReportCreationWizard />} />
          <Route path="/workspace/:id/accounting/reports/builder" element={<ReportBuilderPage />} />
          <Route path="/workspace/:id/accounting/reports/account-balances" element={<AccountBalancesReportPage />} />
          <Route path="/workspace/:id/accounting/reports/tax-summary" element={<TaxSummaryReportPage />} />
          <Route path="/workspace/:id/accounting/reports/account-statement" element={<AccountStatementReportPage />} />
          <Route path="/workspace/:id/accounting/reports/accounts-payable" element={<AccountsPayableReportPage />} />
          <Route path="/workspace/:id/accounting/reports/accounts-receivable" element={<AccountsReceivableReportPage />} />
          <Route path="/workspace/:id/accounting/reports/customer-ledger" element={<CustomerLedgerReportPage />} />
          <Route path="/workspace/:id/accounting/reports/customer-aging" element={<CustomerAgingReportPage />} />
          <Route path="/workspace/:id/accounting/reports/aged-receivables" element={<CustomerAgingReportPage />} />
          <Route path="/workspace/:id/accounting/reports/vendor-aging" element={<VendorAgingReportPage />} />
          <Route path="/workspace/:id/accounting/reports/aged-payables" element={<VendorAgingReportPage />} />
          <Route path="/workspace/:id/accounting/reports/vendor-ledger" element={<VendorLedgerReportPage />} />
          <Route path="/workspace/:id/accounting/reports/document-explorer/:docType/:docId" element={<DocumentExplorerShowPage />} />
          <Route path="/workspace/:id/accounting/reports/document-explorer" element={<DocumentExplorerPage />} />
          <Route path="/workspace/:id/accounting/integrity-check" element={<AccountingIntegrityCheckPage />} />
          <Route path="/workspace/:id/accounting/reports" element={<AccountingReportsHubPage />} />
          <Route path="/workspace/:id/accounting/audit-logs" element={<AuditLogsPage />} />
          <Route path="/workspace/:id/accounting/sync-admin" element={<SyncAdminPage />} />
          <Route path="/workspace/:id/accounting/approvals" element={<ApprovalsHubPage />} />
          <Route path="/workspace/:id/accounting/workflows" element={<WorkflowDesignerPage />} />
          <Route path="/workspace/:id/accounting/backup" element={<DataBackupPage />} />
          <Route path="/workspace/:id/accounting/permissions" element={<RolesPermissionsPage />} />
          <Route path="/workspace/:id/accounting/settings" element={<AccountingSettingsPage />} />
          <Route
            path="/workspace/:id/accounting/invoice-templates/:templateId/edit"
            element={<InvoiceTemplateEditPage />}
          />
          <Route path="/workspace/:id/accounting/invoice-templates" element={<InvoiceTemplatesPage />} />
          <Route
            path="/workspace/:id/accounting/document-output/designer/:layoutId/edit"
            element={<DocumentDesignerEditPage />}
          />
          <Route
            path="/workspace/:id/accounting/document-output/designer"
            element={<DocumentDesignerListPage />}
          />
          <Route path="/workspace/:id/production-orders/create" element={<ProductionOrderCreatePage />} />
          <Route path="/workspace/:id/production-orders/:orderId/edit" element={<ProductionOrderEditPage />} />
          <Route path="/workspace/:id/production-orders/:orderId" element={<ProductionOrderShowPage />} />
          <Route path="/workspace/:id/production-orders" element={<ProductionOrdersPage />} />
          <Route path="/workspace/:id/employee/create" element={<EmployeeCreatePage />} />
          <Route path="/workspace/:id/employee" element={<EmployeesPage />} />
          <Route path="/workspace/:id/help" element={<WorkspaceHelpPage />} />
        </Route>
      </Route>

      {/* Company selector / onboarding — needs a token but no company required */}
      <Route element={<AuthGuard />}>
        <Route path="/select-company" element={<CompanySelectorPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
      </Route>

      <Route path="/auth/signin" element={<SignInPage />} />

      <Route element={<EnterpriseTrialLayout />}>
        <Route path="/auth/signup" element={<SignUpPage />} />
        <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
      </Route>

      <Route element={<SuperAdminBrandedLayout />}>
        <Route path="/superadmin/login" element={<SuperAdminLoginPage />} />
      </Route>

      <Route element={<SuperAdminGuard />}>
        <Route element={<SuperAdminLayout />}>
          <Route path="/superadmin/dashboard" element={<SuperAdminDashboardPage />} />
          <Route path="/superadmin/users" element={<SuperAdminUsersPage />} />
          <Route path="/superadmin/users/create" element={<SuperAdminCreateAccountOwnerPage />} />
          <Route path="/superadmin/account-owners" element={<SuperAdminAccountOwnersPage />} />
          <Route
            path="/superadmin/account-owners/:ownerId/companies"
            element={<SuperAdminOwnerCompaniesPage />}
          />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
