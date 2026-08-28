/** Design tokens for Reports Overview — UI-only, no backend coupling. */

export const STAT_CARD_THEMES = {
  total: {
    tint: 'bg-blue-500/[0.06]',
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-600',
    ring: 'hover:ring-blue-500/20',
  },
  my: {
    tint: 'bg-emerald-500/[0.06]',
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-600',
    ring: 'hover:ring-emerald-500/20',
  },
  favorites: {
    tint: 'bg-amber-500/[0.06]',
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-600',
    ring: 'hover:ring-amber-500/20',
  },
  shared: {
    tint: 'bg-purple-500/[0.06]',
    iconBg: 'bg-purple-500/10',
    iconColor: 'text-purple-600',
    ring: 'hover:ring-purple-500/20',
  },
  recent: {
    tint: 'bg-indigo-500/[0.06]',
    iconBg: 'bg-indigo-500/10',
    iconColor: 'text-indigo-600',
    ring: 'hover:ring-indigo-500/20',
  },
  templates: {
    tint: 'bg-rose-500/[0.06]',
    iconBg: 'bg-rose-500/10',
    iconColor: 'text-rose-600',
    ring: 'hover:ring-rose-500/20',
  },
};

export const TEMPLATE_CATEGORY_COLORS = {
  accounting: { bg: 'bg-blue-500/10', text: 'text-blue-600', bar: 'bg-blue-500' },
  sales: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', bar: 'bg-emerald-500' },
  purchasing: { bg: 'bg-amber-500/10', text: 'text-amber-600', bar: 'bg-amber-500' },
  inventory: { bg: 'bg-purple-500/10', text: 'text-purple-600', bar: 'bg-purple-500' },
};

export function datasetDisplayName(key) {
  const map = {
    'accounting.general_ledger': 'General Ledger',
    'accounting.trial_balance': 'Trial Balance',
    'sales.ar_ledger': 'Accounts Receivable',
    'purchasing.ap_ledger': 'Accounts Payable',
    'inventory.stock_summary': 'Inventory',
  };
  return map[key] || key?.split('.').pop()?.replace(/_/g, ' ') || 'Report';
}

export function estimateTemplateSetup(template) {
  const def = template?.definition;
  if (def?.group_by?.length || def?.aggregations?.length) return '~3 min';
  if ((def?.columns?.length ?? 0) > 5) return '~3 min';
  return '~2 min';
}
