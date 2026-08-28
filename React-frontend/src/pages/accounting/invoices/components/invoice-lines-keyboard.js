import { LINE_COL } from '../invoice-template-constants';

const NAV_COL_ORDER = [
  LINE_COL.PRODUCT,
  LINE_COL.DESCRIPTION,
  LINE_COL.QUANTITY,
  LINE_COL.UNIT,
  LINE_COL.BATCH_NUMBER,
  LINE_COL.EXPIRY_DATE,
  LINE_COL.MANUFACTURED_DATE,
  LINE_COL.RATE,
  LINE_COL.DISCOUNT_FIXED,
  LINE_COL.DISCOUNT_PERCENT,
  LINE_COL.NET_TOTAL,
  LINE_COL.TAX,
  LINE_COL.SALE_TAX,
];

export function getVisibleNavCols(visibleCols) {
  return NAV_COL_ORDER.filter((c) => visibleCols.has(c));
}

export function getFocusableCell(scope, row, col) {
  if (!scope) return null;
  return scope.querySelector(
    `[data-enter-nav="1"][data-row="${row}"][data-col="${col}"]`,
  );
}

export function focusCell(scope, row, col, select = true) {
  const el = getFocusableCell(scope, row, col);
  if (!(el instanceof HTMLElement)) return false;
  el.focus();
  if (select && el instanceof HTMLInputElement) {
    el.select();
  }
  return true;
}

export function moveCellFocus(scope, row, col, dRow, dCol, visibleCols) {
  const colOrder = getVisibleNavCols(visibleCols);
  let r = row;
  let cIdx = colOrder.indexOf(col);
  if (cIdx < 0) cIdx = 0;

  if (dCol !== 0) {
    cIdx += dCol;
    while (cIdx >= 0 && cIdx < colOrder.length) {
      if (focusCell(scope, r, colOrder[cIdx])) return true;
      cIdx += dCol > 0 ? 1 : -1;
    }
    return false;
  }

  if (dRow !== 0) {
    r += dRow;
    if (r < 0) return false;
    return focusCell(scope, r, colOrder[cIdx] || colOrder[0]);
  }

  return false;
}

/** Enter in line grid → next column; wraps to next row at end of line. */
export function moveEnterNextColumn(scope, row, col, options = {}) {
  const { visibleCols, onAddLine, linesLength, onLeaveGrid } = options;
  const cols = visibleCols || new Set(NAV_COL_ORDER);
  const colOrder = getVisibleNavCols(cols);
  const cIdx = colOrder.indexOf(col);

  // Next column on the same row (skips hidden/non-focusable cells).
  if (cIdx >= 0 && cIdx < colOrder.length - 1) {
    if (moveCellFocus(scope, row, col, 0, 1, cols)) return true;
  }

  // End of row → first focusable column on the next row.
  const nextRow = row + 1;
  const firstCol = colOrder[0];
  if (firstCol && focusCell(scope, nextRow, firstCol)) return true;

  if (onAddLine && linesLength != null && row >= linesLength - 1) {
    onAddLine();
    requestAnimationFrame(() => {
      if (firstCol) focusCell(scope, row + 1, firstCol, true);
    });
    return true;
  }

  const current = getFocusableCell(scope, row, col);
  if (current && onLeaveGrid) {
    onLeaveGrid(current);
    return true;
  }

  return false;
}

/** @deprecated Use moveEnterNextColumn — kept as alias for callers expecting row-down. */
export function moveEnterDown(scope, row, col, options = {}) {
  return moveEnterNextColumn(scope, row, col, options);
}

function clearCellValue(e, ctx) {
  const { row, col, onUpdateLine, onUpdateLineDiscountFixed, onUpdateLineDiscountPercent, onUpdateLineNetTotal } = ctx;
  switch (col) {
    case LINE_COL.DESCRIPTION:
      onUpdateLine(row, 'description', '');
      break;
    case LINE_COL.QUANTITY:
      onUpdateLine(row, 'quantity', '');
      break;
    case LINE_COL.RATE:
      onUpdateLine(row, 'unit_price', '');
      break;
    case LINE_COL.DISCOUNT_FIXED:
      onUpdateLineDiscountFixed(row, '');
      break;
    case LINE_COL.DISCOUNT_PERCENT:
      onUpdateLineDiscountPercent(row, '');
      break;
    case LINE_COL.NET_TOTAL:
      onUpdateLineNetTotal(row, '');
      break;
    case LINE_COL.SALE_TAX:
      onUpdateLine(row, 'sale_tax_amount', '');
      break;
    default:
      return false;
  }
  if (e.target instanceof HTMLInputElement) {
    e.target.value = '';
  }
  return true;
}

