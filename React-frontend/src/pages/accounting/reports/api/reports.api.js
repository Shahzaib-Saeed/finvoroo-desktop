import api from '@/lib/api';

export const reportsApi = {
  generalLedger: (params) => api.get('/workspace/reports/general-ledger', { params }),
  trialBalance: (params) => api.get('/workspace/reports/trial-balance', { params }),
  profitLoss: (params) => api.get('/workspace/reports/profit-loss', { params }),
  incomeStatement: (params) => api.get('/workspace/reports/profit-loss', { params }),
  balanceSheet: (params) => api.get('/workspace/reports/balance-sheet', { params }),
  cashFlow: (params) => api.get('/workspace/reports/cash-flow', { params }),
  accountStatement: (params) => api.get('/workspace/reports/account-statement', { params }),
  accountBalances: (params) => api.get('/workspace/reports/account-balances', { params }),
  accountBalancesExport: (params) =>
    api.get('/workspace/reports/account-balances/export', {
      params,
      responseType: 'blob',
    }),
  taxSummary: (params) => api.get('/workspace/reports/tax-summary', { params }),
  taxSummaryExport: (params) =>
    api.get('/workspace/reports/tax-summary/export', {
      params,
      responseType: 'blob',
    }),
  accountsPayable: (params) => api.get('/workspace/reports/accounts-payable', { params }),
  accountsReceivable: (params) => api.get('/workspace/reports/accounts-receivable', { params }),
  customerLedger: (params) => api.get('/workspace/reports/customer-ledger', { params }),
  vendorLedger: (params) => api.get('/workspace/reports/vendor-ledger', { params }),
  customerAging: (params) => api.get('/workspace/reports/customer-aging', { params }),
  vendorAging: (params) => api.get('/workspace/reports/vendor-aging', { params }),
  categoryTrading: (params) => api.get('/workspace/reports/category-trading', { params }),
};
