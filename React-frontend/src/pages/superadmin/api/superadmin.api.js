import api from '@/lib/api';

export const superadminApi = {
  dashboard: () => api.get('/superadmin/dashboard', { skipCompanyHeader: true }),
  plans: () => api.get('/superadmin/plans', { skipCompanyHeader: true }),
  listUsers: () => api.get('/superadmin/users', { skipCompanyHeader: true }),
  showUser: (id) => api.get(`/superadmin/users/${id}`, { skipCompanyHeader: true }),
  createAccountOwner: (data) =>
    api.post('/superadmin/account-owners', data, { skipCompanyHeader: true }),
  updateUser: (id, data) =>
    api.put(`/superadmin/users/${id}`, data, { skipCompanyHeader: true }),
  deleteUser: (id) => api.delete(`/superadmin/users/${id}`, { skipCompanyHeader: true }),
  toggleUserStatus: (id) =>
    api.post(`/superadmin/users/${id}/toggle-status`, {}, { skipCompanyHeader: true }),
  listAccountOwners: () => api.get('/superadmin/account-owners', { skipCompanyHeader: true }),
  ownerCompanies: (ownerId) =>
    api.get(`/superadmin/account-owners/${ownerId}/companies`, { skipCompanyHeader: true }),
};