export function handleInvoiceLinesKeyDown(e, ctx) {
  const {
    scope,
    row,
    col,
    visibleCols,
    onDuplicateLine,
    onAddLine,
    onRemoveLine,
    linesLength,
    onUpdateLine,
    onUpdateLineDiscountFixed,
    onUpdateLineDiscountPercent,
    onUpdateLineNetTotal,
  } = ctx;

  const mod = e.metaKey || e.ctrlKey;
  const input = e.target;
  const isInput = input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement;

  if (mod && e.key.toLowerCase() === 'd' && onDuplicateLine != null) {
    e.preventDefault();
    onDuplicateLine(row);
    requestAnimationFrame(() => focusCell(scope, row + 1, LINE_COL.PRODUCT));
    return true;
  }

  if (mod && e.key.toLowerCase() === 'enter' && onAddLine) {
    e.preventDefault();
    onAddLine();
    requestAnimationFrame(() => focusCell(scope, linesLength, LINE_COL.PRODUCT));
    return true;
  }

  if (e.key === 'Insert' && onAddLine) {
    e.preventDefault();
    onAddLine();
    requestAnimationFrame(() => focusCell(scope, linesLength, LINE_COL.PRODUCT));
    return true;
  }

  if ((e.key === 'Delete' || e.key === 'Backspace') && e.shiftKey && onRemoveLine && linesLength > 1) {
    e.preventDefault();
    onRemoveLine(row);
    requestAnimationFrame(() => focusCell(scope, Math.min(row, linesLength - 2), col));
    return true;
  }

  if (
    e.key === 'Delete' &&
    !e.shiftKey &&
    !mod &&
    isInput &&
    input.selectionStart === 0 &&
    input.selectionEnd === input.value.length
  ) {
    if (clearCellValue(e, ctx)) {
      e.preventDefault();
      return true;
    }
  }

  const arrowMod = e.altKey || (mod && !e.shiftKey);
  if (e.key === 'ArrowDown' && arrowMod) {
    e.preventDefault();
    moveCellFocus(scope, row, col, 1, 0, visibleCols);
    return true;
  }
  if (e.key === 'ArrowUp' && arrowMod) {
    e.preventDefault();
    moveCellFocus(scope, row, col, -1, 0, visibleCols);
    return true;
  }
  if (e.key === 'ArrowRight' && arrowMod) {
    e.preventDefault();
    moveCellFocus(scope, row, col, 0, 1, visibleCols);
    return true;
  }
  if (e.key === 'ArrowLeft' && arrowMod) {
    e.preventDefault();
    moveCellFocus(scope, row, col, 0, -1, visibleCols);
    return true;
  }

  return false;
}

export function findProductByScanValue(products, value) {
  const q = String(value || '').trim().toLowerCase();
  if (!q) return null;
  return (
    products.find((p) => String(p.barcode || '').toLowerCase() === q) ||
    products.find((p) => String(p.sku || '').toLowerCase() === q) ||
    products.find((p) => String(p.id) === q) ||
    null
  );
}

export function findProductByLabel(products, value) {
  const q = String(value || '').trim().toLowerCase();
  if (!q) return null;
  return (
    findProductByScanValue(products, value) ||
    products.find((p) => String(p.name || '').toLowerCase() === q) ||
    null
  );
}

export function parseExcelPaste(text) {
  return String(text || '')
    .trim()
    .split(/\r?\n/)
    .map((row) => row.split('\t'));
}

export function buildPasteLineUpdates(cells, startCol, visibleCols, products) {
  const colOrder = getVisibleNavCols(visibleCols);
  const startIdx = colOrder.indexOf(startCol);
  if (startIdx < 0) return {};

  const updates = {};

  cells.forEach((raw, offset) => {
    const col = colOrder[startIdx + offset];
    if (!col) return;
    const val = String(raw ?? '').trim();
    if (!val) return;

    switch (col) {
      case LINE_COL.PRODUCT: {
        const product = findProductByLabel(products, val);
        if (product) updates.product_id = String(product.id);
        break;
      }
      case LINE_COL.DESCRIPTION:
        updates.description = val;
        break;
      case LINE_COL.QUANTITY:
        if (/^\d*\.?\d*$/.test(val)) updates.quantity = val;
        break;
      case LINE_COL.RATE:
        updates.unit_price = val;
        break;
      case LINE_COL.DISCOUNT_FIXED:
        updates.discount_fixed = val;
        break;
      case LINE_COL.DISCOUNT_PERCENT:
        updates.discount_percent = val;
        break;
      case LINE_COL.NET_TOTAL:
        updates.net_total = val;
        break;
      default:
        break;
    }
  });

  return updates;
}
