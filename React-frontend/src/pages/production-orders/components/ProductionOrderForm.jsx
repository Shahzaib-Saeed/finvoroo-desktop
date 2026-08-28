import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import {
  buildProductComboboxOptions,
  productPickerLabel,
} from '@/components/workspace/product/lib/product-picker';
import { UnitPickerCell } from '@/components/workspace/product/components/UnitPickerCell';
import { defaultEnteredUnitForProduct } from '@/lib/units';
import { cn } from '@/lib/utils';
import {
  formSectionBodyClass,
  formSectionCardClass,
  formInnerPanelClass,
  FormSectionHeader,
} from '@/pages/accounting/invoices/components/invoice-form-design';
import { productTracksStock } from '@/pages/accounting/invoices/constants';
import { ProductionMaterialsGrid } from './ProductionMaterialsGrid';
import { ProductionCostSummary } from './ProductionCostSummary';
import { CREATE_STATUSES, materialsCost, productPickerSubtitle } from '../constants';

function FieldError({ message }) {
  if (!message) return null;
  return <p className="text-xs text-destructive mt-1">{message}</p>;
}

function formatStock(value, unitLabel) {
  const n = Number(value) || 0;
  const formatted = Number.isInteger(n) ? String(n) : n.toFixed(2);
  return unitLabel ? `${formatted} ${unitLabel}` : formatted;
}

function productStock(product) {
  return Number(
    product?.available_stock ??
      product?.current_stock ??
      product?.quantity_on_hand ??
      product?.stock ??
      0,
  );
}

function FinishedProductOptionLabel({ product, compact = false }) {
  if (!product) return null;
  const tracks = productTracksStock(product);
  const stock = productStock(product);
  const stockValue = tracks ? formatStock(stock, product?.unit_label) : '—';
  const stockClass = !tracks
    ? 'text-muted-foreground'
    : stock > 0
      ? 'text-emerald-700 dark:text-emerald-400'
      : 'text-destructive';
  const subtitle = compact ? '' : productPickerSubtitle(product);

  return (
    <div className={cn('flex w-full min-w-0 items-center gap-2', compact && 'w-full')}>
      <div className="flex-1 min-w-0 text-left">
        <div className="truncate text-xs font-medium">{productPickerLabel(product)}</div>
        {subtitle ? (
          <div className="truncate text-[10px] text-muted-foreground">SKU: {subtitle}</div>
        ) : null}
      </div>
      <span
        className={cn(
          'shrink-0 text-right text-[11px] font-medium tabular-nums',
          stockClass,
        )}
      >
        {tracks ? stockValue : '—'}
      </span>
    </div>
  );
}

function FormField({ label, required, error, children, className }) {
  return (
    <div className={cn('space-y-1', className)}>
      {label ? (
        <Label className="text-sm">
          {label}
          {required ? <span className="text-destructive ml-0.5">*</span> : null}
        </Label>
      ) : null}
      {children}
      <FieldError message={error} />
    </div>
  );
}

