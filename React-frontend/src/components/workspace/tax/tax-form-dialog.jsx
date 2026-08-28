import { useEffect, useState } from 'react';
import { Loader2, Percent, Save } from 'lucide-react';
import { toast } from 'sonner';
import { taxRatesApi } from '@/pages/accounting/taxes/api/tax-rates.api';
import {
  EMPTY_TAX_FORM,
  buildTaxPayload,
  mapTaxToForm,
  TYPE_OPTIONS,
} from '@/pages/accounting/taxes/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function TaxFormDialog({ open, onOpenChange, tax, loadingTax, onSuccess }) {
  const isEdit = !!tax?.id;
  const [form, setForm] = useState(EMPTY_TAX_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [typeOptions, setTypeOptions] = useState(TYPE_OPTIONS);

  useEffect(() => {
    if (!open) return;
    taxRatesApi
      .formOptions()
      .then((res) => {
        const types = res.data?.data?.types;
        if (types?.length) setTypeOptions(types);
      })
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (tax?.id) {
      setForm(mapTaxToForm(tax));
    } else {
      setForm({ ...EMPTY_TAX_FORM });
    }
    setErrors({});
  }, [open, tax]);

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Name is required';
    if (form.rate === '' || Number(form.rate) < 0) next.rate = 'Rate is required';
    if (!form.type) next.type = 'Type is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = buildTaxPayload(form, isEdit);
      const res = isEdit
        ? await taxRatesApi.update(tax.id, payload)
        : await taxRatesApi.create(payload);
      toast.success(res.data?.message || (isEdit ? 'Tax rate updated' : 'Tax rate created'));
      onSuccess?.(res.data?.data);
      onOpenChange(false);
    } catch (err) {
      const data = err?.response?.data;
      if (data?.errors) setErrors(data.errors);
      toast.error(data?.message || 'Could not save tax rate');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Percent className="size-5 text-primary" />
            {isEdit ? 'Edit tax rate' : 'Add tax rate'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update VAT, GST, or sales tax used on invoices and bills.'
              : 'Create a tax rate for invoices, bills, and products.'}
          </DialogDescription>
        </DialogHeader>

        {loadingTax ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                placeholder="e.g. VAT 15%"
                autoComplete="off"
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && (
                <p className="text-xs text-destructive">
                  {Array.isArray(errors.name) ? errors.name[0] : errors.name}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setField('type', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>
                Rate <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.rate}
                onChange={(e) => setField('rate', e.target.value)}
                placeholder={form.type === 'percentage' ? '15' : '0.00'}
                className={`tabular-nums ${errors.rate ? 'border-destructive' : ''}`}
              />
              {errors.rate && (
                <p className="text-xs text-destructive">
                  {Array.isArray(errors.rate) ? errors.rate[0] : errors.rate}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="tax-is-default"
                checked={form.is_default}
                onCheckedChange={(v) => setField('is_default', !!v)}
              />
              <Label htmlFor="tax-is-default" className="font-normal cursor-pointer">
                Set as default tax rate
              </Label>
            </div>

            {isEdit && (
              <div className="flex items-center justify-between rounded-md border p-3">
                <Label htmlFor="tax-is-active" className="font-normal">
                  Active
                </Label>
                <Switch
                  id="tax-is-active"
                  checked={form.is_active}
                  onCheckedChange={(v) => setField('is_active', !!v)}
                />
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : (
                  <Save className="size-4 mr-2" />
                )}
                Save
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
