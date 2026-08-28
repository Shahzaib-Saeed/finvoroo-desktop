import { useState } from 'react';
import { Banknote, Loader2, Save, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '../constants';
import { ApplyVendorUnappliedDialog } from './ApplyVendorUnappliedDialog';
import { BillPaymentDetailsSection } from './BillPaymentDetailsSection';
import { BillPaymentMetricsPanel } from './BillPaymentMetricsPanel';
import { BillAllocationTable } from './BillAllocationTable';

export function BillPaymentForm({
  form,
  errors,
  saving,
  loadingLookups,
  loadingContext,
  vendors,
  depositAccounts,
  groupedAccounts = [],
  paymentMethods,
  baseCurrency,
  multiCurrency,
  canCreateCoa,
  onAccountCreated,
  lookups,
  rows,
  vendorCredits,
  totals,
  totalOpenBalance,
  openingBalanceInfo,
  openingBalanceSelected,
  unappliedPayments = [],
  unappliedCashAvailable = 0,
  setField,
  onVendorChange,
  updateRow,
  onToggleRow,
  onToggleOpeningBalance,
  onOpeningBalanceAmountChange,
  onDistributeCashToSelected,
  onFillRowCashMax,
  onSuggestCreditsToFirstRow,
  onUnappliedApplied,
  onSubmit,
  onCancel,
  isEdit = false,
}) {
  const currencies = lookups?.currencies || [baseCurrency];
  const [applyPaymentId, setApplyPaymentId] = useState(null);

  if (loadingLookups) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 w-full min-w-0">
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-[minmax(0,1.65fr)_minmax(260px,1fr)] gap-6 lg:gap-8">
          <BillPaymentDetailsSection
            form={form}
            errors={errors}
            vendors={vendors}
            depositAccounts={depositAccounts}
            groupedAccounts={groupedAccounts}
            paymentMethods={paymentMethods}
            multiCurrency={multiCurrency}
            currencies={currencies}
            baseCurrency={baseCurrency}
            canCreateCoa={canCreateCoa}
            onAccountCreated={onAccountCreated}
            onVendorChange={onVendorChange}
            onFieldChange={setField}
          />
          <BillPaymentMetricsPanel
            totals={totals}
            currency={form.currency || baseCurrency}
            totalOpenBalance={totalOpenBalance}
            formVendorId={form.vendor_id}
          />
        </div>

        {unappliedCashAvailable > 0 && form.vendor_id && (
          <div className="mx-4 sm:mx-5 mb-4 rounded-lg border border-amber-200 bg-amber-50/70 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-amber-950">
                  On-account cash available:{' '}
                  {formatCurrency(unappliedCashAvailable, form.currency || baseCurrency)}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-amber-900/80 max-w-2xl">
                  Previously paid to this vendor and not yet applied to a bill. Apply it below
                  first — do not enter it again in Amount paid (that would pay cash twice).
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {unappliedPayments.map((payment) => (
                <Button
                  key={payment.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 border-amber-300 bg-white text-amber-950 hover:bg-amber-100"
                  onClick={() => setApplyPaymentId(payment.id)}
                >
                  Apply {formatCurrency(payment.unapplied, payment.currency || form.currency)}
                  <span className="ml-1.5 text-amber-700/70">
                    ({payment.payment_number || '—'})
                  </span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {openingBalanceInfo && form.vendor_id && (
          <div className="mx-4 sm:mx-5 mb-4 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={openingBalanceSelected}
                  onCheckedChange={(v) => onToggleOpeningBalance?.(!!v)}
                  aria-label="Apply to opening balance"
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium text-foreground">Opening balance</p>
                  <p className="text-xs text-muted-foreground mt-0.5 max-w-md leading-relaxed">
                    Balance owed to this vendor from before bills were tracked here —{' '}
                    <span className="font-medium text-foreground">
                      {formatCurrency(openingBalanceInfo.due, openingBalanceInfo.currency)}
                    </span>{' '}
                    still due{openingBalanceInfo.balance_date ? ` as of ${openingBalanceInfo.balance_date}` : ''}.
                    Check this to apply part of this payment toward it.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-foreground">Apply</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max={openingBalanceInfo.due}
                  className="h-8 w-32 text-right tabular-nums"
                  value={form.opening_balance_amount}
                  onChange={(e) => onOpeningBalanceAmountChange?.(e.target.value)}
                  disabled={!openingBalanceSelected}
                  placeholder="0.00"
                  aria-label="Amount to apply to opening balance"
                />
              </div>
            </div>
            {errors.opening_balance_amount ? (
              <p className="mt-2 text-sm text-destructive">{errors.opening_balance_amount}</p>
            ) : null}
          </div>
        )}

        {vendorCredits?.length > 0 && form.vendor_id && (
          <div className="mx-4 sm:mx-5 mb-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onSuggestCreditsToFirstRow}
              disabled={!rows.length}
            >
              <Wand2 className="size-3 mr-1" /> Apply credits to first row
            </Button>
          </div>
        )}

        <div className="border-t p-4 sm:p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Apply to bills</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
                Check bills to pay — <span className="font-medium text-foreground">Amount paid</span>{' '}
                adds each bill&apos;s balance. Adjust cash per row if needed. Vendor credit columns
                are optional.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {loadingContext && (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              )}
              {rows.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={onDistributeCashToSelected}
                  disabled={loadingContext}
                >
                  <Banknote className="size-3.5 mr-1.5" />
                  Auto-apply cash
                </Button>
              )}
            </div>
          </div>

          {!loadingContext && !(Number(form.amount) > 0) && rows.length > 0 && form.vendor_id && (
            <div className="rounded-md border border-amber-200/80 bg-amber-50/60 dark:bg-amber-950/20 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
              Check one or more bills to set <strong>Amount paid</strong>, or enter an amount above
              and use <strong>Auto-apply cash</strong>.
            </div>
          )}

          <BillAllocationTable
            rows={rows}
            vendorCredits={vendorCredits}
            currency={form.currency || baseCurrency}
            loading={loadingContext}
            amountPaid={form.amount}
            onUpdateRow={updateRow}
            onToggleRow={onToggleRow}
            onFillRowCashMax={onFillRowCashMax}
          />
          {errors.allocations ? (
            <p className="text-sm text-destructive">{errors.allocations}</p>
          ) : null}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving || loadingContext}>
          {saving ? (
            <>
              <Loader2 className="size-4 mr-1 animate-spin" /> Saving…
            </>
          ) : (
            <>
              <Save className="size-4 mr-1" />
              {isEdit ? 'Update payment' : 'Save payment'}
            </>
          )}
        </Button>
      </div>

      <ApplyVendorUnappliedDialog
        open={!!applyPaymentId}
        paymentId={applyPaymentId}
        onOpenChange={(open) => {
          if (!open) setApplyPaymentId(null);
        }}
        onApplied={async () => {
          setApplyPaymentId(null);
          await onUnappliedApplied?.();
        }}
      />
    </form>
  );
}
