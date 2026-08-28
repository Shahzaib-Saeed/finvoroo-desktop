/**
 * Human-readable audit field diffs for the detail sheet (client-side fallback).
 * Prefer API `presentation.changes` when present — this module covers older rows
 * and created-record snapshots.
 */

const SKIP_KEYS = new Set([
  'created_at',
  'updated_at',
  'deleted_at',
  'password',
  'remember_token',
  'company_id',
  'inventory_movements',
  'message',
  'url',
]);

const RELATION_BY_FK = {
  coa2_subtype_id: 'subtype',
  subtype_id: 'subtype',
  parent_id: 'parent',
  customer_id: 'customer',
  vendor_id: 'vendor',
  product_id: 'product',
  chart_of_account_id: 'chart_of_account',
  bank_account_id: 'bank_account',
  user_id: 'user',
  posted_by: 'posted_by_name',
  journal_entry_id: null,
};

const FK_BY_RELATION = Object.fromEntries(
  Object.entries(RELATION_BY_FK)
    .filter(([, relation]) => relation)
    .map(([fk, relation]) => [relation, fk]),
);

const FIELD_LABELS = {
  coa2_subtype_id: 'Account type',
  subtype: 'Account type',
  account_number: 'Account number',
  is_active: 'Active',
  is_postable: 'Postable',
  parent_id: 'Parent account',
  document_number: 'Document #',
  description: 'Description',
  name: 'Name',
  status: 'Status',
  journal_entry_id: 'Journal entry',
  revenue_journal_entry_id: 'Revenue journal',
  posted_by: 'Posted by',
  posted_by_name: 'Posted by',
  posted_at: 'Posted at',
  balance_due: 'Balance due',
  amount_paid: 'Amount paid',
  approval_status: 'Approval status',
  approver_id: 'Approver',
  approver_name: 'Approver',
  ap_impact: 'AP impact',
  inventory_updated: 'Inventory updated',
  invoice_number: 'Invoice #',
  bill_number: 'Bill #',
  total: 'Total',
  currency: 'Currency',
};

