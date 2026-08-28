import api from '@/lib/api';

export const expensesApi = {
  formOptions: () => api.get('/workspace/expenses/form-options'),
  list: (params) => api.get('/workspace/expenses', { params }),
  show: (id) => api.get(`/workspace/expenses/${id}`),
  create: (data) => api.post('/workspace/expenses', data),
  update: (id, data) => {
    if (data instanceof FormData) {
      data.append('_method', 'PUT');
      return api.post(`/workspace/expenses/${id}`, data);
    }
    return api.put(`/workspace/expenses/${id}`, data);
  },
  destroy: (id) => api.delete(`/workspace/expenses/${id}`),
  bulk: (payload) => api.post('/workspace/expenses/bulk', payload),
};
