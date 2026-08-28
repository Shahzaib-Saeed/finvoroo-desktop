/** Mirrors App\Support\Accounting\InvoiceTemplateLineColumns */
export const LINE_COL = {
  PRODUCT: 'product',
  DESCRIPTION: 'description',
  QUANTITY: 'quantity',
  UNIT: 'unit',
  BATCH_NUMBER: 'batch_number',
  EXPIRY_DATE: 'expiry_date',
  MANUFACTURED_DATE: 'manufactured_date',
  RATE: 'rate',
  DISCOUNT_FIXED: 'discount_fixed',
  DISCOUNT_PERCENT: 'discount_percent',
  TAX: 'tax',
  SALE_TAX: 'sale_tax',
  NET_TOTAL: 'net_total',
  FINAL_TOTAL: 'final_total',
  ACTIONS: 'actions',
};

/** Extra bill columns when company has batch_expiry enabled. */
export const PHARMACY_BATCH_LINE_COLUMNS = [
  { key: LINE_COL.BATCH_NUMBER, label: 'Batch #', visible: true, order: 3.1 },
  { key: LINE_COL.EXPIRY_DATE, label: 'Expiry', visible: true, order: 3.2 },
  { key: LINE_COL.MANUFACTURED_DATE, label: 'Mfg', visible: true, order: 3.3 },
];

export const PLACEMENT = {
  FORM_BELOW_TEMPLATE: 'form_below_template',
  BILL_TO_UNDER_CUSTOMER: 'bill_to_under_customer',
  BILL_TO_UNDER_ADDRESS: 'bill_to_under_address',
  INVOICE_DETAILS_TOP: 'invoice_details_top',
};

export const SYSTEM_SLOT = {
  INVOICE_DATE: 'invoice_date',
  DUE_DATE: 'due_date',
  PAYMENT_TERMS: 'payment_terms',
};

const KNOWN_LINE_COLUMN_KEYS = new Set(Object.values(LINE_COL));

/** Mirrors InvoiceTemplateLineColumns::defaultDefinitions() — used offline when templates aren't cached. */
export const DEFAULT_LINE_COLUMNS = [
  { key: LINE_COL.PRODUCT, label: 'Product / Service', visible: true, order: 0 },
  { key: LINE_COL.DESCRIPTION, label: 'Description', visible: true, order: 1 },
  { key: LINE_COL.QUANTITY, label: 'Qty', visible: true, order: 2 },
  { key: LINE_COL.UNIT, label: 'Unit', visible: true, order: 3 },
  { key: LINE_COL.RATE, label: 'Rate', visible: true, order: 4 },
  { key: LINE_COL.DISCOUNT_FIXED, label: 'Disc. fixed', visible: true, order: 5 },
  { key: LINE_COL.DISCOUNT_PERCENT, label: 'Disc. %', visible: true, order: 6 },
  { key: LINE_COL.TAX, label: 'Tax', visible: true, order: 7 },
  { key: LINE_COL.SALE_TAX, label: 'Sales tax', visible: true, order: 8 },
  { key: LINE_COL.NET_TOTAL, label: 'Net total', visible: true, order: 9 },
  { key: LINE_COL.FINAL_TOTAL, label: 'Final total', visible: true, order: 10 },
  { key: LINE_COL.ACTIONS, label: '', visible: true, order: 11 },
];

export function visibleLineColumns(columns) {
  const list = columns?.length ? columns : DEFAULT_LINE_COLUMNS;
  return list
    .filter((c) => c.visible !== false && KNOWN_LINE_COLUMN_KEYS.has(c.key))
    .map((c) =>
      c.key === LINE_COL.ACTIONS ? { ...c, label: '' } : c,
    );
}

