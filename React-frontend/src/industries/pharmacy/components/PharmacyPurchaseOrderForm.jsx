import { useMemo } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Loader2, Save, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import { SourceDocumentBanner } from '@/components/accounting/SourceDocumentBanner';
import { MetadataCustomFields } from '@/components/accounting/MetadataCustomFields';
import { useVendorDialog } from '@/components/workspace/vendor/vendor-dialog-provider';
import { PharmacyPurchaseOrderLinesGrid } from '@/industries/pharmacy/components/PharmacyPurchaseOrderLinesGrid';
import { PoSmartSuggestions } from '@/industries/pharmacy/components/PoSmartSuggestions';
import { InvoiceTotalsPanel } from '@/pages/accounting/invoices/components/InvoiceTotalsPanel';
import { formatCurrency } from '@/pages/accounting/invoices/constants';
import { cn } from '@/lib/utils';

const NEW_VENDOR = '__po_vendor_new__';

const FIELD =
  'h-9 rounded-lg border-slate-200 bg-white text-[13px] shadow-none focus-visible:border-emerald-400 focus-visible:ring-emerald-500/20';

function Field({ label, required, error, className, children }) {
  return (
    <div className={cn('min-w-0 space-y-1', className)}>
      <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
        {required ? <span className="ml-0.5 text-red-600">*</span> : null}
      </span>
      {children}
      {error ? <p className="text-[11px] text-red-600">{error}</p> : null}
    </div>
  );
}

