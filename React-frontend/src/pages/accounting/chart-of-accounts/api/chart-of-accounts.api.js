import api from '@/lib/api';

export const chartOfAccountsApi = {
  list: (params) => api.get('/workspace/chart-of-accounts', { params }),
  show: (id) => api.get(`/workspace/chart-of-accounts/${id}`),
  create: (data) => api.post('/workspace/chart-of-accounts', data),
  update: (id, data) => api.put(`/workspace/chart-of-accounts/${id}`, data),
  delete: (id) => api.delete(`/workspace/chart-of-accounts/${id}`),
  formOptions: () => api.get('/workspace/chart-of-accounts/form-options'),
  bulk: (payload) => api.post('/workspace/chart-of-accounts/bulk', payload),
  toggleStatus: (id, isActive) =>
    api.post(`/workspace/chart-of-accounts/${id}/toggle-status`, {
      is_active: isActive ? 1 : 0,
    }),
};
