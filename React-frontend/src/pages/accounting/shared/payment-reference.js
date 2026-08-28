/**
 * Client-entered payment reference (e.g. MB STAN-844807, CASH-7851116).
 * System receipt numbers (RC-26-xxxx) are secondary IDs — not the primary label.
 */
export function getPaymentDisplayReference(row) {
  const ref = String(row?.reference ?? '').trim();
  if (ref) return ref;
  return row?.payment_number || row?.receipt_number || '—';
}

export function getPaymentSystemNumber(row) {
  return row?.receipt_number || row?.payment_number || null;
}

export function hasClientPaymentReference(row) {
  return Boolean(String(row?.reference ?? '').trim());
}
