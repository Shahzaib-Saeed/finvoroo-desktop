import { formatCurrencyAmount } from '@/lib/currency';

/** Match pharmacy POS — standard rounding to whole rupees. */
export function roundReceiptWhole(value) {
  return Math.round(Number(value) || 0);
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

/** Receipt header date/time — DD/MM/YYYY HH:mm (24h, local). */
export function formatReceiptDateTime(isoOrDisplay) {
  if (!isoOrDisplay) return '';
  const raw = String(isoOrDisplay).trim();
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return `${pad2(parsed.getDate())}/${pad2(parsed.getMonth() + 1)}/${parsed.getFullYear()} ${pad2(parsed.getHours())}:${pad2(parsed.getMinutes())}`;
  }
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?/);
  if (iso) {
    const hh = iso[4] ?? '00';
    const mm = iso[5] ?? '00';
    return `${iso[3]}/${iso[2]}/${iso[1]} ${hh}:${mm}`;
  }
  const dmy = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (dmy) {
    const hh = dmy[4] ? pad2(dmy[4]) : '00';
    const mm = dmy[5] ?? '00';
    return `${pad2(dmy[1])}/${pad2(dmy[2])}/${dmy[3]} ${hh}:${mm}`;
  }
  return raw;
}

/** Table cell amounts (no currency symbol). */
export function formatReceiptPlainAmount(value, { wholeRupees = false } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) return wholeRupees ? '0' : '0.00';
  const v = wholeRupees ? roundReceiptWhole(n) : n;
  const s = v.toLocaleString('en-US', {
    minimumFractionDigits: wholeRupees ? 0 : 2,
    maximumFractionDigits: wholeRupees ? 0 : 2,
  });
  if (wholeRupees) return s;
  return s.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
}

/** Summary lines with currency symbol (Rs., $, …). */
export function formatReceiptMoney(value, currency, { wholeRupees = false } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  const v = wholeRupees ? roundReceiptWhole(n) : n;
  return formatCurrencyAmount(v, currency, {
    minimumFractionDigits: wholeRupees ? 0 : 2,
    maximumFractionDigits: wholeRupees ? 0 : 2,
  });
}
