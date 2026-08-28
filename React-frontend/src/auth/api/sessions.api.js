import api from '@/lib/api';

export const sessionsApi = {
  list: () => api.get('/auth/sessions'),
  revoke: (sessionId) => api.delete(`/auth/sessions/${sessionId}`),
  revokeOthers: () => api.delete('/auth/sessions'),
};
