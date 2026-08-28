import api from '@/lib/api';

export const fixedAssetsApi = {
  list: (params) => api.get('/workspace/fixed-assets', { params }),
  show: (id) => api.get(`/workspace/fixed-assets/${id}`),
  create: (data) => api.post('/workspace/fixed-assets', data),
  update: (id, data) => api.put(`/workspace/fixed-assets/${id}`, data),
  formOptions: () => api.get('/workspace/fixed-assets/form-options'),
  retire: (id, data) => api.post(`/workspace/fixed-assets/${id}/retire`, data),
  sell: (id, data) => api.post(`/workspace/fixed-assets/${id}/sell`, data),
  runDepreciation: (data) => api.post('/workspace/fixed-assets/run-depreciation', data),
  auditTrail: (id) => api.get(`/workspace/fixed-assets/${id}/audit-trail`),
};