export function ProductionOrderForm({
  form,
  setField,
  errors,
  finishedProducts,
  rawProducts,
  warehouses,
  employees,
  loading,
  loadingOptions,
  loadingSource,
  saving,
  loadingBom,
  isEdit,
  readOnly,
  onSubmit,
  onCancel,
  loadBom,
  saveBomTemplate,
  addMaterialRow,
  updateMaterial,
  removeMaterial,
}) {
  if (loading || loadingOptions || loadingSource) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const matCost = materialsCost(form.materials);
  const overhead = parseFloat(form.production_overhead) || 0;
  const totalCost = matCost + overhead;
  const selectedFinishedProduct = finishedProducts.find(
    (p) => String(p.id) === form.product_id,
  );
  const finishedOptions = buildProductComboboxOptions(finishedProducts);
  const unitLabel = selectedFinishedProduct?.unit_label || form.uom || 'pcs';
  const statusOptions = isEdit
    ? [
        { value: 'draft', label: 'Draft' },
        { value: 'planned', label: 'Planned' },
        { value: 'in_production', label: 'In production' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' },
      ]
    : CREATE_STATUSES;

  return (
    <form onSubmit={onSubmit} className="w-full min-w-0 space-y-0">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
        {/* Output — same weight as SO customer card */}
        <div className={cn(formSectionCardClass, 'lg:col-span-5')}>
          <FormSectionHeader title="Output" />
          <div className={cn(formSectionBodyClass, 'space-y-3')}>
            <FormField
              label="Finished product / variant"
              required
              error={errors.product_id}
            >
              {readOnly ? (
                <p className="text-sm font-medium min-h-10 flex items-center">
                  {selectedFinishedProduct
                    ? productPickerLabel(selectedFinishedProduct)
                    : '—'}
                </p>
              ) : (
                <SearchableCombobox
                  value={form.product_id || ''}
                  onValueChange={(v) => {
                    setField('product_id', v || '');
                    const product = finishedProducts.find((p) => String(p.id) === String(v));
                    setField('entered_unit', defaultEnteredUnitForProduct(product) || '');
                    if (product?.unit) setField('uom', product.unit);
                  }}
                  options={finishedOptions}
                  placeholder="Search product or variant…"
                  searchPlaceholder="Name, SKU, or variant…"
                  triggerClassName={cn('h-10 w-full', errors.product_id && 'border-destructive')}
                  contentClassName="min-w-[26rem]"
                  renderValue={(option) =>
                    option?.product ? (
                      <FinishedProductOptionLabel product={option.product} compact />
                    ) : selectedFinishedProduct ? (
                      <FinishedProductOptionLabel product={selectedFinishedProduct} compact />
                    ) : null
                  }
                  renderOption={(option) =>
                    option?.product ? (
                      <FinishedProductOptionLabel product={option.product} />
                    ) : (
                      <span className="truncate">{option.label}</span>
                    )
                  }
                />
              )}
              {!readOnly && finishedProducts.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Add finished-good or manufactured products first.
                </p>
              )}
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Quantity" required error={errors.quantity}>
                <Input
                  type="number"
                  min="1"
                  className="h-10"
                  value={form.quantity}
                  onChange={(e) => setField('quantity', e.target.value)}
                  readOnly={readOnly}
                />
              </FormField>
              <FormField label="Unit">
                {readOnly ? (
                  <p className="text-sm min-h-10 flex items-center">{unitLabel}</p>
                ) : selectedFinishedProduct ? (
                  <UnitPickerCell
                    line={form}
                    product={selectedFinishedProduct}
                    onChange={(v) => setField('entered_unit', v)}
                    className="h-10 rounded-md border"
                  />
                ) : (
                  <div className="h-10 flex items-center rounded-md border border-dashed px-3 text-xs text-muted-foreground bg-muted/30">
                    Select product
                  </div>
                )}
              </FormField>
            </div>
          </div>
        </div>

        {/* Schedule — same weight as SO order details card */}
        <div className={cn(formSectionCardClass, 'lg:col-span-7')}>
          <FormSectionHeader title="Schedule & resources" />
          <div className={formSectionBodyClass}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Status">
                {readOnly ? (
                  <p className="text-sm capitalize min-h-10 flex items-center">
                    {form.status?.replace(/_/g, ' ')}
                  </p>
                ) : (
                  <Select value={form.status} onValueChange={(v) => setField('status', v)}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </FormField>

              <FormField label="Production date" required error={errors.production_date}>
                <DatePicker
                  value={form.production_date}
                  onChange={(v) => setField('production_date', v)}
                  disabled={readOnly}
                />
              </FormField>

              <FormField label="Expected completion">
                <DatePicker
                  value={form.expected_completion_date}
                  onChange={(v) => setField('expected_completion_date', v)}
                  placeholder="Optional"
                  disabled={readOnly}
                />
              </FormField>

              <FormField label="Warehouse">
                {readOnly ? (
                  <p className="text-sm min-h-10 flex items-center">
                    {warehouses.find((w) => String(w.id) === form.warehouse_id)?.name || 'Default'}
                  </p>
                ) : (
                  <Select
                    value={form.warehouse_id || 'default'}
                    onValueChange={(v) => setField('warehouse_id', v === 'default' ? '' : v)}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Default warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                      {warehouses.map((w) => (
                        <SelectItem key={w.id} value={String(w.id)}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </FormField>

              <FormField label="Assigned to">
                {readOnly ? (
                  <p className="text-sm min-h-10 flex items-center">
                    {employees.find((e) => String(e.id) === form.assigned_to)?.name || '—'}
                  </p>
                ) : (
                  <Select
                    value={form.assigned_to || 'none'}
                    onValueChange={(v) => setField('assigned_to', v === 'none' ? '' : v)}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {employees.map((e) => (
                        <SelectItem key={e.id} value={String(e.id)}>
                          {e.name || e.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </FormField>

              <FormField label="Overhead cost">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className="h-10"
                  value={form.production_overhead}
                  onChange={(e) => setField('production_overhead', e.target.value)}
                  readOnly={readOnly}
                  placeholder="0.00"
                />
              </FormField>

              <FormField label="Machine / line" className="sm:col-span-2">
                <Input
                  className="h-10"
                  value={form.machine_line}
                  onChange={(e) => setField('machine_line', e.target.value)}
                  readOnly={readOnly}
                  placeholder="Optional production line or machine"
                />
              </FormField>
            </div>
          </div>
        </div>
      </div>

      {/* Materials + notes + summary — Bill form pattern */}
      <div className={cn(formSectionCardClass, 'mb-4 w-full min-w-0')}>
        <ProductionMaterialsGrid
          materials={form.materials}
          rawProducts={rawProducts}
          loadingBom={loadingBom}
          onAddRow={addMaterialRow}
          onUpdate={updateMaterial}
          onRemove={removeMaterial}
          onLoadBom={loadBom}
          onSaveBom={saveBomTemplate}
          readOnly={readOnly}
        />
        <FieldError message={errors.materials} />

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
                  onChange={(e) => setField('notes', e.target.value)}
                  placeholder="Optional — internal production notes."
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
                <ProductionCostSummary
                  stretch
                  materialsCost={matCost}
                  overhead={overhead}
                  totalCost={totalCost}
                  quantity={form.quantity}
                  unitLabel={unitLabel}
                />
              </div>
            </div>
          </div>
        </div>

        {!readOnly && (
          <div className="flex flex-wrap gap-2 justify-end border-t border-foreground/[0.08] px-4 sm:px-5 py-4 bg-muted/20">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={saving}>
              {saving ? (
                <Loader2 className="size-4 animate-spin mr-1" />
              ) : (
                <Save className="size-4 mr-1" />
              )}
              {isEdit ? 'Update production order' : 'Create production order'}
            </Button>
          </div>
        )}
      </div>
    </form>
  );
}
