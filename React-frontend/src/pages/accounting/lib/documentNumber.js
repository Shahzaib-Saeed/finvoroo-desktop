/**
 * Prefer the human document number; never invent PREFIX-{id}.
 * Falls back to em dash when missing so users are not shown DB ids.
 */
export function documentNumberLabel(...candidates) {
  for (const value of candidates) {
    const text = value == null ? '' : String(value).trim();
    if (text && text !== '#' && !/^#\d+$/.test(text)) return text;
  }
  return '—';
}
