import api from '@/lib/api';

export const journalsApi = {
  list: (params) => api.get('/workspace/journal-entries', { params }),
  show: (id) => api.get(`/workspace/journal-entries/${id}`),
  create: (data) => api.post('/workspace/journal-entries', data),
  update: (id, data) => api.put(`/workspace/journal-entries/${id}`, data),
  destroy: (id) => api.delete(`/workspace/journal-entries/${id}`),
  post: (id) => api.post(`/workspace/journal-entries/${id}/post`),
  formOptions: () => api.get('/workspace/journal-entries/form-options'),
  exchangeRate: (params) => api.get('/workspace/journal-entries/exchange-rate', { params }),
};
