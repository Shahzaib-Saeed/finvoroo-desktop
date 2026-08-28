import api from '@/lib/api';

export const integrityCheckApi = {
  index: (params) => api.get('/workspace/accounting/integrity-checks', { params }),
  runNow: () => api.post('/workspace/accounting/integrity-checks/run-now'),
};
