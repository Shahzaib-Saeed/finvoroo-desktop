import { cn } from '@/lib/utils';
import { NO_NUMBER_SPINNER } from '@/pages/accounting/invoices/constants';

export const PURCHASE_GRID_BORDER = 'border-slate-400';

/** @deprecated use slate-400 borders via PurchaseGridTd */
export const PURCHASE_GRID_COLOR = '#94a3b8';

export const PURCHASE_CELL_INPUT =
  'h-11 w-full min-h-11 border-0 rounded-none shadow-none bg-transparent px-2.5 text-[13px] font-semibold leading-tight text-slate-900 outline-none placeholder:text-slate-400 focus:bg-emerald-50 focus:ring-2 focus:ring-inset focus:ring-emerald-500/35 disabled:opacity-50';

export const PURCHASE_CELL_NUMBER = cn(PURCHASE_CELL_INPUT, NO_NUMBER_SPINNER);

export function PurchaseGridTh({ children, align = 'left', className, ...rest }) {
  return (
    <th
      {...rest}
      className={cn(
        'border border-slate-400 bg-emerald-800 px-2.5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-white whitespace-nowrap',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
    >
      {children}
    </th>
  );
}

export function PurchaseGridTd({
  children,
  className,
  align = 'left',
  onClick,
  selected = false,
  lead = false,
}) {
  return (
    <td
      onClick={onClick}
      style={
        selected && lead
          ? { boxShadow: 'inset 4px 0 0 0 #065f46' }
          : undefined
      }
      className={cn(
        'border border-slate-400 p-0 align-middle',
        selected ? 'bg-emerald-100' : 'bg-white',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
    >
      {children}
    </td>
  );
}

export function PurchaseGridCellText({ children, className, align = 'left' }) {
  return (
    <div
      className={cn(
        'flex h-11 items-center px-2.5 text-[13px] tabular-nums text-slate-700',
        align === 'right' && 'justify-end',
        align === 'center' && 'justify-center',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function scrollPurchaseRowIntoView(index) {
  const row =
    document.querySelector(`[data-grn-row="${index}"]`) ||
    document.querySelector(`[data-extract-row="${index}"]`);
  row?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
}

export function focusPurchaseField(index, field) {
  requestAnimationFrame(() => {
    document.querySelector(`[data-grn-field="${field}-${index}"]`)?.focus?.({ preventScroll: true });
    scrollPurchaseRowIntoView(index);
  });
}

export function focusPurchaseItem(index) {
  requestAnimationFrame(() => {
    const el =
      document.querySelector(`input[data-grn-item="${index}"]`) ||
      document.querySelector(`button[data-grn-item="${index}"]`) ||
      document.querySelector(`[data-grn-item="${index}"]`);
    el?.focus?.({ preventScroll: true });
    scrollPurchaseRowIntoView(index);
  });
}

export function buildPurchaseCellEnterHandler(index, rowCount, onAdvanceRow) {
  return (e, nextField) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const delta = e.key === 'ArrowDown' ? 1 : -1;
      const next = Math.max(0, Math.min(rowCount - 1, index + delta));
      onAdvanceRow?.(next);
      focusPurchaseItem(next);
      return;
    }
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (nextField === 'next-row') {
      const next = Math.min(rowCount - 1, index + 1);
      onAdvanceRow?.(next);
      focusPurchaseItem(next);
      return;
    }
    if (nextField === 'item') {
      focusPurchaseItem(index);
      return;
    }
    focusPurchaseField(index, nextField);
  };
}
