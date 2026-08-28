import api from '@/lib/api';

export const productionOrdersApi = {
  list: (params) => api.get('/workspace/production-orders', { params }),
  show: (id) => api.get(`/workspace/production-orders/${id}`),
  create: (data) => api.post('/workspace/production-orders', data),
  update: (id, data) => api.put(`/workspace/production-orders/${id}`, data),
  destroy: (id) => api.delete(`/workspace/production-orders/${id}`),
  formOptions: () => api.get('/workspace/production-orders/form-options'),
  complete: (id, data) => api.post(`/workspace/production-orders/${id}/complete`, data),
  duplicate: (id) => api.post(`/workspace/production-orders/${id}/duplicate`),
  bulkStatus: (data) => api.post('/workspace/production-orders/bulk-status', data),
  getBom: (productId) => api.get(`/workspace/production-orders/bom/${productId}`),
  getMaterialUnitCost: (productId) =>
    api.get(`/workspace/production-orders/material-cost/${productId}`),
  saveBom: (data) => api.post('/workspace/production-orders/bom', data),
  fromSalesOrder: (salesOrderId, params) =>
    api.get(`/workspace/production-orders/from-sales-order/${salesOrderId}`, { params }),
  exportCsvUrl: (params) => {
    const base = import.meta.env.VITE_API_BASE_URL || '/api/v1';
    const qs = new URLSearchParams(params).toString();
    return `${base}/workspace/production-orders/export/csv${qs ? `?${qs}` : ''}`;
  },
};
