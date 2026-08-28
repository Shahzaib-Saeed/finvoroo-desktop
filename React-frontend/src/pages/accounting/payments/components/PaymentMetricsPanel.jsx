import { formatCurrency } from '../constants';

export function PaymentMetricsPanel({ totals, currency, totalOpenBalance, formCustomerId }) {
  if (!formCustomerId) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-5 text-center">
        <p className="text-sm font-medium text-foreground">Start by selecting a customer</p>
        <p className="text-xs text-muted-foreground mt-1">
          Then tick the invoices they are paying.
        </p>
      </div>
    );
  }

  const cards = [
    {
      key: 'due',
      label: 'Still owes',
      hint: 'Open invoices',
      value: formatCurrency(totalOpenBalance, currency),
      valueClass: 'text-foreground',
      boxClass: 'border-border bg-card',
    },
    {
      key: 'received',
      label: 'Amount received',
      hint: 'This receipt',
      value: formatCurrency(totals.received, currency),
      valueClass: 'text-emerald-700 dark:text-emerald-400',
      boxClass: 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20',
    },
    {
      key: 'cash',
      label: 'Cash applied',
      hint: 'From this receipt',
      value: formatCurrency(totals.cashApplied, currency),
      valueClass: 'text-foreground',
      boxClass: 'border-border bg-card',
    },
    {
      key: 'discount',
      label: 'Discount',
      hint: 'Write-off',
      value: formatCurrency(totals.discountTotal, currency),
      valueClass: 'text-sky-800 dark:text-sky-300',
      boxClass: 'border-sky-200 bg-sky-50/50 dark:bg-sky-950/20',
    },
    {
      key: 'prepaid',
      label: 'Left as prepaid',
      hint: 'Unapplied cash',
      value: formatCurrency(totals.unapplied, currency),
      valueClass: 'text-amber-700 dark:text-amber-400',
      boxClass: 'border-amber-200 bg-amber-50/50 dark:bg-amber-950/20',
    },
  ];

  const overAppliedCash =
    totals.received > 0 && totals.cashApplied > totals.received + 0.001;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2.5">
        {cards.map((card) => (
          <div
            key={card.key}
            className={`rounded-lg border px-3 py-2.5 min-w-0 ${card.boxClass}`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {card.label}
            </p>
            <p className="text-[10px] text-muted-foreground/80 -mt-0.5 mb-1">{card.hint}</p>
            <p className={`text-base sm:text-lg font-bold tabular-nums truncate ${card.valueClass}`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {overAppliedCash && (
        <p className="text-xs text-destructive">
          Cash applied is greater than amount received. Lower cash on invoices or raise amount
          received.
        </p>
      )}
    </div>
  );
}
