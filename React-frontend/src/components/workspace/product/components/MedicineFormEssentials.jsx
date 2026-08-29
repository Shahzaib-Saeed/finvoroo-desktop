import { useEffect, useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { PRODUCT_NAME_MAX_LENGTH } from '../constants';
import { pharmacyApi } from '@/industries/pharmacy/api/pharmacy.api';
import { useTaxDialog } from '@/components/workspace/tax/tax-dialog-provider';

const NEW_TAX = '__new_tax__';
const NEW_DOSAGE = '__new_dosage__';

function Field({ label, required, error, children, className, hint }) {
  return (
    <div className={cn('space-y-1', className)}>
      <span className="block text-[12px] font-medium text-slate-700">
        {label}
        {required ? <span className="ml-0.5 text-red-600">*</span> : null}
      </span>
      {children}
      {hint ? <p className="text-[11px] text-slate-500">{hint}</p> : null}
      {error ? <p className="text-[11px] text-red-600">{error}</p> : null}
    </div>
  );
}

/** Functional update so fast typing never loses keystrokes to a stale form snapshot. */
function patchPharmacy(setField, patch) {
  setField('pharmacy', (prev) => ({
    ...(prev || {}),
    ...patch,
  }));
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
  taxRates = [],
  barcodeAutoFocus = true,
  onTaxCreated,
  imagePreview = '',
  setImageFile,
  clearImage,
}) {
  const barcodeRef = useRef(null);
  const imageInputRef = useRef(null);
  const [dosageForms, setDosageForms] = useState([]);
  const [creatingDosage, setCreatingDosage] = useState(false);
  const taxDialog = useTaxDialog();
  const p = form.pharmacy || {};
  const canEditImage = typeof setImageFile === 'function';

  const loadDosageForms = () =>
    pharmacyApi
      .dosageForms()
      .then((res) => setDosageForms(res?.data?.data || []))
      .catch(() => setDosageForms([]));

  useEffect(() => {
    let cancelled = false;
    loadDosageForms().then(() => {
      if (cancelled) return;
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

  const createDosageForm = async () => {
    const name = window.prompt('New form name (e.g. Tablet, Capsule, Syrup)');
    if (!name?.trim()) return;
    setCreatingDosage(true);
    try {
      const res = await pharmacyApi.createDosageForm({ name: name.trim() });
      const row = res?.data?.data;
      await loadDosageForms();
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

  const openNewTax = () => {
    taxDialog.openCreate({
      onSuccess: (saved) => {
        if (saved?.id) {
          setField('tax_rate_id', String(saved.id));
          onTaxCreated?.(saved);
          toast.success(`Tax “${saved.name}” added`);
        }
      },
    });
  };

  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-6 [&_input]:text-slate-900 [&_[data-slot=select-trigger]]:text-slate-800">
        <Field label="Barcode" className="sm:col-span-6">
          <div className="flex items-center gap-2.5">
            {canEditImage ? (
              <>
                <button
                  type="button"
                  className="group relative shrink-0"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={saving}
                  title={imagePreview ? 'Replace photo' : 'Add photo'}
                >
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt=""
                      className="size-11 rounded-lg object-cover ring-1 ring-border"
                    />
                  ) : (
                    <div className="flex size-11 items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 text-muted-foreground transition-colors group-hover:border-primary/40">
                      <ImagePlus className="size-4 opacity-50" />
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
              </>
            ) : null}
            <Input
              ref={barcodeRef}
              value={form.barcode || ''}
              onChange={(e) => setField('barcode', e.target.value)}
              placeholder="Scan or type barcode"
              disabled={saving}
              className="h-9 flex-1 font-mono text-[13px]"
              autoComplete="off"
            />
            {canEditImage && imagePreview && clearImage ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-9 shrink-0 px-2 text-muted-foreground"
                disabled={saving}
                onClick={clearImage}
                aria-label="Remove photo"
              >
                <X className="size-3.5" />
              </Button>
            ) : null}
          </div>
        </Field>

        <Field
          label="Medicine name"
          required
          error={errors.name}
          className="sm:col-span-6"
        >
          <Input
            value={form.name || ''}
            maxLength={isEdit ? undefined : PRODUCT_NAME_MAX_LENGTH}
            onChange={(e) => setField('name', e.target.value)}
            placeholder="Panadol 500mg"
            className="h-9"
            disabled={saving}
            autoComplete="off"
          />
        </Field>

        <Field label="Generic" className="sm:col-span-3">
          <Input
            value={p.generic_name || ''}
            onChange={(e) => patchPharmacy(setField, { generic_name: e.target.value })}
            placeholder="Paracetamol"
            disabled={saving}
            className="h-9"
            autoComplete="off"
          />
        </Field>

        <Field label="Form" className="sm:col-span-3">
          <Select
            value={p.dosage_form_id ? String(p.dosage_form_id) : '_none'}
            onValueChange={(v) => {
              if (v === NEW_DOSAGE) {
                createDosageForm();
                return;
              }
              patchPharmacy(setField, {
                dosage_form_id: v === '_none' ? '' : v,
              });
            }}
            disabled={saving || creatingDosage}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Tablet, capsule…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NEW_DOSAGE} className="font-medium text-primary">
                + New form…
              </SelectItem>
              <SelectItem value="_none">None</SelectItem>
              {dosageForms.map((f) => (
                <SelectItem key={f.id} value={String(f.id)}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Sale price" required error={errors.unit_price} className="sm:col-span-2">
          <Input
            type="number"
            min={0}
            step="0.01"
            value={form.unit_price ?? ''}
            onChange={(e) => setField('unit_price', e.target.value)}
            placeholder="0.00"
            disabled={saving}
            className="h-9"
          />
        </Field>

        <Field label="MRP" className="sm:col-span-2">
          <Input
            type="number"
            min={0}
            step="0.01"
            value={form.mrp ?? ''}
            onChange={(e) => setField('mrp', e.target.value)}
            placeholder="0.00"
            disabled={saving}
            className="h-9"
          />
        </Field>

        <Field label="Tax" className="sm:col-span-2">
          <Select
            value={form.tax_rate_id ? String(form.tax_rate_id) : '_none'}
            onValueChange={(v) => {
              if (v === NEW_TAX) {
                openNewTax();
                return;
              }
              setField('tax_rate_id', v === '_none' ? '' : v);
            }}
            disabled={saving}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="No tax" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NEW_TAX} className="font-medium text-primary">
                + New tax…
              </SelectItem>
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

        <Field
          label="Tablets per strip"
          required
          error={errors['pharmacy.units_per_pack'] || errors['pharmacy.pack_size']}
          className="sm:col-span-3"
          hint="Needed to sell loose tablets from a strip or box."
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
            placeholder="e.g. 10, 20"
            disabled={saving}
            className="h-9"
          />
        </Field>

        <div className="flex items-end gap-2 pb-1 sm:col-span-3 sm:justify-end">
          <span className="text-[12px] font-medium text-slate-700">Active</span>
          <Switch
            checked={form.is_active !== false}
            onCheckedChange={(v) => setField('is_active', v)}
            disabled={saving}
            id="medicine-active"
          />
        </div>
    </div>
  );
}
