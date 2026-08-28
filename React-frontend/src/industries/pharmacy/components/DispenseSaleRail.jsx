import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PharmacyKbd } from './PharmacyKbd';

function MoneyRow({ label, value, strong = false }) {
  return (
    <div className="flex items-center justify-between gap-3 py-0.5">
      <span className="text-[13px] font-medium text-slate-600">{label}</span>
      <span
        className={cn(
          'tabular-nums text-neutral-950',
          strong ? 'text-[15px] font-bold' : 'text-[14px] font-semibold',
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function DispenseSaleRail({
  totals,
  formatMoney,
  unitLabel = 'pcs',
  onPostAndPrint,
  checkingOut = false,
  shiftOpen = true,
  disabled = false,
}) {
  return (
    <aside className="flex h-full w-full flex-col overflow-hidden bg-slate-50/40">
      <div className="min-h-0 flex-1 space-y-3 overflow-hidden px-4 py-4">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">Lines</p>
            <p className="mt-1 text-2xl font-bold tabular-nums leading-none text-slate-900">
              {totals.itemCount}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">Qty</p>
            <p className="mt-1 text-2xl font-bold tabular-nums leading-none text-slate-900">
              {totals.totalBaseQty}
              <span className="ms-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                {unitLabel}
              </span>
            </p>
          </div>
        </div>

        <div className="space-y-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-3.5 shadow-sm">
          <MoneyRow label="Subtotal" value={formatMoney(totals.subtotal)} strong />
          {totals.lineDiscountTotal > 0 ? (
            <MoneyRow
              label="Line discount"
              value={`−${formatMoney(totals.lineDiscountTotal)}`}
            />
          ) : null}
          {totals.discount > 0 ? (
            <MoneyRow label="Invoice discount" value={`−${formatMoney(totals.discount)}`} />
          ) : null}
          <div className="border-t border-slate-100 pt-2">
            <MoneyRow label="Tax" value={formatMoney(totals.taxTotal)} strong />
          </div>
          {totals.posFee > 0 ? (
            <MoneyRow
              label={totals.posFeeLabel || 'POS fee'}
              value={formatMoney(totals.posFee)}
            />
          ) : null}
        </div>
      </div>

      <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-4">
        <div className="mb-3 rounded-xl bg-zinc-950 px-4 py-3.5 shadow-md">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-400">
            Grand total
          </p>
          <p className="mt-1 text-[28px] font-bold leading-none tracking-tight tabular-nums text-white">
            {formatMoney(totals.total)}
          </p>
        </div>
        <Button
          type="button"
          className="h-12 w-full rounded-xl bg-emerald-700 text-[15px] font-bold text-white shadow-sm hover:bg-emerald-800"
          onClick={onPostAndPrint}
          disabled={disabled || checkingOut || !shiftOpen}
        >
          {checkingOut ? <Loader2 className="mr-2 size-5 animate-spin" /> : null}
          Complete & print
          <PharmacyKbd className="ms-2 border-white/25 bg-white/15 text-[11px] text-white">
            Ctrl+P
          </PharmacyKbd>
        </Button>
        <p className="mt-2.5 text-center text-[12px] font-medium text-slate-500">
          Custom tender · <PharmacyKbd className="text-[11px]">Ctrl+S</PharmacyKbd>
        </p>
      </div>
    </aside>
  );
}
