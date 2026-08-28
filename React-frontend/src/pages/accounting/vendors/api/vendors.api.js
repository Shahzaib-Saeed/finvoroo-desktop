import api from '@/lib/api';

export const vendorsApi = {
  list: (params) => api.get('/workspace/vendors', { params }),
  show: (id) => api.get(`/workspace/vendors/${id}`),
  create: (data) => api.post('/workspace/vendors', data),
  update: (id, data) => api.put(`/workspace/vendors/${id}`, data),
  delete: (id) => api.delete(`/workspace/vendors/${id}`),
  activate: (id) => api.post(`/workspace/vendors/${id}/activate`),
  bulk: (data) => api.post('/workspace/vendors/bulk', data),
  formOptions: () => api.get('/workspace/vendors/form-options'),
  listBills: (vendorId, params) =>
    api.get('/workspace/bills', {
      params: { vendor_id: vendorId, per_page: 100, ...params },
    }),

  listBillPayments: (vendorId, params) =>
    api.get('/workspace/bill-payments', {
      params: { vendor_id: vendorId, per_page: 100, ...params },
    }),

  listPurchaseOrders: (vendorId, params) =>
    api.get('/workspace/purchase-orders', {
      params: { vendor_id: vendorId, per_page: 100, ...params },
    }),

  listVendorCredits: (vendorId, params) =>
    api.get('/workspace/vendor-credits', {
      params: { vendor_id: vendorId, per_page: 100, ...params },
    }),

  listAttachments: (id) => api.get(`/workspace/vendors/${id}/attachments`),
  uploadAttachment: (id, formData, config) =>
    api.post(`/workspace/vendors/${id}/attachments`, formData, config),
  deleteAttachment: (id, attachmentId) =>
    api.delete(`/workspace/vendors/${id}/attachments/${attachmentId}`),
  downloadAttachment: (id, attachmentId) =>
    api.get(`/workspace/vendors/${id}/attachments/${attachmentId}/download`, {
      responseType: 'blob',
      skipCacheBust: true,
    }),
  previewAttachment: (id, attachmentId) =>
    api.get(`/workspace/vendors/${id}/attachments/${attachmentId}/download`, {
      params: { preview: 1 },
      responseType: 'blob',
      skipCacheBust: true,
    }),
};
