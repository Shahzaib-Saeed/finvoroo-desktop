import api from '@/lib/api';

export const stockTransfersApi = {
  list: (params) => api.get('/workspace/stock-transfers', { params }),
  show: (id) => api.get(`/workspace/stock-transfers/${id}`),
  create: (data) => api.post('/workspace/stock-transfers', data),
  update: (id, data) => api.put(`/workspace/stock-transfers/${id}`, data),
  destroy: (id) => api.delete(`/workspace/stock-transfers/${id}`),
  complete: (id) => api.post(`/workspace/stock-transfers/${id}/complete`),
  formOptions: () => api.get('/workspace/stock-transfers/form-options'),
};
