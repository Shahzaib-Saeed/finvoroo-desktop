/** Route patterns → help center entry (future contextual help from any ERP page). */
export const CONTEXTUAL_HELP_ROUTES = [
  { match: /\/invoices\/create/i, topic: 'invoices', query: 'create invoice', label: 'Create Invoice' },
  { match: /\/invoices/i, topic: 'invoices', query: 'invoice lifecycle', label: 'Invoicing' },
  { match: /\/payments/i, topic: 'payments', query: 'customer payment', label: 'Customer Payment' },
  { match: /\/pos/i, topic: 'pos', query: 'pos sale', label: 'POS' },
  { match: /\/reports/i, topic: 'reports', query: 'reports', label: 'Reports' },
  { match: /\/settings/i, topic: 'settings', query: 'settings', label: 'Settings' },
  { match: /\/permissions|\/roles/i, topic: 'permissions', query: 'roles permissions', label: 'Roles & Permissions' },
  { match: /\/bills|\/purchase/i, topic: 'purchases', query: 'vendor bill', label: 'Purchases' },
  { match: /\/inventory|\/products/i, topic: 'inventory', query: 'inventory stock', label: 'Inventory' },
  { match: /\/bank/i, topic: 'banking', query: 'bank reconciliation', label: 'Banking' },
  { match: /\/tax/i, topic: 'tax', query: 'tax rate', label: 'Tax' },
];

export function resolveContextualHelp(pathname = '') {
  const hit = CONTEXTUAL_HELP_ROUTES.find((r) => r.match.test(pathname));
  return hit || null;
}

export function buildHelpUrl(workspaceBase, { query, topic, category } = {}) {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (topic) params.set('topic', topic);
  if (category) params.set('category', category);
  const qs = params.toString();
  return `${workspaceBase}/help${qs ? `?${qs}` : ''}`;
}
