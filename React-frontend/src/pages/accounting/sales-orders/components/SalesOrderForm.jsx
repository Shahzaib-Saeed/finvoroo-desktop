import { Loader2, Save } from 'lucide-react';
import { useParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SourceDocumentBanner } from '@/components/accounting/SourceDocumentBanner';
import { cn } from '@/lib/utils';
import {
  formSectionBodyClass,
  formSectionCardClass,
  formInnerPanelClass,
  FormSectionHeader,
} from '../../invoices/components/invoice-form-design';
import { SalesOrderBillToSection } from './SalesOrderBillToSection';
import { SalesOrderDetailsSection } from './SalesOrderDetailsSection';
import { InvoiceLinesGrid } from '../../invoices/components/InvoiceLinesGrid';
import { InvoiceTotalsPanel } from '../../invoices/components/InvoiceTotalsPanel';

export function SalesOrderForm({
  form,
  errors,
  saving,
  loadingLookups,
  loadingConversion,
  conversionSource,
  conversionWarnings,
  customers,
  products,
  taxRates,
  taxRatesById,
  productsById,
  lineColumns,
  totals,
  currencySymbols,
  customerContext: _customerContext,
  addressUnlocked,
  setAddressUnlocked,
  isEdit,
  readOnly,
  onFieldChange,
  onCustomerChange,
  onAddressDisplayChange,
  onUpdateLine,
  onUpdateLineDiscountFixed,
  onUpdateLineDiscountPercent,
  onUpdateLineNetTotal,
  onSelectProduct,
  onAddLine,
  onRemoveLine,
  onSubmit,
  onCancel,
  canCreateProduct,
  canCreateCustomer,
  quotations,
  loadingQuotations,
  showQuotationPicker,
  setShowQuotationPicker,
  importingQuotation,
  importFromQuotation,
  customFieldDefinitions = [],
  setMetadataField,
  addMetadataSelectOption,
}) {
  const { id: workspaceId } = useParams();

  if (loadingLookups || loadingConversion) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="w-full min-w-0 space-y-4 pb-4">
      {conversionSource ? (
        <SourceDocumentBanner
          source={conversionSource}
          warnings={conversionWarnings}
          workspaceId={workspaceId}
          accent="emerald"
        />
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className={cn(formSectionCardClass, 'lg:col-span-5')}>
          <FormSectionHeader title="Customer" />
          <div className={formSectionBodyClass}>
            <SalesOrderBillToSection
              form={form}
              errors={errors}
              customers={customers}
              canCreateCustomer={canCreateCustomer}
              addressUnlocked={addressUnlocked}
              setAddressUnlocked={setAddressUnlocked}
              onCustomerChange={onCustomerChange}
              onAddressDisplayChange={onAddressDisplayChange}
              isEdit={isEdit}
              quotations={quotations}
              loadingQuotations={loadingQuotations}
              showQuotationPicker={showQuotationPicker}
              setShowQuotationPicker={setShowQuotationPicker}
              importingQuotation={importingQuotation}
              importFromQuotation={importFromQuotation}
            />
          </div>
        </div>

        <div className={cn(formSectionCardClass, 'lg:col-span-7')}>
          <FormSectionHeader title="Order details" />
          <div className={formSectionBodyClass}>
            <SalesOrderDetailsSection
              form={form}
              errors={errors}
              onFieldChange={onFieldChange}
              readOnly={readOnly}
              customFieldDefinitions={customFieldDefinitions}
              onMetadataFieldChange={setMetadataField}
              onAddMetadataSelectOption={addMetadataSelectOption}
            />
          </div>
        </div>
      </div>

      <div className={cn(formSectionCardClass, 'w-full min-w-0')}>
        <InvoiceLinesGrid
          lines={form.lines}
          lineColumns={lineColumns}
          products={products}
          taxRates={taxRates}
          taxRatesById={taxRatesById}
          productsById={productsById}
          currency={form.currency}
          currencySymbols={currencySymbols}
          canCreateProduct={canCreateProduct && !readOnly}
          onAddLine={onAddLine}
          onRemoveLine={onRemoveLine}
          onUpdateLine={onUpdateLine}
          onUpdateLineDiscountFixed={onUpdateLineDiscountFixed}
          onUpdateLineDiscountPercent={onUpdateLineDiscountPercent}
          onUpdateLineNetTotal={onUpdateLineNetTotal}
          onSelectProduct={onSelectProduct}
          restrictByStock={false}
        />

        <div className="border-t border-foreground/[0.09] bg-muted/35 p-4 sm:p-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            <div
              className={cn(
                formInnerPanelClass,
                'flex flex-col min-h-[220px] lg:col-span-7',
              )}
            >
              <FormSectionHeader title="Notes" />
              <div className="flex flex-1 flex-col p-4 min-h-0">
                <Label className="sr-only">Notes</Label>
                <Textarea
                  rows={5}
                  className="flex-1 min-h-[160px] resize-none text-sm h-full bg-background border-foreground/10"
                  value={form.notes}
                  onChange={(e) => onFieldChange('notes', e.target.value)}
                  placeholder="Optional — printed on the sales order document."
                  disabled={readOnly}
                />
              </div>
            </div>

            <div
              className={cn(
                formInnerPanelClass,
                'flex flex-col min-h-[220px] lg:col-span-5 ring-1 ring-primary/20 border-primary/25',
              )}
            >
              <FormSectionHeader title="Summary" accent />
              <div className="flex flex-1 flex-col p-4 min-h-0">
                <InvoiceTotalsPanel
                  totals={totals}
                  currency={form.currency}
                  currencySymbols={currencySymbols}
                  invoiceDiscount={form.invoice_discount}
                  onDiscountChange={(v) => onFieldChange('invoice_discount', v)}
                  fullWidth
                  stretch
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {!readOnly && (
        <div className="sticky bottom-0 z-20 -mx-1 px-1 py-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t border-border">
          <div className="flex flex-wrap gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="size-4 mr-1 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="size-4 mr-1" />
                  {isEdit ? 'Update sales order' : 'Save sales order'}
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
