/** Strip labels/punctuation, then format digits as MM/YY. */
export function formatExpiryMaskInput(raw) {
  const iso = parseExpiryToIso(raw);
  if (iso) return isoToExpiryMask(iso);
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (digits.length >= 6) {
    return `${digits.slice(0, 2)}/${digits.slice(4, 6)}`;
  }
  const four = digits.slice(0, 4);
  if (four.length <= 2) return four;
  return `${four.slice(0, 2)}/${four.slice(2)}`;
}

/** Show ISO or any printed expiry style as MM/YY in the cell. */
export function expiryDisplayMask(value) {
  const iso = parseExpiryToIso(value);
  if (iso) return isoToExpiryMask(iso);
  const s = String(value ?? '').trim();
  if (/^\d{1,2}\/\d{2}$/.test(s)) {
    const [mo, yy] = s.split('/');
    return `${mo.padStart(2, '0')}/${yy}`;
  }
  return formatExpiryMaskInput(s);
}

export function isoToExpiryMask(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  return `${iso.slice(5, 7)}/${iso.slice(2, 4)}`;
}

/** Parse any common invoice expiry style → last day of month ISO (or the printed day). */
export function normalizeExpiry(raw) {
  return parseExpiryToIso(raw) || String(raw || '').trim();
}

export function isValidExpiryInput(raw) {
  return /^\d{4}-\d{2}-\d{2}$/.test(parseExpiryToIso(raw) || '');
}

const MONTHS = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9,
  sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12,
  december: 12,
};

function fullYear(n) {
  const y = Number(n);
  if (!Number.isFinite(y)) return null;
  if (y < 100) return y + 2000;
  return y;
}

function ymd(year, month, day) {
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return '';
  if (year < 1990 || year > 2099) return '';
  const last = new Date(year, month, 0).getDate();
  if (day > last) return '';
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function monthYear(month, year) {
  const y = fullYear(year);
  const m = Number(month);
  if (!y || m < 1 || m > 12) return '';
  const last = new Date(y, m, 0).getDate();
  return ymd(y, m, last);
}

function monthFromName(name) {
  return MONTHS[String(name || '').trim().toLowerCase()] || 0;
}

function cleanExpiryText(raw) {
  let s = String(raw ?? '').trim();
  if (!s || /^null$/i.test(s) || /^n\/a$/i.test(s)) return '';
  s = s.replace(/[\u2013\u2014\u2212\u00A0]/g, ' ');
  s = s.replace(/[''`]/g, ' ');
  s = s.replace(/(?<=\d)[Oo](?=\d)/g, '0').replace(/^[Oo](?=\d)/, '0');
  s = s.replace(/\b(?:exp(?:iry)?(?:\s*date)?|exp\.?|use by|best before|bb|mfg\.?|mfd)\b[:.\s]*/gi, '');
  return s.replace(/\s+/g, ' ').replace(/^[\s.:;]+|[\s.:;]+$/g, '');
}

function dayMonthYear(a, b, year) {
  const y = fullYear(year);
  if (a > 12 && b >= 1 && b <= 12) return ymd(y, b, a);
  if (b > 12 && a >= 1 && a <= 12) return ymd(y, a, b);
  return ymd(y, b, a);
}

function fromDigits(digits) {
  if (digits.length === 8) {
    const y = Number(digits.slice(0, 4));
    if (y >= 1990 && y <= 2099) {
      return ymd(y, Number(digits.slice(4, 6)), Number(digits.slice(6, 8)));
    }
    return dayMonthYear(Number(digits.slice(0, 2)), Number(digits.slice(2, 4)), Number(digits.slice(4, 8)));
  }
  if (digits.length === 6) {
    const head = Number(digits.slice(0, 4));
    if (head >= 1990 && head <= 2099) return monthYear(Number(digits.slice(4, 6)), head);
    return monthYear(Number(digits.slice(0, 2)), Number(digits.slice(2, 6)));
  }
  if (digits.length === 4) {
    return monthYear(Number(digits.slice(0, 2)), Number(digits.slice(2, 4)));
  }
  return '';
}

function tryParseExpiry(s) {
  let m;
  if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T].*)?$/))) {
    return ymd(Number(m[1]), Number(m[2]), Number(m[3]));
  }
  if ((m = s.match(/^(\d{4})[/.\\-](\d{1,2})[/.\\-](\d{1,2})$/))) {
    return ymd(Number(m[1]), Number(m[2]), Number(m[3]));
  }
  if ((m = s.match(/^(\d{4})[/.\\-\s]+(\d{1,2})$/))) {
    return monthYear(Number(m[2]), Number(m[1]));
  }
  if ((m = s.match(/^(\d{1,2})[/.\\-\s]+([A-Za-z]{3,9})[/.\\-\s]+(\d{2}|\d{4})$/))) {
    const month = monthFromName(m[2]);
    return month ? ymd(fullYear(m[3]), month, Number(m[1])) : '';
  }
  if ((m = s.match(/^([A-Za-z]{3,9})[/.\\-\s]+(\d{1,2})[,/.\\-\s]+(\d{2}|\d{4})$/))) {
    const month = monthFromName(m[1]);
    return month ? ymd(fullYear(m[3]), month, Number(m[2])) : '';
  }
  if ((m = s.match(/^([A-Za-z]{3,9})[/.\\-\s]+(\d{2}|\d{4})$/))) {
    const month = monthFromName(m[1]);
    return month ? monthYear(month, m[2]) : '';
  }
  if ((m = s.match(/^(\d{4}|\d{2})[/.\\-\s]+([A-Za-z]{3,9})$/))) {
    const month = monthFromName(m[2]);
    return month ? monthYear(month, m[1]) : '';
  }
  if ((m = s.match(/^(\d{1,2})[/.\\-\s]+(\d{1,2})[/.\\-\s]+(\d{2}|\d{4})$/))) {
    return dayMonthYear(Number(m[1]), Number(m[2]), m[3]);
  }
  if ((m = s.match(/^(\d{1,2})[/.\\-\s]+(\d{2}|\d{4})$/))) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (b >= 1000) return monthYear(a, b);
    if (a > 12 && b >= 1 && b <= 12) return monthYear(b, a);
    return monthYear(a, b);
  }
  return fromDigits(s.replace(/\D+/g, ''));
}

export function parseExpiryToIso(raw) {
  const s = cleanExpiryText(raw);
  if (!s) return '';
  return tryParseExpiry(s) || '';
}
