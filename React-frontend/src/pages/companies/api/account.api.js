import api from '@/lib/api';

export const accountApi = {
  overview: () => api.get('/account/overview', { skipCompanyHeader: true }),
};
