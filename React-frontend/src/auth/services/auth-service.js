import { authCookies } from '@/auth/auth-cookies';
import { useAuthStore } from '@/store/authStore';

/**
 * Thin facade over cookie storage + auth store (keeps older imports working).
 */
export const authService = {
  async login(email, password, rememberMe = false) {
    const { default: api } = await import('@/lib/api');
    const response = await api.post('/auth/login', {
      email,
      password,
      remember: !!rememberMe,
    });
    const { token, user, companies } = response.data.data;
    useAuthStore.getState().login(token, user, companies, !!rememberMe);
    return { token, user, companies };
  },

  async logout() {
    await useAuthStore.getState().logout();
  },

  getToken() {
    return authCookies.getToken();
  },

  getUser() {
    return useAuthStore.getState().user;
  },

  isAuthenticated() {
    return !!authCookies.getToken();
  },

  getCompanies() {
    return useAuthStore.getState().companies;
  },

  getCompanyId() {
    return authCookies.getCompanyId();
  },

  setCompanyId(id) {
    useAuthStore.getState().setActiveCompanyById(id);
  },
};
