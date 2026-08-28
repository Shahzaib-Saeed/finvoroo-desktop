const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Istanbul',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
  'Pacific/Auckland',
];

export function getTimezoneOptions() {
  try {
    if (typeof Intl.supportedValuesOf === 'function') {
      const all = Intl.supportedValuesOf('timeZone');
      const merged = [...new Set([...COMMON_TIMEZONES, ...all])];
      return merged.sort((a, b) => a.localeCompare(b));
    }
  } catch {
    // ignore
  }
  return COMMON_TIMEZONES;
}

export function timezoneLabel(tz) {
  if (!tz) return 'UTC';
  try {
    const now = new Date();
    const offset = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    })
      .formatToParts(now)
      .find((p) => p.type === 'timeZoneName')?.value;
    return offset ? `${tz} (${offset})` : tz;
  } catch {
    return tz;
  }
}
