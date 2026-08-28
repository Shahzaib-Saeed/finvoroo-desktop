import { useEffect } from "react";
import { useParams } from "react-router";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SourceDocumentBanner } from "@/components/accounting/SourceDocumentBanner";
import { InvoiceBillToSection } from "./InvoiceBillToSection";
import { InvoiceDetailsSection } from "./InvoiceDetailsSection";
import { InvoiceSalesOrderSourceBar } from "./InvoiceSalesOrderSourceBar";
import { InvoiceLinesGrid } from "./InvoiceLinesGrid";
import { InvoiceTotalsPanel } from "./InvoiceTotalsPanel";
import {
  formSectionBodyClass,
  formSectionCardClass,
  formInnerPanelClass,
  FormSectionHeader,
  InvoiceFormLoadingShell,
} from "./invoice-form-design";
import { DocumentAttachmentsSection } from "@/components/accounting/DocumentAttachmentsSection";
import { ATTACHMENT_MAX_SIZE } from "@/components/accounting/document-attachments.lib";
import { InvoiceFormActions } from "./InvoiceFormActions";
import { InvoicePreviewSheet } from "./InvoicePreviewSheet";
import {
  handleInvoiceFormShortcuts,
  INVOICE_FORM_SCOPE,
} from "./invoice-form-keyboard";
import { cn } from "@/lib/utils";

