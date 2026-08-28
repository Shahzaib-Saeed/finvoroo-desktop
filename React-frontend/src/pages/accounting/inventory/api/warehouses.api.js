import api from '@/lib/api';

export const warehousesApi = {
  list: (params) => api.get('/workspace/warehouses', { params }),
  show: (id) => api.get(`/workspace/warehouses/${id}`),
  create: (data) => api.post('/workspace/warehouses', data),
  update: (id, data) => api.put(`/workspace/warehouses/${id}`, data),
  delete: (id) => api.delete(`/workspace/warehouses/${id}`),
  formOptions: () => api.get('/workspace/warehouses/form-options'),
  stock: (id) => api.get(`/workspace/warehouses/${id}/stock`),
};
