const ROW_FIELDS = ['item', 'qty', 'price', 'batch', 'expiry'];

function selector(field, index) {
  if (field === 'item') {
    return `[data-open-return-item="${index}"]`;
  }
  return `[data-open-return-${field}="${index}"]`;
}

export function focusOpenReturnDiscountAmount({ selectAll = true } = {}) {
  requestAnimationFrame(() => {
    const el = document.querySelector('[data-open-return-discount-amount]');
    el?.focus?.({ preventScroll: true });
    if (selectAll) el?.select?.();
  });
}

export function focusOpenReturnDiscountPercent({ selectAll = true } = {}) {
  requestAnimationFrame(() => {
    const el = document.querySelector('[data-open-return-discount-percent]');
    el?.focus?.({ preventScroll: true });
    if (selectAll) el?.select?.();
  });
}

export function focusOpenReturnSubmit() {
  requestAnimationFrame(() => {
    document.querySelector('[data-open-return-submit]')?.focus?.({ preventScroll: true });
  });
}

export function focusOpenReturnField(index, field, { selectAll = false } = {}) {
  requestAnimationFrame(() => {
    if (field === 'item') {
      const cell = document.querySelector(selector('item', index));
      const input = cell?.querySelector?.('input');
      const button = cell?.querySelector?.('button');
      const target = input || button;
      target?.focus?.({ preventScroll: true });
      if (selectAll) input?.select?.();
      return;
    }
    const el = document.querySelector(selector(field, index));
    el?.focus?.({ preventScroll: true });
    if (selectAll) el?.select?.();
    document
      .querySelector(`[data-open-return-row="${index}"]`)
      ?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  });
}

function detectOpenReturnField() {
  const active = document.activeElement;
  if (active?.closest?.('[data-open-return-qty]')) return 'qty';
  if (active?.closest?.('[data-open-return-price]')) return 'price';
  if (active?.closest?.('[data-open-return-batch]')) return 'batch';
  if (active?.closest?.('[data-open-return-expiry]')) return 'expiry';
  return 'item';
}

export function navigateOpenReturnRow(rowIndex, delta, rowCount, onSelectRow) {
  const next = Math.max(0, Math.min(rowIndex + delta, rowCount - 1));
  if (next === rowIndex) return;
  const field = detectOpenReturnField();
  onSelectRow?.(next);
  focusOpenReturnField(next, field);
}

export function handleOpenReturnArrowNav(e, rowIndex, rowCount, onSelectRow) {
  if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return false;
  e.preventDefault();
  e.stopPropagation();
  navigateOpenReturnRow(rowIndex, e.key === 'ArrowDown' ? 1 : -1, rowCount, onSelectRow);
  return true;
}

export function focusOpenReturnNextProductRow(rowIndex, { onEnsureRow, onSelectRow } = {}) {
  const nextIndex = rowIndex + 1;
  onEnsureRow?.(nextIndex);
  onSelectRow?.(nextIndex);

  const focusAndOpen = (attempt = 0) => {
    requestAnimationFrame(() => {
      const cell = document.querySelector(`[data-open-return-item="${nextIndex}"]`);
      const input = cell?.querySelector?.('input');
      const button = cell?.querySelector?.('button');
      const target = input || button;
      if (!target) {
        if (attempt < 12) focusAndOpen(attempt + 1);
        return;
      }
      target.focus?.({ preventScroll: true });
      input?.select?.();
      window.dispatchEvent(
        new CustomEvent('pharmacy:open-medicine-sheet', { detail: { rowIndex: nextIndex } }),
      );
      document
        .querySelector(`[data-open-return-row="${nextIndex}"]`)
        ?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    });
  };
  focusAndOpen();
}

export function focusOpenReturnNextField(rowIndex, currentField, rowCount, onSelectRow) {
  const idx = ROW_FIELDS.indexOf(currentField);
  if (idx >= 0 && idx < ROW_FIELDS.length - 1) {
    focusOpenReturnField(rowIndex, ROW_FIELDS[idx + 1]);
    onSelectRow?.(rowIndex);
    return;
  }
  if (currentField === 'expiry' && rowIndex >= rowCount - 1) {
    focusOpenReturnDiscountAmount();
    return;
  }
  const nextRow = Math.min(rowIndex + 1, rowCount - 1);
  onSelectRow?.(nextRow);
  focusOpenReturnField(nextRow, 'item', { selectAll: true });
}

export function openReturnFieldFocusProps(index, onSelectRow, { selectAll = false } = {}) {
  return {
    onMouseDown: () => {
      window.dispatchEvent(
        new CustomEvent('pharmacy:close-medicine-sheet', { detail: { restoreFocus: false } }),
      );
    },
    onFocus: (e) => {
      window.dispatchEvent(
        new CustomEvent('pharmacy:close-medicine-sheet', { detail: { restoreFocus: false } }),
      );
      onSelectRow?.(index);
      if (selectAll) e.target.select?.();
    },
  };
}

export function buildOpenReturnTabHandler(rowIndex, currentField, rowCount, onSelectRow) {
  const idx = ROW_FIELDS.indexOf(currentField);
  return (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.shiftKey) {
      if (idx <= 0) return;
      focusOpenReturnField(rowIndex, ROW_FIELDS[idx - 1]);
      onSelectRow?.(rowIndex);
      return;
    }
    if (idx >= ROW_FIELDS.length - 1) {
      if (currentField === 'expiry' && rowIndex >= rowCount - 1) {
        focusOpenReturnDiscountAmount();
        return;
      }
      const nextRow = Math.min(rowIndex + 1, rowCount - 1);
      onSelectRow?.(nextRow);
      focusOpenReturnField(nextRow, 'item', { selectAll: true });
      return;
    }
    focusOpenReturnField(rowIndex, ROW_FIELDS[idx + 1]);
    onSelectRow?.(rowIndex);
  };
}
