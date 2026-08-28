import {
  endOfDay,
  endOfMonth,
  endOfQuarter,
  endOfYear,
  format,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  subDays,
  subMonths,
  subQuarters,
} from 'date-fns';
import { OPERATOR_LABELS, RELATIVE_DATE_OPTIONS } from '../builder/filter-operators';

function formatValue(operator, value) {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object' && value.relative_key) {
    const rel = RELATIVE_DATE_OPTIONS.find((o) => o.value === value.relative_key);
    return rel?.label || value.relative_key;
  }
  return String(value);
}

function summarizeNode(node, fieldLabels) {
  if (!node) return [];
  if (node.type === 'condition') {
    const field = fieldLabels[node.field] || node.field;
    const op = OPERATOR_LABELS[node.operator] || node.operator;
    const val = formatValue(node.operator, node.value ?? node.values);
    if (['is_empty', 'is_not_empty'].includes(node.operator)) {
      return [`${field} ${op.toLowerCase()}`];
    }
    return [`${field} ${op.toLowerCase()} ${val}`.trim()];
  }
  if (node.type === 'group' && node.children?.length) {
    const parts = node.children.flatMap((c) => summarizeNode(c, fieldLabels));
    if (!parts.length) return [];
    const join = node.operator === 'or' ? ' or ' : ' · ';
    return [parts.join(join)];
  }
  return [];
}

export function summarizeReportFilters(filters, fields = []) {
  if (!filters) return [];
  const fieldLabels = Object.fromEntries((fields || []).map((f) => [f.key, f.label]));
  return summarizeNode(filters, fieldLabels);
}

export function summarizeDateRange(dateRange) {
  if (!dateRange) return null;
  if (dateRange.relative_key) {
    const rel = RELATIVE_DATE_OPTIONS.find((o) => o.value === dateRange.relative_key);
    return rel?.label || dateRange.relative_key.replace(/_/g, ' ');
  }
  if (dateRange.from && dateRange.to) {
    return `${dateRange.from} → ${dateRange.to}`;
  }
  return null;
}

/** Resolve a report definition date_range into concrete yyyy-MM-dd bounds. */
export function resolveReportDateRange(dateRange, now = new Date()) {
  if (!dateRange) return null;
  if (dateRange.from && dateRange.to) {
    return { from: String(dateRange.from).slice(0, 10), to: String(dateRange.to).slice(0, 10) };
  }

  const key = dateRange.relative_key;
  if (!key || key === 'custom_range') return null;

  const fmt = (d) => format(d, 'yyyy-MM-dd');

  switch (key) {
    case 'today':
      return { from: fmt(startOfDay(now)), to: fmt(endOfDay(now)) };
    case 'yesterday': {
      const y = subDays(now, 1);
      return { from: fmt(startOfDay(y)), to: fmt(endOfDay(y)) };
    }
    case 'last_7_days':
      return { from: fmt(subDays(now, 6)), to: fmt(now) };
    case 'last_30_days':
      return { from: fmt(subDays(now, 29)), to: fmt(now) };
    case 'this_month':
      return { from: fmt(startOfMonth(now)), to: fmt(endOfMonth(now)) };
    case 'last_month': {
      const m = subMonths(now, 1);
      return { from: fmt(startOfMonth(m)), to: fmt(endOfMonth(m)) };
    }
    case 'this_quarter':
      return { from: fmt(startOfQuarter(now)), to: fmt(endOfQuarter(now)) };
    case 'last_quarter': {
      const q = subQuarters(now, 1);
      return { from: fmt(startOfQuarter(q)), to: fmt(endOfQuarter(q)) };
    }
    case 'year_to_date':
      return { from: fmt(startOfYear(now)), to: fmt(now) };
    case 'this_year':
      return { from: fmt(startOfYear(now)), to: fmt(endOfYear(now)) };
    default:
      return null;
  }
}
