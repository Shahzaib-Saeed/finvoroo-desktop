import api from '@/lib/api';

export const inventoryApi = {
  overview: () => api.get('/workspace/inventory/overview'),
  stockLevels: (params) => api.get('/workspace/inventory/stock-levels', { params }),
};
