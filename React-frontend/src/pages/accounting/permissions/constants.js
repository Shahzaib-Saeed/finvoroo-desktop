/** Core matrix columns — keep the main grid lean (enterprise ERP pattern). */
export const MAIN_ACTIONS = ['view', 'create', 'edit', 'delete', 'approve', 'restore'];

/** Advanced actions live in the per-module drawer, not as extra matrix columns. */
export const ADVANCED_ACTIONS = ['manage', 'print', 'export', 'import'];

/** @deprecated Prefer MAIN_ACTIONS + ADVANCED_ACTIONS */
export const RBAC_ACTIONS = [...MAIN_ACTIONS, ...ADVANCED_ACTIONS];

export const RBAC_ACTION_LABELS = {
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
  approve: 'Approve',
  manage: 'Manage',
  restore: 'Restore',
  print: 'Print',
  export: 'Export',
  import: 'Import',
};

export const ACTION_TOOLTIPS = {
  view: 'Allows opening lists and detail screens for this area.',
  create: 'Allows creating new records. Also enables View.',
  edit: 'Allows editing existing records. Also enables View.',
  delete: 'Allows deleting or voiding posted documents. Also enables View.',
  approve: 'Allows approving workflow requests. Also enables View.',
  manage: 'Allows configuring approval workflows and designer. Also enables View.',
  restore: 'Allows restoring archived or soft-deleted items. Also enables View.',
  print: 'Allows printing documents and layouts. Also enables View.',
  export: 'Allows exporting data (CSV / PDF / Excel). Also enables View.',
  import: 'Allows importing data from files. Also enables View.',
};

/** Future advanced capabilities shown as coming-soon in the drawer. */
export const FUTURE_ADVANCED = [
  { key: 'download', label: 'Download', hint: 'Download attachments and files' },
  { key: 'duplicate', label: 'Duplicate', hint: 'Clone records' },
  { key: 'archive', label: 'Archive', hint: 'Archive without deleting' },
  { key: 'cancel', label: 'Cancel', hint: 'Cancel open documents' },
  { key: 'void', label: 'Void', hint: 'Void posted documents' },
  { key: 'share', label: 'Share', hint: 'Share with other users' },
  { key: 'view_cost', label: 'View Cost', hint: 'See cost prices' },
  { key: 'view_margin', label: 'View Margin', hint: 'See margin percentages' },
  { key: 'view_profit', label: 'View Profit', hint: 'See profit figures' },
  { key: 'override_discount', label: 'Override Discount', hint: 'Bypass discount limits' },
  { key: 'override_price', label: 'Override Price', hint: 'Edit locked prices' },
  { key: 'override_tax', label: 'Override Tax', hint: 'Change tax on lines' },
  { key: 'scope_own', label: 'Own records', hint: 'Access only own records' },
  { key: 'scope_team', label: 'Team records', hint: 'Access team records' },
  { key: 'scope_branch', label: 'Branch records', hint: 'Access branch records' },
  { key: 'scope_company', label: 'Company records', hint: 'Access all company records' },
];

