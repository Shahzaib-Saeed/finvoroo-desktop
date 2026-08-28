import api from '@/lib/api';

export const billPaymentsApi = {
  list: (params) => api.get('/workspace/bill-payments', { params }),
  show: (id) => api.get(`/workspace/bill-payments/${id}`),
  create: (data) => api.post('/workspace/bill-payments', data),
  update: (id, data) => api.put(`/workspace/bill-payments/${id}`, data),
  editContext: (id) => api.get(`/workspace/bill-payments/${id}/edit-context`),
  remove: (id) => api.delete(`/workspace/bill-payments/${id}`),
  formOptions: () => api.get('/workspace/bill-payments/form-options'),
  vendorContext: (vendorId) =>
    api.get(`/workspace/vendors/${vendorId}/bill-payment-context`),
  applyUnappliedModal: (id) =>
    api.get(`/workspace/bill-payments/${id}/apply-unapplied-modal`),
  applyUnapplied: (id, data) =>
    api.post(`/workspace/bill-payments/${id}/apply-unapplied`, data),
};
