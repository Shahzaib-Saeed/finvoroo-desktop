const PRINT_ROOT_CLASS = 'print-payment-receipt-document-only';

/**
 * Print only the element with id="payment-receipt-document" (hides sidebar, header, toolbar).
 */
export function printPaymentReceiptDocument(elementId = 'payment-receipt-document') {
  const el = document.getElementById(elementId);
  if (!el) {
    window.print();
    return;
  }

  const root = document.documentElement;
  root.classList.add(PRINT_ROOT_CLASS);

  const cleanup = () => {
    root.classList.remove(PRINT_ROOT_CLASS);
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);
  requestAnimationFrame(() => window.print());
}
