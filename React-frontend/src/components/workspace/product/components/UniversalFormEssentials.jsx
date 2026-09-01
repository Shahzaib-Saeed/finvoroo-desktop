import { useRef } from 'react';
import { ImagePlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { PRODUCT_NAME_MAX_LENGTH } from '../constants';

const NEW_CATEGORY = '__new_category__';
const NEW_BRAND = '__new_brand__';

const CONTROL =
  'h-9 w-full border-slate-200 bg-white shadow-sm focus-visible:border-slate-400 focus-visible:ring-slate-400/20';
const COMBO_TRIGGER = 'h-9 border-slate-200 bg-white shadow-sm font-normal';

function Field({ label, required, error, children, className, hint }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-600">
        {label}
        {required ? <span className="ml-0.5 text-red-600">*</span> : null}
      </span>
      {children}
      {hint ? <p className="text-[11px] leading-snug text-slate-500">{hint}</p> : null}
      {error ? <p className="text-[11px] text-red-600">{error}</p> : null}
    </div>
  );
}

function buildLookupOptions(items, currentId, fallbackLabel, labelKey = 'name') {
  const opts = (items || []).map((item) => ({
    value: String(item.id ?? item.value),
    label: item[labelKey] ?? item.label ?? String(item.id ?? item.value),
  }));
  const id = currentId ? String(currentId) : '';
  if (id && !opts.some((o) => o.value === id)) {
    opts.push({ value: id, label: fallbackLabel || id });
  }
  return opts;
}

