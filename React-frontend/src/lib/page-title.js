export const SUPERADMIN_BROWSING_KEY = 'superadmin_browsing_owner_id';

const APP_NAME = 'Finvoroo';

const EXACT_TITLES = {
  '/': 'Dashboard',
  '/dashboard': 'Dashboard',
  '/profile': 'Profile',
  '/companies': 'Companies',
  '/companies/create': 'Create Company',
  '/select-company': 'Select Company',
  '/help': 'Help',
  '/auth/signin': 'Sign In',
  '/superadmin/login': 'Super Admin Sign In',
  '/superadmin/dashboard': 'Super Admin Dashboard',
  '/superadmin/users': 'Users',
  '/superadmin/users/create': 'Create Account Owner',
  '/superadmin/account-owners': 'Account Owners',
};

const WORKSPACE_TITLE_RULES = [
  [/^\/?workspace\/[^/]+\/accounting\/invoices\/create$/, 'New Invoice'],
  [/^\/?workspace\/[^/]+\/accounting\/invoices\/[^/]+\/edit$/, 'Edit Invoice'],
  [/^\/?workspace\/[^/]+\/accounting\/invoices\/[^/]+$/, 'Invoice'],
  [/^\/?workspace\/[^/]+\/accounting\/invoices$/, 'Invoices'],
  [/^\/?workspace\/[^/]+\/accounting\/payments\/[^/]+\/edit$/, 'Edit Receipt'],
  [/^\/?workspace\/[^/]+\/accounting\/payments\/[^/]+$/, 'Receipt'],
  [/^\/?workspace\/[^/]+\/accounting\/payments$/, 'Receipts'],
  [/^\/?workspace\/[^/]+\/accounting\/customers\/create$/, 'New Customer'],
  [/^\/?workspace\/[^/]+\/accounting\/customers\/[^/]+\/edit$/, 'Edit Customer'],
  [/^\/?workspace\/[^/]+\/accounting\/customers\/[^/]+$/, 'Customer'],
  [/^\/?workspace\/[^/]+\/accounting\/customers$/, 'Customers'],
  [/^\/?workspace\/[^/]+\/accounting\/chart-of-accounts$/, 'Chart of Accounts'],
  [/^\/?workspace\/[^/]+\/accounting\/settings$/, 'Accounting Settings'],
  [/^\/?workspace\/[^/]+\/accounting\/integrity-check$/, 'Accounting Health Check'],
  [/^\/?workspace\/[^/]+\/accounting\/reports$/, 'Reports'],
  [/^\/?workspace\/[^/]+\/accounting\/audit-logs$/, 'Audit Logs'],
  [/^\/?workspace\/[^/]+\/accounting\/permissions$/, 'Roles & Permissions'],
  [/^\/?workspace\/[^/]+\/accounting$/, 'Accounting'],
  [/^\/?workspace\/[^/]+\/employee\/create$/, 'New Employee'],
  [/^\/?workspace\/[^/]+\/employee$/, 'Employees'],
  [/^\/?workspace\/[^/]+\/help$/, 'Help'],
  [/^\/?workspace\/[^/]+$/, 'Workspace Dashboard'],
];

function normalizePath(pathname = '') {
  const base = import.meta.env.BASE_URL || '/';
  let path = pathname || '/';
  if (base !== '/' && path.startsWith(base)) {
    path = path.slice(base.length - 1) || '/';
  }
  if (path.length > 1 && path.endsWith('/')) {
    path = path.slice(0, -1);
  }
  return path;
}

function formatTitle(pageTitle, section = APP_NAME) {
  return pageTitle ? `${pageTitle} | ${section}` : section;
}

export function resolvePageTitle(pathname) {
  const path = normalizePath(pathname);

  if (EXACT_TITLES[path]) {
    if (path.startsWith('/superadmin')) {
      return formatTitle(EXACT_TITLES[path], 'Super Admin');
    }
    return formatTitle(EXACT_TITLES[path]);
  }

  if (/^\/?superadmin\/account-owners\/[^/]+\/companies$/.test(path)) {
    return formatTitle('Owner Companies', 'Super Admin');
  }

  for (const [pattern, title] of WORKSPACE_TITLE_RULES) {
    if (pattern.test(path)) {
      return formatTitle(title);
    }
  }

  if (path.startsWith('/workspace/')) {
    return formatTitle('Workspace');
  }

  if (path.startsWith('/superadmin/')) {
    return formatTitle('Super Admin', 'Super Admin');
  }

  return APP_NAME;
}

export function setPageTitle(title, section = 'Super Admin') {
  if (typeof document === 'undefined') return;
  document.title = title ? `${title} | ${section}` : section;
}
