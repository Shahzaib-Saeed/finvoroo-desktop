import api from '@/lib/api';

export const auditLogsApi = {
  list: (params) => api.get('/workspace/audit-logs', { params }),
  show: (id) => api.get(`/workspace/audit-logs/${id}`),
  stats: (params) => api.get('/workspace/audit-logs/stats', { params }),
  integrityStatus: () => api.get('/workspace/audit-logs/integrity-status'),

  /** Streams the current filter selection as CSV (see AuditLogController@export). */
  exportCsv: (params) =>
    api.get('/workspace/audit-logs/export', {
      params,
      responseType: 'blob',
    }),
};
