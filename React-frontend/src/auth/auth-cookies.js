/**
 * Auth persistence via HTTP cookies (not localStorage).
 * Session cookies when "remember me" is off; 30-day cookies when on.
 */

const COOKIE_TOKEN = 'erp_auth_token';
const COOKIE_COMPANY_ID = 'erp_auth_company_id';
const COOKIE_REMEMBER = 'erp_auth_remember';

const REMEMBER_MAX_AGE_DAYS = 30;

function isSecureContext() {
  return typeof window !== 'undefined' && window.location.protocol === 'https:';
}

function readCookie(name) {
  if (typeof document === 'undefined') return null;
  const pattern = `(?:^|; )${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}=([^;]*)`;
  const match = document.cookie.match(new RegExp(pattern));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name, value, maxAgeDays) {
  if (typeof document === 'undefined') return;
  const parts = [
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
    'path=/',
    'SameSite=Lax',
  ];
  if (maxAgeDays != null) {
    parts.push(`max-age=${Math.floor(maxAgeDays * 24 * 60 * 60)}`);
  }
  if (isSecureContext()) {
    parts.push('Secure');
  }
  document.cookie = parts.join('; ');
}

function deleteCookie(name) {
  if (typeof document === 'undefined') return;
  writeCookie(name, '', 0);
}

function rememberDays() {
  return readCookie(COOKIE_REMEMBER) === '1' ? REMEMBER_MAX_AGE_DAYS : null;
}

/** Remove legacy localStorage keys from older builds. */
export function clearLegacyAuthStorage() {
  if (typeof localStorage === 'undefined') return;
  ['auth_token', 'auth_user', 'auth_companies', 'auth_company_id'].forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  });
}

export const authCookies = {
  getToken() {
    return readCookie(COOKIE_TOKEN);
  },

  setToken(token, remember = false) {
    if (remember) {
      writeCookie(COOKIE_REMEMBER, '1', REMEMBER_MAX_AGE_DAYS);
    } else {
      deleteCookie(COOKIE_REMEMBER);
    }
    const maxAge = remember ? REMEMBER_MAX_AGE_DAYS : null;
    writeCookie(COOKIE_TOKEN, token, maxAge);
  },

  getCompanyId() {
    return readCookie(COOKIE_COMPANY_ID);
  },

  setCompanyId(companyId) {
    writeCookie(COOKIE_COMPANY_ID, String(companyId), rememberDays());
  },

  clearCompanyId() {
    deleteCookie(COOKIE_COMPANY_ID);
  },

  isRemembered() {
    return readCookie(COOKIE_REMEMBER) === '1';
  },

  clearAll() {
    deleteCookie(COOKIE_TOKEN);
    deleteCookie(COOKIE_COMPANY_ID);
    deleteCookie(COOKIE_REMEMBER);
    clearLegacyAuthStorage();
  },
};
