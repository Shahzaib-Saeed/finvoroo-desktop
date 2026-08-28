import api from '@/lib/api';

export const stockAdjustmentsApi = {
  list: (params) => api.get('/workspace/stock-adjustments', { params }),
  show: (id) => api.get(`/workspace/stock-adjustments/${id}`),
  create: (data) => api.post('/workspace/stock-adjustments', data),
  update: (id, data) => api.put(`/workspace/stock-adjustments/${id}`, data),
  destroy: (id) => api.delete(`/workspace/stock-adjustments/${id}`),
  formOptions: () => api.get('/workspace/stock-adjustments/form-options'),
};
