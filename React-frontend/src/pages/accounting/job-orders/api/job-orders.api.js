import api from '@/lib/api';

export const jobOrdersApi = {
  list: (params) => api.get('/workspace/job-orders', { params }),
  show: (id) => api.get(`/workspace/job-orders/${id}`),
  create: (data) => api.post('/workspace/job-orders', data),
  update: (id, data) => api.put(`/workspace/job-orders/${id}`, data),
  delete: (id) => api.delete(`/workspace/job-orders/${id}`),
  dashboard: (params) => api.get('/workspace/job-orders/dashboard', { params }),
  formOptions: () => api.get('/workspace/job-orders/form-options'),
  invoicePreview: (jobOrderId) =>
    api.get(`/workspace/job-orders/${jobOrderId}/invoice-preview`),
  billPreview: (jobOrderId) =>
    api.get(`/workspace/job-orders/${jobOrderId}/bill-preview`),
  fromSalesOrder: (salesOrderId) =>
    api.get(`/workspace/job-orders/from-sales-order/${salesOrderId}`),
  fromFixedAsset: (fixedAssetId) =>
    api.get(`/workspace/job-orders/from-fixed-asset/${fixedAssetId}`),
  profitLossReport: (params) =>
    api.get('/workspace/job-orders/reports/profit-loss', { params }),
  profitLossExport: (params) =>
    api.get('/workspace/job-orders/reports/profit-loss/export', {
      params,
      responseType: 'blob',
    }),
  laborEntries: (jobOrderId) => api.get(`/workspace/job-orders/${jobOrderId}/labor-entries`),
  storeLaborEntry: (jobOrderId, data) =>
    api.post(`/workspace/job-orders/${jobOrderId}/labor-entries`, data),
  deleteLaborEntry: (jobOrderId, laborEntryId) =>
    api.delete(`/workspace/job-orders/${jobOrderId}/labor-entries/${laborEntryId}`),
  attachments: (jobOrderId) =>
    api.get(`/workspace/job-orders/${jobOrderId}/attachments`),
  uploadAttachment: (jobOrderId, file) => {
    const data = new FormData();
    data.append('file', file);
    return api.post(`/workspace/job-orders/${jobOrderId}/attachments`, data);
  },
  downloadAttachment: (jobOrderId, attachmentId) =>
    api.get(`/workspace/job-orders/${jobOrderId}/attachments/${attachmentId}/download`, {
      responseType: 'blob',
      skipCacheBust: true,
    }),
  previewAttachment: (jobOrderId, attachmentId) =>
    api.get(`/workspace/job-orders/${jobOrderId}/attachments/${attachmentId}/download`, {
      params: { preview: 1 },
      responseType: 'blob',
      skipCacheBust: true,
    }),
  deleteAttachment: (jobOrderId, attachmentId) =>
    api.delete(`/workspace/job-orders/${jobOrderId}/attachments/${attachmentId}`),
};
