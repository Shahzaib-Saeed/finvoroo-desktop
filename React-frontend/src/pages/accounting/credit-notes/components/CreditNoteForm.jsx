import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreditNoteDetailsSection } from './CreditNoteDetailsSection';
import { CreditNoteLinesTable } from './CreditNoteLinesTable';
import { formatCurrency } from '../constants';

export function CreditNoteForm({
  form,
  lines,
  errors,
  saving,
  loadingLookups,
  loadingLines,
  customers,
  invoices,
  baseCurrency,
  lineTotals,
  showLines,
  setShowLines,
  returnableInvoiceLineCount = 0,
  openReturnedItemsFromInvoice,
  financialLocked,
  isEdit,
  readOnly,
  canCreateCustomer,
  loadingInvoices,
  onFieldChange,
  onCustomerChange,
  onUpdateLine,
  onAddLine,
  onRemoveLine,
  onSubmit,
  onCancel,
}) {
  if (loadingLookups) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const displayTotal = showLines
    ? lineTotals.total
    : Number(form.amount) || 0;

  return (
    <form onSubmit={onSubmit} className="space-y-4 w-full min-w-0">
      {financialLocked && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 dark:bg-amber-950/20 p-3 text-sm text-amber-900 dark:text-amber-200">
          This credit note has been applied or refunded. Customer, date, amount, and line items
          are locked; you may still update the reason.
        </div>
      )}

      <div className="rounded-lg border bg-card shadow-sm p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CreditNoteDetailsSection
          form={form}
          errors={errors}
          customers={customers}
          invoices={invoices}
          loadingInvoices={loadingInvoices}
          canCreateCustomer={canCreateCustomer}
          onCustomerChange={onCustomerChange}
          onFieldChange={onFieldChange}
          readOnly={readOnly}
          financialLocked={financialLocked}
          showLines={showLines}
        />
        <div className="flex flex-col justify-center rounded-lg border bg-muted/30 p-4 space-y-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Credit total</p>
          <p className="text-3xl font-bold tabular-nums text-primary">
            {formatCurrency(displayTotal, baseCurrency)}
          </p>
          {!showLines && !readOnly && !financialLocked && (
            <div className="flex flex-col items-start gap-1">
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 justify-start text-sm"
                onClick={() => setShowLines(true)}
              >
                Add line items instead
              </Button>
              {form.invoice_id && returnableInvoiceLineCount > 0 && !loadingLines && (
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 justify-start text-sm font-medium"
                  onClick={() => openReturnedItemsFromInvoice?.()}
                >
                  Returned items from invoice
                </Button>
              )}
            </div>
          )}
          {showLines && !readOnly && !financialLocked && (
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
          <CreditNoteLinesTable
            lines={lines}
            baseCurrency={baseCurrency}
            lineTotals={lineTotals}
            loadingLines={loadingLines}
            readOnly={readOnly}
            financialLocked={financialLocked}
            onUpdateLine={onUpdateLine}
            onAddLine={onAddLine}
            onRemoveLine={onRemoveLine}
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
            {isEdit ? 'Update credit note' : 'Create credit note'}
          </Button>
        </div>
      )}
    </form>
  );
}
