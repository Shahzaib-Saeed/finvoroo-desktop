import api from '@/lib/api';

export const permissionsApi = {
  getMatrix: () => api.get('/workspace/permissions'),
  updateModule: (payload) => api.patch('/workspace/permissions/module', payload),
  updateSingle: (payload) => api.patch('/workspace/permissions/single', payload),
  applyPreset: (payload) => api.post('/workspace/permissions/apply-preset', payload),
};
