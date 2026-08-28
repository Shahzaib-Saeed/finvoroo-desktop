import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VendorCreditDetailsSection } from './VendorCreditDetailsSection';
import { VendorCreditLinesTable } from './VendorCreditLinesTable';
import { formatCurrency } from '../constants';

export function VendorCreditForm({
  form,
  lines,
  errors,
  saving,
  loadingLookups,
  loadingLines,
  vendors,
  billsForVendor,
  products,
  taxRates,
  baseCurrency,
  multiCurrency,
  lookups,
  lineTotals,
  showLines,
  setShowLines,
  returnableBillLineCount = 0,
  openReturnedItemsFromBill,
  hasApplication,
  canCreateVendor,
  onFieldChange,
  onVendorChange,
  onBillChange,
  updateLine,
  addLine,
  removeLine,
  onSubmit,
  onCancel,
  readOnly,
  isEdit,
}) {
  const currencies = lookups?.currencies || [baseCurrency];
  const currency = form.currency || baseCurrency;

  if (loadingLookups) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const displayTotal = showLines ? lineTotals.total : Number(form.amount) || 0;

  return (
    <form onSubmit={onSubmit} className="space-y-4 w-full min-w-0">
      {hasApplication && (
        <div className="rounded-lg border border-blue-200 bg-blue-50/60 dark:bg-blue-950/20 p-3 text-sm text-blue-900 dark:text-blue-200">
          This debit note has already been applied to a bill. Saving your changes will
          automatically reverse that application, recalculate inventory and the journal
          entry, and reapply the updated amount — capped by the bill's current balance.
        </div>
      )}

      <div className="rounded-lg border bg-card shadow-sm p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VendorCreditDetailsSection
          form={form}
          errors={errors}
          vendors={vendors}
          billsForVendor={billsForVendor}
          multiCurrency={multiCurrency}
          currencies={currencies}
          baseCurrency={baseCurrency}
          canCreateVendor={canCreateVendor}
          onVendorChange={onVendorChange}
          onBillChange={onBillChange}
          onFieldChange={onFieldChange}
          readOnly={readOnly}
          showLines={showLines}
        />
        <div className="flex flex-col justify-center rounded-lg border bg-muted/30 p-4 space-y-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Debit total</p>
          <p className="text-3xl font-bold tabular-nums text-primary">
            {formatCurrency(displayTotal, currency)}
          </p>
          {!showLines && !readOnly && (
            <div className="flex flex-col items-start gap-1">
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 justify-start text-sm"
                onClick={() => setShowLines(true)}
              >
                Add line items instead
              </Button>
              {form.bill_id && returnableBillLineCount > 0 && !loadingLines && (
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 justify-start text-sm font-medium"
                  onClick={() => openReturnedItemsFromBill?.()}
                >
                  Returned items from bill
                </Button>
              )}
            </div>
          )}
          {showLines && !readOnly && (
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 justify-start text-sm"
              onClick={() => setShowLines(false)}
            >
              Use amount instead
            </Button>
          )}
        </div>
      </div>

      {showLines && (
        <div className="rounded-lg border bg-card shadow-sm p-4 sm:p-5">
          {errors.lines && (
            <p className="text-sm text-destructive mb-3">{errors.lines}</p>
          )}
          <VendorCreditLinesTable
            lines={lines}
            products={products}
            taxRates={taxRates}
            currency={currency}
            lineTotals={lineTotals}
            loadingLines={loadingLines}
            readOnly={readOnly}
            onUpdateLine={updateLine}
            onAddLine={addLine}
            onRemoveLine={removeLine}
          />
        </div>
      )}

      {!readOnly && (
        <div className="flex flex-wrap gap-2 justify-end">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={saving}>
            {saving ? (
              <Loader2 className="size-4 animate-spin mr-1" />
            ) : (
              <Save className="size-4 mr-1" />
            )}
            {isEdit ? 'Update debit note' : 'Create debit note'}
          </Button>
        </div>
      )}
    </form>
  );
}
