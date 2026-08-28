import { create } from 'zustand';
import api from '@/lib/api';
import { authCookies, clearLegacyAuthStorage } from '@/auth/auth-cookies';

const SUPERADMIN_BROWSING_KEY = 'superadmin_browsing_owner_id';

/** Only workspaces the user should be able to open (active company + membership). */
export function activeCompaniesOnly(companies) {
  return (companies ?? []).filter(
    (c) => c && c.is_active !== false && c.is_active !== 0,
  );
}

function resolveActiveCompany(companies, companyId) {
  if (!companyId || !companies?.length) return null;
  return companies.find((c) => String(c.id) === String(companyId)) || null;
}

export const useAuthStore = create((set, get) => ({
  token: null,
  user: null,
  companies: [],
  activeCompany: null,
  hydrated: false,
  hydrating: false,
  permissions: [],
  isFullAccess: false,
  effectiveRole: null,
  permissionsLoaded: false,

  get isAuthenticated() {
    return !!get().token;
  },

  isSuperAdmin() {
    return (get().user?.role ?? '') === 'super_admin';
  },

  /** True if the user's effective permission set includes `slug`. Super admin / company owner / any other full-access role always passes. */
  hasPermission(slug) {
    const state = get();
    if (state.isFullAccess) return true;
    return state.permissions.includes(slug);
  },

  /**
   * Fetch the effective permission set for the current company. Safe to call
   * whenever `activeCompany` changes (login's company selection, a company
   * switch, or hydrate() resolving a stored company on refresh) — permissions
   * are per-company-membership, so they must be refetched every time.
   * Follows the same resilience rule as hydrate(): a transient failure keeps
   * whatever permissions are already in state rather than clearing them.
   */
  async fetchPermissions() {
    if (!get().activeCompany?.id) {
      set({ permissions: [], isFullAccess: false, effectiveRole: null, permissionsLoaded: true });
      return;
    }
    try {
      const res = await api.get('/workspace/access');
      const data = res.data?.data || {};
      set({
        permissions: data.permissions ?? [],
        isFullAccess: !!data.is_full_access,
        effectiveRole: data.role ?? null,
        permissionsLoaded: true,
      });
    } catch {
      set({ permissionsLoaded: true });
    }
  },

  setSuperAdminBrowsing(ownerId) {
    if (typeof sessionStorage === 'undefined') return;
    if (ownerId) {
      sessionStorage.setItem(SUPERADMIN_BROWSING_KEY, String(ownerId));
    } else {
      sessionStorage.removeItem(SUPERADMIN_BROWSING_KEY);
    }
  },

  clearSuperAdminBrowsing() {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.removeItem(SUPERADMIN_BROWSING_KEY);
  },

  getSuperAdminBrowsingOwnerId() {
    if (typeof sessionStorage === 'undefined') return null;
    return sessionStorage.getItem(SUPERADMIN_BROWSING_KEY);
  },

  clearSession() {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(SUPERADMIN_BROWSING_KEY);
    }
    authCookies.clearAll();
    clearLegacyAuthStorage();
    set({
      token: null,
      user: null,
      companies: [],
      activeCompany: null,
      hydrated: true,
      hydrating: false,
      permissions: [],
      isFullAccess: false,
      effectiveRole: null,
      permissionsLoaded: false,
    });
  },

  async hydrate() {
    if (get().hydrating) return;
    clearLegacyAuthStorage();

    const token = authCookies.getToken();
    if (!token) {
      set({ token: null, user: null, companies: [], activeCompany: null, hydrated: true, hydrating: false });
      return;
    }

    set({ hydrating: true, token });

    try {
      const res = await api.get('/auth/me');
      const data = res.data?.data || {};
      const user = data.user ?? null;
      const companies = data.companies ?? [];
      const companyId = authCookies.getCompanyId();
      const activeCompany = resolveActiveCompany(companies, companyId);

      set({
        token,
        user,
        companies,
        activeCompany,
        hydrated: true,
        hydrating: false,
      });

      if (activeCompany) {
        await get().fetchPermissions();
      }
    } catch (err) {
      // Only a genuine "invalid session" (401) should log the user out. A transient
      // failure — rate limit (429), network blip, 5xx — must not: on a page refresh
      // that happens to land during a temporary hiccup, wiping the token here would
      // force a real logout for a problem that resolves itself on the very next
      // request. Leave the token/cookies alone and mark hydration done so the UI
      // unblocks; subsequent API calls (which do their own 401 handling) will still
      // catch a truly expired session.
      if (err?.response?.status === 401) {
        authCookies.clearAll();
        set({
          token: null,
          user: null,
          companies: [],
          activeCompany: null,
          hydrated: true,
          hydrating: false,
          permissions: [],
          isFullAccess: false,
          effectiveRole: null,
          permissionsLoaded: false,
        });
      } else {
        set({ hydrated: true, hydrating: false });
      }
    }
  },

  login(token, user, companies, remember = false) {
    authCookies.setToken(token, remember);
    authCookies.clearCompanyId();

    const list = activeCompaniesOnly(companies ?? []);

    set({
      token,
      user,
      companies: list,
      activeCompany: null,
      hydrated: true,
      hydrating: false,
    });
  },

  clearActiveCompany() {
    authCookies.clearCompanyId();
    set({ activeCompany: null, permissions: [], isFullAccess: false, effectiveRole: null, permissionsLoaded: false });
  },

  /** Leave a company workspace — required before account-owner pages/API calls. */
  enterAccountOwnerShell() {
    authCookies.clearCompanyId();
    set({ activeCompany: null, permissions: [], isFullAccess: false, effectiveRole: null, permissionsLoaded: false });
  },

  setCompanies(companies) {
    set({ companies: activeCompaniesOnly(companies ?? []) });
  },

  /** Permissions are per-company-membership — switching the active company always refetches them. */
  setActiveCompany(company) {
    if (!company?.id) return;
    authCookies.setCompanyId(company.id);
    set({ activeCompany: company });
    get().fetchPermissions();
  },

  setActiveCompanyById(companyId) {
    const company = resolveActiveCompany(get().companies, companyId);
    if (company) {
      get().setActiveCompany(company);
    } else if (companyId) {
      authCookies.setCompanyId(companyId);
    }
  },

  updateUser(user) {
    set({ user });
  },

  async logout() {
    const token = authCookies.getToken();
    get().clearSession();
    if (token) {
      try {
        await api.post('/auth/logout');
      } catch {
        // token may already be invalid
      }
    }
  },
}));