export function formatRoleLabel(role) {
  if (!role) return 'Role';
  if (typeof role === 'object') {
    return role.label || role.name || formatRoleLabel(role.slug || role.name);
  }
  return String(role).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function permissionTooltip(resourceLabel, action) {
  const actionLabel = RBAC_ACTION_LABELS[action] || action;
  const base = ACTION_TOOLTIPS[action] || `${actionLabel} access`;
  return `${actionLabel} — ${resourceLabel}\n${base}`;
}

/** Highlight query matches inside plain text (returns React-ready parts via callback). */
export function splitHighlight(text, query) {
  const source = String(text || '');
  const q = String(query || '').trim();
  if (!q) return [{ text: source, match: false }];
  const lower = source.toLowerCase();
  const needle = q.toLowerCase();
  const parts = [];
  let start = 0;
  let idx = lower.indexOf(needle);
  while (idx !== -1) {
    if (idx > start) parts.push({ text: source.slice(start, idx), match: false });
    parts.push({ text: source.slice(idx, idx + needle.length), match: true });
    start = idx + needle.length;
    idx = lower.indexOf(needle, start);
  }
  if (start < source.length) parts.push({ text: source.slice(start), match: false });
  return parts.length ? parts : [{ text: source, match: false }];
}

export function moduleSearchBlob(mod) {
  const pageBlob = (mod?.pages || [])
    .map((p) => {
      const actionBlob = Object.entries(p.cells || {})
        .flatMap(([action, cell]) => [
          action,
          RBAC_ACTION_LABELS[action] || '',
          ...(cell?.names || []),
        ])
        .join(' ');
      return `${p.label || ''} ${p.key || ''} ${actionBlob}`;
    })
    .join(' ');
  const modActions = Object.entries(mod?.cells || {})
    .flatMap(([action, cell]) => [action, RBAC_ACTION_LABELS[action] || '', ...(cell?.names || [])])
    .join(' ');
  return `${mod?.label || ''} ${mod?.description || ''} ${mod?.key || ''} ${pageBlob} ${modActions}`.toLowerCase();
}

/**
 * Filter modules/pages by permission-oriented search (page, action, slug).
 */
export function filterModulesByPermissionSearch(modules, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return modules;

  return modules
    .map((mod) => {
      const modMatch = moduleSearchBlob(mod).includes(q);
      if (modMatch) return mod;

      const pages = (mod.pages || []).filter((page) => {
        const actionHit = Object.entries(page.cells || {}).some(([action, cell]) => {
          const label = (RBAC_ACTION_LABELS[action] || action).toLowerCase();
          const names = (cell?.names || []).join(' ').toLowerCase();
          return (
            action.includes(q) ||
            label.includes(q) ||
            names.includes(q) ||
            `${page.label || ''} ${action}`.toLowerCase().includes(q)
          );
        });
        const pageHit = `${page.label || ''} ${page.key || ''}`.toLowerCase().includes(q);
        return pageHit || actionHit;
      });

      if (!pages.length) return null;
      return { ...mod, pages };
    })
    .filter(Boolean);
}

export function getCellState(ids, permissionSet) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return { checked: false, disabled: true };
  }

  let matched = 0;
  ids.forEach((id) => {
    if (permissionSet.has(Number(id))) matched += 1;
  });

  if (matched === 0) return { checked: false, disabled: false };
  if (matched === ids.length) return { checked: true, disabled: false };
  return { checked: 'indeterminate', disabled: false };
}

export function normalizeRolePermissions(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  Object.entries(raw).forEach(([key, ids]) => {
    out[Number(key)] = Array.isArray(ids) ? ids.map(Number) : [];
  });
  return out;
}

export function patchRolePermissions(prev, roleId, ids) {
  return { ...prev, [Number(roleId)]: ids };
}

export function countRolePermissions(rolePermissions, roleId) {
  return (rolePermissions[Number(roleId)] || []).length;
}

export function countColumnGranted(modules, action, permissionSet, { pagesOnly = true } = {}) {
  let granted = 0;
  let total = 0;
  modules.forEach((mod) => {
    const rows = pagesOnly && Array.isArray(mod.pages) && mod.pages.length ? mod.pages : [mod];
    rows.forEach((row) => {
      const ids = row.cells?.[action]?.ids || [];
      if (ids.length === 0) return;
      total += 1;
      if (getCellState(ids, permissionSet).checked === true) granted += 1;
    });
  });
  return { granted, total };
}

export function countAdvancedForModule(mod, permissionSet) {
  let granted = 0;
  let total = 0;
  const rows = mod.pages?.length ? mod.pages : [mod];
  rows.forEach((row) => {
    ADVANCED_ACTIONS.forEach((action) => {
      const ids = row.cells?.[action]?.ids || [];
      if (!ids.length) return;
      total += 1;
      if (getCellState(ids, permissionSet).checked === true) granted += 1;
    });
  });
  return { granted, total };
}