function parsePrice(value) {
  if (value === '' || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function markupOnCost(purchase, sale) {
  if (purchase == null || sale == null || purchase <= 0) return null;
  const pct = ((sale - purchase) / purchase) * 100;
  return { pct };
}

function formatPct(n) {
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/**
 * Clean essentials layout for universal (non-pharmacy) products — mirrors medicine sheet.
 */
export function UniversalFormEssentials({
  form,
  errors,
  setField,
  saving,
  isEdit,
  tracks = true,
  categories = [],
  brands = [],
  taxRates = [],
  onNewCategory,
  onNewBrand,
  categoryFallbackLabel = '',
  brandFallbackLabel = '',
  categorySelectKey = '',
  brandSelectKey = '',
  imagePreview = '',
  setImageFile,
  clearImage,
  typeSelect = null,
  nameAutoFocus = true,
}) {
  const nameRef = useRef(null);
  const imageInputRef = useRef(null);
  const canEditImage = typeof setImageFile === 'function' && tracks;

  const categoryId = form.category_id ? String(form.category_id) : '';
  const brandId = form.brand_id ? String(form.brand_id) : '';
  const purchase = parsePrice(form.purchase_price);
  const sale = parsePrice(form.unit_price);
  const markup = markupOnCost(purchase, sale);

  const categoryOptions = buildLookupOptions(categories, categoryId, categoryFallbackLabel);
  const brandOptions = buildLookupOptions(brands, brandId, brandFallbackLabel);

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
            Product details
          </h3>
        </div>

        <div className="p-4">
          <div className="flex items-start gap-4">
            {canEditImage ? (
              <div className="flex w-[4.75rem] shrink-0 flex-col items-center gap-1.5">
                <button
                  type="button"
                  className="group relative"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={saving}
                  title={imagePreview ? 'Replace photo' : 'Add photo'}
                >
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt=""
                      className="size-[4.75rem] rounded-lg object-cover ring-1 ring-slate-200"
                    />
                  ) : (
                    <div className="flex size-[4.75rem] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-500 transition-colors group-hover:border-slate-400 group-hover:bg-slate-100">
                      <ImagePlus className="size-4" />
                      <span className="text-[9px] font-semibold uppercase tracking-wide">Photo</span>
                    </div>
                  )}
                </button>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setImageFile?.(file);
                    e.target.value = '';
                  }}
                />
                {imagePreview && clearImage ? (
                  <button
                    type="button"
                    className="text-[10px] font-medium text-slate-500 hover:text-red-600"
                    disabled={saving}
                    onClick={clearImage}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            ) : null}

            <div className="min-w-0 flex-1 grid grid-cols-1 gap-3 sm:grid-cols-6">
              <Field label="Barcode" className="sm:col-span-3">
                <Input
                  value={form.barcode || ''}
                  onChange={(e) => setField('barcode', e.target.value)}
                  placeholder="Scan or type"
                  disabled={saving}
                  className={cn(CONTROL, 'font-mono text-[13px]')}
                  autoComplete="off"
                />
              </Field>

              <Field label="SKU" error={errors.sku} className="sm:col-span-3">
                <Input
                  value={form.sku || ''}
                  onChange={(e) => setField('sku', e.target.value)}
                  placeholder="Auto"
                  disabled={saving}
                  className={CONTROL}
                  autoComplete="off"
                />
              </Field>

              <Field label="Product name" required error={errors.name} className="sm:col-span-4">
                <Input
                  ref={nameRef}
                  value={form.name || ''}
                  maxLength={isEdit ? undefined : PRODUCT_NAME_MAX_LENGTH}
                  onChange={(e) => setField('name', e.target.value)}
                  placeholder="Wireless mouse"
                  className={CONTROL}
                  disabled={saving}
                  autoFocus={nameAutoFocus && !isEdit}
                  autoComplete="off"
                />
              </Field>

              <Field label="Category" className="sm:col-span-2">
                <SearchableCombobox
                  key={categorySelectKey ? `${categorySelectKey}-${categoryId || '_none'}` : undefined}
                  value={categoryId}
                  onValueChange={(v) => setField('category_id', v)}
                  options={categoryOptions}
                  placeholder="Category"
                  searchPlaceholder="Search categories…"
                  allowNone
                  disabled={saving}
                  triggerClassName={COMBO_TRIGGER}
                  actionItems={[
                    {
                      value: NEW_CATEGORY,
                      label: '+ New category…',
                      className: 'text-primary font-medium',
                      onSelect: () => onNewCategory?.(),
                    },
                  ]}
                />
              </Field>

              <Field label="Brand" className="sm:col-span-3">
                <SearchableCombobox
                  key={brandSelectKey ? `${brandSelectKey}-${brandId || '_none'}` : undefined}
                  value={brandId}
                  onValueChange={(v) => setField('brand_id', v)}
                  options={brandOptions}
                  placeholder="Brand"
                  searchPlaceholder="Search brands…"
                  allowNone
                  disabled={saving}
                  triggerClassName={COMBO_TRIGGER}
                  actionItems={[
                    {
                      value: NEW_BRAND,
                      label: '+ New brand…',
                      className: 'text-primary font-medium',
                      onSelect: () => onNewBrand?.(),
                    },
                  ]}
                />
              </Field>

              {typeSelect ? (
                <Field label="Product type" required error={errors.type} className="sm:col-span-3">
                  {typeSelect}
                </Field>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
            Pricing & status
          </h3>
          <label
            htmlFor="product-active"
            className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5"
          >
            <span className="text-xs font-medium text-slate-600">Active</span>
            <Switch
              checked={form.is_active !== false}
              onCheckedChange={(v) => setField('is_active', v)}
              disabled={saving}
              id="product-active"
            />
          </label>
        </div>

        <div className="space-y-3 p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Cost" error={errors.purchase_price}>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.purchase_price ?? ''}
                onChange={(e) => setField('purchase_price', e.target.value)}
                placeholder="0.00"
                disabled={saving}
                className={CONTROL}
              />
            </Field>

            <Field label="Sell price" required error={errors.unit_price}>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.unit_price ?? ''}
                onChange={(e) => setField('unit_price', e.target.value)}
                placeholder="0.00"
                disabled={saving}
                className={CONTROL}
              />
            </Field>
          </div>

          {markup ? (
            <div
              className={cn(
                'flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm',
                markup.pct >= 0
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-red-200 bg-red-50 text-red-900',
              )}
            >
              <span
                className={cn(
                  'text-xs font-medium uppercase tracking-wide',
                  markup.pct >= 0 ? 'text-emerald-700/80' : 'text-red-700/80',
                )}
              >
                Margin on cost
              </span>
              <span
                className={cn(
                  'font-semibold tabular-nums',
                  markup.pct >= 0 ? 'text-emerald-700' : 'text-red-700',
                )}
              >
                {markup.pct >= 0 ? '+' : ''}
                {formatPct(markup.pct)}%
              </span>
            </div>
          ) : null}

          <Field label="Tax">
            <Select
              value={form.tax_rate_id || '_none'}
              onValueChange={(v) => setField('tax_rate_id', v === '_none' ? '' : v)}
              disabled={saving}
            >
              <SelectTrigger className={COMBO_TRIGGER}>
                <SelectValue placeholder="No tax" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">No tax</SelectItem>
                {taxRates.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.name}
                    {t.rate != null ? ` (${t.rate}%)` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </section>
    </div>
  );
}
