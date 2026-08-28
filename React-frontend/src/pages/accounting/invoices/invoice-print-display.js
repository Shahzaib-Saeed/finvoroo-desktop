/** Mirrors App\Support\Accounting\InvoicePrintDisplaySettings (PHP). */

export const DISPLAY_DEFAULTS = {
  show_company_header: true,
  show_bill_to: true,
  bill_to_show_address: true,
  bill_to_show_contact_person: false,
  bill_to_show_contact_email: false,
  bill_to_show_phone: false,
  bill_to_show_tax_id: false,
  show_custom_fields: true,
  show_line_items: true,
  show_payment_terms: true,
  show_notes: true,
  show_footer: true,
  columns: {
    number: true,
    description: true,
    rate: true,
    qty: true,
    discount: true,
    tax: true,
    amount: true,
  },
  section_order: null,
};

export const DOCUMENT_PLACEMENT_ORDER = [
  'form_below_template',
  'bill_to_under_customer',
  'bill_to_under_address',
  'invoice_details_top',
  'invoice_details_after_dates',
  'invoice_details_after_payment_terms',
  'invoice_details_after_balances',
];

export const CORE_SECTION_IDS = [
  'company-header',
  'addresses',
  'line-items',
  'payment-terms',
  'notes',
  'footer',
];

export function mergePrintDisplay(stored) {
  const out = structuredClone(DISPLAY_DEFAULTS);
  if (!stored || typeof stored !== 'object') {
    return out;
  }
  for (const [k, v] of Object.entries(stored)) {
    if (k === 'columns' && v && typeof v === 'object') {
      out.columns = { ...out.columns, ...v };
    } else if (k === 'section_order' && Array.isArray(v)) {
      const filtered = v.filter((id) => typeof id === 'string');
      out.section_order = filtered.length ? filtered : null;
    } else if (k in out && k !== 'section_order') {
      out[k] = Boolean(v);
    }
  }
  return out;
}

export function sanitizePrintDisplayForSave(input) {
  const out = structuredClone(DISPLAY_DEFAULTS);
  if (!input || typeof input !== 'object') {
    return out;
  }
  for (const key of Object.keys(DISPLAY_DEFAULTS)) {
    if (key === 'columns') {
      const cols = input.columns || {};
      for (const ck of Object.keys(out.columns)) {
        out.columns[ck] = cols[ck] !== undefined ? Boolean(cols[ck]) : out.columns[ck];
      }
    } else if (key === 'section_order') {
      const so = input.section_order;
      out.section_order = Array.isArray(so)
        ? so.filter((id) => typeof id === 'string')
        : null;
    } else {
      out[key] = input[key] !== undefined ? Boolean(input[key]) : out[key];
    }
  }
  return out;
}

export function sectionOrderStorageKey(invoiceId) {
  return `invoice_section_order_${invoiceId}`;
}

export function loadSectionOrderLocal(invoiceId) {
  try {
    const raw = localStorage.getItem(sectionOrderStorageKey(invoiceId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveSectionOrderLocal(invoiceId, order) {
  try {
    localStorage.setItem(sectionOrderStorageKey(invoiceId), JSON.stringify(order));
  } catch {
    /* ignore */
  }
}

const JOB_ORDER_CUSTOM_FIELDS_KEY = '__job_order_custom_fields__';

/**
 * Merge legacy job-only blob values into template values when the field key
 * exists on the invoice template. Job-only fields without a template match are omitted.
 * Also merges settings-linked metadata values (definition_id) into field_key values.
 */
export function resolveInvoiceCustomFieldValues(invoice) {
  const fields = invoice?.invoice_template?.header_fields || [];
  const values = { ...(invoice?.custom_field_values || {}) };
  delete values[JOB_ORDER_CUSTOM_FIELDS_KEY];

  const headerKeys = new Set(fields.map((f) => f.field_key).filter(Boolean));
  const legacyJobRows =
    invoice?.job_order_custom_fields || invoice?.custom_field_values?.[JOB_ORDER_CUSTOM_FIELDS_KEY] || [];

  if (Array.isArray(legacyJobRows)) {
    for (const row of legacyJobRows) {
      const key = (row?.field_key || '').trim();
      if (!key || !headerKeys.has(key)) continue;
      const val = row?.value;
      if (val == null || String(val).trim() === '') continue;
      if (values[key] == null || String(values[key]).trim() === '') {
        values[key] = val;
      }
    }
  }

  const metadata = invoice?.invoice_metadata_custom_fields || {};
  for (const field of fields) {
    if (field.definition_id == null || !field.field_key) continue;
    const metaVal =
      metadata[String(field.definition_id)] ?? metadata[field.definition_id];
    if (metaVal == null || String(metaVal).trim() === '') continue;
    if (values[field.field_key] == null || String(values[field.field_key]).trim() === '') {
      values[field.field_key] = metaVal;
    }
  }

  return values;
}

function resolveFieldDisplayValue(field, values, metadata = {}) {
  const keyVal = values?.[field?.field_key];
  if (keyVal != null && String(keyVal).trim() !== '') return keyVal;
  if (field?.definition_id != null) {
    const metaVal =
      metadata[String(field.definition_id)] ?? metadata[field.definition_id];
    if (metaVal != null && String(metaVal).trim() !== '') return metaVal;
  }
  return keyVal;
}

/**
 * Build custom-field sections for invoice show/print.
 * Only invoice template fields with values are shown — job-order-only fields are excluded.
 */
export function buildCustomFieldSections(invoice) {
  const fields = invoice?.invoice_template?.header_fields || [];
  const values = resolveInvoiceCustomFieldValues(invoice);
  const metadata = invoice?.invoice_metadata_custom_fields || {};

  const placements = [
    ...new Set(fields.map((f) => f.placement || 'form_below_template')),
  ].sort(
    (a, b) =>
      DOCUMENT_PLACEMENT_ORDER.indexOf(a) - DOCUMENT_PLACEMENT_ORDER.indexOf(b),
  );

  const sections = placements
    .map((placement) => {
      const items = fields
        .filter((f) => (f.placement || 'form_below_template') === placement)
        .map((field) => ({
          field,
          value: resolveFieldDisplayValue(field, values, metadata),
        }))
        .filter(({ value }) => value != null && String(value).trim() !== '');

      if (!items.length) return null;

      return {
        sectionId: `custom-fields-${placement}`,
        placement,
        items,
      };
    })
    .filter(Boolean);

  const legacyKeys = Object.keys(values).filter(
    (k) =>
      k !== JOB_ORDER_CUSTOM_FIELDS_KEY &&
      values[k] != null &&
      String(values[k]).trim() !== '' &&
      !fields.some((f) => f.field_key === k),
  );

  if (!fields.length && legacyKeys.length) {
    sections.push({
      sectionId: 'custom-fields-legacy',
      placement: 'legacy',
      items: legacyKeys.map((key) => ({
        field: { field_key: key, label: key, field_type: 'text' },
        value: values[key],
      })),
    });
  }

  return sections;
}

/** Format a template custom field value for invoice show/print. */
export function formatInvoiceCustomFieldDisplayValue(value, fieldType) {
  if (value == null) return '';
  if (fieldType === 'date') {
    const raw = String(value).trim();
    const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      });
    }
    return raw;
  }
  if (fieldType === 'textarea') return String(value);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value).trim();
}

