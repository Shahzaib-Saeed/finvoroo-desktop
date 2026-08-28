import api from '@/lib/api';

export const inventoryReportsApi = {
  stockSummary: (params) => api.get('/workspace/reports/inventory/stock-summary', { params }),
  valuation: (params) => api.get('/workspace/reports/inventory/valuation', { params }),
  movements: (params) => api.get('/workspace/reports/inventory/movements', { params }),
  lowStock: () => api.get('/workspace/reports/inventory/low-stock'),
  exportStockSummaryCsv: () =>
    api.get('/workspace/reports/inventory/stock-summary/export-csv', { responseType: 'blob' }),
};
