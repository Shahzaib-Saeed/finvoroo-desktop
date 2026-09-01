import api from '@/lib/api';

export const posApi = {
  bootstrap: (params) => api.get('/workspace/pos/bootstrap', { params }),
  catalog: (params) => api.get('/workspace/pos/catalog', { params }),
  recentProducts: (params) => api.get('/workspace/pos/recent-products', { params }),
  recentSales: (params) => api.get('/workspace/pos/recent-sales', { params }),
  barcode: (code, params) => api.get('/workspace/pos/barcode', { params: { code, ...params } }),
  walkIn: () => api.post('/workspace/pos/walk-in'),
  quickCustomer: (data) => api.post('/workspace/pos/customers/quick', data),
  managerUnlock: (data) => api.post('/workspace/pos/manager-unlock', data),
  quote: (data) => api.post('/workspace/pos/quote', data),
  checkout: (data, config) => api.post('/workspace/pos/checkout', data, config),
  openShift: (data) => api.post('/workspace/pos/shifts/open', data),
  closeShift: (id, data) => api.post(`/workspace/pos/shifts/${id}/close`, data),
  xReport: (id) => api.get(`/workspace/pos/shifts/${id}/x-report`),
  shiftHistory: () => api.get('/workspace/pos/shifts/history'),
  holds: {
    list: () => api.get('/workspace/pos/holds'),
    create: (data) => api.post('/workspace/pos/holds', data),
    show: (id) => api.get(`/workspace/pos/holds/${id}`),
    destroy: (id) => api.delete(`/workspace/pos/holds/${id}`),
  },
};
