import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import api from '@/lib/api';

function Field({ label, children, className }) {
  return (
    <div className={className}>
      <Label className="mb-1 block text-xs font-medium text-slate-700">{label}</Label>
      {children}
    </div>
  );
}

function setPharmacyField(setField, key, value) {
  setField('pharmacy', (prev) => ({
    ...(prev || {}),
    [key]: value,
  }));
}

/**
 * Pharmacy catalog extension: clinical attrs, MRP/wholesale, multi-barcode.
 * Shown when company has pharmacy_shell / barcode features.
 */
export function PharmacyProductSection({
  form,
  setField,
  disabled = false,
  compact = false,
  /** full | advanced — advanced hides fields already on medicine essentials */
  mode = 'full',
}) {
  const advancedOnly = mode === 'advanced';
  const [dosageForms, setDosageForms] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.get('/workspace/pharmacy/dosage-forms').catch(() => null),
      api.get('/workspace/pharmacy/manufacturers').catch(() => null),
    ]).then(([formsRes, mfrRes]) => {
      if (cancelled) return;
      setDosageForms(formsRes?.data?.data || []);
      setManufacturers(mfrRes?.data?.data || []);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const p = form.pharmacy || {};
  const barcodes = Array.isArray(form.barcodes) ? form.barcodes : [];
  const gap = compact ? 'gap-2.5' : 'gap-3';

  const updateBarcode = (index, patch) => {
    const next = barcodes.map((row, i) => (i === index ? { ...row, ...patch } : row));
    setField('barcodes', next);
  };

  const addBarcode = () => {
    setField('barcodes', [
      ...barcodes,
      { code: '', source: 'internal', pack_level: 'unit', is_primary: barcodes.length === 0 },
    ]);
  };

  const removeBarcode = (index) => {
    setField(
      'barcodes',
      barcodes.filter((_, i) => i !== index),
    );
  };

  return (
    <div className={`space-y-4 ${loading ? 'opacity-70' : ''}`}>
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${gap}`}>
        {!advancedOnly ? (
          <>
            <Field label="Generic name">
              <Input
                value={p.generic_name || ''}
                onChange={(e) => setPharmacyField(setField, 'generic_name', e.target.value)}
                disabled={disabled}
                placeholder="e.g. Paracetamol"
              />
            </Field>
            <Field label="Strength (display)">
              <Input
                value={p.strength_text || ''}
                onChange={(e) => setPharmacyField(setField, 'strength_text', e.target.value)}
                disabled={disabled}
                placeholder="e.g. 500 mg"
              />
            </Field>
            <Field label="Strength value">
              <Input
                type="number"
                min={0}
                step="any"
                value={p.strength_value ?? ''}
                onChange={(e) => setPharmacyField(setField, 'strength_value', e.target.value)}
                disabled={disabled}
              />
            </Field>
            <Field label="Strength unit">
              <Input
                value={p.strength_unit || ''}
                onChange={(e) => setPharmacyField(setField, 'strength_unit', e.target.value)}
                disabled={disabled}
                placeholder="mg, ml…"
              />
            </Field>
            <Field label="Dosage form">
              <Select
                value={p.dosage_form_id || '_none'}
                onValueChange={(v) =>
                  setPharmacyField(setField, 'dosage_form_id', v === '_none' ? '' : v)
                }
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select form" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">None</SelectItem>
                  {dosageForms.map((f) => (
                    <SelectItem key={f.id} value={String(f.id)}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </>
        ) : null}
        <Field label="Manufacturer">
          <Select
            value={p.manufacturer_id || '_none'}
            onValueChange={(v) =>
              setPharmacyField(setField, 'manufacturer_id', v === '_none' ? '' : v)
            }
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select manufacturer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">None</SelectItem>
              {manufacturers.map((m) => (
                <SelectItem key={m.id} value={String(m.id)}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="HSN / SAC">
          <Input
            value={p.hsn_sac || ''}
            onChange={(e) => setPharmacyField(setField, 'hsn_sac', e.target.value)}
            disabled={disabled}
          />
        </Field>
        <Field label="Bin / shelf">
          <Input
            value={p.bin_location || ''}
            onChange={(e) => setPharmacyField(setField, 'bin_location', e.target.value)}
            disabled={disabled}
          />
        </Field>
        <Field label="Storage">
          <Select
            value={p.storage_condition || '_none'}
            onValueChange={(v) =>
              setPharmacyField(setField, 'storage_condition', v === '_none' ? '' : v)
            }
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Condition" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">Default</SelectItem>
              <SelectItem value="room">Room temperature</SelectItem>
              <SelectItem value="cold">Cold chain</SelectItem>
              <SelectItem value="controlled">Controlled storage</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Controlled schedule">
          <Input
            value={p.controlled_schedule || ''}
            onChange={(e) =>
              setPharmacyField(setField, 'controlled_schedule', e.target.value)
            }
            disabled={disabled || !p.controlled_drug}
            placeholder="e.g. Schedule H"
          />
        </Field>
      </div>

      <div className={`grid grid-cols-1 sm:grid-cols-3 ${gap}`}>
        {!advancedOnly ? (
          <Field label="MRP">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={form.mrp ?? ''}
              onChange={(e) => setField('mrp', e.target.value)}
              disabled={disabled}
            />
          </Field>
        ) : null}
        <Field label="Wholesale">
          <Input
            type="number"
            min={0}
            step="0.01"
            value={form.wholesale_price ?? ''}
            onChange={(e) => setField('wholesale_price', e.target.value)}
            disabled={disabled}
          />
        </Field>
        {!advancedOnly ? (
          <>
            <Field label="Pack size">
              <Input
                type="number"
                min={1}
                step={1}
                value={p.pack_size ?? ''}
                onChange={(e) => setPharmacyField(setField, 'pack_size', e.target.value)}
                disabled={disabled}
              />
            </Field>
            <Field label="Units / pack">
              <Input
                type="number"
                min={1}
                step={1}
                value={p.units_per_pack ?? ''}
                onChange={(e) => setPharmacyField(setField, 'units_per_pack', e.target.value)}
                disabled={disabled}
              />
            </Field>
          </>
        ) : null}
        <Field label="Min stock">
          <Input
            type="number"
            min={0}
            step="any"
            value={form.min_stock ?? ''}
            onChange={(e) => setField('min_stock', e.target.value)}
            disabled={disabled}
          />
        </Field>
        <Field label="Max stock">
          <Input
            type="number"
            min={0}
            step="any"
            value={form.max_stock ?? ''}
            onChange={(e) => setField('max_stock', e.target.value)}
            disabled={disabled}
          />
        </Field>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-3">
        <label className="flex items-center gap-2 text-[13px] text-slate-700">
          <Switch
            checked={!!p.prescription_required}
            onCheckedChange={(v) => setPharmacyField(setField, 'prescription_required', v)}
            disabled={disabled}
          />
          Rx required
        </label>
        <label className="flex items-center gap-2 text-[13px] text-slate-700">
          <Switch
            checked={!!p.controlled_drug}
            onCheckedChange={(v) => setPharmacyField(setField, 'controlled_drug', v)}
            disabled={disabled}
          />
          Controlled drug
        </label>
        <label className="flex items-center gap-2 text-[13px] text-slate-700">
          <Switch
            checked={!!p.allow_fractional_qty}
            onCheckedChange={(v) => setPharmacyField(setField, 'allow_fractional_qty', v)}
            disabled={disabled}
          />
          Allow fractional qty
        </label>
        <label className="flex items-center gap-2 text-[13px] text-slate-700">
          <Switch
            checked={p.sale_blocked_when_expired !== false}
            onCheckedChange={(v) =>
              setPharmacyField(setField, 'sale_blocked_when_expired', v)
            }
            disabled={disabled}
          />
          Block expired sales
        </label>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Alternate barcodes
          </h4>
          <Button type="button" variant="outline" size="sm" onClick={addBarcode} disabled={disabled}>
            <Plus className="size-3.5 mr-1" />
            Add
          </Button>
        </div>
        {barcodes.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Primary barcode stays on the product. Add GTIN / supplier codes here.
          </p>
        ) : (
          <div className="space-y-2">
            {barcodes.map((row, index) => (
              <div
                key={`bc-${index}`}
                className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-end"
              >
                <Field label={index === 0 ? 'Code' : undefined}>
                  <Input
                    value={row.code || ''}
                    onChange={(e) => updateBarcode(index, { code: e.target.value })}
                    disabled={disabled}
                    placeholder="Barcode"
                  />
                </Field>
                <Field label={index === 0 ? 'Source' : undefined}>
                  <Select
                    value={row.source || 'internal'}
                    onValueChange={(v) => updateBarcode(index, { source: v })}
                    disabled={disabled}
                  >
                    <SelectTrigger className="w-[110px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="internal">Internal</SelectItem>
                      <SelectItem value="gtin">GTIN</SelectItem>
                      <SelectItem value="supplier">Supplier</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={index === 0 ? 'Pack' : undefined}>
                  <Select
                    value={row.pack_level || 'unit'}
                    onValueChange={(v) => updateBarcode(index, { pack_level: v })}
                    disabled={disabled}
                  >
                    <SelectTrigger className="w-[90px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unit">Unit</SelectItem>
                      <SelectItem value="pack">Pack</SelectItem>
                      <SelectItem value="case">Case</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <label className="flex items-center gap-1.5 text-xs pb-2">
                  <Switch
                    checked={!!row.is_primary}
                    onCheckedChange={(v) => {
                      const next = barcodes.map((b, i) => ({
                        ...b,
                        is_primary: i === index ? v : false,
                      }));
                      setField('barcodes', next);
                    }}
                    disabled={disabled}
                  />
                  Primary
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="mb-0.5"
                  onClick={() => removeBarcode(index)}
                  disabled={disabled}
                >
                  <Trash2 className="size-3.5 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
