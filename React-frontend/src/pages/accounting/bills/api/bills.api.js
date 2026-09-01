import api from '@/lib/api';

export const billsApi = {
  list: (params) => api.get('/workspace/bills', { params }),
  show: (id) => api.get(`/workspace/bills/${id}`),
  create: (data) => api.post('/workspace/bills', data),
  update: (id, data) => api.put(`/workspace/bills/${id}`, data),
  editImpact: (id, data) => api.post(`/workspace/bills/${id}/edit-impact`, data),
  post: (id) => api.post(`/workspace/bills/${id}/post`),
  cancel: (id) => api.post(`/workspace/bills/${id}/cancel`),
  destroy: (id) => api.delete(`/workspace/bills/${id}`),
  formOptions: () => api.get('/workspace/bills/form-options'),
  nextNumber: (params) => api.get('/workspace/bills/next-number', { params }),
  checkNumber: (params) => api.get('/workspace/bills/check-number', { params }),
  vendorContext: (vendorId) => api.get(`/workspace/vendors/${vendorId}/bill-context`),
  vendorPurchaseOrders: (vendorId) =>
    api.get(`/workspace/vendors/${vendorId}/purchase-orders-for-bill`),

  listAttachments: (id) => api.get(`/workspace/bills/${id}/attachments`),
  uploadAttachment: (id, formData, config) =>
    api.post(`/workspace/bills/${id}/attachments`, formData, config),
  deleteAttachment: (id, attachmentId) =>
    api.delete(`/workspace/bills/${id}/attachments/${attachmentId}`),
  downloadAttachment: (id, attachmentId) =>
    api.get(`/workspace/bills/${id}/attachments/${attachmentId}/download`, {
      responseType: 'blob',
    }),
};
