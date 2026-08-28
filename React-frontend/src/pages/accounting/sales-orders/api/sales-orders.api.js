import api from '@/lib/api';

export const salesOrdersApi = {
  list: (params) => api.get('/workspace/sales-orders', { params }),
  show: (id) => api.get(`/workspace/sales-orders/${id}`),
  create: (data) => api.post('/workspace/sales-orders', data),
  update: (id, data) => api.put(`/workspace/sales-orders/${id}`, data),
  delete: (id) => api.delete(`/workspace/sales-orders/${id}`),
  complete: (id) => api.post(`/workspace/sales-orders/${id}/complete`),
  convertToInvoice: (id) => api.post(`/workspace/sales-orders/${id}/convert-to-invoice`),
  formOptions: () => api.get('/workspace/sales-orders/form-options'),
  customerContext: (customerId) =>
    api.get(`/workspace/customers/${customerId}/invoice-context`),
};
