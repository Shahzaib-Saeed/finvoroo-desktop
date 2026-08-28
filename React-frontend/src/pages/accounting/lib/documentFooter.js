/** @typedef {'invoice'|'bill'|'payment_receipt'|'credit_note'|'bill_payment'} DocumentFooterPage */

export const DEFAULT_DOCUMENT_FOOTER_PAGES = {
  invoice: true,
  bill: true,
  payment_receipt: true,
  credit_note: true,
  bill_payment: true,
};

function coercePageEnabled(value, fallback = true) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off', ''].includes(normalized)) return false;
  }
  return fallback;
}

export function normalizeDocumentFooterPages(pages) {
  let raw = pages;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = null;
    }
  }
  const out = { ...DEFAULT_DOCUMENT_FOOTER_PAGES };
  if (!raw || typeof raw !== 'object') return out;
  for (const key of Object.keys(out)) {
    if (raw[key] !== undefined) out[key] = coercePageEnabled(raw[key], true);
  }
  return out;
}

/** Split a company notice into title (first line) + body (remaining lines). */
export function splitDocumentNotice(text) {
  const raw = (text || '').trim();
  if (!raw) return null;
  const lines = raw.split(/\n/);
  const title = (lines[0] || '').trim();
  const body = lines.slice(1).join('\n').trim();
  return { title, body };
}

/** Company footer text only when enabled for this document page. */
export function companyDocumentFooterFor(company, page) {
  const text = (company?.document_footer || '').trim();
  if (!text) return '';
  const pages = normalizeDocumentFooterPages(company?.document_footer_pages);
  return coercePageEnabled(pages[page], true) ? text : '';
}
