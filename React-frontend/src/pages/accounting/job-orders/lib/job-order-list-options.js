import { CREATE_STATUSES, JOB_PRIORITIES, JOB_STATUSES, PRIORITY_COLORS, STATUS_COLORS } from '../constants';

/** Fallback when API options are unavailable (e.g. before migration or during errors). */
export function fallbackStatusOptions() {
  return CREATE_STATUSES.map((s, index) => ({
    id: s.value,
    value: s.value,
    label: s.label,
    sort_order: (index + 1) * 10,
    is_active: true,
    is_system: true,
    badge_class: STATUS_COLORS[s.value] || STATUS_COLORS.scheduled,
  }));
}

export function fallbackPriorityOptions() {
  return JOB_PRIORITIES.map((s, index) => ({
    id: s.value,
    value: s.value,
    label: s.label,
    sort_order: (index + 1) * 10,
    is_active: true,
    is_system: true,
    badge_class: PRIORITY_COLORS[s.value] || PRIORITY_COLORS.normal,
  }));
}

/** @typedef {{ value: string, label: string, badge_class?: string, is_active?: boolean }} ListOption */

export function activeListOptions(options) {
  return (options || []).filter((o) => o.is_active !== false);
}

/** Insert or replace a list option by value (keeps sort order stable). */
export function upsertListOption(options, created) {
  if (!created?.value) return options || [];
  const list = [...(options || [])];
  const idx = list.findIndex((o) => String(o.value) === String(created.value));
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...created };
  } else {
    list.push(created);
  }
  return list.sort(
    (a, b) =>
      Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0) ||
      String(a.label || '').localeCompare(String(b.label || '')),
  );
}

/** Merge API list options with any locally known options missing from the response. */
export function mergeListOptionsFromApi(apiOptions, prevOptions) {
  const merged = new Map(
    (Array.isArray(apiOptions) ? apiOptions : []).map((o) => [String(o.value), o]),
  );
  for (const opt of prevOptions || []) {
    if (!opt?.value || opt.is_active === false) continue;
    const key = String(opt.value);
    if (!merged.has(key)) merged.set(key, opt);
  }
  return [...merged.values()].sort(
    (a, b) =>
      Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0) ||
      String(a.label || '').localeCompare(String(b.label || '')),
  );
}

export function listOptionLabel(options, value, fallbackList = []) {
  const found = (options || []).find((o) => o.value === value);
  if (found) return found.label;
  const fb = fallbackList.find((o) => o.value === value);
  return fb?.label || value || '—';
}

export function listOptionBadgeClass(options, value, fallbackColors = {}) {
  const found = (options || []).find((o) => o.value === value);
  if (found?.badge_class) return found.badge_class;
  return fallbackColors[value] || 'text-foreground border-border bg-muted/30';
}

export function statusLabel(value, statusOptions) {
  return listOptionLabel(statusOptions, value, JOB_STATUSES);
}

export function statusBadgeClass(value, statusOptions) {
  return listOptionBadgeClass(statusOptions, value, STATUS_COLORS);
}

export function priorityLabel(value, priorityOptions) {
  return listOptionLabel(priorityOptions, value, JOB_PRIORITIES);
}

export function priorityBadgeClass(value, priorityOptions) {
  return listOptionBadgeClass(priorityOptions, value, PRIORITY_COLORS);
}

export function slugFromLabel(label) {
  return String(label || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 50);
}
