/**
 * Client-side mirror of the value-formatting half of PHP's
 * `App\Domain\DocumentOutput\Fields\FieldResolver`. The DTO's internal
 * dot-paths (e.g. `meta.logo_url` for the `company.logo_url` token) are
 * intentionally NOT exposed to the frontend (the field-catalog API only
 * returns token/label/group/type, never `path`) — that mapping is a
 * server-side implementation detail. So this module does not attempt
 * client-side dot-path resolution against a DocumentDTO; the
 * authoritative resolved render always comes from the server
 * (`previewWithConfig`/`preview` — see TemplateRenderer.jsx), which is
 * what actually guarantees "Designer = Preview = PDF".
 *
 * What this module IS for: validating `{{token}}` syntax client-side
 * (so a typo is caught before a 422 round-trip) and formatting a
 * already-known sample value the same way the server would, for
 * instant Properties-panel feedback (e.g. "Format preview: USD 1,234.50").
 */

const TOKEN_PATTERN = /^[a-zA-Z_][\w]*(?:\.[a-zA-Z_][\w]*)+$/;
const TOKEN_IN_CONTENT_PATTERN = /\{\{\s*([a-zA-Z_][\w]*(?:\.[a-zA-Z_][\w]*)+)\s*\}\}/g;

/** @param {string} token */
export function isValidTokenSyntax(token) {
  return typeof token === 'string' && TOKEN_PATTERN.test(token);
}

/** Every `{{...}}`-looking substring in `content` must be a syntactically valid token. */
export function contentHasOnlyValidTokens(content) {
  const text = String(content ?? '');
  const matches = text.matchAll(/\{\{(.*?)\}\}/g);
  for (const m of matches) {
    if (!isValidTokenSyntax(m[1].trim())) return false;
  }
  return true;
}

/** @returns {string[]} every `{{token}}` referenced inside `content` */
export function extractTokens(content) {
  const text = String(content ?? '');
  return Array.from(text.matchAll(TOKEN_IN_CONTENT_PATTERN)).map((m) => m[1]);
}

export function formatMoney(value, currency = 'USD', decimals = 2) {
  const n = Number(value ?? 0);
  return `${currency} ${n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

export function formatNumber(value, decimals = null) {
  const n = Number(value ?? 0);
  if (decimals != null) {
    return n.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }
  // Auto: whole numbers as 1, not 1.00 (Sr #, integer qty).
  if (Math.abs(n - Math.round(n)) < 1e-9) {
    return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/** pattern: iso | short | long — matches the Formatting panel + FieldResolver::formatDate(). */
export function formatDate(value, pattern = 'short') {
  const ts = value ? new Date(value) : null;
  if (!ts || Number.isNaN(ts.getTime())) return String(value ?? '');

  if (pattern === 'iso') {
    return ts.toISOString().slice(0, 10);
  }
  const day = ts.getDate();
  const month = ts.toLocaleString('en-US', { month: pattern === 'long' ? 'long' : 'short' });
  const year = ts.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * @param {*} value
 * @param {{type?: string, decimals?: number, pattern?: string, currency_override?: string}} [format]
 * @param {string} [currency]
 */
export function formatValue(value, format, currency = 'USD') {
  const type = format?.type ?? 'text';
  switch (type) {
    case 'money':
      return formatMoney(value, format?.currency_override ?? currency, format?.decimals ?? 2);
    case 'number':
      return formatNumber(value, Object.prototype.hasOwnProperty.call(format || {}, 'decimals') ? format.decimals : null);
    case 'date':
      return formatDate(value, format?.pattern ?? 'short');
    case 'boolean':
      return value ? 'Yes' : 'No';
    default:
      return value === null || value === undefined ? '' : String(value);
  }
}

/** Mirrors FieldResolver::resolveFormatted()'s fallback behaviour for empty values. */
export function formatWithFallback(value, format, currency = 'USD') {
  const fallback = format?.fallback ?? '—';
  if (value === null || value === undefined || value === '') return fallback;
  return formatValue(value, format, currency);
}
