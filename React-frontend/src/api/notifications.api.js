import api from '@/lib/api';

const endpoints = {
  account: {
    list: '/notifications',
    read: (id) => `/notifications/${id}/read`,
    readAll: '/notifications/read-all',
  },
  workspace: {
    list: '/workspace/notifications',
    read: (id) => `/workspace/notifications/${id}/read`,
    readAll: '/workspace/notifications/read-all',
  },
};

const accountRequestConfig = { skipCompanyHeader: true };

export function notificationsApi(scope = 'workspace') {
  const paths = endpoints[scope] || endpoints.workspace;
  const baseConfig = scope === 'account' ? accountRequestConfig : {};

  return {
    list: (params) => api.get(paths.list, { params, ...baseConfig }),
    markRead: (id) => api.post(paths.read(id), null, baseConfig),
    markAllRead: () => api.post(paths.readAll, null, baseConfig),
  };
}
