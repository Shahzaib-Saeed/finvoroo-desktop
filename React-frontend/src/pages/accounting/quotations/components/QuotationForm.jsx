import { Loader2, Save } from 'lucide-react';
import { useParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SourceDocumentBanner } from '@/components/accounting/SourceDocumentBanner';
import { QuotationBillToSection } from './QuotationBillToSection';
import { QuotationDetailsSection } from './QuotationDetailsSection';
import { InvoiceLinesGrid } from '../../invoices/components/InvoiceLinesGrid';
import { InvoiceTotalsPanel } from '../../invoices/components/InvoiceTotalsPanel';

export function QuotationForm({
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
    <form onSubmit={onSubmit} className="space-y-0">
      {conversionSource ? (
        <div className="mb-4">
          <SourceDocumentBanner
            source={conversionSource}
            warnings={conversionWarnings}
            workspaceId={workspaceId}
            accent="blue"
          />
        </div>
      ) : null}
      <div className="rounded-lg border bg-card shadow-sm mb-4 w-full min-w-0">
        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            <QuotationBillToSection
              form={form}
              errors={errors}
              customers={customers}
              canCreateCustomer={canCreateCustomer}
              addressUnlocked={addressUnlocked}
              setAddressUnlocked={setAddressUnlocked}
              onCustomerChange={onCustomerChange}
              onAddressDisplayChange={onAddressDisplayChange}
            />
            <QuotationDetailsSection
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

        <div className="border-t">
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
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 sm:p-5 border-t bg-muted/10">
          <div className="lg:col-span-7 space-y-1">
            <Label className="text-sm">Notes</Label>
            <Textarea
              rows={5}
              className="text-sm resize-y"
              value={form.notes}
              onChange={(e) => onFieldChange('notes', e.target.value)}
              placeholder="Optional — printed on the quotation document."
              disabled={readOnly}
            />
          </div>
          <div className="lg:col-span-5 min-w-0">
            <InvoiceTotalsPanel
              totals={totals}
              currency={form.currency}
              currencySymbols={currencySymbols}
              invoiceDiscount={form.invoice_discount}
              onDiscountChange={(v) => onFieldChange('invoice_discount', v)}
            />
          </div>
        </div>
      </div>

      {!readOnly && (
        <div className="flex justify-end gap-2 pt-4">
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
                {isEdit ? 'Update quotation' : 'Save quotation'}
              </>
            )}
          </Button>
        </div>
      )}
    </form>
  );
}
