import { formatCurrency } from '../constants';
import { cn } from '@/lib/utils';

export function PaymentMetricsPanel({ totals, currency, totalOpenBalance, formCustomerId }) {
  if (!formCustomerId) {
    return (
      <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-5 py-6 text-center">
        <p className="text-sm font-semibold text-foreground">Select a customer to begin</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Open invoices and balances load automatically.
        </p>
      </div>
    );
  }

  const received = Number(totals.received) || 0;
  const cashApplied = Number(totals.cashApplied) || 0;
  const discount = Number(totals.discountTotal) || 0;
  const prepaid = Number(totals.unapplied) || 0;
  const stillOwes = Number(totalOpenBalance) || 0;

  const cards = [
    {
      key: 'due',
      label: 'Still owes',
      hint: 'Open invoices balance',
      value: formatCurrency(stillOwes, currency),
      valueClass: stillOwes > 0 ? 'text-foreground' : 'text-muted-foreground',
      boxClass: 'border-border/80 bg-background shadow-sm',
    },
    {
      key: 'received',
      label: 'Amount received',
      hint: 'Entered this receipt',
      value: formatCurrency(received, currency),
      valueClass: received > 0 ? 'text-emerald-700' : 'text-muted-foreground',
      boxClass:
        received > 0
          ? 'border-emerald-300 bg-emerald-50/80 shadow-sm ring-1 ring-emerald-200/60'
          : 'border-border/80 bg-background shadow-sm',
    },
    {
      key: 'cash',
      label: 'Cash applied',
      hint: 'Applied to invoices',
      value: formatCurrency(cashApplied, currency),
      valueClass: cashApplied > 0 ? 'text-foreground' : 'text-muted-foreground',
      boxClass: 'border-border/80 bg-background shadow-sm',
    },
    {
      key: 'discount',
      label: 'Discount',
      hint: 'Written off',
      value: formatCurrency(discount, currency),
      valueClass: discount > 0 ? 'text-sky-800' : 'text-muted-foreground',
      boxClass:
        discount > 0
          ? 'border-sky-200 bg-sky-50/60 shadow-sm'
          : 'border-border/80 bg-background shadow-sm',
    },
    {
      key: 'prepaid',
      label: 'Unapplied cash',
      hint: 'Left as prepaid balance',
      value: formatCurrency(prepaid, currency),
      valueClass: prepaid > 0 ? 'text-amber-800' : 'text-muted-foreground',
      boxClass:
        prepaid > 0
          ? 'border-amber-200 bg-amber-50/60 shadow-sm'
          : 'border-border/80 bg-background shadow-sm',
    },
  ];

  const overAppliedCash = received > 0 && cashApplied > received + 0.001;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        {cards.map((card) => (
          <div
            key={card.key}
            className={cn('rounded-xl border px-3.5 py-3 min-w-0 transition-colors', card.boxClass)}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              {card.label}
            </p>
            <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground/90">{card.hint}</p>
            <p className={cn('mt-1.5 text-base font-bold tabular-nums sm:text-lg', card.valueClass)}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {overAppliedCash ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          Cash applied exceeds amount received. Lower cash on invoices or raise amount received.
        </p>
      ) : null}
    </div>
  );
}
