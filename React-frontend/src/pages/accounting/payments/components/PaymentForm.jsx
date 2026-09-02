import { useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, Banknote, Loader2, Save, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { PaymentDetailsSection } from './PaymentDetailsSection';
import { PaymentMetricsPanel } from './PaymentMetricsPanel';
import { PaymentAllocationTable } from './PaymentAllocationTable';
import { PaymentCustomerLedgerPanel } from './PaymentCustomerLedgerPanel';
import { formatCurrency } from '../constants';
import { cn } from '@/lib/utils';

export function PaymentForm({
  form,
  errors,
  saving,
  loadingLookups,
  loadingContext,
  customers,
  depositAccounts,
  paymentMethods,
  baseCurrency,
  lookups,
  rows,
  creditNotes,
  overpaymentInvoices,
  unappliedPayments,
  paidInvoices,
  openingBalanceInfo,
  openingBalanceSelected,
  totals,
  totalOpenBalance,
  isEdit,
  readOnly,
  canCreateCustomer,
  canCreateCoa,
  onAccountCreated,
  onFieldChange,
  onCustomerChange,
  onUpdateRow,
  onToggleRow,
  onToggleAllRows,
  onDistributeCashToSelected,
  onFillRowCashMax,
  onSuggestCreditsToFirstRow,
  onToggleOpeningBalance,
  onOpeningBalanceAmountChange,
  onApplyUnapplied,
  onSubmit,
  onCancel,
  workspaceId,
}) {
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [showAdvancedAllocation, setShowAdvancedAllocation] = useState(false);

  useEffect(() => {
    if (!form.customer_id) setLedgerOpen(false);
  }, [form.customer_id]);

  useEffect(() => {
    // Auto-open advanced columns only when credits/overpayments actually exist.
    if (creditNotes.length > 0 || overpaymentInvoices.length > 0) {
      setShowAdvancedAllocation(true);
    }
  }, [creditNotes.length, overpaymentInvoices.length]);

  const customerName = useMemo(() => {
    if (!form.customer_id) return '';
    const match = (customers || []).find((c) => String(c.id) === String(form.customer_id));
    return match?.name || '';
  }, [customers, form.customer_id]);

  if (loadingLookups) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Full-sheet ledger swap — not a side panel / modal.
  if (ledgerOpen && form.customer_id) {
    return (
      <PaymentCustomerLedgerPanel
        customerId={form.customer_id}
        customerName={customerName}
        workspaceId={workspaceId}
        onClose={() => setLedgerOpen(false)}
      />
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 w-full min-w-0">
      <PaymentMetricsPanel
        totals={totals}
        currency={form.currency || baseCurrency}
        totalOpenBalance={totalOpenBalance}
        formCustomerId={form.customer_id}
      />

      <PaymentDetailsSection
        form={form}
        errors={errors}
        customers={customers}
        depositAccounts={depositAccounts}
        groupedAccounts={lookups?.grouped_accounts || []}
        paymentMethods={paymentMethods}
        baseCurrency={baseCurrency}
        canCreateCustomer={canCreateCustomer}
        canCreateCoa={canCreateCoa}
        onAccountCreated={onAccountCreated}
        onCustomerChange={onCustomerChange}
        onFieldChange={onFieldChange}
        onViewLedger={() => setLedgerOpen(true)}
        readOnly={readOnly}
      />

      {unappliedPayments?.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/70 dark:bg-amber-950/25 px-4 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                Existing unapplied cash available
              </p>
              <p className="text-xs text-amber-800/90 dark:text-amber-200/90 mt-0.5 leading-snug">
                Customer currently holds unapplied cash from previous overpayments or receipts.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              {unappliedPayments.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  className="text-xs font-medium rounded-md border border-amber-300/80 bg-background px-2.5 py-1.5 hover:bg-muted tabular-nums"
                  onClick={() => onApplyUnapplied?.(p.id)}
                >
                  {p.receipt_number} — {formatCurrency(p.unapplied, p.currency)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {openingBalanceInfo && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <Checkbox
                checked={openingBalanceSelected}
                onCheckedChange={(v) => onToggleOpeningBalance?.(!!v)}
                disabled={readOnly}
                aria-label="Apply to opening balance"
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-medium text-foreground">Opening balance</p>
                <p className="text-xs text-muted-foreground mt-0.5 max-w-md leading-relaxed">
                  Balance carried over for this customer before invoices were tracked here —{' '}
                  <span className="font-medium text-foreground">
                    {formatCurrency(openingBalanceInfo.due, openingBalanceInfo.currency)}
                  </span>{' '}
                  still due
                  {openingBalanceInfo.balance_date
                    ? ` as of ${openingBalanceInfo.balance_date}`
                    : ''}
                  . Check this to apply part of this receipt toward it.
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
                disabled={readOnly || !openingBalanceSelected}
                placeholder="0.00"
                aria-label="Amount to apply to opening balance"
              />
            </div>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
        <div className="space-y-3 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-foreground">
                1. Tick invoices to pay
              </h3>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
                Check invoices to apply this receipt. Cash and amount received update
                automatically.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {loadingContext ? (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              ) : null}
              <Button
                type="button"
                variant={showAdvancedAllocation ? 'default' : 'outline'}
                size="sm"
                className={cn('h-8 text-xs font-medium', showAdvancedAllocation && 'shadow-sm')}
                onClick={() => setShowAdvancedAllocation((v) => !v)}
                aria-pressed={showAdvancedAllocation}
              >
                <ArrowLeftRight className="mr-1.5 size-3.5" />
                {showAdvancedAllocation ? 'Credits on' : 'Credits & transfers'}
              </Button>
              {showAdvancedAllocation &&
                (creditNotes.length > 0 || overpaymentInvoices.length > 0) &&
                form.customer_id ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={onSuggestCreditsToFirstRow}
                    disabled={readOnly || !rows.length}
                  >
                    <Wand2 className="mr-1.5 size-3.5" />
                    Apply credits
                  </Button>
                ) : null}
              {!readOnly && rows.length > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={onDistributeCashToSelected}
                  disabled={loadingContext}
                >
                  <Banknote className="size-3.5" />
                  Auto-apply
                  <kbd className="hidden rounded border bg-muted px-1 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
                    Alt+A
                  </kbd>
                </Button>
              ) : null}
            </div>
          </div>

          <PaymentAllocationTable
            rows={rows}
            creditNotes={creditNotes}
            overpaymentInvoices={overpaymentInvoices}
            currency={form.currency || baseCurrency}
            readOnly={readOnly}
            amountReceived={form.amount}
            showAdvanced={showAdvancedAllocation}
            onUpdateRow={onUpdateRow}
            onToggleRow={onToggleRow}
            onToggleAllRows={onToggleAllRows}
            onFillRowCashMax={onFillRowCashMax}
          />
        </div>

        {paidInvoices?.length > 0 && (
          <div className="border-t p-4 sm:p-5">
            <details className="text-sm">
              <summary className="cursor-pointer font-medium text-muted-foreground">
                Payment history ({paidInvoices.length} recent)
              </summary>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-xs border">
                  <thead>
                    <tr className="bg-muted/40">
                      <th className="border p-2 text-left">Invoice</th>
                      <th className="border p-2 text-right">Total</th>
                      <th className="border p-2 text-right">Paid</th>
                      <th className="border p-2">Last payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paidInvoices.map((inv) => (
                      <tr key={inv.id}>
                        <td className="border p-2">{inv.invoice_number}</td>
                        <td className="border p-2 text-right tabular-nums">
                          {formatCurrency(inv.total, inv.currency)}
                        </td>
                        <td className="border p-2 text-right tabular-nums">
                          {formatCurrency(inv.amount_paid, inv.currency)}
                        </td>
                        <td className="border p-2 text-muted-foreground">
                          {inv.last_payment_date || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </div>
        )}
      </div>

      {!readOnly && (
        <div className="sticky bottom-0 -mx-1 flex flex-col gap-3 border-t bg-background/95 px-1 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/90 sm:flex-row sm:items-center sm:justify-between">
          <div className="hidden items-center gap-3 text-[11px] text-muted-foreground sm:flex">
            <span>
              <kbd className="rounded border bg-muted px-1.5 py-0.5 font-medium">Esc</kbd> Cancel
            </span>
            <span>
              <kbd className="rounded border bg-muted px-1.5 py-0.5 font-medium">Ctrl</kbd>
              {' + '}
              <kbd className="rounded border bg-muted px-1.5 py-0.5 font-medium">Enter</kbd>{' '}
              Save payment
            </span>
          </div>
          <div className="flex justify-end gap-2 sm:ms-auto">
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || loadingContext}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-1 size-4 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <Save className="mr-1 size-4" />
                  {isEdit ? 'Update payment' : 'Save payment'}
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
