import api from '@/lib/api';

export const taxRatesApi = {
  list: (params) => api.get('/workspace/tax-rates', { params }),
  show: (id) => api.get(`/workspace/tax-rates/${id}`),
  create: (data) => api.post('/workspace/tax-rates', data),
  update: (id, data) => api.put(`/workspace/tax-rates/${id}`, data),
  delete: (id) => api.delete(`/workspace/tax-rates/${id}`),
  formOptions: () => api.get('/workspace/tax-rates/form-options'),
};
