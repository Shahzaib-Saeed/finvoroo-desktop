/**
 * Pharmacist-facing invoice scan UX.
 *
 * Validation severity never decides whether extracted rows are shown.
 * Blocking / advisory / Gemini correction only change the warning state.
 */

export const SCAN_UX = {
  CLEAN: 'clean',
  ADVISORY: 'advisory',
  CORRECTED: 'corrected',
  REVIEW: 'review',
  EMPTY: 'empty',
};

const UX_RANK = {
  [SCAN_UX.EMPTY]: 4,
  [SCAN_UX.REVIEW]: 3,
  [SCAN_UX.CORRECTED]: 2,
  [SCAN_UX.ADVISORY]: 1,
  [SCAN_UX.CLEAN]: 0,
};

const FIELD_ALIASES = {
  quantity: ['qty'],
  unit_price: ['trade_price', 'gross_amount'],
  invoice_line_total: ['line_total'],
  batch_number: ['batch_no'],
  expiry_date: ['expiry_date'],
  discount: ['discount_amount', 'discount_percent', 'discount'],
  tax_amount: ['tax_amount', 'tax_percent', 'further_tax', 'tax'],
};

const TECHNICAL_MESSAGE_RE =
  /mistral read|failed our checks|low confidence|text region|http\s*\d{3}|ocr reported|what mistral extracted|provider_unavailable|primary_unreadable|validation_failed|confidence score|generativelanguage|api\.mistral/i;

export function pharmacistScanMessage(ux, itemCount = 0) {
  const n = Number(itemCount) || 0;
  const itemsLabel = `${n} item${n === 1 ? '' : 's'}`;

  switch (ux) {
    case SCAN_UX.CLEAN:
      return `Invoice scanned successfully — ${itemsLabel} found.`;
    case SCAN_UX.ADVISORY:
      return 'Some information may need review.';
    case SCAN_UX.CORRECTED:
      return 'Invoice scanned and automatically reviewed. Please verify the highlighted information before posting.';
    case SCAN_UX.REVIEW:
      return 'Some information could not be read confidently. Please review the highlighted rows before posting.';
    default:
      return 'This page could not be read. Try a clearer photo, or add the lines by hand.';
  }
}

export function isTechnicalScanMessage(text) {
  return TECHNICAL_MESSAGE_RE.test(String(text || ''));
}

