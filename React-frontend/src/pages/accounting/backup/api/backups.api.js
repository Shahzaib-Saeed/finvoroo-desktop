import api from '@/lib/api';
import { authCookies } from '@/auth/auth-cookies';
import { getApiBaseUrl } from '@/lib/desktop-app';

const base = getApiBaseUrl();

export const backupsApi = {
  list: (params) => api.get('/workspace/backups', { params }),
  get: (id) => api.get(`/workspace/backups/${id}`),
  preview: (id) => api.get(`/workspace/backups/${id}/preview`),
  previewUpload: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/workspace/backups/preview', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  settings: () => api.get('/workspace/backups/settings'),
  updateSettings: (data) => api.put('/workspace/backups/settings', data),
  create: (data = {}) => api.post('/workspace/backups', data),
  remove: (id) => api.delete(`/workspace/backups/${id}`),
  restoreById: (id) =>
    api.post(`/workspace/backups/${id}/restore`, { confirm: 1 }),
  restoreUpload: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('confirm', '1');
    return api.post('/workspace/backups/restore', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  cloudStatus: () => api.get('/workspace/backups/cloud'),
  cloudConnect: () => api.post('/workspace/backups/cloud/connect'),
  cloudDisconnect: () => api.delete('/workspace/backups/cloud/disconnect'),
};

export async function downloadBackupFile(backupId, filename) {
  const token = authCookies.getToken();
  const companyId = authCookies.getCompanyId();
  const url = `${base}/workspace/backups/${backupId}/download`;

  const res = await fetch(url, {
    headers: {
      Accept: 'application/json, application/zip, */*',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(companyId ? { 'X-Company-ID': String(companyId) } : {}),
    },
  });

  if (!res.ok) {
    let message = 'Download failed';
    try {
      const data = await res.json();
      message = data?.message || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  const safeName = String(filename || `backup-${backupId}.zip`).replace(/\.enc$/i, '');
  link.download = safeName;
  link.click();
  URL.revokeObjectURL(link.href);
}