export function PharmacyPurchaseOrderForm({
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
  onAddSuggestedProduct,
  onAddLine,
  onRemoveLine,
  onSubmit,
  onCancel,
  customFieldDefinitions = [],
  setMetadataField,
  addMetadataSelectOption,
  pageTitle,
  pageSubtitle,
  backTo,
  extraActions,
}) {
  const { id: workspaceId } = useParams();
  const currency = baseCurrency;
  const vendorDialog = useVendorDialog();
  const money = (n) => formatCurrency(n, currency, currencySymbols);
  const excludeProductIds = useMemo(
    () =>
      (form.lines || [])
        .map((line) => Number(line.product_id))
        .filter((id) => Number.isFinite(id) && id > 0),
    [form.lines],
  );

  if (loadingLookups || loadingConversion) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-sm text-slate-500">
        <Loader2 className="size-8 animate-spin text-emerald-700" />
        <p>
          {loadingConversion
            ? 'Loading the source document…'
            : 'Loading suppliers and medicines…'}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex min-h-[calc(100dvh-9.5rem)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
    >
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-slate-200/80 bg-white px-4 py-2.5">
        {backTo ? (
          <Button
            asChild
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 shrink-0 rounded-lg text-slate-600 hover:bg-emerald-50 hover:text-emerald-900"
          >
            <Link to={backTo} aria-label="Back">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
        ) : onCancel ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 shrink-0 rounded-lg text-slate-600 hover:bg-emerald-50 hover:text-emerald-900"
            onClick={onCancel}
          >
            <ArrowLeft className="size-4" />
          </Button>
        ) : null}

        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-800 text-white">
            <ShoppingCart className="size-4" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-[16px] font-bold tracking-tight text-slate-900">
              {pageTitle || (isEdit ? 'Edit purchase order' : 'Create purchase order')}
            </h1>
            <p className="text-[11px] font-medium text-slate-500">
              {pageSubtitle || 'Choose a supplier, add medicines, then save the order.'}
            </p>
          </div>
        </div>

        <div className="ms-auto flex flex-wrap items-center gap-2">
          {extraActions}
          {!readOnly ? (
            <Button
              type="submit"
              disabled={saving}
              className="h-9 gap-1.5 rounded-lg bg-emerald-800 px-3 text-[12px] font-medium text-white shadow-none hover:bg-emerald-700"
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              {isEdit ? 'Update order' : 'Create purchase order'}
            </Button>
          ) : null}
        </div>
      </header>

      {conversionSource ? (
        <div className="shrink-0 border-b border-emerald-100 bg-emerald-50/50 px-4 py-2">
          <SourceDocumentBanner
            source={conversionSource}
            warnings={conversionWarnings}
            workspaceId={workspaceId}
            accent="emerald"
          />
        </div>
      ) : null}

      <div className="shrink-0 border-b border-slate-200 bg-emerald-50/40 px-3 py-2">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-12 lg:items-end">
          <Field
            label="Supplier"
            required
            error={errors.vendor_id}
            className="col-span-2 lg:col-span-5"
          >
            <SearchableCombobox
              value={form.vendor_id ? String(form.vendor_id) : undefined}
              onValueChange={(v) => {
                if (readOnly || v === NEW_VENDOR) return;
                onVendorChange(v || '');
              }}
              options={vendors.map((v) => ({
                value: String(v.id),
                label: v.name,
                keywords: [v.email, v.currency].filter(Boolean),
              }))}
              placeholder="Select supplier"
              searchPlaceholder="Search suppliers…"
              disabled={readOnly}
              triggerClassName={cn(FIELD, 'w-full font-medium')}
              className="w-full"
              contentClassName="min-w-[280px]"
              actionItems={
                !canCreateVendor || readOnly
                  ? []
                  : [
                      {
                        value: NEW_VENDOR,
                        label: '+ Create supplier…',
                        className: 'font-medium text-emerald-700',
                        onSelect: () => {
                          vendorDialog.openCreate({
                            onSuccess: (vendor) => {
                              if (vendor?.id) onVendorChange(String(vendor.id));
                            },
                          });
                        },
                      },
                    ]
              }
            />
          </Field>
          <Field label="Order date" required error={errors.order_date} className="lg:col-span-2">
            <DatePicker
              value={form.order_date}
              onChange={(v) => onFieldChange('order_date', v)}
              allowClear={false}
              disabled={readOnly}
            />
          </Field>
          <Field label="Expected delivery" className="lg:col-span-2">
            <DatePicker
              value={form.expected_delivery}
              onChange={(v) => onFieldChange('expected_delivery', v)}
              disabled={readOnly}
              placeholder="Optional"
            />
          </Field>
          <div className="col-span-2 flex items-end justify-end lg:col-span-3">
            <div className="w-full rounded-lg border border-emerald-100 bg-white px-3 py-2 text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Order total
              </p>
              <p className="text-lg font-bold tabular-nums text-emerald-900">
                {money(totals.total)}
              </p>
            </div>
          </div>
        </div>
        {customFieldDefinitions.length > 0 && setMetadataField ? (
          <div className="mt-2">
            <MetadataCustomFields
              variant="inline"
              definitions={customFieldDefinitions}
              values={form.purchase_order_metadata_custom_fields || {}}
              onChange={setMetadataField}
              onAddSelectOption={addMetadataSelectOption}
              errors={errors}
              errorsPrefix="purchase_order_metadata_custom_fields"
              readOnly={readOnly}
            />
          </div>
        ) : null}
      </div>

      <PoSmartSuggestions
        vendorId={form.vendor_id}
        excludeProductIds={excludeProductIds}
        currency={currencySymbols?.[currency] || currency}
        readOnly={readOnly}
        onAdd={onAddSuggestedProduct}
        variant="pharmacy"
      />

      <div className="min-h-0 flex-1 overflow-auto">
        <PharmacyPurchaseOrderLinesGrid
          lines={form.lines}
          productsById={productsById}
          taxRatesById={taxRatesById}
          canCreateProduct={canCreateProduct && !readOnly}
          readOnly={readOnly}
          onAddLine={onAddLine}
          onRemoveLine={onRemoveLine}
          onUpdateLine={onUpdateLine}
          onUpdateLineDiscountPercent={onUpdateLineDiscountPercent}
          onSelectProduct={onSelectProduct}
        />
      </div>

      <div className="shrink-0 border-t border-slate-200 bg-slate-50/80 px-4 py-3">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Notes
            </Label>
            <Textarea
              rows={3}
              className="resize-y text-sm"
              value={form.notes}
              onChange={(e) => onFieldChange('notes', e.target.value)}
              placeholder="Optional — delivery instructions or internal memo"
              disabled={readOnly}
            />
          </div>
          <div className="flex flex-col gap-3 lg:col-span-5">
            <div className="rounded-lg border border-emerald-100 bg-white p-3">
              <InvoiceTotalsPanel
                totals={totals}
                currency={currency}
                currencySymbols={currencySymbols}
                invoiceDiscount={form.discount_amount}
                onDiscountChange={(v) => onFieldChange('discount_amount', v)}
                fullWidth
              />
              <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
                <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Other charges
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className={cn(FIELD, 'text-right tabular-nums')}
                  value={form.other_charges}
                  onChange={(e) => onFieldChange('other_charges', e.target.value)}
                  disabled={readOnly}
                  placeholder="0.00"
                />
              </div>
            </div>
            {!readOnly ? (
              <div className="flex justify-end gap-2">
                {onCancel ? (
                  <Button type="button" variant="outline" className="h-9" onClick={onCancel}>
                    Cancel
                  </Button>
                ) : null}
                <Button
                  type="submit"
                  disabled={saving}
                  className="h-9 gap-1.5 bg-emerald-800 text-white hover:bg-emerald-700"
                >
                  {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  {isEdit ? 'Update purchase order' : 'Create purchase order'}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </form>
  );
}
