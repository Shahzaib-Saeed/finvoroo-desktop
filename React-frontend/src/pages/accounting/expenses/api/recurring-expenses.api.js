import api from '@/lib/api';

export const recurringExpensesApi = {
  formOptions: () => api.get('/workspace/recurring-expenses/form-options'),
  list: (params) => api.get('/workspace/recurring-expenses', { params }),
  show: (id) => api.get(`/workspace/recurring-expenses/${id}`),
  create: (data) => api.post('/workspace/recurring-expenses', data),
  update: (id, data) => api.put(`/workspace/recurring-expenses/${id}`, data),
  destroy: (id) => api.delete(`/workspace/recurring-expenses/${id}`),
};
