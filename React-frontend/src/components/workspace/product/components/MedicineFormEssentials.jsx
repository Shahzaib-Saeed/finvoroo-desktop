import { useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, ScanLine } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { PRODUCT_NAME_MAX_LENGTH } from '../constants';
import { pharmacyApi } from '@/industries/pharmacy/api/pharmacy.api';

const NEW_DOSAGE = '__new_dosage__';
const NEW_CATEGORY = '__new_category__';

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

function patchPharmacy(setField, patch) {
  setField('pharmacy', (prev) => ({
    ...(prev || {}),
    ...patch,
  }));
}

function buildLookupOptions(items, currentId, fallbackLabel, labelKey = 'name') {
  const opts = (items || []).map((item) => ({
    value: String(item.id),
    label: item[labelKey] || String(item.id),
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
 * Pharmacy-first essentials for fast medicine entry.
 */
export function MedicineFormEssentials({
  form,
  errors,
  setField,
  saving,
  isEdit,
  categories = [],
  onNewCategory,
  categoryFallbackLabel = '',
  categorySelectKey = '',
  barcodeAutoFocus = true,
  imagePreview = '',
  setImageFile,
  clearImage,
}) {
  const barcodeRef = useRef(null);
  const imageInputRef = useRef(null);
  const [dosageForms, setDosageForms] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [creatingDosage, setCreatingDosage] = useState(false);
  const p = form.pharmacy || {};
  const canEditImage = typeof setImageFile === 'function';

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      pharmacyApi.dosageForms().catch(() => null),
      api.get('/workspace/pharmacy/manufacturers').catch(() => null),
    ]).then(([formsRes, mfrRes]) => {
      if (cancelled) return;
      setDosageForms(formsRes?.data?.data || []);
      setManufacturers(mfrRes?.data?.data || []);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (barcodeAutoFocus && !isEdit) {
      requestAnimationFrame(() => barcodeRef.current?.focus?.());
    }
  }, [barcodeAutoFocus, isEdit]);

  const packFactor = p.units_per_pack ?? p.pack_size ?? '';
  const categoryId = form.category_id ? String(form.category_id) : '';
  const purchase = parsePrice(form.purchase_price);
  const sale = parsePrice(form.unit_price);
  const markup = markupOnCost(purchase, sale);

  const categoryOptions = useMemo(
    () => buildLookupOptions(categories, categoryId, categoryFallbackLabel),
    [categories, categoryId, categoryFallbackLabel],
  );

  const manufacturerOptions = useMemo(
    () => buildLookupOptions(manufacturers, p.manufacturer_id, form.manufacturer),
    [manufacturers, p.manufacturer_id, form.manufacturer],
  );

  const dosageFormOptions = useMemo(
    () => buildLookupOptions(dosageForms, p.dosage_form_id, ''),
    [dosageForms, p.dosage_form_id],
  );

  const createDosageForm = async () => {
    const name = window.prompt('New form name (e.g. Tablet, Capsule, Syrup)');
    if (!name?.trim()) return;
    setCreatingDosage(true);
    try {
      const res = await pharmacyApi.createDosageForm({ name: name.trim() });
      const row = res?.data?.data;
      setDosageForms((prev) => {
        if (!row?.id || prev.some((f) => String(f.id) === String(row.id))) return prev;
        return [...prev, row];
      });
      if (row?.id) {
        patchPharmacy(setField, { dosage_form_id: String(row.id) });
        toast.success(`Form “${row.name}” ready`);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not create form');
    } finally {
      setCreatingDosage(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
            Medicine details
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
              <Field label="Barcode" className="sm:col-span-4">
                <div className="relative">
                  <ScanLine className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    ref={barcodeRef}
                    value={form.barcode || ''}
                    onChange={(e) => setField('barcode', e.target.value)}
                    placeholder="Scan or type"
                    disabled={saving}
                    className={cn(CONTROL, 'pl-9 font-mono text-[13px]')}
                    autoComplete="off"
                  />
                </div>
              </Field>

              <Field label="Category" className="sm:col-span-2">
                <SearchableCombobox
                  key={categorySelectKey ? `${categorySelectKey}-${categoryId || '_none'}` : undefined}
                  value={categoryId}
                  onValueChange={(v) => setField('category_id', v)}
                  options={categoryOptions}
                  placeholder="Category"
                  searchPlaceholder="Search categories…"
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

              <Field
                label="Medicine name"
                required
                error={errors.name}
                className="sm:col-span-4"
              >
                <Input
                  value={form.name || ''}
                  maxLength={isEdit ? undefined : PRODUCT_NAME_MAX_LENGTH}
                  onChange={(e) => setField('name', e.target.value)}
                  placeholder="Panadol 500mg"
                  className={CONTROL}
                  disabled={saving}
                  autoComplete="off"
                />
              </Field>

              <Field
                label="Tablets per strip"
                required
                error={errors['pharmacy.units_per_pack'] || errors['pharmacy.pack_size']}
                hint="For loose tablet sales"
                className="sm:col-span-2"
              >
                <Input
                  type="number"
                  min={1}
                  step={1}
                  required
                  aria-required="true"
                  value={packFactor === null || packFactor === undefined ? '' : packFactor}
                  onChange={(e) => {
                    const n = e.target.value;
                    patchPharmacy(setField, {
                      units_per_pack: n,
                      pack_size: n,
                    });
                  }}
                  placeholder="10, 20…"
                  disabled={saving}
                  className={CONTROL}
                />
              </Field>

              <Field label="Manufacturer" className="sm:col-span-3">
                <SearchableCombobox
                  value={p.manufacturer_id ? String(p.manufacturer_id) : ''}
                  onValueChange={(v) => {
                    const name = manufacturers.find((m) => String(m.id) === v)?.name;
                    patchPharmacy(setField, { manufacturer_id: v });
                    if (name) setField('manufacturer', name);
                  }}
                  options={manufacturerOptions}
                  placeholder="Select manufacturer"
                  searchPlaceholder="Search manufacturers…"
                  allowNone
                  disabled={saving}
                  triggerClassName={COMBO_TRIGGER}
                />
              </Field>

              <Field label="Form" className="sm:col-span-3">
                <SearchableCombobox
                  value={p.dosage_form_id ? String(p.dosage_form_id) : ''}
                  onValueChange={(v) => patchPharmacy(setField, { dosage_form_id: v })}
                  options={dosageFormOptions}
                  placeholder="Tablet, capsule…"
                  searchPlaceholder="Search forms…"
                  allowNone
                  disabled={saving || creatingDosage}
                  triggerClassName={COMBO_TRIGGER}
                  actionItems={[
                    {
                      value: NEW_DOSAGE,
                      label: '+ New form…',
                      className: 'text-primary font-medium',
                      onSelect: createDosageForm,
                    },
                  ]}
                />
              </Field>
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
            htmlFor="medicine-active"
            className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5"
          >
            <span className="text-xs font-medium text-slate-600">Active</span>
            <Switch
              checked={form.is_active !== false}
              onCheckedChange={(v) => setField('is_active', v)}
              disabled={saving}
              id="medicine-active"
            />
          </label>
        </div>

        <div className="space-y-3 p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Purchase price" error={errors.purchase_price}>
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

            <Field label="Sale price" required error={errors.unit_price}>
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

          <Field label="Generic">
            <Input
              value={p.generic_name || ''}
              onChange={(e) => patchPharmacy(setField, { generic_name: e.target.value })}
              placeholder="Paracetamol"
              disabled={saving}
              className={CONTROL}
              autoComplete="off"
            />
          </Field>
        </div>
      </section>
    </div>
  );
}
