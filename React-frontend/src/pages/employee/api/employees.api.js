import api from '@/lib/api';

export const employeesApi = {
  list: (params) => api.get('/workspace/users', { params }),
  meta: () => api.get('/workspace/users/meta'),
  create: (data) => api.post('/workspace/users', data),
  update: (id, data) => api.put(`/workspace/users/${id}`, data),
  updateStatus: (id, data = {}) => api.patch(`/workspace/users/${id}/status`, data),
  destroy: (id) => api.delete(`/workspace/users/${id}`),
  bulkAssignRole: (data) => api.post('/workspace/users/bulk-assign-role', data),
};
