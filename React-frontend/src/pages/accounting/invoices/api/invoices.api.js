import api from '@/lib/api';

export const invoicesApi = {
  list: (params) => api.get('/workspace/invoices', { params }),
  show: (id) => api.get(`/workspace/invoices/${id}`),
  create: (data) => api.post('/workspace/invoices', data),
  update: (id, data) => api.put(`/workspace/invoices/${id}`, data),
  delete: (id) => api.delete(`/workspace/invoices/${id}`),
  post: (id) => api.post(`/workspace/invoices/${id}/post`),
  cancel: (id) => api.post(`/workspace/invoices/${id}/cancel`),
  recordPayment: (id, data) => api.post(`/workspace/invoices/${id}/payments`, data),

  formOptions: () => api.get('/workspace/invoices/form-options'),
  nextNumber: (params) => api.get('/workspace/invoices/next-number', { params }),
  checkNumber: (params) => api.get('/workspace/invoices/check-number', { params }),
  exchangeRate: (params) => api.get('/workspace/invoices/exchange-rate', { params }),
  customerSalesOrders: (customerId) =>
    api.get(`/workspace/invoices/customer-sales-orders/${customerId}`),
  customerInvoiceContext: (customerId) =>
    api.get(`/workspace/customers/${customerId}/invoice-context`),
  updatePrintDisplay: (id, printDisplaySettings) =>
    api.patch(`/workspace/invoices/${id}/print-display`, {
      print_display_settings: printDisplaySettings,
    }),
  conversionPreview: (id, target) =>
    api.get(`/workspace/invoices/${id}/conversion-preview`, { params: { target } }),

  listAttachments: (id) => api.get(`/workspace/invoices/${id}/attachments`),
  uploadAttachment: (id, formData, config) =>
    api.post(`/workspace/invoices/${id}/attachments`, formData, config),
  deleteAttachment: (id, attachmentId) =>
    api.delete(`/workspace/invoices/${id}/attachments/${attachmentId}`),
  downloadAttachment: (id, attachmentId) =>
    api.get(`/workspace/invoices/${id}/attachments/${attachmentId}/download`, {
      responseType: 'blob',
    }),
};
