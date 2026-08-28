import { getPaymentDisplayReference } from '../shared/payment-reference';

/** Internal GL keys posted for payments — not shown to users in reports. */
export function isInternalPaymentGlRef(value) {
  return /^(PAY|BP)-\d+$/i.test(String(value ?? '').trim());
}

/**
 * Internal ledger keys (INV-152, BILL-7, INVCOGS-12, …) — bookkeeping links only.
 * User-facing numbers are IN-26-0001, BI-26-0001, etc.
 */
export function isInternalGlRef(value) {
  const v = String(value ?? '').trim();
  if (!v) return false;
  if (isInternalPaymentGlRef(v)) return true;
  if (/^INV-\d+$/i.test(v)) return true;
  if (/^BILL-\d+$/i.test(v)) return true;
  if (/^VC-\d+$/i.test(v)) return true;
  if (/^CN(?:COGS(?:REV)?|REF)?-\d+/i.test(v)) return true;
  if (/^INVCOGS(?:REV)?-\d+/i.test(v)) return true;
  if (/^INV(?:ADJ|REV|NETREV|OVERPAY|OPENROUND|ROUND|RECON|COGSFIX)-/i.test(v)) {
    return true;
  }
  if (/^BILL(?:ADJ|NETREV|REV)-/i.test(v)) return true;
  if (/^BILLREV-(?:CANCEL|DEL)-\d+-/i.test(v)) return true;
  if (/^VCINV(?:REV-\d+-)?/i.test(v)) return true;
  if (/^(?:VEND|CUST)-OB-\d+$/i.test(v)) return true;

  return false;
}

/** Auto-generated receipt/payment numbers — secondary to client-entered reference. */
export function isSystemPaymentLabel(value) {
  const v = String(value ?? '').trim();
  if (!v) return false;
  if (isInternalGlRef(v)) return true;
  return /^(RC-\d{2}-\d+|BP-\d{2}-\d+)$/i.test(v);
}

function normalizePaymentReference(value) {
  const ref = String(value ?? '').trim();
  if (!ref) return '—';
  if (isInternalGlRef(ref)) return '—';
  return ref;
}

function pickEnrichedReference(row) {
  const enriched = String(
    row?.display_reference ??
      row?.source_document_number ??
      row?.invoice_number ??
      row?.bill_number ??
      '',
  ).trim();
  if (!enriched || isInternalGlRef(enriched)) return '';
  if (isSystemPaymentLabel(enriched)) return '';
  return enriched;
}

/**
 * Human label for report Reference column: invoice/bill numbers (IN-26-0001),
 * client-entered receipt references, then system RC/BP numbers — never INV-152.
 */
export function getReportDisplayReference(row) {
  const enrichedRef = pickEnrichedReference(row);
  if (enrichedRef) return enrichedRef;

  const rawRef = String(
    row?.reference ?? row?.reference_no ?? row?.payment_reference ?? '',
  ).trim();

  const paymentRef = getPaymentDisplayReference(row);
  if (
    paymentRef &&
    paymentRef !== '—' &&
    !isInternalGlRef(paymentRef) &&
    !isSystemPaymentLabel(paymentRef)
  ) {
    return paymentRef;
  }

  if (rawRef && !isInternalGlRef(rawRef) && !isInternalPaymentGlRef(rawRef)) {
    return rawRef;
  }

  if (paymentRef && paymentRef !== '—' && !isInternalGlRef(paymentRef)) {
    return paymentRef;
  }

  const receiptOrPayment = String(
    row?.receipt_number ?? row?.payment_number ?? '',
  ).trim();
  if (receiptOrPayment) {
    return receiptOrPayment;
  }

  return normalizePaymentReference(rawRef);
}
