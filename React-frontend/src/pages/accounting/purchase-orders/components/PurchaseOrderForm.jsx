import { Loader2, Save } from 'lucide-react';
import { useParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SourceDocumentBanner } from '@/components/accounting/SourceDocumentBanner';
import { PoVendorSection } from './PoVendorSection';
import { PoDetailsSection } from './PoDetailsSection';
import { InvoiceLinesGrid } from '../../invoices/components/InvoiceLinesGrid';
import { InvoiceTotalsPanel } from '../../invoices/components/InvoiceTotalsPanel';

export function PurchaseOrderForm({
  form,
  errors,
  saving,
  loadingLookups,
  loadingConversion,
  conversionSource,
  conversionWarnings,
  vendors,
  products,
  taxRates,
  taxRatesById,
  productsById,
  lineColumns,
  totals,
  currencySymbols,
  baseCurrency,
  isEdit,
  readOnly,
  canCreateProduct,
  canCreateVendor,
  onFieldChange,
  onVendorChange,
  onUpdateLine,
  onUpdateLineDiscountFixed,
  onUpdateLineDiscountPercent,
  onUpdateLineNetTotal,
  onSelectProduct,
  onAddLine,
  onRemoveLine,
  onSubmit,
  onCancel,
  customFieldDefinitions = [],
  setMetadataField,
  addMetadataSelectOption,
}) {
  const { id: workspaceId } = useParams();
  const currency = baseCurrency;

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
            accent="violet"
          />
        </div>
      ) : null}
      <div className="rounded-lg border bg-card shadow-sm mb-4 w-full min-w-0">
        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            <PoVendorSection
              form={form}
              errors={errors}
              vendors={vendors}
              canCreateVendor={canCreateVendor}
              onVendorChange={onVendorChange}
              readOnly={readOnly}
            />
            <PoDetailsSection
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
          currency={currency}
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

        <div className="border-t bg-muted/10 p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-1">
              <Label className="text-sm">Notes</Label>
              <Textarea
                rows={5}
                className="text-sm resize-y"
                value={form.notes}
                onChange={(e) => onFieldChange('notes', e.target.value)}
                placeholder="Optional — delivery instructions or internal memo"
                disabled={readOnly}
              />
            </div>
            <div className="lg:col-span-5 flex flex-col gap-4">
              <InvoiceTotalsPanel
                totals={totals}
                currency={currency}
                currencySymbols={currencySymbols}
                invoiceDiscount={form.discount_amount}
                onDiscountChange={(v) => onFieldChange('discount_amount', v)}
              />
              <div className="rounded-lg border border-border/80 bg-background p-3 space-y-1.5">
                <Label className="text-sm text-muted-foreground">Other charges</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className="h-9 text-right tabular-nums"
                  value={form.other_charges}
                  onChange={(e) => onFieldChange('other_charges', e.target.value)}
                  disabled={readOnly}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
        </div>

        {!readOnly && (
          <div className="flex flex-wrap gap-2 justify-end border-t px-4 sm:px-5 py-4 bg-card">
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
            {isEdit ? 'Update purchase order' : 'Create purchase order'}
          </Button>
        </div>
        )}
      </div>
    </form>
  );
}
