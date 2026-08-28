import api from '@/lib/api';

export const syncApi = {
  status: () => api.get('/workspace/sync/status'),
  registerDevice: (data) => api.post('/workspace/sync/devices/register', data),
  push: (data) => api.post('/workspace/sync/push', data),
  pull: (params) => api.get('/workspace/sync/pull', { params }),
  bootstrap: (params) => api.get('/workspace/sync/bootstrap', { params }),
  leasePool: (data) => api.post('/workspace/sync/pools/lease', data),
  admin: () => api.get('/workspace/sync/admin'),
};
