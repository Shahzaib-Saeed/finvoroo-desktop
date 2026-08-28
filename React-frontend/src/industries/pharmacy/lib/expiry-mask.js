/** Strip to digits and format as MM/YY (max 5 chars). */
export function formatExpiryMaskInput(raw) {
  const digits = String(raw ?? '').replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

/** Show ISO or loose values as MM/YY in the cell. */
export function expiryDisplayMask(value) {
  const s = String(value ?? '').trim();
  if (!s) return '';
  if (/^\d{1,2}\/\d{2}$/.test(s)) {
    const [mo, yy] = s.split('/');
    return `${mo.padStart(2, '0')}/${yy}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return `${s.slice(5, 7)}/${s.slice(2, 4)}`;
  }
  return formatExpiryMaskInput(s);
}

export function isoToExpiryMask(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  return `${iso.slice(5, 7)}/${iso.slice(2, 4)}`;
}

/** Parse MM/YY, M/YY, MMDD, or ISO → last day of month ISO date. */
export function normalizeExpiry(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  let month;
  let year;

  const slash = s.match(/^(\d{1,2})[\/\-.](\d{2}|\d{4})$/);
  if (slash) {
    month = Number(slash[1]);
    year = Number(slash[2]);
    if (year < 100) year += 2000;
  } else {
    const digits = s.replace(/\D/g, '');
    if (/^\d{4}$/.test(digits)) {
      month = Number(digits.slice(0, 2));
      year = Number(digits.slice(2, 4)) + 2000;
    }
  }

  if (!month || !year) return s;
  if (month < 1 || month > 12) return s;

  const last = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
}

export function isValidExpiryInput(raw) {
  const iso = normalizeExpiry(raw);
  return /^\d{4}-\d{2}-\d{2}$/.test(iso);
}