export function sanitizePharmacistScanMessage(text, fallback = pharmacistScanMessage(SCAN_UX.EMPTY)) {
  const value = String(text || '').trim();
  if (!value || isTechnicalScanMessage(value)) return fallback;
  return value;
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function asList(value) {
  return Array.isArray(value) ? value : [];
}

export function itemIsUsable(item) {
  if (!item || typeof item !== 'object') return false;
  return Boolean(
    String(item.product_description || '').trim()
      || String(item.item_code || '').trim()
      || item.matched_product_id
      || String(item.matched_product_name || '').trim(),
  );
}

export function usableExtractionItems(items) {
  return asList(items).filter(itemIsUsable);
}

function firstUsableItemList(...candidates) {
  for (const candidate of candidates) {
    const list = usableExtractionItems(candidate);
    if (list.length) return list;
  }
  return [];
}

function stubItemsFromLineLabels(labels) {
  return asList(labels)
    .map((label) => String(label || '').trim())
    .filter(Boolean)
    .map((product_description) => ({ product_description }));
}

/**
 * Pull items / document / validation from a successful parse body or a 409
 * consent payload. Blocking validation is not treated as "no extraction".
 */
export function extractScanEnvelope(source = {}) {
  const data = asObject(source.data);
  const errorBody = asObject(source.error?.response?.data);
  const errors = asObject(errorBody.errors);
  const nestedData = asObject(errorBody.data);

  const items = firstUsableItemList(
    data.items,
    nestedData.items,
    errors.items,
    errors.primary_items,
    asObject(data.document).items,
    asObject(errors.document).items,
    stubItemsFromLineLabels(errors.primary_lines),
  );

  const document =
    data.document
    || nestedData.document
    || errors.document
    || null;

  const meta = asObject(data.meta || nestedData.meta || errors.meta);
  const validation =
    meta.validation
    || data.validation
    || nestedData.validation
    || errors.validation
    || null;

  const issues = asList(validation?.issues).length
    ? asList(validation.issues)
    : asList(errors.issues);

  return {
    items: Array.isArray(items) ? items : [],
    document,
    meta: {
      ...meta,
      validation: validation || meta.validation || null,
      fallback_used: Boolean(meta.fallback_used ?? errors.fallback_used),
      fallback_reason: meta.fallback_reason ?? errors.fallback_reason ?? errors.reason_code ?? '',
      fallback_provider: meta.fallback_provider || errors.fallback_provider || '',
      provider: meta.provider || errors.primary_provider || '',
      model: meta.model || '',
      extraction_id: meta.extraction_id || nestedData.meta?.extraction_id || null,
    },
    validation: validation
      ? { ...validation, issues }
      : issues.length
        ? { severity: 'blocking', issues }
        : null,
    issues,
    needsFallback:
      Boolean(errors.needs_fallback)
      || errors.code === 'ocr_fallback_consent',
    fallbackProvider: String(errors.fallback_provider || meta.fallback_provider || ''),
    reasonCode: String(errors.reason_code || meta.fallback_reason || ''),
    ocrDebug:
      data.ocr_debug
      || nestedData.ocr_debug
      || errors.ocr_debug
      || meta.ocr_debug
      || null,
  };
}

function severityOf(validation) {
  return String(validation?.severity || '').toLowerCase();
}

function resolveUx({ items, validation, fallbackUsed, needsFallback, hasError }) {
  if (!items.length) return SCAN_UX.EMPTY;
  const severity = severityOf(validation);
  if (severity === 'blocking' || (needsFallback && !fallbackUsed)) return SCAN_UX.REVIEW;
  if (fallbackUsed) return SCAN_UX.CORRECTED;
  if (severity === 'advisory') return SCAN_UX.ADVISORY;
  if (hasError) return SCAN_UX.REVIEW;
  return SCAN_UX.CLEAN;
}

/**
 * @param {{ data?: object, error?: object }} source
 *   `data` is the unwrapped parse-invoice success body.
 *   `error` is an axios-style failure (409 consent or hard failure).
 */
export function interpretInvoiceScanResult(source = {}) {
  const envelope = extractScanEnvelope(source);
  const hasError = Boolean(source.error);
  const fallbackUsed = Boolean(envelope.meta.fallback_used);
  const ux = resolveUx({
    items: envelope.items,
    validation: envelope.validation,
    fallbackUsed,
    needsFallback: envelope.needsFallback,
    hasError,
  });

  return {
    items: envelope.items,
    document: envelope.document,
    meta: envelope.meta,
    validation: envelope.validation,
    issues: envelope.issues,
    fallbackUsed,
    fallbackReason: envelope.meta.fallback_reason || '',
    fallbackProvider: envelope.fallbackProvider || envelope.meta.fallback_provider || '',
    reasonCode: envelope.reasonCode,
    needsFallback: envelope.needsFallback && !fallbackUsed,
    ocrDebug: envelope.ocrDebug,
    ux,
    pharmacistMessage: pharmacistScanMessage(ux, envelope.items.length),
    hasUsableRows: envelope.items.length > 0,
  };
}

export function pickWorstScanUx(states) {
  let worst = SCAN_UX.CLEAN;
  for (const state of states || []) {
    if ((UX_RANK[state] ?? -1) > (UX_RANK[worst] ?? -1)) worst = state;
  }
  return worst;
}

export function applyOcrHighlights(rows, issues) {
  const byRow = new Map();
  for (const issue of issues || []) {
    if (issue == null || issue.row === null || issue.row === undefined || issue.row === '') continue;
    const idx = Number(issue.row);
    if (!Number.isInteger(idx) || idx < 0) continue;
    const fields = byRow.get(idx) || [];
    if (issue.field) fields.push(String(issue.field));
    byRow.set(idx, fields);
  }
  return (rows || []).map((row, i) => {
    if (!byRow.has(i)) return row;
    return {
      ...row,
      _ocrHighlight: true,
      _ocrHighlightFields: byRow.get(i),
    };
  });
}

export function ocrFieldIsHighlighted(line, field) {
  if (!line?._ocrHighlight) return false;
  const wanted = asList(line._ocrHighlightFields);
  if (!wanted.length) return true;
  const aliases = FIELD_ALIASES[field] || [field];
  return wanted.some((name) => name === field || aliases.includes(name));
}