const SNAPSHOT_KEYS = [
  'name',
  'account_number',
  'coa2_subtype_id',
  'subtype',
  'is_active',
  'is_postable',
  'description',
  'parent_id',
  'invoice_number',
  'bill_number',
  'status',
  'total',
  'amount',
  'currency',
  'journal_entry_id',
];

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isScalar(value) {
  return (
    value === null ||
    value === undefined ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

function shouldSkipPath(path) {
  const parts = String(path || '').split('.');
  const leaf = parts[parts.length - 1] || '';
  if (SKIP_KEYS.has(leaf)) return true;
  if (/_at$/.test(leaf) && leaf !== 'posted_at') return true;
  return false;
}

export function humanizeField(path) {
  const raw = String(path || '');
  if (FIELD_LABELS[raw]) return FIELD_LABELS[raw];
  const leaf = raw.includes('.') ? raw.split('.').pop() : raw;
  if (FIELD_LABELS[leaf]) return FIELD_LABELS[leaf];
  return raw
    .replace(/\[([^\]]+)\]/g, ' $1')
    .replace(/\./g, ' › ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function getByPath(source, path) {
  if (!source || path == null || path === '') return undefined;
  const text = String(path);

  const tokens = [];
  text.replace(/([^[.\]]+)|\[([^\]]+)\]/g, (_, key, bracket) => {
    if (key) tokens.push(key);
    if (bracket != null) tokens.push(bracket);
    return '';
  });

  let cur = source;
  for (const token of tokens) {
    if (cur == null) return undefined;
    if (Array.isArray(cur)) {
      const asId = token.startsWith('+') || token.startsWith('-') ? token.slice(1) : token;
      const found = cur.find(
        (row) =>
          row &&
          typeof row === 'object' &&
          String(row.id ?? row.product_id ?? row.account_id) === String(asId),
      );
      cur = found !== undefined ? found : cur[token];
      continue;
    }
    if (!isPlainObject(cur) || !(token in cur)) return undefined;
    cur = cur[token];
  }
  return cur;
}

export function formatAuditValue(value) {
  if (value === null || value === undefined || value === '') return null;
  if (value === 'linked_via_correlation') return null;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    if (!Number.isInteger(value)) {
      return value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    return String(value);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '' || trimmed === 'linked_via_correlation') return null;
    if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
      try {
        const d = new Date(trimmed);
        if (!Number.isNaN(d.getTime())) {
          return d.toLocaleString(undefined, {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
        }
      } catch {
        /* fall through */
      }
    }
    if (/^[a-z_]+$/.test(trimmed)) {
      return trimmed.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return trimmed;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return 'None';
    if (value.every((item) => !isPlainObject(item) && !Array.isArray(item))) {
      return value.map((item) => formatAuditValue(item) ?? '—').join(', ');
    }
    return `${value.length} item${value.length === 1 ? '' : 's'}`;
  }
  if (isPlainObject(value)) {
    if (value.code && value.name) return `${value.code} — ${value.name}`;
    if (value.account_number && value.name) {
      return `${value.account_number} — ${value.name}`;
    }
    if (value.name) return String(value.name);
    if (value.title) return String(value.title);
    if (value.email) return String(value.email);
    if (value.label) return String(value.label);
    if (value.number) return String(value.number);
    if (value.invoice_number) return String(value.invoice_number);
    if (value.bill_number) return String(value.bill_number);
    if (value.code) return String(value.code);
    if (value.id != null) return `#${value.id}`;
    return null;
  }
  return String(value);
}

function isRelationObject(value) {
  return isPlainObject(value) && ('id' in value || 'code' in value || 'name' in value);
}

function normalizeChangedFields(changedFields) {
  if (!changedFields) return [];
  if (Array.isArray(changedFields)) {
    return changedFields.map(String).filter(Boolean);
  }
  if (isPlainObject(changedFields)) {
    return Object.keys(changedFields)
      .map((key) => {
        const val = changedFields[key];
        if (typeof val === 'string') return val;
        if (val === true) return key;
        return /^\d+$/.test(key) ? String(val) : key;
      })
      .filter(Boolean);
  }
  return [];
}

function collectScalarPaths(oldValues, newValues) {
  const keys = new Set([
    ...Object.keys(oldValues || {}),
    ...Object.keys(newValues || {}),
  ]);
  const paths = [];

  for (const key of keys) {
    if (shouldSkipPath(key)) continue;
    if (key.endsWith('_name') && (key.slice(0, -5) in (oldValues || {}) || key.slice(0, -5) in (newValues || {}))) {
      continue;
    }
    const before = oldValues?.[key];
    const after = newValues?.[key];
    if (!isScalar(before) || !isScalar(after)) continue;
    if (String(before ?? '') !== String(after ?? '')) {
      paths.push(key);
    }
  }

  return paths;
}

function collectShallowPaths(oldValues, newValues) {
  const keys = new Set([
    ...Object.keys(oldValues || {}),
    ...Object.keys(newValues || {}),
  ]);
  const paths = [];

  for (const key of keys) {
    if (shouldSkipPath(key)) continue;
    const before = oldValues?.[key];
    const after = newValues?.[key];

    if (isPlainObject(before) && isPlainObject(after)) {
      const nested = collectShallowPaths(before, after)
        .filter((p) => !shouldSkipPath(p))
        .map((p) => `${key}.${p}`);
      if (nested.length) {
        paths.push(...nested);
        continue;
      }
    }

    if (JSON.stringify(before) !== JSON.stringify(after)) {
      paths.push(key);
    }
  }

  return paths;
}

function collapsePaths(paths, oldValues, newValues) {
  const set = new Set(paths);

  for (const [fk, relation] of Object.entries(RELATION_BY_FK)) {
    if (!relation) continue;
    const relationPaths = [...set].filter(
      (p) => p === relation || p.startsWith(`${relation}.`),
    );
    if (!relationPaths.length) continue;

    const beforeFk = oldValues?.[fk];
    const afterFk = newValues?.[fk];
    const fkPresent = beforeFk !== undefined || afterFk !== undefined;
    const fkChanged =
      fkPresent && String(beforeFk ?? '') !== String(afterFk ?? '');

    if (fkChanged) {
      set.add(fk);
      for (const path of relationPaths) set.delete(path);
      continue;
    }

    const beforeRel = oldValues?.[relation];
    const afterRel = newValues?.[relation];
    const oneSided =
      (isRelationObject(beforeRel) && afterRel == null) ||
      (isRelationObject(afterRel) && beforeRel == null);

    if (oneSided || set.has(fk)) {
      for (const path of relationPaths) set.delete(path);
    }
  }

  return [...set];
}

function resolveDisplayValue(path, sideValues, otherSideValues) {
  if (path === 'posted_by') {
    const named =
      formatAuditValue(sideValues?.posted_by_name) ||
      formatAuditValue(sideValues?.posted_by);
    if (named != null && !/^\d+$/.test(named)) return named;
  }

  const relationKey = RELATION_BY_FK[path];
  if (relationKey) {
    const fromSide = formatAuditValue(sideValues?.[relationKey]);
    if (fromSide != null) return fromSide;

    const sideId = sideValues?.[path];
    const otherId = otherSideValues?.[path];
    const fromOther = formatAuditValue(otherSideValues?.[relationKey]);
    if (
      fromOther != null &&
      sideId != null &&
      otherId != null &&
      String(sideId) === String(otherId)
    ) {
      return fromOther;
    }

    if (sideId != null && sideId !== '') return `#${sideId}`;
  }

  if (FK_BY_RELATION[path]) {
    return formatAuditValue(sideValues?.[path]);
  }

  const direct = getByPath(sideValues, path);
  return formatAuditValue(direct);
}

function toDiffRows(paths, oldObj, newObj) {
  const rows = [];
  const seen = new Set();

  for (const path of paths) {
    if (shouldSkipPath(path) || seen.has(path)) continue;
    seen.add(path);

    const before = resolveDisplayValue(path, oldObj, newObj);
    const after = resolveDisplayValue(path, newObj, oldObj);
    if ((before ?? '—') === (after ?? '—')) continue;

    rows.push({
      path,
      field: humanizeField(path),
      before: before ?? '—',
      after: after ?? '—',
    });
  }

  return rows;
}

/**
 * Prefer server presentation when available.
 * @returns {{ field: string, path: string, before: string, after: string }[]}
 */
export function buildAuditDiff(oldValues, newValues, changedFields, presentationChanges) {
  if (Array.isArray(presentationChanges) && presentationChanges.length > 0) {
    return presentationChanges
      .map((row) => ({
        path: row.path || row.field,
        field: row.field || humanizeField(row.path),
        before: row.before ?? '—',
        after: row.after ?? '—',
      }))
      .filter((row) => (row.before ?? '—') !== (row.after ?? '—') || row.before !== '—');
  }

  if (!oldValues && !newValues) return [];

  const oldObj = isPlainObject(oldValues) ? oldValues : {};
  const newObj = isPlainObject(newValues) ? newValues : {};

  const hinted = normalizeChangedFields(changedFields).filter((p) => !shouldSkipPath(p));
  const scalarPaths = collectScalarPaths(oldObj, newObj);
  const shallowPaths = collectShallowPaths(oldObj, newObj);

  let paths = collapsePaths(
    [...new Set([...scalarPaths, ...hinted, ...shallowPaths])],
    oldObj,
    newObj,
  );

  for (const path of collectScalarPaths(oldObj, newObj)) {
    if (!paths.includes(path)) paths.push(path);
  }

  return toDiffRows(paths, oldObj, newObj);
}

export function buildAuditSnapshotRows(oldValues, newValues) {
  const oldObj = isPlainObject(oldValues) ? oldValues : {};
  const newObj = isPlainObject(newValues) ? newValues : {};
  if (!Object.keys(oldObj).length && !Object.keys(newObj).length) return [];

  const keys = SNAPSHOT_KEYS.filter((key) => {
    if (!(key in oldObj) && !(key in newObj)) return false;
    if (FK_BY_RELATION[key] && (FK_BY_RELATION[key] in oldObj || FK_BY_RELATION[key] in newObj)) {
      return false;
    }
    if (FK_BY_RELATION[key] || RELATION_BY_FK[key]) {
      const before = oldObj[key];
      const after = newObj[key];
      const oneSided =
        (isRelationObject(before) && after == null) ||
        (isRelationObject(after) && before == null);
      if (oneSided) return false;
    }
    return true;
  });

  const fallbackKeys =
    keys.length > 0
      ? keys
      : [...new Set([...Object.keys(oldObj), ...Object.keys(newObj)])]
          .filter(
            (key) =>
              !shouldSkipPath(key) &&
              isScalar(oldObj[key] ?? null) &&
              isScalar(newObj[key] ?? null),
          )
          .slice(0, 8);

  return fallbackKeys
    .map((path) => {
      const before = resolveDisplayValue(path, oldObj, newObj);
      const after = resolveDisplayValue(path, newObj, oldObj);
      if (before == null && after == null) return null;
      return {
        path,
        field: humanizeField(path),
        before: before ?? '—',
        after: after ?? '—',
        changed: (before ?? '—') !== (after ?? '—'),
      };
    })
    .filter(Boolean);
}
