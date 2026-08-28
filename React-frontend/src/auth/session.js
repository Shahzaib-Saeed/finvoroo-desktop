import { toast } from 'sonner';
import { authCookies, clearLegacyAuthStorage } from './auth-cookies';

let sessionRedirectInFlight = false;

export function getSignInPath() {
  const base = import.meta.env.BASE_URL || '/';
  const normalized = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${normalized || ''}/auth/signin`.replace(/\/+/g, '/') || '/auth/signin';
}

export function isAuthRoute(pathname = '') {
  return (
    pathname.includes('/auth/signin') ||
    pathname.includes('/auth/reset-password') ||
    pathname.includes('/superadmin/login')
  );
}

export function getSuperAdminSignInPath() {
  const base = import.meta.env.BASE_URL || '/';
  const normalized = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${normalized || ''}/superadmin/login`.replace(/\/+/g, '/') || '/superadmin/login';
}

/**
 * Clear credentials and send the user to sign-in (full navigation so guards re-run).
 */
export function handleSessionExpired(message = 'Session expired. Please sign in again.') {
  if (typeof window === 'undefined') return;
  if (sessionRedirectInFlight || isAuthRoute(window.location.pathname)) return;

  sessionRedirectInFlight = true;
  authCookies.clearAll();
  clearLegacyAuthStorage();

  toast.error(message);

  const returnTo = `${window.location.pathname}${window.location.search}`;
  const onSuperAdminRoute = window.location.pathname.startsWith('/superadmin');
  const signIn = onSuperAdminRoute ? getSuperAdminSignInPath() : getSignInPath();
  const next =
    returnTo && !isAuthRoute(returnTo)
      ? `?next=${encodeURIComponent(returnTo)}`
      : '';

  window.location.assign(`${signIn}${next}`);
}

export function resetSessionRedirectFlag() {
  sessionRedirectInFlight = false;
}
