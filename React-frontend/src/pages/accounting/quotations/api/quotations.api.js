import api from '@/lib/api';

export const quotationsApi = {
  list: (params) => api.get('/workspace/quotations', { params }),
  show: (id) => api.get(`/workspace/quotations/${id}`),
  create: (data) => api.post('/workspace/quotations', data),
  update: (id, data) => api.put(`/workspace/quotations/${id}`, data),
  delete: (id) => api.delete(`/workspace/quotations/${id}`),
  formOptions: () => api.get('/workspace/quotations/form-options'),
  customerContext: (customerId) =>
    api.get(`/workspace/customers/${customerId}/invoice-context`),
  listForCustomer: (customerId, params = {}) =>
    api.get('/workspace/quotations', {
      params: { customer_id: customerId, per_page: 50, ...params },
    }),
};
