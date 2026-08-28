export const throttle = (func, limit) => {
  let lastFunc = null;
  let lastRan = null;

  return function (...args) {
    if (lastRan === null) {
      func.apply(this, args);
      lastRan = Date.now();
    } else {
      if (lastFunc !== null) {
        clearTimeout(lastFunc);
      }
      lastFunc = setTimeout(
        () => {
          if (Date.now() - lastRan >= limit) {
            func.apply(this, args);
            lastRan = Date.now();
          }
        },
        limit - (Date.now() - lastRan),
      );
    }
  };
};

export function debounce(func, wait) {
  let timeout = null;

  return function (...args) {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

export function uid() {
  return (Date.now() + Math.floor(Math.random() * 1000)).toString();
}

export function getInitials(name, count) {
  if (!name || typeof name !== 'string') {
    return '';
  }

  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase());

  return count && count > 0
    ? initials.slice(0, count).join('')
    : initials.join('');
}

export function toAbsoluteUrl(pathname) {
  const baseUrl = import.meta.env.BASE_URL;

  if (baseUrl && baseUrl !== '/') {
    return import.meta.env.BASE_URL + pathname;
  } else {
    return pathname;
  }
}

/** Product name shown on printed receipts (e.g. Finvoroo). */
export function getSystemBrandName() {
  const name = String(import.meta.env.VITE_APP_NAME || 'Finvoroo').trim();
  return name || 'Finvoroo';
}

export function getSystemBrandTagline() {
  return String(import.meta.env.VITE_APP_TAGLINE || 'Enterprise Pharmacy POS').trim();
}

/** API origin from VITE_API_BASE_URL (e.g. https://api.finvoroo.com). */
export function apiOrigin() {
  const base = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
  if (!base) return '';
  try {
    return new URL(base).origin;
  } catch {
    return base.replace(/\/api\/v1$/i, '');
  }
}

/**
 * Resolve the logged-in user's avatar URL for display.
 * Prefers avatar_url from the API; falls back to /storage/{avatar}.
 */
export function resolveUserAvatarUrl(user) {
  if (!user) return null;

  const raw = user.avatar_url || user.avatar || null;
  if (!raw || typeof raw !== 'string') return null;

  if (/^https?:\/\//i.test(raw) || raw.startsWith('data:') || raw.startsWith('blob:')) {
    return raw;
  }

  const origin = apiOrigin();
  if (raw.startsWith('/')) {
    return origin ? `${origin}${raw}` : raw;
  }

  // Relative storage path (e.g. "avatars/xyz.jpg")
  const path = raw.startsWith('storage/') ? `/${raw}` : `/storage/${raw.replace(/^\//, '')}`;
  return origin ? `${origin}${path}` : path;
}

/** Company logo from API payload — absolute URL for print and cross-origin app hosts. */
export function resolveCompanyLogoUrl(company) {
  if (!company) return null;

  const raw = company.logo_url || company.logo || null;
  if (!raw || typeof raw !== 'string') return null;

  if (/^https?:\/\//i.test(raw) || raw.startsWith('data:') || raw.startsWith('blob:')) {
    return raw;
  }

  const origin = apiOrigin();
  if (raw.startsWith('/')) {
    return origin ? `${origin}${raw}` : raw;
  }

  const path = raw.startsWith('storage/') ? `/${raw}` : `/storage/${raw.replace(/^\//, '')}`;
  return origin ? `${origin}${path}` : path;
}

export function timeAgo(date) {
  const now = new Date();
  const inputDate = typeof date === 'string' ? new Date(date) : date;
  const diff = Math.floor((now.getTime() - inputDate.getTime()) / 1000);

  if (diff < 60) return 'just now';
  if (diff < 3600)
    return `${Math.floor(diff / 60)} minute${Math.floor(diff / 60) > 1 ? 's' : ''} ago`;
  if (diff < 86400)
    return `${Math.floor(diff / 3600)} hour${Math.floor(diff / 3600) > 1 ? 's' : ''} ago`;
  if (diff < 604800)
    return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) > 1 ? 's' : ''} ago`;
  if (diff < 2592000)
    return `${Math.floor(diff / 604800)} week${Math.floor(diff / 604800) > 1 ? 's' : ''} ago`;
  if (diff < 31536000)
    return `${Math.floor(diff / 2592000)} month${Math.floor(diff / 2592000) > 1 ? 's' : ''} ago`;

  return `${Math.floor(diff / 31536000)} year${Math.floor(diff / 31536000) > 1 ? 's' : ''} ago`;
}

export {
  formatDisplayDate as formatDate,
  formatDisplayDateTime as formatDateTime,
} from '@/lib/format-datetime';
