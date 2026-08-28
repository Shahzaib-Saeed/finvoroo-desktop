const PRINT_ROOT_CLASS = 'print-bill-document-only';

/**
 * Print the on-screen bill (#bill-document) so print matches view.
 * Falls back to #bill-print-document, then full window.print().
 */
export function printBillDocument(elementId = 'bill-document') {
  const el =
    document.getElementById(elementId) ||
    document.getElementById('bill-print-document');
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
