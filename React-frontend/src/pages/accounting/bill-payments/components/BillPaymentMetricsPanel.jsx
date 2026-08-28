import { formatCurrency } from '../constants';

export function BillPaymentMetricsPanel({ totals, currency, totalOpenBalance, formVendorId }) {
  if (!formVendorId) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Select a vendor to load open bills.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center py-2">
        <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Amount due</p>
        <p className="text-3xl font-bold tabular-nums">
          {formatCurrency(totalOpenBalance, currency)}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2">
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <p className="text-xs font-semibold uppercase text-primary mb-1">Amount to apply</p>
          <p className="text-lg font-bold tabular-nums">{formatCurrency(totals.applied, currency)}</p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 p-3">
          <p className="text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-400 mb-1">
            Amount paid
          </p>
          <p className="text-lg font-bold tabular-nums">{formatCurrency(totals.received, currency)}</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 p-3">
          <p className="text-xs font-semibold uppercase text-amber-700 dark:text-amber-400 mb-1">
            Prepaid
          </p>
          <p className="text-lg font-bold tabular-nums text-amber-700 dark:text-amber-400">
            {formatCurrency(totals.unapplied, currency)}
          </p>
          {totals.unapplied > 0 && (
            <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80 mt-1 leading-snug">
              This remaining amount will be saved as prepaid vendor payment.
            </p>
          )}
        </div>
      </div>
      {totals.received > 0 && (totals.cashTotal ?? totals.cashApplied ?? 0) > totals.received + 0.001 && (
        <p className="text-xs text-destructive">
          Applied amount is greater than amount paid. Reduce allocations before saving.
        </p>
      )}
      {totals.discountTotal > 0 && (
        <p className="text-[11px] text-muted-foreground leading-snug">
          Includes {formatCurrency(totals.discountTotal, currency)} settlement discount (write-off), which is not cash.
        </p>
      )}
    </div>
  );
}
