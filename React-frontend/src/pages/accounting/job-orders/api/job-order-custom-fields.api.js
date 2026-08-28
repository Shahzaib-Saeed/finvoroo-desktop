import api from '@/lib/api';

export const jobOrderCustomFieldsApi = {
  list: (params) => api.get('/workspace/job-order-custom-fields', { params }),
  show: (id) => api.get(`/workspace/job-order-custom-fields/${id}`),
  create: (data) => api.post('/workspace/job-order-custom-fields', data),
  update: (id, data) => api.put(`/workspace/job-order-custom-fields/${id}`, data),
  appendOption: (id, data) =>
    api.post(`/workspace/job-order-custom-fields/${id}/options`, data),
  delete: (id) => api.delete(`/workspace/job-order-custom-fields/${id}`),
  reorder: (order) => api.post('/workspace/job-order-custom-fields/reorder', { order }),
  cardLayout: (placements, order) =>
    api.post('/workspace/job-order-custom-fields/card-layout', { placements, order }),
};
