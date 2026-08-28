import { cn } from '@/lib/utils';
import { formatCurrency } from '../constants';

function SummaryRow({ label, value, bold = false }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className={bold ? 'font-semibold text-foreground' : 'text-muted-foreground'}>
        {label}
      </span>
      <span
        className={cn(
          'tabular-nums shrink-0',
          bold ? 'text-base font-semibold text-foreground' : 'font-medium text-foreground',
        )}
      >
        {value}
      </span>
    </div>
  );
}

/** Inner totals body — parent supplies Bill-style nested panel chrome. */
export function ProductionCostSummary({
  materialsCost,
  overhead,
  totalCost,
  quantity,
  unitLabel,
  stretch = false,
}) {
  const unit = unitLabel || 'pcs';

  return (
    <div
      className={cn(
        'space-y-2.5 rounded-lg border border-border/80 bg-muted/25 p-4',
        stretch && 'h-full flex flex-col border-0 bg-transparent p-0 rounded-none shadow-none',
      )}
    >
      <SummaryRow label="Materials" value={formatCurrency(materialsCost)} />
      <SummaryRow label="Overhead" value={formatCurrency(overhead)} />
      <div className="border-t border-primary/15 pt-2.5 mt-2 -mx-1 px-2.5 py-2.5 rounded-lg bg-primary/[0.06] ring-1 ring-primary/10">
        <SummaryRow label="Total cost" value={formatCurrency(totalCost)} bold />
      </div>
      <p className={cn('text-[11px] text-muted-foreground pt-1', stretch && 'mt-auto')}>
        Producing {quantity} {unit} when this order is completed.
      </p>
    </div>
  );
}
