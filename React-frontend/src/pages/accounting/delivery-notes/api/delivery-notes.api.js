import api from '@/lib/api';

export const deliveryNotesApi = {
  list: (params) => api.get('/workspace/delivery-notes', { params }),
  show: (id) => api.get(`/workspace/delivery-notes/${id}`),
  create: (data) => api.post('/workspace/delivery-notes', data),
  update: (id, data) => api.put(`/workspace/delivery-notes/${id}`, data),
  delete: (id) => api.delete(`/workspace/delivery-notes/${id}`),
  confirm: (id) => api.post(`/workspace/delivery-notes/${id}/confirm`),
  cancel: (id) => api.post(`/workspace/delivery-notes/${id}/cancel`),
  formOptions: () => api.get('/workspace/delivery-notes/form-options'),
  fromSalesOrder: (salesOrderId) =>
    api.get(`/workspace/delivery-notes/from-sales-order/${salesOrderId}`),
};
