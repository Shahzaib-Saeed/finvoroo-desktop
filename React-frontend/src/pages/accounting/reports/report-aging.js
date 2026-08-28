/**
 * Display aging status: days left until due, or days overdue.
 */
export function formatAgingLabel(row) {
  if (row?.aging_label) {
    return row.aging_label;
  }

  const daysLate = row?.days_late;
  if (daysLate === null || daysLate === undefined || Number.isNaN(Number(daysLate))) {
    return '';
  }

  const n = Number(daysLate);
  if (n < 0) {
    const days = Math.abs(n);
    return days === 1 ? '1 day left' : `${days} days left`;
  }
  if (n === 0) {
    return 'Due today';
  }
  return n === 1 ? '1 day overdue' : `${n} days overdue`;
}
