import api from '@/lib/api';

export const customersApi = {
  list: (params) => api.get('/workspace/customers', { params }),
  show: (id) => api.get(`/workspace/customers/${id}`),
  create: (data) => api.post('/workspace/customers', data),
  update: (id, data) => api.put(`/workspace/customers/${id}`, data),
  delete: (id, params) => api.delete(`/workspace/customers/${id}`, { params }),
  activate: (id) => api.post(`/workspace/customers/${id}/activate`),
  bulk: (data) => api.post('/workspace/customers/bulk', data),
  formOptions: () => api.get('/workspace/customers/form-options'),
  updateVendorLink: (id, enabled) =>
    api.put(`/workspace/customers/${id}/vendor-link`, { enabled }),

  listAttachments: (id) => api.get(`/workspace/customers/${id}/attachments`),
  uploadAttachment: (id, formData, config) =>
    api.post(`/workspace/customers/${id}/attachments`, formData, config),
  deleteAttachment: (id, attachmentId) =>
    api.delete(`/workspace/customers/${id}/attachments/${attachmentId}`),
  downloadAttachment: (id, attachmentId) =>
    api.get(`/workspace/customers/${id}/attachments/${attachmentId}/download`, {
      responseType: 'blob',
    }),

  listCustomFieldDefinitions: (params) =>
    api.get('/workspace/customer-custom-fields', { params: { per_page: 100, ...params } }),

  listInvoices: (customerId, params) =>
    api.get('/workspace/invoices', { params: { customer_id: customerId, per_page: 100, ...params } }),

  listPayments: (customerId, params) =>
    api.get('/workspace/customer-payments', { params: { customer_id: customerId, per_page: 100, ...params } }),

  listSalesOrders: (customerId, params) =>
    api.get('/workspace/sales-orders', {
      params: { customer_id: customerId, per_page: 100, ...params },
    }),

  listQuotations: (customerId, params) =>
    api.get('/workspace/quotations', {
      params: { customer_id: customerId, per_page: 100, ...params },
    }),

  listCreditNotes: (customerId, params) =>
    api.get('/workspace/credit-notes', { params: { customer_id: customerId, per_page: 100, ...params } }),
};
