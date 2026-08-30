import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DispenseContextBar } from './DispenseContextBar';
import { PharmacyKbd } from './PharmacyKbd';

function MoneyRow({ label, value, strong = false, accent = false }) {
  return (
    <div className="flex items-center justify-between gap-3 py-0.5">
      <span className="text-[13px] font-medium text-slate-600">{label}</span>
      <span
        className={cn(
          'tabular-nums',
          accent
            ? 'text-[15px] font-bold text-emerald-800'
            : strong
              ? 'text-[15px] font-bold text-slate-900'
              : 'text-[14px] font-semibold text-slate-800',
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
  customer,
  onOpenCustomer,
  needsRxNote = false,
  rxNote = '',
  onRxNoteChange,
  onPostAndPrint,
  checkingOut = false,
  shiftOpen = true,
  disabled = false,
}) {
  return (
    <aside className="flex h-full w-full flex-col overflow-hidden bg-white">
      <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-2.5">
        <p className="border-s-[3px] border-emerald-600 ps-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
          Checkout
        </p>
      </div>
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-auto px-2 py-2 sm:px-4 sm:py-3">
        <DispenseContextBar
          customer={customer}
          formatMoney={formatMoney}
          onOpenCustomer={onOpenCustomer}
          needsRxNote={needsRxNote}
          rxNote={rxNote}
          onRxNoteChange={onRxNoteChange}
        />

        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Lines</p>
            <p className="mt-1 text-2xl font-bold tabular-nums leading-none text-slate-900">
              {totals.itemCount}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Qty</p>
            <p className="mt-1 text-2xl font-bold tabular-nums leading-none text-slate-900">
              {totals.totalBaseQty}
              <span className="ms-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                {unitLabel}
              </span>
            </p>
          </div>
        </div>

        <div className="space-y-2.5 rounded-lg border border-slate-200 bg-white px-3.5 py-3.5">
          <MoneyRow label="Subtotal" value={formatMoney(totals.subtotal)} strong accent />
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

      <div className="shrink-0 border-t border-slate-200 bg-white px-3 py-3 sm:px-4 sm:py-4 max-lg:sticky max-lg:bottom-0 max-lg:z-10 max-lg:shadow-[0_-4px_16px_rgba(15,23,42,0.08)]">
        <div className="mb-2.5 rounded-xl bg-gradient-to-br from-emerald-800 to-emerald-950 px-3.5 py-3 shadow-md ring-1 ring-emerald-700/30 sm:mb-3 sm:px-4 sm:py-3.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-300/80 sm:text-[11px]">
            Grand total
          </p>
          <p className="mt-1 text-2xl font-bold leading-none tracking-tight tabular-nums text-white sm:text-[28px]">
            {formatMoney(totals.total)}
          </p>
        </div>
        <Button
          type="button"
          className="h-11 w-full rounded-xl bg-emerald-700 text-[14px] font-bold text-white shadow-md shadow-emerald-900/20 hover:bg-emerald-800 sm:h-12 sm:text-[15px]"
          onClick={onPostAndPrint}
          disabled={disabled || checkingOut || !shiftOpen}
        >
          {checkingOut ? <Loader2 className="mr-2 size-5 animate-spin" /> : null}
          Complete & print
          <PharmacyKbd className="ms-2 border-white/25 bg-white/15 text-[11px] text-white">
            Ctrl+P
          </PharmacyKbd>
        </Button>
        <p className="mt-2 hidden text-center text-[12px] font-medium text-slate-500 sm:block">
          Custom tender · <PharmacyKbd className="text-[11px]">Ctrl+S</PharmacyKbd>
        </p>
      </div>
    </aside>
  );
}
