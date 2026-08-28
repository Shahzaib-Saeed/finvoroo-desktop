/** Shared cell formatting for viewer and builder preview tables. */
export function formatReportCell(value, col, formatting = {}) {
  const fmt = {
    decimalPlaces: 2,
    thousandsSeparator: true,
    negativeStyle: 'minus',
    dateFormat: 'short',
    ...formatting,
  };

  if (value === null || value === undefined || value === '') return '—';

  if (col.formatter === 'money' || col.type === 'money') {
    const n = Number(value);
    if (Number.isNaN(n)) return String(value);
    const opts = { minimumFractionDigits: fmt.decimalPlaces, maximumFractionDigits: fmt.decimalPlaces };
    const formatted = fmt.thousandsSeparator ? n.toLocaleString(undefined, opts) : n.toFixed(fmt.decimalPlaces);
    if (n < 0 && fmt.negativeStyle === 'parentheses') {
      const positive = fmt.thousandsSeparator
        ? Math.abs(n).toLocaleString(undefined, opts)
        : Math.abs(n).toFixed(fmt.decimalPlaces);
      return `(${positive})`;
    }
    return formatted;
  }

  if (col.type === 'number') {
    const n = Number(value);
    return Number.isNaN(n) ? String(value) : fmt.thousandsSeparator ? n.toLocaleString() : String(n);
  }

  if (col.formatter === 'date' || col.type === 'date' || col.type === 'datetime') {
    const d = new Date(String(value).slice(0, 10));
    if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
    if (fmt.dateFormat === 'iso') return d.toISOString().slice(0, 10);
    if (fmt.dateFormat === 'long') {
      return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
    }
    return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  }

  return String(value);
}

export function formatReportDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatReportDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
