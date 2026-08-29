import { Stethoscope, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { PharmacyKbd } from './PharmacyKbd';

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
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 px-4 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onOpenCustomer}
          className="flex min-w-0 items-center gap-2 rounded-lg py-0.5 text-left transition-colors hover:bg-slate-50"
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
          className="h-8 shrink-0 gap-1 rounded-lg border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700 shadow-none hover:border-emerald-200 hover:bg-emerald-50/50 hover:text-emerald-900"
        >
          Change
          <PharmacyKbd className="h-4 min-w-4 border-slate-200 px-1 text-[9px] font-bold text-slate-500">
            Alt+C
          </PharmacyKbd>
        </Button>

        {balanceDue > 0 ? (
          <span className="hidden shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold tabular-nums text-amber-800 ring-1 ring-amber-100 sm:inline">
            Due {formatMoney(balanceDue)}
          </span>
        ) : null}
      </div>

      <span className="hidden h-8 w-px shrink-0 bg-slate-200 md:block" aria-hidden />

      <div
        className={cn(
          'flex min-w-[min(100%,14rem)] flex-1 items-center gap-2.5 rounded-lg border bg-white px-2.5 py-1.5',
          rxMissing ? 'border-emerald-300 ring-1 ring-emerald-100' : 'border-slate-200',
        )}
        data-pharmacy-typing
      >
        <Stethoscope className="size-4 shrink-0 text-emerald-700" strokeWidth={2.25} />

        <div className="min-w-0 flex-1">
          <label
            htmlFor="dispense-rx-note"
            className="block text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500"
          >
            Prescribed by
          </label>
          <Input
            id="dispense-rx-note"
            className={cn(
              'mt-0.5 h-7 min-w-0 border-0 bg-transparent p-0 text-[13px] font-medium text-slate-900 shadow-none placeholder:text-slate-400 focus-visible:ring-0',
              rxMissing && 'placeholder:text-emerald-600/70',
            )}
            value={rxNote}
            onChange={(e) => onRxNoteChange?.(e.target.value)}
            placeholder="Dr. name / OPD ref…"
          />
        </div>

        {needsRxNote ? (
          <span
            className={cn(
              'hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide sm:inline',
              rxMissing
                ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100'
                : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
            )}
          >
            {rxMissing ? 'Rx required' : 'Rx noted'}
          </span>
        ) : null}
      </div>
    </div>
  );
}
