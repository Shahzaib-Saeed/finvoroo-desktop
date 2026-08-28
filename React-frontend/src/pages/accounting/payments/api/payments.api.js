import api from '@/lib/api';

export const paymentsApi = {
  list: (params) => api.get('/workspace/customer-payments', { params }),
  show: (id) => api.get(`/workspace/customer-payments/${id}`),
  create: (data) => api.post('/workspace/customer-payments', data),
  update: (id, data) => api.put(`/workspace/customer-payments/${id}`, data),
  delete: (id) => api.delete(`/workspace/customer-payments/${id}`),
  formOptions: () => api.get('/workspace/customer-payments/form-options'),
  customerContext: (customerId) =>
    api.get(`/workspace/customers/${customerId}/payment-context`),
  editContext: (id) => api.get(`/workspace/customer-payments/${id}/edit-context`),
  applyUnappliedModal: (id) =>
    api.get(`/workspace/customer-payments/${id}/apply-unapplied-modal`),
  applyUnapplied: (id, allocations) =>
    api.post(`/workspace/customer-payments/${id}/apply-unapplied`, { allocations }),
  linkToAccount: (id, depositAccountId) =>
    api.post(`/workspace/customer-payments/${id}/link-to-account`, {
      deposit_account_id: depositAccountId,
    }),
};
