import api from '@/lib/api';

/**
 * Reports & Analytics Center hub (Phase 2 of the reporting platform).
 * Mirrors Api\V1\Workspace\ReportCenterController — catalog listing,
 * saved report CRUD, favorite/recent/share actions. Standard reports
 * themselves still run through `reportsApi` (reports.api.js) unchanged.
 */
export const reportCenterApi = {
  index: () => api.get('/workspace/report-center'),

  showDefinition: (id) => api.get(`/workspace/report-center/definitions/${id}`),

  createDefinition: (payload) => api.post('/workspace/report-center/definitions', payload),
  updateDefinition: (id, payload) => api.put(`/workspace/report-center/definitions/${id}`, payload),
  duplicateDefinition: (id) => api.post(`/workspace/report-center/definitions/${id}/duplicate`),
  archiveDefinition: (id) => api.post(`/workspace/report-center/definitions/${id}/archive`),
  shareDefinition: (id, payload) => api.post(`/workspace/report-center/definitions/${id}/share`, payload),
  unshareDefinition: (id, payload) => api.post(`/workspace/report-center/definitions/${id}/unshare`, payload),

  toggleFavorite: (payload) => api.post('/workspace/report-center/favorites/toggle', payload),
  recordView: (payload) => api.post('/workspace/report-center/recent-views', payload),
};
