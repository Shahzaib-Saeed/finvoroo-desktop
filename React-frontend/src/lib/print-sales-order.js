const PRINT_ROOT_CLASS = 'print-sales-order-document-only';

/**
 * Print only #sales-order-print-document (hides workspace shell and show UI).
 */
export function printSalesOrderDocument(elementId = 'sales-order-print-document') {
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
