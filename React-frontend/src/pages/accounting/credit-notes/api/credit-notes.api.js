import api from '@/lib/api';

export const creditNotesApi = {
  list: (params) => api.get('/workspace/credit-notes', { params }),
  show: (id) => api.get(`/workspace/credit-notes/${id}`),
  create: (data) => api.post('/workspace/credit-notes', data),
  update: (id, data) => api.put(`/workspace/credit-notes/${id}`, data),
  delete: (id) => api.delete(`/workspace/credit-notes/${id}`),
  formOptions: () => api.get('/workspace/credit-notes/form-options'),
  customerOpenInvoices: (customerId, params) =>
    api.get(`/workspace/customers/${customerId}/open-invoices`, { params }),
  invoiceLines: (invoiceId, params) =>
    api.get(`/workspace/invoices/${invoiceId}/credit-note-lines`, { params }),
  manageModal: (id) => api.get(`/workspace/credit-notes/${id}/manage-modal`),
  apply: (id, data) => api.post(`/workspace/credit-notes/${id}/apply`, data),
  refund: (id, data) => api.post(`/workspace/credit-notes/${id}/refund`, data),
};