export function InvoiceForm({
  form,
  errors,
  saving,
  loadingLookups,
  loadingConversion,
  conversionSource,
  conversionWarnings,
  postedLocked,
  customers,
  products,
  taxRates,
  taxRatesById,
  productsById,
  selectedTemplate,
  lineColumns,
  totals,
  currencySymbols,
  baseCurrency,
  customerContext,
  loadingCustomerContext,
  salesOrders,
  addressUnlocked,
  setAddressUnlocked,
  paymentTermsUnlocked,
  setPaymentTermsUnlocked,
  isEdit,
  onFieldChange,
  onJobOrderChange,
  onCustomerChange,
  onAddressDisplayChange,
  setTemplateCustom,
  setInvoiceMetadataField,
  addTemplateSelectOption,
  onUpdateLine,
  onUpdateLineDiscountFixed,
  onUpdateLineDiscountPercent,
  onUpdateLineNetTotal,
  onProductCreated,
  onProductUpdated,
  onTaxCreated,
  onSelectTax,
  onSelectProduct,
  onAddLine,
  onRemoveLine,
  onDuplicateLine,
  onReorderLines,
  onPasteLines,
  getMaxQtyForLine,
  importSalesOrder,
  clearSalesOrderImport,
  onSubmit,
  onCancel,
  saveWithMode,
  openPreview,
  previewOpen,
  setPreviewOpen,
  previewInvoice,
  autoPostEnabled,
  presetJobOrderId,
  canCreateProduct,
  canQuickCreateTax,
  pendingAttachments,
  setPendingAttachments,
  attachments,
  setAttachments,
  documentId,
  invoiceNumberPreview,
  loadingInvoiceNumber,
  checkingInvoiceSequence,
  toggleInvoiceNumberManual,
  setInvoiceSequence,
  currentInvoiceNumber,
  invoiceStatus = 'draft',
}) {
  const { id: workspaceId } = useParams();

  useEffect(() => {
    if (postedLocked || saving) return undefined;

    const onKeyDown = (e) => {
      handleInvoiceFormShortcuts(e, {
        onSave: saveWithMode,
        onPreview: openPreview,
      });
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [postedLocked, saving, saveWithMode, openPreview]);

  if (loadingLookups || loadingConversion) {
    return <InvoiceFormLoadingShell />;
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full min-w-0 pb-4 space-y-6"
      data-enter-scope={INVOICE_FORM_SCOPE}
    >
      {conversionSource ? (
        <SourceDocumentBanner
          source={conversionSource}
          warnings={conversionWarnings}
          workspaceId={workspaceId}
          accent={
            conversionSource?.source_type === 'job_order' ? 'primary' : 'amber'
          }
          targetDocument={
            conversionSource?.source_type === 'job_order' ? 'invoice' : undefined
          }
        />
      ) : null}
      {postedLocked ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This invoice cannot be edited while it is pending approval or cancelled.
        </div>
      ) : null}
      {/* {!isEdit && autoPostEnabled ? (
        <div className="rounded-lg border border-sky-200/80 bg-sky-50/60 dark:border-sky-900/50 dark:bg-sky-950/30 px-4 py-3 text-sm text-sky-900 dark:text-sky-100 flex gap-2">
          <Info className="size-4 shrink-0 mt-0.5" />
          <p>
            <span className="font-medium">Auto-post is on.</span> This invoice will post to
            accounting when you save. Use <span className="font-medium">Save &amp; record payment</span>{' '}
            if you are collecting payment now.
          </p>
        </div>
      ) : null} */}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className={cn(formSectionCardClass, 'lg:col-span-5')}>
          <FormSectionHeader title="Customer" />
          <div className={formSectionBodyClass}>
            <InvoiceBillToSection
              form={form}
              errors={errors}
              customers={customers}
              postedLocked={postedLocked}
              customerContext={customerContext}
              loadingCustomerContext={loadingCustomerContext}
              addressUnlocked={addressUnlocked}
              setAddressUnlocked={setAddressUnlocked}
              paymentTermsUnlocked={paymentTermsUnlocked}
              setPaymentTermsUnlocked={setPaymentTermsUnlocked}
              onCustomerChange={onCustomerChange}
              onAddressDisplayChange={onAddressDisplayChange}
              onFieldChange={onFieldChange}
              onJobOrderChange={onJobOrderChange}
            />
          </div>
        </div>

        <div className={cn(formSectionCardClass, 'lg:col-span-7')}>
          <FormSectionHeader title="Invoice details" />
          <div className={formSectionBodyClass}>
            <InvoiceDetailsSection
              form={form}
              errors={errors}
              postedLocked={postedLocked}
              isEdit={isEdit}
              invoiceStatus={invoiceStatus}
              selectedTemplate={selectedTemplate}
              invoiceNumberPreview={invoiceNumberPreview}
              loadingInvoiceNumber={loadingInvoiceNumber}
              checkingInvoiceSequence={checkingInvoiceSequence}
              onFieldChange={onFieldChange}
              onToggleInvoiceNumberManual={toggleInvoiceNumberManual}
              onInvoiceSequenceChange={setInvoiceSequence}
              currentInvoiceNumber={currentInvoiceNumber}
              setTemplateCustom={setTemplateCustom}
              setInvoiceMetadataField={setInvoiceMetadataField}
              addTemplateSelectOption={addTemplateSelectOption}
            />
          </div>
        </div>
      </div>

      <div className={cn(formSectionCardClass, 'w-full min-w-0')}>
        {!isEdit && form.customer_id && salesOrders.length > 0 ? (
          <InvoiceSalesOrderSourceBar
            salesOrders={salesOrders}
            selectedSalesOrderId={form.sales_order_id}
            onImportSalesOrder={importSalesOrder}
            onClearSalesOrder={clearSalesOrderImport}
            disabled={postedLocked}
          />
        ) : null}
        <InvoiceLinesGrid
          lines={form.lines}
          lineColumns={lineColumns}
          products={products}
          taxRates={taxRates}
          taxRatesById={taxRatesById}
          productsById={productsById}
          currency={form.currency}
          currencySymbols={currencySymbols}
          canCreateProduct={canCreateProduct}
          canQuickCreateTax={canQuickCreateTax}
          onTaxCreated={onTaxCreated}
          onSelectTax={onSelectTax}
          onAddLine={onAddLine}
          onRemoveLine={onRemoveLine}
          onDuplicateLine={onDuplicateLine}
          onReorderLines={onReorderLines}
          onPasteLines={onPasteLines}
          onUpdateLine={onUpdateLine}
          onUpdateLineDiscountFixed={onUpdateLineDiscountFixed}
          onUpdateLineDiscountPercent={onUpdateLineDiscountPercent}
          onUpdateLineNetTotal={onUpdateLineNetTotal}
          onProductCreated={onProductCreated}
          onProductUpdated={onProductUpdated}
          onSelectProduct={onSelectProduct}
          getMaxQtyForLine={getMaxQtyForLine}
          restrictByStock={!isEdit}
          postedLocked={postedLocked}
        />

        <div className="border-t border-foreground/[0.09] bg-muted/20 px-4 sm:px-5 py-4 sm:py-5">
          <div
            className={cn(
              'grid grid-cols-1 gap-4 items-stretch',
              postedLocked ? 'lg:grid-cols-12' : 'lg:grid-cols-3',
            )}
          >
            <div
              className={cn(
                formInnerPanelClass,
                'flex flex-col min-h-0',
                postedLocked && 'lg:col-span-7',
              )}
            >
              <FormSectionHeader title="Payment & banking details" />
              <div className="flex flex-1 flex-col p-4 min-h-[180px]">
                <Label className="sr-only">Payment and banking details</Label>
                <Textarea
                  rows={5}
                  className="flex-1 min-h-[140px] resize-none text-sm leading-relaxed bg-background"
                  value={form.notes}
                  onChange={(e) => onFieldChange('notes', e.target.value)}
                  disabled={postedLocked}
                  placeholder="Prefilled from Settings → Footer settings when enabled for invoices. Edit only if this invoice needs different wording."
                />
              </div>
            </div>

            {!postedLocked ? (
              <DocumentAttachmentsSection
                documentType="invoice"
                documentId={documentId}
                attachments={attachments}
                pendingFiles={pendingAttachments}
                onPendingFilesChange={setPendingAttachments}
                onAttachmentsChange={setAttachments}
                disabled={saving}
                maxSize={ATTACHMENT_MAX_SIZE}
                compact
                className={cn(formInnerPanelClass, 'flex flex-col h-full min-h-[180px]')}
              />
            ) : null}

            <div
              className={cn(
                formInnerPanelClass,
                'flex flex-col min-h-0',
                postedLocked ? 'lg:col-span-5' : '',
              )}
            >
              <FormSectionHeader title="Summary" />
              <div className="flex flex-1 flex-col justify-center p-4 min-h-[180px]">
                <InvoiceTotalsPanel
                  totals={totals}
                  currency={form.currency}
                  currencySymbols={currencySymbols}
                  invoiceDiscount={form.invoice_discount}
                  onDiscountChange={(v) => onFieldChange('invoice_discount', v)}
                  outstandingBalanceFormatted={customerContext?.outstanding_balance_due_formatted}
                  fullWidth
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur-sm px-1 py-2.5">
        <InvoiceFormActions
          isEdit={isEdit}
          saving={saving}
          autoPostEnabled={autoPostEnabled}
          fromJobOrder={Boolean(presetJobOrderId)}
          onCancel={onCancel}
          onPreview={openPreview}
          onSave={saveWithMode}
        />
      </div>

      <InvoicePreviewSheet
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        invoice={previewInvoice}
        workspaceId={workspaceId}
      />
    </form>
  );
}
