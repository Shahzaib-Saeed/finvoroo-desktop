import api from '@/lib/api';

const opts = { skipCompanyHeader: true };

export const companiesApi = {
  list: () => api.get('/companies', opts),
  listTrash: () => api.get('/companies/trash', opts),
  show: (id) => api.get(`/companies/${id}`, opts),
  update: (id, data) => api.put(`/companies/${id}`, data, opts),
  toggleStatus: (id) => api.post(`/companies/${id}/toggle-status`, {}, opts),
  /** Move company to trash (30-day retention). */
  delete: (id, data) => api.delete(`/companies/${id}`, { ...opts, data }),
  restore: (id) => api.post(`/companies/${id}/restore`, {}, opts),
  forceDelete: (id, data) => api.delete(`/companies/${id}/force`, { ...opts, data }),
  emptyTrash: (data) => api.delete('/companies/trash', { ...opts, data }),
};

export const TRASH_RETENTION_DAYS = 30;
