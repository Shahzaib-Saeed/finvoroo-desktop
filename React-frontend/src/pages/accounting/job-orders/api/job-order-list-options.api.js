import api from '@/lib/api';

export const jobOrderListOptionsApi = {
  list: (params) => api.get('/workspace/job-order-list-options', { params }),
  create: (data) => api.post('/workspace/job-order-list-options', data),
  update: (id, data) => api.put(`/workspace/job-order-list-options/${id}`, data),
  delete: (id) => api.delete(`/workspace/job-order-list-options/${id}`),
};
