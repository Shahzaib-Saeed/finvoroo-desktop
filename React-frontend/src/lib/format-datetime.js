import { format, isValid, parse, parseISO } from 'date-fns';
import { useAuthStore } from '@/store/authStore';

/** Canonical display format: Date/Month/Year (e.g. 24/07/2026). */
export const DISPLAY_DATE_FORMAT = 'dd/MM/yyyy';
export const DISPLAY_DATE_SHORT_FORMAT = 'dd/MM/yy';
export const DISPLAY_DATE_TIME_FORMAT = "dd/MM/yyyy 'at' hh:mm:ss a";
export const DISPLAY_DATE_TIME_COMPACT_FORMAT = 'dd/MM/yyyy, hh:mm a';

export function getUserTimezone() {
  const { activeCompany, user } = useAuthStore.getState();
  if (activeCompany?.timezone) return activeCompany.timezone;
  if (user?.timezone) return user.timezone;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function hasTimeComponent(value) {
  if (value instanceof Date) return true;
  const raw = String(value ?? '').trim();
  return /[T\s]\d{1,2}:\d{2}/.test(raw) || /at\s+\d{1,2}:\d{2}/i.test(raw);
}

function toValidDate(value) {
  if (!value && value !== 0) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  // ISO / SQL datetime strings — preserve the time portion.
  if (/^\d{4}-\d{2}-\d{2}[T\s]\d/.test(raw)) {
    const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
    const parsed = parseISO(normalized);
    if (isValid(parsed)) return parsed;
    const fallback = new Date(raw);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }

  // Date-only ISO (YYYY-MM-DD) — used by date inputs / document dates.
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const parsed = parseISO(raw);
    if (isValid(parsed)) return parsed;
  }

  // DD/MM/YYYY display strings, with or without time.
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(raw)) {
    if (/\d{1,2}:\d{2}/.test(raw)) {
      const withAt = parse(raw, DISPLAY_DATE_TIME_FORMAT, new Date());
      if (isValid(withAt)) return withAt;
      const compact = parse(raw, DISPLAY_DATE_TIME_COMPACT_FORMAT, new Date());
      if (isValid(compact)) return compact;
    } else {
      const parsed = parse(
        raw,
        raw.length <= 8 ? DISPLAY_DATE_SHORT_FORMAT : DISPLAY_DATE_FORMAT,
        new Date(),
      );
      if (isValid(parsed)) return parsed;
    }
  }

  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function formatInTimezone(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).formatToParts(date);

  const get = (type) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('day')}/${get('month')}/${get('year')} at ${get('hour')}:${get('minute')}:${get('second')} ${get('dayPeriod')}`;
}

/** Format any date-like value as DD/MM/YYYY for UI display. */
export function formatDisplayDate(value, empty = '—') {
  const date = toValidDate(value);
  if (!date) return empty;
  try {
    return format(date, DISPLAY_DATE_FORMAT);
  } catch {
    return empty;
  }
}

/** Compact DD/MM/YY for dense tables. */
export function formatDisplayDateShort(value, empty = '—') {
  const date = toValidDate(value);
  if (!date) return empty;
  try {
    return format(date, DISPLAY_DATE_SHORT_FORMAT);
  } catch {
    return empty;
  }
}

/** Date + time for report footers / audit timestamps. */
export function formatDisplayDateTime(value, empty = '—', options = {}) {
  const date = toValidDate(value);
  if (!date) return empty;

  const {
    pattern = DISPLAY_DATE_TIME_FORMAT,
    timeZone = getUserTimezone(),
    showTimezone = false,
    useLocal,
  } = options;

  const includeTime = hasTimeComponent(value);

  // Datetimes should respect the workspace/user timezone (audit logs, approvals, etc.).
  if (includeTime && useLocal === false) {
    try {
      const formatted = formatInTimezone(date, timeZone || 'UTC');
      return showTimezone ? `${formatted} (${timeZone})` : formatted;
    } catch {
      // fall through to date-fns
    }
  }

  try {
    const formatted = format(date, pattern);
    return showTimezone ? `${formatted} (${timeZone})` : formatted;
  } catch {
    return empty;
  }
}

/** @deprecated Prefer formatDisplayDateTime — kept for existing call sites. */
export function formatDateTime(value, options = {}) {
  return formatDisplayDateTime(value, '—', {
    ...options,
    useLocal: false,
  });
}

export function formatRelativeTime(value) {
  if (!value) return '';

  try {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    const diffSec = Math.round((date.getTime() - Date.now()) / 1000);
    const absSec = Math.abs(diffSec);
    const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

    if (absSec < 60) return rtf.format(diffSec, 'second');
    const diffMin = Math.round(diffSec / 60);
    if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute');
    const diffHour = Math.round(diffMin / 60);
    if (Math.abs(diffHour) < 24) return rtf.format(diffHour, 'hour');
    const diffDay = Math.round(diffHour / 24);
    return rtf.format(diffDay, 'day');
  } catch {
    return '';
  }
}
