export const INVOICE_FORM_SCOPE = 'invoice-form';

export const INVOICE_FORM_SHORTCUTS = [
  { keys: 'Enter', label: 'Next field / next line column →' },
  { keys: 'Ctrl+S', label: 'Save invoice' },
  { keys: 'Ctrl+Shift+S', label: 'Save & close' },
  { keys: 'Ctrl+Enter', label: 'Save & new (grid: add line)' },
  { keys: 'Ctrl+Shift+P', label: 'Preview' },
  { keys: 'Ctrl+D', label: 'Duplicate line' },
  { keys: 'Shift+Delete', label: 'Remove line' },
  { keys: 'Alt+arrows', label: 'Move between line cells' },
];

export function isVisibleFocusableElement(el) {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el.hidden) return false;
  if (el.getAttribute('aria-hidden') === 'true') return false;
  if (el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true') return false;
  return el.offsetParent !== null || el.getClientRects().length > 0;
}

export function resolveEnterNavElement(el) {
  if (!el || !(el instanceof HTMLElement)) return null;
  if (el.getAttribute('data-enter-nav') === '1') return el;
  return el.closest('[data-enter-nav="1"]');
}

export function getFocusableNavElements(scope) {
  if (!scope) return [];
  return Array.from(scope.querySelectorAll('[data-enter-nav="1"]')).filter(isVisibleFocusableElement);
}

/**
 * Tab-like focus advance for header/footer fields (outside line grid row logic).
 */
export function moveToNextFormField(currentEl, scopeSelector = `[data-enter-scope="${INVOICE_FORM_SCOPE}"]`) {
  const navEl = resolveEnterNavElement(currentEl) || currentEl;
  if (!navEl || !(navEl instanceof HTMLElement)) return false;

  const scope =
    navEl.closest(scopeSelector) ||
    navEl.closest('[data-enter-scope]') ||
    document.querySelector(scopeSelector);
  if (!scope) return false;

  const all = getFocusableNavElements(scope);
  const idx = all.indexOf(navEl);
  if (idx < 0 || idx >= all.length - 1) return false;

  const nextEl = all[idx + 1];
  if (!(nextEl instanceof HTMLElement)) return false;

  requestAnimationFrame(() => {
    nextEl.focus();
    if (nextEl instanceof HTMLInputElement) {
      nextEl.select();
    }
  });
  return true;
}

/**
 * Enter → next field. Skips textareas (allow new lines) unless modified.
 */
export function handleInvoiceEnterKeyDown(e) {
  if (e.key !== 'Enter' || e.shiftKey) return false;
  if (e.metaKey || e.ctrlKey || e.altKey) return false;
  if (!(e.target instanceof HTMLElement)) return false;

  if (e.target instanceof HTMLTextAreaElement) return false;

  if (e.target.closest('[role="dialog"], [role="listbox"], [cmdk-root]')) return false;

  const navEl = resolveEnterNavElement(e.target);
  if (!navEl) return false;

  e.preventDefault();
  moveToNextFormField(navEl);
  return true;
}

export function createInvoiceEnterKeyDownHandler(extraHandler) {
  return (e) => {
    if (handleInvoiceEnterKeyDown(e)) return;
    extraHandler?.(e);
  };
}

export function handleInvoiceFormShortcuts(e, handlers = {}) {
  const mod = e.metaKey || e.ctrlKey;
  if (!mod) return false;

  if (e.target instanceof HTMLElement) {
    if (e.target.closest('[role="dialog"]')) return false;
    if (e.target.isContentEditable) return false;
  }

  const inLineGrid = e.target instanceof HTMLElement &&
    Boolean(e.target.closest('[data-enter-scope="invoice-lines-grid"]'));

  const key = e.key.toLowerCase();

  if (key === 's' && !e.shiftKey && !e.altKey) {
    e.preventDefault();
    handlers.onSave?.('view');
    return true;
  }

  if (key === 's' && e.shiftKey && !e.altKey) {
    e.preventDefault();
    handlers.onSave?.('close');
    return true;
  }

  if (key === 'enter' && !e.shiftKey && !inLineGrid) {
    e.preventDefault();
    handlers.onSave?.('new');
    return true;
  }

  if (key === 'p' && e.shiftKey && !e.altKey) {
    e.preventDefault();
    handlers.onPreview?.();
    return true;
  }

  return false;
}
