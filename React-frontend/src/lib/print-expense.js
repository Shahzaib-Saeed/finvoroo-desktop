const PRINT_ROOT_CLASS = 'print-expense-document-only';

/**
 * Print only the element with id="expense-print-document" (hides sidebar, header, show UI).
 */
export function printExpenseDocument(elementId = 'expense-print-document') {
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