export function fieldsForPlacement(headerFields, placement) {
  return (headerFields || [])
    .filter((f) => (f.placement || PLACEMENT.FORM_BELOW_TEMPLATE) === placement)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

export function layoutCustomFieldKeys(layout) {
  return (layout || [])
    .filter((s) => s.kind === 'custom' && s.field_key)
    .map((s) => s.field_key);
}

/** Invoice date + due date (left); payment terms + layout customs (right). */
export function partitionFormLayout(slots) {
  const dateKeys = {
    [SYSTEM_SLOT.INVOICE_DATE]: true,
    [SYSTEM_SLOT.DUE_DATE]: true,
  };
  const left = [];
  const right = [];
  for (const s of slots || []) {
    if (s.kind === 'system' && dateKeys[s.key]) {
      left.push(s);
    } else {
      right.push(s);
    }
  }
  return { left, right };
}

const BILL_TO_PLACEMENTS = new Set([
  PLACEMENT.FORM_BELOW_TEMPLATE,
  PLACEMENT.BILL_TO_UNDER_CUSTOMER,
  PLACEMENT.BILL_TO_UNDER_ADDRESS,
]);

function normalizeFieldLabel(label) {
  return String(label ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function fieldDedupeKeys(field) {
  if (!field?.field_key) return [];
  const keys = [`key:${String(field.field_key).toLowerCase()}`];
  if (field.definition_id != null && field.definition_id !== '') {
    keys.push(`def:${field.definition_id}`);
  }
  const lbl = normalizeFieldLabel(field.label);
  if (lbl) keys.push(`lbl:${lbl}`);
  return keys;
}

export function dedupeTemplateHeaderFields(fields) {
  const sorted = [...(fields || [])].sort((a, b) => {
    if (a.definition_id && !b.definition_id) return -1;
    if (!a.definition_id && b.definition_id) return 1;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });

  const seen = new Set();
  const result = [];
  for (const f of sorted) {
    const keys = fieldDedupeKeys(f);
    if (!keys.length || keys.some((k) => seen.has(k))) continue;
    keys.forEach((k) => seen.add(k));
    result.push(f);
  }
  return result;
}

/**
 * Template fields to render on invoice/bill forms.
 * Only fields included on the selected layout template are shown — no global extras.
 */
export function resolveFormCustomFieldsForDocument(headerFields, formLayout) {
  const templateFields = dedupeTemplateHeaderFields(
    collectBillFormCustomFields(headerFields, formLayout),
  ).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  return { templateFields, extraDefinitions: [] };
}

/**
 * Split ordered fields into columns top-to-bottom (c1–c3 col 1, c4–c6 col 2, …).
 * Preserves template editor sort_order when fields are passed pre-sorted.
 */
export function partitionFieldsColumnWise(fields, columnCount) {
  const list = fields || [];
  if (!list.length) return [];
  const cols = Math.max(1, Math.min(columnCount, list.length));
  if (cols === 1) return [list];

  const perCol = Math.ceil(list.length / cols);
  const columns = [];
  for (let c = 0; c < cols; c++) {
    const chunk = list.slice(c * perCol, (c + 1) * perCol);
    if (chunk.length) columns.push(chunk);
  }
  return columns;
}

/**
 * Custom fields shown beside invoice/due dates (deduped).
 * Sources: invoice_details_top zone, form-layout custom slots, legacy invoice-details placements.
 */
export function collectInvoiceDetailsCustomFields(headerFields, formLayout) {
  const layoutKeys = new Set(layoutCustomFieldKeys(formLayout));
  const partition = partitionFormLayout(formLayout);
  const seen = new Set();
  const result = [];

  const add = (f) => {
    const keys = fieldDedupeKeys(f);
    if (!keys.length || keys.some((k) => seen.has(k))) return;
    keys.forEach((k) => seen.add(k));
    result.push(f);
  };

  fieldsForPlacement(headerFields, PLACEMENT.INVOICE_DETAILS_TOP).forEach(add);

  for (const slot of partition.right || []) {
    if (slot.kind === 'custom' && slot.field_key) {
      const f = (headerFields || []).find((h) => h.field_key === slot.field_key);
      if (f) add(f);
    }
  }

  for (const f of headerFields || []) {
    if (layoutKeys.has(f.field_key)) continue;
    if (BILL_TO_PLACEMENTS.has(f.placement)) continue;
    if (String(f.placement || '').startsWith('invoice_details')) add(f);
  }

  return result.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

/** All template custom fields for bill/invoice forms (deduped), shown after core details. */
export function collectBillFormCustomFields(headerFields, formLayout) {
  const seen = new Set();
  const result = [];
  const add = (f) => {
    const keys = fieldDedupeKeys(f);
    if (!keys.length || keys.some((k) => seen.has(k))) return;
    keys.forEach((k) => seen.add(k));
    result.push(f);
  };

  fieldsForPlacement(headerFields, PLACEMENT.FORM_BELOW_TEMPLATE).forEach(add);
  fieldsForPlacement(headerFields, PLACEMENT.BILL_TO_UNDER_CUSTOMER).forEach(add);
  fieldsForPlacement(headerFields, PLACEMENT.BILL_TO_UNDER_ADDRESS).forEach(add);
  collectInvoiceDetailsCustomFields(headerFields, formLayout).forEach(add);

  return result;
}

/** @deprecated Use resolveFormCustomFieldsForDocument */
export function metadataDefinitionsExcludingTemplate(definitions, templateFields) {
  const templateDefIds = new Set();
  const templateFieldKeys = new Set();
  const templateLabels = new Set();

  for (const f of templateFields || []) {
    if (f?.definition_id != null && f.definition_id !== '') {
      templateDefIds.add(String(f.definition_id));
    }
    if (f?.field_key) templateFieldKeys.add(String(f.field_key).toLowerCase());
    const lbl = normalizeFieldLabel(f.label);
    if (lbl) templateLabels.add(lbl);
  }

  return (definitions || []).filter((d) => {
    if (templateDefIds.has(String(d.id))) return false;
    const key = String(d.field_key ?? '').toLowerCase();
    if (key && templateFieldKeys.has(key)) return false;
    const lbl = normalizeFieldLabel(d.label);
    if (lbl && templateLabels.has(lbl)) return false;
    return true;
  });
}

/** All template custom fields for invoice forms (deduped), shown after core invoice details. */
export const collectInvoiceFormCustomFields = collectBillFormCustomFields;

/** Amount-style columns share one width; description is widest */
export const INVOICE_LINE_AMOUNT_COL_KEYS = new Set([
  LINE_COL.QUANTITY,
  LINE_COL.RATE,
  LINE_COL.DISCOUNT_FIXED,
  LINE_COL.DISCOUNT_PERCENT,
  LINE_COL.NET_TOTAL,
  LINE_COL.FINAL_TOTAL,
  LINE_COL.SALE_TAX,
]);
