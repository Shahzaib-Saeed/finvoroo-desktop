import { cn } from '@/lib/utils';
import { formatCurrency } from '../constants';

function PanelLine({ label, value, bold = false, muted = false }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span
        className={cn(
          'text-sm',
          muted ? 'text-slate-500' : 'text-slate-700',
          bold && 'font-semibold text-slate-900',
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          'text-right text-sm tabular-nums',
          bold && 'text-base font-bold text-slate-900',
        )}
      >
        {value}
      </span>
    </div>
  );
}

function formatQty(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  if (Number.isInteger(n)) return String(n);
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

/**
 * Period totals — purchases on the left, sales on the right (matches inventory flow).
 */
export function InventoryActivitySummaryPanels({ summary, movementCount, className }) {
  if (!summary) return null;

  const purchasedQty = summary.purchased_qty ?? 0;
  const soldQty = summary.sold_qty ?? 0;
  const returnedQty = summary.returned_qty ?? 0;
  const purchasedCost = summary.purchased_cost ?? 0;
  const soldCost = summary.sold_cost ?? 0;

  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm',
        className,
      )}
    >
      <div className="grid grid-cols-1 divide-y divide-slate-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <div className="px-5 py-4 sm:px-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-800">
            Purchases — stock in
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Goods received from bills and positive purchase movements.
          </p>
          <div className="mt-3 space-y-0 divide-y divide-slate-100">
            <PanelLine label="Quantity in" value={formatQty(purchasedQty)} bold />
            <PanelLine
              label="Purchase cost"
              value={formatCurrency(purchasedCost)}
              muted
            />
          </div>
        </div>

        <div className="bg-slate-50/40 px-5 py-4 sm:px-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-sky-800">
            Sales — stock out
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Goods sold on invoices and POS — cost shown is COGS from inventory.
          </p>
          <div className="mt-3 space-y-0 divide-y divide-slate-100">
            <PanelLine label="Quantity out" value={formatQty(soldQty)} bold />
            <PanelLine label="COGS (cost of sales)" value={formatCurrency(soldCost)} muted />
            {returnedQty > 0.0001 ? (
              <PanelLine
                label="Customer returns (qty)"
                value={formatQty(returnedQty)}
                muted
              />
            ) : null}
          </div>
        </div>
      </div>

      {movementCount != null ? (
        <p className="border-t border-slate-100 bg-slate-50/60 px-5 py-2 text-right text-[11px] text-slate-500 sm:px-6">
          {movementCount} movement{movementCount === 1 ? '' : 's'} in this view
          <span className="mx-1.5 text-slate-300">·</span>
          Purchases add stock; sales remove stock — they are separate from profit.
        </p>
      ) : null}
    </div>
  );
}
