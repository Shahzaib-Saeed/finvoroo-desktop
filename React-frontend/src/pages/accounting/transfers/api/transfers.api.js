import api from '@/lib/api';

export const transfersApi = {
  list: (params) => api.get('/workspace/transfers', { params }),
  show: (id) => api.get(`/workspace/transfers/${id}`),
  create: (data) => api.post('/workspace/transfers', data),
  formOptions: () => api.get('/workspace/transfers/form-options'),
};
