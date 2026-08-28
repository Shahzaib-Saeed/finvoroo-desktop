import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NO_NUMBER_SPINNER, formatCurrency } from '../constants';
import { cn } from '@/lib/utils';

function fmt(value, currency, symbols) {
  return formatCurrency(value, currency, symbols);
}

function Row({ label, value, className, valueClassName }) {
  return (
    <div className={cn('flex justify-between items-baseline gap-4 text-sm', className)}>
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('tabular-nums text-right font-medium text-foreground shrink-0', valueClassName)}>
        {value}
      </span>
    </div>
  );
}

export function InvoiceTotalsPanel({
  totals,
  currency,
  currencySymbols,
  invoiceDiscount,
  onDiscountChange,
  otherCharges,
  onOtherChargesChange,
  otherChargesLabel = 'Shipping / other',
  outstandingBalanceFormatted,
  fullWidth = false,
  stretch = false,
}) {
  const showOther =
    onOtherChargesChange != null ||
    (totals?.other_charges != null && Number(totals.other_charges) > 0);

  return (
    <div
      className={cn(
        fullWidth ? 'w-full' : 'sm:w-full max-w-sm sm:ml-auto',
        stretch && 'h-full flex flex-col',
      )}
    >
      <div className={cn('space-y-2.5', stretch && 'flex flex-col h-full')}>
        <Row label="Subtotal" value={fmt(totals.subtotal, currency, currencySymbols)} />
        {totals.lineDiscount > 0 ? (
          <Row
            label="Line discounts"
            value={`−${fmt(totals.lineDiscount, currency, currencySymbols)}`}
            valueClassName="text-red-600 dark:text-red-400"
          />
        ) : null}

        <div className="flex justify-between items-center gap-3 text-sm py-0.5">
          <Label className="text-muted-foreground font-normal shrink-0">Invoice discount</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            className={cn('h-8 w-[7.5rem] text-right tabular-nums text-sm', NO_NUMBER_SPINNER)}
            value={invoiceDiscount}
            onChange={(e) => onDiscountChange(e.target.value)}
            placeholder="0.00"
          />
        </div>

        {totals.tax > 0 ? (
          <Row label="Tax" value={fmt(totals.tax, currency, currencySymbols)} />
        ) : null}

        {showOther && onOtherChargesChange ? (
          <div className="flex justify-between items-center gap-3 text-sm py-0.5">
            <Label className="text-muted-foreground font-normal shrink-0">{otherChargesLabel}</Label>
            <Input
              type="text"
              inputMode="decimal"
              className={cn('h-8 w-[7.5rem] text-right tabular-nums text-sm', NO_NUMBER_SPINNER)}
              value={otherCharges ?? ''}
              onChange={(e) => onOtherChargesChange(e.target.value)}
              placeholder="0.00"
            />
          </div>
        ) : null}
        {showOther && Number(totals.other_charges) > 0 && !onOtherChargesChange ? (
          <Row label={otherChargesLabel} value={fmt(totals.other_charges, currency, currencySymbols)} />
        ) : null}

        <div className="border-t border-border pt-3 mt-2">
          <div className="flex justify-between items-baseline gap-4">
            <span className="text-sm font-semibold text-foreground">Grand total</span>
            <span className="text-xl font-bold tabular-nums text-foreground tracking-tight">
              {fmt(totals.total, currency, currencySymbols)}
            </span>
          </div>
        </div>

        {outstandingBalanceFormatted ? (
          <Row
            label="Customer outstanding"
            value={outstandingBalanceFormatted}
            valueClassName="text-amber-700 dark:text-amber-400 font-medium"
          />
        ) : null}
      </div>
    </div>
  );
}
