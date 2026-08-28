import api from '@/lib/api';

export const helpApi = {
  getAccount: () => api.get('/help'),
  get: () => api.get('/workspace/help'),
  restartTour: () => api.post('/workspace/help/tour/restart'),
};
