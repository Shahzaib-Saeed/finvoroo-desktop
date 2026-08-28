import api from '@/lib/api';

export const vendorCreditsApi = {
  list: (params) => api.get('/workspace/vendor-credits', { params }),
  show: (id) => api.get(`/workspace/vendor-credits/${id}`),
  create: (data) => api.post('/workspace/vendor-credits', data),
  update: (id, data) => api.put(`/workspace/vendor-credits/${id}`, data),
  delete: (id) => api.delete(`/workspace/vendor-credits/${id}`),
  formOptions: () => api.get('/workspace/vendor-credits/form-options'),
  billLines: (billId, params) =>
    api.get(`/workspace/bills/${billId}/vendor-credit-lines`, { params }),
};
