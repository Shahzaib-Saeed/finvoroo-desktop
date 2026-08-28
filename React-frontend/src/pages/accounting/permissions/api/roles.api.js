import api from '@/lib/api';

export const rolesApi = {
  list: (params) => api.get('/workspace/roles', { params }),
  templates: () => api.get('/workspace/roles/templates'),
  create: (payload) => api.post('/workspace/roles', payload),
  show: (id) => api.get(`/workspace/roles/${id}`),
  update: (id, payload) => api.patch(`/workspace/roles/${id}`, payload),
  duplicate: (id, payload = {}) => api.post(`/workspace/roles/${id}/duplicate`, payload),
  archive: (id) => api.post(`/workspace/roles/${id}/archive`),
  destroy: (id) => api.delete(`/workspace/roles/${id}`),
  users: (id, params) => api.get(`/workspace/roles/${id}/users`, { params }),
};
