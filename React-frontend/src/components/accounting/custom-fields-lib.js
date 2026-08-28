import { jobOrderCustomFieldsApi } from '@/pages/accounting/job-orders/api/job-order-custom-fields.api';

export const CUSTOM_FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Long text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'dropdown', label: 'Select' },
];

export const CUSTOM_FIELD_TYPE_LABELS = Object.fromEntries(
  CUSTOM_FIELD_TYPES.map((t) => [t.value, t.label]),
);

export function sortCustomFieldDefinitions(items) {
  return [...items].sort((a, b) => {
    const orderDiff = Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0);
    if (orderDiff !== 0) return orderDiff;
    return String(a.label || '').localeCompare(String(b.label || ''));
  });
}

export async function fetchAllCustomFieldDefinitions() {
  const perPage = 200;
  let page = 1;
  let lastPage = 1;
  const all = [];

  do {
    const res = await jobOrderCustomFieldsApi.list({ per_page: perPage, page });
    const items = res.data?.data ?? [];
    if (Array.isArray(items)) all.push(...items);
    lastPage = Number(res.data?.meta?.last_page ?? 1);
    page += 1;
  } while (page <= lastPage);

  return all;
}

export function customFieldApiErrorMessage(err, fallback) {
  const data = err?.response?.data;
  if (data?.errors && typeof data.errors === 'object') {
    const first = Object.values(data.errors).flat().find(Boolean);
    if (first) return String(first);
  }
  return data?.message || fallback;
}

export function templateAssignmentSummary(def) {
  const scope = def.invoice_bill_template_scope || 'none';
  if (scope === 'all') return 'Invoices/bills: all templates';
  if (scope === 'selected') {
    const names = def.invoice_bill_template_names || [];
    if (names.length) return `Invoices/bills: ${names.join(', ')}`;
    return 'Invoices/bills: selected templates';
  }
  return null;
}

/** Pages that use simple show/hide flags (no layout template). */
export const OTHER_PAGE_VISIBILITY = [
  { key: 'show_on_job_order', label: 'Job orders', defaultOn: true },
  { key: 'show_on_expense', label: 'Expenses', defaultOn: false },
  { key: 'show_on_quotation', label: 'Quotations', defaultOn: false },
  { key: 'show_on_sales_order', label: 'Sales orders', defaultOn: false },
  { key: 'show_on_purchase_order', label: 'Purchase orders', defaultOn: false },
];

export function otherPageVisibilityBadges(def) {
  return OTHER_PAGE_VISIBILITY.filter(({ key, defaultOn }) => {
    const value = def[key];
    return defaultOn ? value !== false : Boolean(value);
  }).map(({ label }) => label);
}

export function customFieldVisibilityBadges(def) {
  const badges = otherPageVisibilityBadges(def);
  const templateSummary = templateAssignmentSummary(def);
  if (templateSummary) badges.push(templateSummary);
  return badges;
}

export function parseDefinitionOptions(def) {
  if (Array.isArray(def?.options)) return def.options.map((v) => String(v));
  if (Array.isArray(def?.select_options)) return def.select_options.map((v) => String(v));
  return [];
}

/** Find a header field row for a settings definition (by definition_id or field_key). */
export function findHeaderFieldForDefinition(headerFields, def) {
  if (!Array.isArray(headerFields) || !def) return null;
  return headerFields.find(
    (f) =>
      (def.id != null && Number(f.definition_id) === Number(def.id)) ||
      (def.field_key && String(f.field_key) === String(def.field_key)),
  );
}

/** Effective display label from a header field row (same as invoice template editor). */
export function effectiveTemplateFieldLabel(row, def) {
  if (!row) return '';
  const templateLabel = String(row.label ?? '').trim();
  if (templateLabel) return templateLabel;
  return String(row.master_label ?? def?.label ?? '').trim();
}

/** Normalize template id => label map from API (string or numeric keys). */
export function normalizeTemplateLabelsMap(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out = {};
  for (const [key, value] of Object.entries(raw)) {
    const id = Number(key);
    if (!Number.isFinite(id) || id <= 0) continue;
    const text = String(value ?? '').trim();
    if (text) out[id] = text;
  }
  return out;
}

/** Template ids that include this field based on settings scope. */
export function templateIdsForDefinitionScope(def, templates = []) {
  const scope = def?.invoice_bill_template_scope || 'none';
  if (scope === 'none') return [];
  if (scope === 'all') {
    return templates.map((t) => Number(t.id)).filter((id) => id > 0);
  }
  return (def?.invoice_bill_template_ids || []).map(Number).filter((id) => id > 0);
}

/**
 * Read per-template display labels from invoice template header_fields —
 * same source as the invoice template custom-fields editor.
 *
 * @param {object} def - Custom field definition (needs field_key + scope)
 * @param {Array} templates - Company invoice templates
 * @param {Record<number, Array>} headerFieldsCache - templateId -> header_fields rows
 * @param {(templateId: number) => Promise<Array>} loadHeaderFields - fetch when not cached
 */
export async function loadTemplateLabelsForDefinition(
  def,
  templates,
  headerFieldsCache,
  loadHeaderFields,
) {
  const fieldKey = def?.field_key;
  if (!fieldKey) return {};

  const templateIds = templateIdsForDefinitionScope(def, templates);
  if (!templateIds.length) return {};

  const labels = {};
  await Promise.all(
    templateIds.map(async (tplId) => {
      let headerFields = headerFieldsCache?.[tplId];
      if (!Array.isArray(headerFields)) {
        headerFields = await loadHeaderFields(tplId);
      }
      const row = findHeaderFieldForDefinition(headerFields, def);
      const text = effectiveTemplateFieldLabel(row, def);
      if (text) labels[tplId] = text;
    }),
  );
  return labels;
}

/** Merge template label maps; later maps win. */
export function mergeTemplateLabelMaps(...maps) {
  const out = {};
  for (const map of maps) {
    Object.assign(out, normalizeTemplateLabelsMap(map));
  }
  return out;
}

export function mergeDefinitionInList(list, defId, updated) {
  if (!updated) return list;
  return (list || []).map((d) =>
    String(d.id) === String(defId)
      ? {
          ...d,
          ...updated,
          options: parseDefinitionOptions({ ...d, ...updated }),
        }
      : d,
  );
}

/** Merge select options from API with any locally known options (safety net after stale loads). */
export function mergeDefinitionOptionsFromApi(apiDefs, prevDefs) {
  const prevById = new Map((prevDefs || []).map((d) => [String(d.id), d]));
  return (apiDefs || []).map((def) => {
    const prev = prevById.get(String(def.id));
    if (!prev) return def;
    const merged = new Set([
      ...parseDefinitionOptions(def),
      ...parseDefinitionOptions(prev),
    ]);
    const options = [...merged];
    return options.length ? { ...def, options } : def;
  });
}

/** Append a select option — uses server-side merge so stale local state cannot wipe options. */
export async function appendCustomFieldSelectOption(definition, optionLabel) {
  const defId = definition?.id;
  const next = String(optionLabel || '').trim();
  if (!defId || !next) return null;

  const res = await jobOrderCustomFieldsApi.appendOption(defId, { label: next });
  return res.data?.data ?? null;
}
