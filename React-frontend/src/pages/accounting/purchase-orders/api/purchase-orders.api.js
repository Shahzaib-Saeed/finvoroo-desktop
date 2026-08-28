import api from '@/lib/api';

export const purchaseOrdersApi = {
  list: (params) => api.get('/workspace/purchase-orders', { params }),
  show: (id) => api.get(`/workspace/purchase-orders/${id}`),
  create: (data) => api.post('/workspace/purchase-orders', data),
  update: (id, data) => api.put(`/workspace/purchase-orders/${id}`, data),
  delete: (id) => api.delete(`/workspace/purchase-orders/${id}`),
  convertToBill: (id) => api.post(`/workspace/purchase-orders/${id}/convert-to-bill`),
  formOptions: () => api.get('/workspace/purchase-orders/form-options'),
  vendorContext: (vendorId) => api.get(`/workspace/vendors/${vendorId}/bill-context`),
};
