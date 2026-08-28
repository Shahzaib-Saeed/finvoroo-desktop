import { LINE_COL, PLACEMENT, SYSTEM_SLOT } from '../invoices/invoice-template-constants';

export { LINE_COL, PLACEMENT, SYSTEM_SLOT };

export const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Select' },
];

export const PLACEMENT_LABELS = {
  [PLACEMENT.FORM_BELOW_TEMPLATE]: 'Below template selector',
  [PLACEMENT.BILL_TO_UNDER_CUSTOMER]: 'Bill To — under customer',
  [PLACEMENT.BILL_TO_UNDER_ADDRESS]: 'Bill To — under address',
  [PLACEMENT.INVOICE_DETAILS_TOP]: 'Invoice Details — top',
};

export const PLACEMENT_EDITOR_VALUES = Object.keys(PLACEMENT_LABELS);

export const SYSTEM_SLOT_LABELS = {
  [SYSTEM_SLOT.INVOICE_DATE]: 'Invoice date',
  [SYSTEM_SLOT.DUE_DATE]: 'Due date',
  [SYSTEM_SLOT.PAYMENT_TERMS]: 'Payment terms',
};

export const LINE_COL_DEFAULT_LABELS = {
  [LINE_COL.PRODUCT]: 'Product / Service',
  [LINE_COL.DESCRIPTION]: 'Description',
  [LINE_COL.QUANTITY]: 'Qty',
  [LINE_COL.UNIT]: 'Unit',
  [LINE_COL.RATE]: 'Rate',
  [LINE_COL.DISCOUNT_FIXED]: 'Disc. fixed',
  [LINE_COL.DISCOUNT_PERCENT]: 'Disc. %',
  [LINE_COL.TAX]: 'Tax',
  [LINE_COL.SALE_TAX]: 'Sales tax',
  [LINE_COL.NET_TOTAL]: 'Net total',
  [LINE_COL.FINAL_TOTAL]: 'Final total',
};

export const STUDIO_TABS = {
  DOCUMENT: 'document',
  FIELDS: 'fields',
  FORM_LAYOUT: 'form-layout',
  LINE_ITEMS: 'line-items',
};

export { partitionFormLayout, collectInvoiceDetailsCustomFields } from '../invoices/invoice-template-constants';

export function validateLineColumns(columns) {
  const visible = (columns || []).filter((c) => c.visible !== false).map((c) => c.key);
  if (!visible.includes(LINE_COL.DESCRIPTION) && !visible.includes(LINE_COL.PRODUCT)) {
    return 'Show at least one of: Product / Service or Description so each line is identifiable.';
  }
  const discFixed = visible.includes(LINE_COL.DISCOUNT_FIXED);
  const discPct = visible.includes(LINE_COL.DISCOUNT_PERCENT);
  if (discFixed !== discPct) {
    return 'Line discount: show both “Disc. fixed” and “Disc. %” columns, or hide both.';
  }
  return null;
}

export function orderDefinitionsForTemplate(definitions, templateFields = []) {
  const templateKeys = new Set(
    (templateFields || []).map((f) => f.field_key).filter(Boolean),
  );
  const orderByKey = {};
  (templateFields || []).forEach((f) => {
    if (f?.field_key) orderByKey[f.field_key] = Number(f.sort_order ?? 0);
  });

  const onTemplate = [];
  const offTemplate = [];
  for (const def of definitions || []) {
    if (templateKeys.has(def.field_key)) onTemplate.push(def);
    else offTemplate.push(def);
  }

  const byId = (a, b) => Number(a.id ?? 0) - Number(b.id ?? 0);
  onTemplate.sort((a, b) => {
    const diff = (orderByKey[a.field_key] ?? 0) - (orderByKey[b.field_key] ?? 0);
    return diff !== 0 ? diff : byId(a, b);
  });
  offTemplate.sort((a, b) => {
    const diff = Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0);
    return diff !== 0 ? diff : byId(a, b);
  });

  return [...onTemplate, ...offTemplate];
}

export function buildPreviewTemplateFields(orderedDefinitions, templateFields, included, placements, labels = {}) {
  let sort = 0;
  return (orderedDefinitions || [])
    .filter((def) => included[def.field_key])
    .map((def) => {
      sort += 10;
      const saved = (templateFields || []).find((f) => f.field_key === def.field_key);
      const fieldType = def.type === 'dropdown' ? 'select' : def.type || 'text';
      const customLabel = labels[def.field_key];
      const effectiveLabel =
        customLabel?.trim() ||
        saved?.label?.trim() ||
        def.label;
      return {
        ...(saved || {}),
        field_key: def.field_key,
        label: effectiveLabel,
        master_label: def.label,
        field_type: fieldType,
        options: def.options || saved?.options || [],
        is_required: Boolean(def.is_required),
        placement: placements[def.field_key] || saved?.placement || PLACEMENT.INVOICE_DETAILS_TOP,
        sort_order: sort,
        definition_id: def.id,
      };
    });
}

export function emptyFieldDraft() {
  return {
    label: '',
    placement: PLACEMENT.FORM_BELOW_TEMPLATE,
    field_type: 'text',
    options_text: '',
    is_required: false,
  };
}

export function fieldDraftFromApi(field) {
  const options = field?.options;
  const optionsText = Array.isArray(options) ? options.join('\n') : '';
  return {
    label: field?.label ?? '',
    placement: field?.placement || PLACEMENT.FORM_BELOW_TEMPLATE,
    field_type: field?.field_type || 'text',
    options_text: optionsText,
    is_required: Boolean(field?.is_required),
  };
}

export function fieldsPayloadFromDrafts(rows) {
  return rows
    .filter((r) => String(r.label || '').trim() !== '')
    .map((r) => ({
      label: String(r.label).trim(),
      placement: r.placement || PLACEMENT.FORM_BELOW_TEMPLATE,
      field_type: r.field_type || 'text',
      options_text: r.field_type === 'select' ? r.options_text || '' : '',
      // API validates with `in:0,1,true,false` — JSON boolean `false` fails; use 0/1
      is_required: r.is_required ? 1 : 0,
    }));
}

export function layoutSlotsFromTemplate(tpl) {
  const slots = tpl?.form_layout?.invoice_details ?? [];
  const fieldKeys = new Set((tpl?.fields ?? []).map((f) => f.field_key));
  return slots.filter(
    (s) => s.kind === 'system' || (s.kind === 'custom' && fieldKeys.has(s.field_key)),
  );
}

export function lineEditorRowsFromTemplate(tpl) {
  return tpl?.line_columns?.editor_rows ?? [];
}

/** Live canvas preview while editing unsaved field rows */
export function previewFieldsFromDrafts(draftRows, savedFields = []) {
  return draftRows
    .filter((r) => String(r.label || '').trim())
    .map((r, i) => ({
      field_key: savedFields[i]?.field_key ?? `preview_${i}`,
      label: String(r.label).trim(),
      placement: r.placement || PLACEMENT.FORM_BELOW_TEMPLATE,
      field_type: r.field_type || 'text',
      options:
        r.field_type === 'select'
          ? String(r.options_text || '')
              .split(/\r?\n/)
              .map((s) => s.trim())
              .filter(Boolean)
          : savedFields[i]?.options ?? [],
      is_required: Boolean(r.is_required),
    }));
}
