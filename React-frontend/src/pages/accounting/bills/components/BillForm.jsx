import { useState } from 'react';
import { Calculator, FileText, Loader2, Save } from 'lucide-react';
import { useParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SourceDocumentBanner } from '@/components/accounting/SourceDocumentBanner';
import { BillVendorSection } from './BillVendorSection';
import { BillDetailsSection } from './BillDetailsSection';
import { BillTemplateSelector } from './BillTemplateSelector';
import { LoadFromPoDialog } from './LoadFromPoDialog';
import { InvoiceLinesGrid } from '../../invoices/components/InvoiceLinesGrid';
import { InvoiceTotalsPanel } from '../../invoices/components/InvoiceTotalsPanel';
import { formatCurrency } from '../constants';
import { DocumentAttachmentsSection } from '@/components/accounting/DocumentAttachmentsSection';

export function BillForm({
  form,
  errors,
  saving,
  loadingLookups,
  loadingConversion,
  conversionSource,
  conversionWarnings,
  vendors,
  customers,
  products,
  taxRates,
  warehouses,
  taxRatesById,
  productsById,
  lineColumns,
  totals,
  currencySymbols,
  baseCurrency,
  templates = [],
  selectedTemplate,
  templateSelectValue,
  purchaseOrders,
  addressUnlocked,
  setAddressUnlocked,
  isEdit,
  vendorLocked,
  readOnly,
  lookups,
  canCreateProduct,
  canCreateVendor,
  canQuickCreateTax,
  onFieldChange,
  onJobOrderChange,
  onVendorChange,
  onVendorCreated,
  onCustomerCreated,
  importPurchaseOrder,
  onUpdateLine,
  onUpdateLineDiscountFixed,
  onUpdateLineDiscountPercent,
  onUpdateLineNetTotal,
  onSelectProduct,
  onProductCreated,
  onTaxCreated,
  onSelectTax,
  onAddLine,
  onRemoveLine,
  setTemplateId,
  setTemplateCustom,
  addTemplateSelectOption,
  onSubmit,
  onCancel,
  pendingAttachments,
  setPendingAttachments,
  attachments,
  setAttachments,
  documentId,
  customFieldDefinitions = [],
  setMetadataField,
  hideTemplateToolbar = false,
  billNumberPreview,
  loadingBillNumber,
  checkingBillSequence,
  toggleBillNumberManual,
  setBillSequence,
  currentBillNumber,
}) {
  const { id: workspaceId } = useParams();
  const [poDialogOpen, setPoDialogOpen] = useState(false);
  const currency = baseCurrency;

  if (loadingLookups || loadingConversion) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Full-width surfaces: clear edge definition so panels hold up on ultrawide monitors.
  const panelClass =
    'rounded-xl border border-foreground/[0.14] bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_16px_rgba(15,23,42,0.06)] overflow-hidden';
  const panelHeaderClass =
    'border-b border-foreground/[0.09] bg-gradient-to-b from-muted/60 to-muted/30 px-4 py-3';
  const nestedPanelClass =
    'flex flex-col min-h-[220px] rounded-xl border border-foreground/[0.14] bg-card shadow-[0_1px_2px_rgba(15,23,42,0.05)] overflow-hidden';
  const nestedHeaderClass =
    'flex items-start gap-3 border-b border-foreground/[0.09] bg-muted/40 px-4 py-3 shrink-0';

  return (
    <form onSubmit={onSubmit} className="w-full min-w-0 space-y-0">
      {conversionSource ? (
        <div className="mb-4">
          <SourceDocumentBanner
            source={conversionSource}
            warnings={conversionWarnings}
            workspaceId={workspaceId}
            accent={
              conversionSource?.source_type === 'job_order' ? 'primary' : 'amber'
            }
            targetDocument={
              conversionSource?.source_type === 'job_order' ? 'bill' : undefined
            }
          />
        </div>
      ) : null}

      {!hideTemplateToolbar ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          {isEdit ? (
            <p className="text-sm text-muted-foreground">
              Update vendor, line items, and totals.
            </p>
          ) : (
            <span />
          )}
          <BillTemplateSelector
            templates={templates}
            value={templateSelectValue}
            formTemplateId={form.invoice_template_id}
            onChange={setTemplateId}
            readOnly={readOnly}
            workspaceId={workspaceId}
            className="sm:justify-end sm:ml-auto"
          />
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
        <div className={`lg:col-span-5 ${panelClass}`}>
          <div className={panelHeaderClass}>
            <h3 className="text-sm font-semibold text-foreground">Vendor</h3>
          </div>
          <div className="p-4">
            <BillVendorSection
              form={form}
              errors={errors}
              vendors={vendors}
              warehouses={warehouses}
              canCreateVendor={canCreateVendor}
              vendorLocked={vendorLocked}
              addressUnlocked={addressUnlocked}
              setAddressUnlocked={setAddressUnlocked}
              purchaseOrders={purchaseOrders}
              onVendorChange={onVendorChange}
              onVendorCreated={onVendorCreated}
              onFieldChange={onFieldChange}
              onJobOrderChange={onJobOrderChange}
              onLoadFromPo={() => setPoDialogOpen(true)}
              readOnly={readOnly}
            />
          </div>
        </div>

        <div className={`lg:col-span-7 ${panelClass}`}>
          <div className={panelHeaderClass}>
            <h3 className="text-sm font-semibold text-foreground">Bill details</h3>
          </div>
          <div className="p-4">
            <BillDetailsSection
              form={form}
              errors={errors}
              customers={customers}
              selectedTemplate={selectedTemplate}
              setTemplateCustom={setTemplateCustom}
              setMetadataField={setMetadataField}
              addTemplateSelectOption={addTemplateSelectOption}
              onFieldChange={onFieldChange}
              onCustomerCreated={onCustomerCreated}
              readOnly={readOnly}
              billDateLocked={false}
              isEdit={isEdit}
              currentBillNumber={currentBillNumber}
              billNumberPreview={billNumberPreview}
              loadingBillNumber={loadingBillNumber}
              checkingBillSequence={checkingBillSequence}
              onToggleBillNumberManual={toggleBillNumberManual}
              onBillSequenceChange={setBillSequence}
            />
          </div>
        </div>
      </div>

      <div className={`${panelClass} mb-4 w-full min-w-0`}>
        <div>
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
          canQuickCreateTax={canQuickCreateTax && !readOnly}
          onTaxCreated={onTaxCreated}
          onSelectTax={onSelectTax}
          onProductCreated={onProductCreated}
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

        <div className="border-t border-foreground/[0.08] bg-muted/35 p-4 sm:p-5">
          <div
            className={
              readOnly
                ? 'grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch'
                : 'grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch'
            }
          >
            <div
              className={`${nestedPanelClass}${readOnly ? ' lg:col-span-7' : ''}`}
            >
              <div className={nestedHeaderClass}>
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground ring-1 ring-foreground/10">
                  <FileText className="size-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold">Description</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Notes or memo for this bill
                  </p>
                </div>
              </div>
              <div className="flex flex-1 flex-col p-4 min-h-0">
                <Label className="sr-only">Description</Label>
                <Textarea
                  rows={4}
                  className="flex-1 min-h-[140px] resize-none text-sm h-full bg-background border-foreground/10"
                  value={form.notes}
                  onChange={(e) => onFieldChange('notes', e.target.value)}
                  disabled={readOnly}
                  placeholder="Notes, memo, or internal description for this bill"
                />
              </div>
            </div>

            {!readOnly ? (
              <DocumentAttachmentsSection
                documentType="bill"
                documentId={documentId}
                attachments={attachments}
                pendingFiles={pendingAttachments}
                onPendingFilesChange={setPendingAttachments}
                onAttachmentsChange={setAttachments}
                disabled={saving}
                compact
                className="min-h-[220px] h-full !rounded-xl !border-foreground/[0.14] shadow-[0_1px_2px_rgba(15,23,42,0.05)]"
              />
            ) : attachments?.length ? (
              <DocumentAttachmentsSection
                documentType="bill"
                documentId={documentId}
                attachments={attachments}
                readOnly
                compact
                className="min-h-[220px] h-full !rounded-xl !border-foreground/[0.14] shadow-[0_1px_2px_rgba(15,23,42,0.05)]"
              />
            ) : null}

            <div
              className={`${nestedPanelClass} ring-1 ring-primary/20 border-primary/25${
                readOnly ? ' lg:col-span-5' : ''
              }`}
            >
              <div className={`${nestedHeaderClass} bg-primary/[0.05]`}>
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
                  <Calculator className="size-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold">Summary</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Subtotal, tax, and bill total
                  </p>
                </div>
              </div>
              <div className="flex flex-1 flex-col p-4 min-h-0">
                <InvoiceTotalsPanel
                  totals={totals}
                  currency={currency}
                  currencySymbols={currencySymbols}
                  invoiceDiscount={form.discount_amount}
                  onDiscountChange={(v) => onFieldChange('discount_amount', v)}
                  otherCharges={form.other_charges}
                  onOtherChargesChange={
                    readOnly ? undefined : (v) => onFieldChange('other_charges', v)
                  }
                  fullWidth
                  stretch
                />
              </div>
            </div>
          </div>
        </div>

        {!readOnly && (
          <div className="flex flex-wrap gap-2 justify-end border-t border-foreground/[0.08] px-4 sm:px-5 py-4 bg-muted/20">
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
              {isEdit ? 'Update bill' : 'Create bill'}
            </Button>
          </div>
        )}
      </div>

      <LoadFromPoDialog
        open={poDialogOpen}
        onOpenChange={setPoDialogOpen}
        orders={purchaseOrders}
        currency={currency}
        onSelect={importPurchaseOrder}
      />
    </form>
  );
}
