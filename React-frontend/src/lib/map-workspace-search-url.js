/**
 * Map legacy Blade workspace URLs from search API to React router paths.
 */
export function mapWorkspaceSearchUrl(url, companyId) {
  if (!url || !companyId) return url;

  let path;
  try {
    const parsed = new URL(url, window.location.origin);
    path = parsed.pathname;
  } catch {
    path = url.startsWith('/') ? url : `/${url}`;
  }

  path = path
    .replace(/\/products\/view\/(\d+)/i, '/products/$1')
    .replace(/\/coa-v2\/(\d+)\/edit/i, '/chart-of-accounts')
    .replace(/\/journal\/view\/(\d+)/i, '/journal/$1')
    .replace(/\/customers\/show\/(\d+)/i, '/customers/$1');

  const parts = path.split('/').filter(Boolean);
  if (parts[0] === 'workspace') {
    const roots = ['accounting', 'employee', 'production-orders', 'help', 'notifications'];
    if (roots.includes(parts[1])) {
      return `/workspace/${companyId}/${parts.slice(1).join('/')}`;
    }
    if (parts[1] === String(companyId)) {
      return path.startsWith('/') ? path : `/${path}`;
    }
  }

  const companyMatch = path.match(/client_company\/(\d+)/i);
  if (companyMatch) {
    return `/workspace/${companyMatch[1]}`;
  }

  return path.startsWith('/') ? path : `/${path}`;
}
