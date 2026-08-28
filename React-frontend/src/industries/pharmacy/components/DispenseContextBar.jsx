import { UserRound } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

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

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-200/80 bg-white px-4 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onOpenCustomer}
          className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 text-left transition-colors hover:border-slate-300 hover:bg-slate-50"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700">
            <UserRound className="size-3.5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[12px] font-semibold text-slate-900">
              {customer?.name || 'Walk-in Customer'}
            </span>
            {customerCode ? (
              <span className="block truncate text-[10px] text-slate-500">{customerCode}</span>
            ) : null}
          </span>
        </button>
        <button
          type="button"
          onClick={onOpenCustomer}
          className="shrink-0 text-[11px] font-semibold text-emerald-700 hover:underline"
        >
          Change <span className="text-slate-400">(Alt+C)</span>
        </button>
        {balanceDue > 0 ? (
          <span className="hidden text-[11px] font-medium tabular-nums text-amber-700 sm:inline">
            Due {formatMoney(balanceDue)}
          </span>
        ) : null}
      </div>

      <div className="hidden h-7 w-px shrink-0 bg-slate-200 md:block" />

      <div className="flex min-w-[200px] flex-1 items-center gap-2" data-pharmacy-typing>
        <label
          htmlFor="dispense-rx-note"
          className="shrink-0 text-[11px] font-medium text-slate-500"
        >
          Prescribed by
        </label>
        <Input
          id="dispense-rx-note"
          className={cn(
            'h-8 min-w-0 flex-1 border-slate-200 bg-white text-[12px] focus-visible:border-emerald-600 focus-visible:ring-emerald-600/40',
            needsRxNote && !String(rxNote || '').trim() && 'border-emerald-400',
          )}
          value={rxNote}
          onChange={(e) => onRxNoteChange?.(e.target.value)}
          placeholder="Dr. name / OPD ref…"
        />
        {needsRxNote ? (
          <span className="hidden shrink-0 text-[10px] font-medium text-emerald-700 lg:inline">
            Rx required
          </span>
        ) : null}
      </div>
    </div>
  );
}
