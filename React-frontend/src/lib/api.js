import axios from 'axios';
import { authCookies } from '@/auth/auth-cookies';
import { handleSessionExpired, isAuthRoute } from '@/auth/session';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = authCookies.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (!config.skipCompanyHeader) {
    const workspaceCompanyId =
      typeof window !== 'undefined'
        ? window.location.pathname.match(/^\/workspace\/(\d+)(?:\/|$)/)?.[1]
        : null;
    const storedCompanyId = authCookies.getCompanyId();
    const companyId = workspaceCompanyId || storedCompanyId;

    if (workspaceCompanyId && workspaceCompanyId !== storedCompanyId) {
      authCookies.setCompanyId(workspaceCompanyId);
    }

    if (companyId) {
      config.headers['X-Company-ID'] = companyId;
    }
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  // Prevent browsers/proxies from serving stale GET responses (e.g. form-options dropdowns).
  const method = String(config.method || 'get').toLowerCase();
  if (method === 'get' && !config.skipCacheBust) {
    config.params = { ...config.params, _: Date.now() };
  }
  return config;
});

function shouldHandleUnauthorized(error, config) {
  if (!error.response || error.response.status !== 401) return false;
  const url = config?.url || '';
  if (url.includes('/auth/login')) return false;
  if (isAuthRoute(window.location.pathname)) return false;
  return true;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (shouldHandleUnauthorized(error, error.config)) {
      handleSessionExpired(
        error.response?.data?.message || 'Session expired. Please sign in again.',
      );
    }
    return Promise.reject(error);
  },
);

export default api;
