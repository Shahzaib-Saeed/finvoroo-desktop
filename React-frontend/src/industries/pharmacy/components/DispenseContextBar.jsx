import { Stethoscope, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { PharmacyKbd } from './PharmacyKbd';

/** Customer + Rx fields for the checkout sidebar. */
export function DispenseContextBar({
  customer,
  formatMoney,
  onOpenCustomer,
  needsRxNote = false,
  rxNote = '',
  onRxNoteChange,
}) {
  const balanceDue = Number(customer?.balance_due ?? customer?.outstanding_balance ?? 0);
  const customerCode =
    customer?.customer_code || customer?.code || (customer?.is_walk_in ? 'WALK-IN' : null);
  const rxMissing = needsRxNote && !String(rxNote || '').trim();

  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-2.5">
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={onOpenCustomer}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100">
              <UserRound className="size-4" strokeWidth={2.25} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold leading-tight text-slate-900">
                {customer?.name || 'Walk-in Customer'}
              </span>
              {customerCode ? (
                <span className="mt-0.5 block truncate text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  {customerCode}
                </span>
              ) : null}
            </span>
          </button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenCustomer}
            className="h-7 shrink-0 gap-1 rounded-md border-slate-200 bg-white px-2 text-[10px] font-semibold text-slate-700 shadow-none hover:border-emerald-200 hover:bg-emerald-50/50"
          >
            Change
            <PharmacyKbd className="hidden h-4 min-w-4 border-slate-200 px-1 text-[9px] font-bold text-slate-500 sm:inline-flex">
              Alt+C
            </PharmacyKbd>
          </Button>
        </div>
        {balanceDue > 0 ? (
          <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-[11px] font-bold tabular-nums text-amber-800 ring-1 ring-amber-100">
            Balance due {formatMoney(balanceDue)}
          </p>
        ) : null}
      </div>

      <div
        className={cn(
          'rounded-lg border bg-white px-2.5 py-2',
          rxMissing ? 'border-emerald-300 ring-1 ring-emerald-100' : 'border-slate-200',
        )}
        data-pharmacy-typing
      >
        <div className="flex items-center gap-2">
          <Stethoscope className="size-3.5 shrink-0 text-emerald-700" strokeWidth={2.25} />
          <label
            htmlFor="dispense-rx-note"
            className="text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500"
          >
            Prescribed by
          </label>
          {needsRxNote ? (
            <span
              className={cn(
                'ms-auto shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide',
                rxMissing
                  ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100'
                  : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
              )}
            >
              {rxMissing ? 'Rx req.' : 'Rx ok'}
            </span>
          ) : null}
        </div>
        <Input
          id="dispense-rx-note"
          className={cn(
            'mt-1 h-8 w-full border-slate-200 bg-slate-50/40 text-[13px] font-medium text-slate-900 shadow-none placeholder:text-slate-400 focus-visible:ring-emerald-200',
            rxMissing && 'border-emerald-200 placeholder:text-emerald-600/70',
          )}
          value={rxNote}
          onChange={(e) => onRxNoteChange?.(e.target.value)}
          placeholder="Dr. name / OPD ref…"
        />
      </div>
    </div>
  );
}