/**
 * All filled template custom fields for invoice view/print — uses client labels as-is.
 */
export function buildInvoiceCustomFieldDisplayRows(invoice, customItems) {
  const seen = new Set();
  const rows = customItems
    .map(({ field, value }) => {
      const label = String(field?.label || field?.field_key || '').trim();
      const formatted = formatInvoiceCustomFieldDisplayValue(value, field?.field_type);
      return {
        key: field?.field_key || label,
        label,
        value: formatted,
        sortOrder: Number(field?.sort_order) || 0,
      };
    })
    .filter(({ label, value }) => label && value)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label))
    .filter((row) => {
      const dedupe = `${row.label}::${row.value}`;
      if (seen.has(dedupe)) return false;
      seen.add(dedupe);
      return true;
    });

  const hasBillOfLading = rows.some(({ label }) =>
    /bill\s*of\s*lading|b\/l|bol|hbl|mbl/i.test(label),
  );
  const ref = String(invoice?.reference_number || '').trim();
  if (!hasBillOfLading && ref) {
    rows.unshift({
      key: '__reference_number__',
      label: 'Bill of Lading No',
      value: ref,
      sortOrder: -1,
    });
  }

  return rows;
}

/** Positive quantity from a saved invoice line. */
export function lineQuantityAsNumber(line) {
  const raw = line?.quantity ?? line?.entered_quantity_decimal;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/**
 * Classic print maps DB fields 1:1 — template label renames (Qty→"Unit Price",
 * Rate→"ROE") only affect the create form, not print columns.
 *   quantity  → Qty
 *   unit_price → Rate
 */
export function resolveUniversalLineDisplay(line) {
  const unitPrice = Number(line?.unit_price);
  const qty = lineQuantityAsNumber(line);

  return {
    qty,
    rate: Number.isFinite(unitPrice) ? unitPrice : null,
  };
}

/** @deprecated use resolveUniversalLineDisplay */
export function resolveUniversalLineQtyAndRate(line) {
  const d = resolveUniversalLineDisplay(line);
  return { qty: d.qty, rate: d.rate };
}

export function lineHasDiscount(line) {
  const disc = Number(line?.discount ?? line?.discount_fixed ?? 0);
  const pct = Number(line?.discount_percent ?? 0);
  if (String(line?.discount_type || '') === 'percent') {
    return (Number.isFinite(pct) && pct > 0) || (Number.isFinite(disc) && disc > 0);
  }
  return Number.isFinite(disc) && Math.abs(disc) > 0.005;
}

export function lineHasTax(line) {
  const tax = Number(line?.tax_amount ?? line?.sale_tax_amount ?? 0);
  return Number.isFinite(tax) && Math.abs(tax) > 0.005;
}

export function formatLineDiscountLabel(line) {
  if (!lineHasDiscount(line)) return '';
  const disc = Number(line?.discount ?? line?.discount_fixed ?? 0);
  const pct = Number(line?.discount_percent ?? 0);
  if (String(line?.discount_type || '') === 'percent') {
    const p = pct > 0 ? pct : disc;
    return `${Number(p).toLocaleString('en-US', { maximumFractionDigits: 2 })}%`;
  }
  return Number(disc).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatLineTaxLabel(line) {
  if (!lineHasTax(line)) return '';
  const tax = Number(line?.tax_amount ?? line?.sale_tax_amount ?? 0);
  return tax.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatLineQtyLabel(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n - Math.round(n)) < 0.0001) {
    return String(Math.round(n));
  }
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}

/** Document section order. Custom fields render inside `addresses`, not as separate blocks. */
export function resolveSectionOrder(invoice, customSections, display) {
  const coreIds = [...CORE_SECTION_IDS];

  const stored = display?.section_order;
  if (Array.isArray(stored) && stored.length) {
    const known = new Set(coreIds);
    const ordered = stored
      .filter((id) => known.has(id) && !String(id).startsWith('custom-fields-'));
    for (const id of coreIds) {
      if (!ordered.includes(id)) ordered.push(id);
    }
    return ordered;
  }

  return coreIds;
}