/** Count distinct permission IDs available in the matrix (for coverage %). */
export function countAssignablePermissionIds(modules) {
  const ids = new Set();
  (modules || []).forEach((mod) => {
    const rows = mod.pages?.length ? mod.pages : [mod];
    rows.forEach((row) => {
      Object.values(row.cells || {}).forEach((cell) => {
        (cell?.ids || []).forEach((id) => ids.add(Number(id)));
      });
    });
  });
  return ids.size;
}

export function roleCoveragePercent(grantedCount, totalAssignable) {
  if (!totalAssignable) return 0;
  return Math.min(100, Math.round((Number(grantedCount) / totalAssignable) * 100));
}

/**
 * Plain-English capability bullets for non-technical users.
 * @returns {list<{tone:string,text:string}>}
 */
export function summarizeRoleAccess(modules, permissionSet) {
  const bullets = [];
  const can = (pageOrMod, action) => {
    const ids = pageOrMod.cells?.[action]?.ids || [];
    return ids.length > 0 && getCellState(ids, permissionSet).checked === true;
  };

  const viewPages = [];
  const createPages = [];
  const approvePages = [];
  const managePages = [];
  const deletePages = [];

  (modules || []).forEach((mod) => {
    const pages = mod.pages?.length ? mod.pages : [mod];
    pages.forEach((page) => {
      const label = page.label || mod.label;
      if (can(page, 'view')) viewPages.push(label);
      if (can(page, 'create')) createPages.push(label);
      if (can(page, 'approve')) approvePages.push(label);
      if (can(page, 'manage')) managePages.push(label);
      if (can(page, 'delete')) deletePages.push(label);
    });
  });

  const top = (arr, n = 4) => {
    if (!arr.length) return '';
    const uniq = [...new Set(arr)];
    if (uniq.length <= n) return uniq.join(', ');
    return `${uniq.slice(0, n).join(', ')} +${uniq.length - n} more`;
  };

  if (!viewPages.length) {
    bullets.push({ tone: 'muted', text: 'No access yet — grant View on modules this role should see.' });
    return bullets;
  }

  bullets.push({ tone: 'view', text: `Can open: ${top(viewPages)}` });
  if (createPages.length) bullets.push({ tone: 'create', text: `Can create: ${top(createPages)}` });
  if (approvePages.length) bullets.push({ tone: 'approve', text: `Can approve: ${top(approvePages)}` });
  if (managePages.length) bullets.push({ tone: 'manage', text: `Can manage workflows: ${top(managePages)}` });
  if (deletePages.length) bullets.push({ tone: 'delete', text: `Can delete/void: ${top(deletePages, 3)}` });

  return bullets;
}

export const ROLE_TEMPLATE_VISUALS = {
  manager: {
    title: 'Manager',
    blurb: 'Day-to-day operations with approvals — without company settings admin.',
    tone: 'emerald',
    preview: ['Sales', 'Purchases', 'Approvals'],
  },
  accountant: {
    title: 'Accountant',
    blurb: 'Books, journals, banking, and reports — focused finance access.',
    tone: 'sky',
    preview: ['Ledger', 'Banking', 'Reports'],
  },
  employee: {
    title: 'Employee',
    blurb: 'Safe starter access — view common documents and own profile.',
    tone: 'zinc',
    preview: ['View', 'Profile'],
  },
  sales: {
    title: 'Sales',
    blurb: 'Customers, quotations, invoices, and receipts.',
    tone: 'amber',
    preview: ['Customers', 'Invoices', 'Payments'],
  },
  purchasing: {
    title: 'Purchasing',
    blurb: 'Vendors, purchase orders, bills, and bill payments.',
    tone: 'violet',
    preview: ['Vendors', 'POs', 'Bills'],
  },
};
