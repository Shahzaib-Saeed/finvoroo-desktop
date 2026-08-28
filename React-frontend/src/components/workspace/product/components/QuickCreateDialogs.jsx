import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { productsApi } from '../api/products.api';

const DEFAULT_UNITS = [
  { value: 'pcs', label: 'Pieces' },
  { value: 'kg', label: 'Kg' },
  { value: 'ltr', label: 'Liter' },
  { value: 'm', label: 'Meter' },
];

function unwrapData(res) {
  return res?.data?.data ?? res?.data ?? res;
}

export function QuickCategoryDialog({ open, onOpenChange, onCreated, record }) {
  const isEdit = !!record?.id;
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(record?.name || '');
      setCode(record?.code || '');
    }
  }, [open, record]);

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!name.trim()) return toast.error('Name is required');
    setSaving(true);
    try {
      const res = isEdit
        ? await productsApi.updateCategory(record.id, { name: name.trim(), code: code.trim() || null })
        : await productsApi.createCategory({ name: name.trim(), code: code.trim() || null });
      toast.success(isEdit ? 'Category updated' : 'Category created');
      await onCreated?.(unwrapData(res));
      if (!isEdit) {
        setName('');
        setCode('');
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} category`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit category' : 'New category'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1">
            <Label>Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <DialogFooter className="pt-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : isEdit ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function QuickBrandDialog({ open, onOpenChange, onCreated, record }) {
  const isEdit = !!record?.id;
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setName(record?.name || '');
  }, [open, record]);

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!name.trim()) return toast.error('Name is required');
    setSaving(true);
    try {
      const res = isEdit
        ? await productsApi.updateBrand(record.id, { name: name.trim() })
        : await productsApi.createBrand({ name: name.trim() });
      toast.success(isEdit ? 'Brand updated' : 'Brand created');
      await onCreated?.(unwrapData(res));
      if (!isEdit) setName('');
      onOpenChange(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} brand`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit brand' : 'New brand'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <DialogFooter className="pt-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : isEdit ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function QuickUnitDialog({
  open,
  onOpenChange,
  onCreated,
  record,
  /** Prefill catalog base when creating from a product's Additional Units panel. */
  defaultBaseUnit = '',
  /** Optional richer unit list (builtin + company). Falls back to DEFAULT_UNITS. */
  unitOptions,
}) {
  const isEdit = !!record?.id;
  const [name, setName] = useState('');
  const [baseUnit, setBaseUnit] = useState('');
  const [factor, setFactor] = useState('');
  const [saving, setSaving] = useState(false);

  const baseOptions = Array.isArray(unitOptions) && unitOptions.length > 0
    ? unitOptions.map((u) => ({
        value: String(u.value ?? u.id ?? ''),
        label: u.label || u.name || String(u.value ?? ''),
      })).filter((u) => u.value && !String(u.value).startsWith('u:'))
    : DEFAULT_UNITS;

  useEffect(() => {
    if (open) {
      setName(record?.name || record?.label || '');
      // API only accepts builtin base keys (pcs/kg/…), never company keys like u:12.
      const preferred = record?.base_unit_key || defaultBaseUnit || '';
      setBaseUnit(preferred && !String(preferred).startsWith('u:') ? preferred : '');
      setFactor(record?.factor_to_base != null ? String(record.factor_to_base) : '');
    }
  }, [open, record, defaultBaseUnit]);

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!name.trim()) return toast.error('Name is required');
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        base_unit_key: baseUnit || null,
        factor_to_base: factor === '' ? null : Number(factor),
      };
      const res = isEdit
        ? await productsApi.updateUnit(record.id, payload)
        : await productsApi.createUnit(payload);
      toast.success(isEdit ? 'Unit updated' : 'Unit created');
      await onCreated?.(unwrapData(res));
      if (!isEdit) {
        setName('');
        setBaseUnit(defaultBaseUnit || '');
        setFactor('');
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} unit`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit unit' : 'Create new unit'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Carton" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Relates to base unit</Label>
              <Select value={baseUnit || '_none'} onValueChange={(v) => setBaseUnit(v === '_none' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="No conversion" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">No conversion</SelectItem>
                  {baseOptions.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Default factor</Label>
              <Input
                type="number"
                min={0}
                step="any"
                value={factor}
                onChange={(e) => setFactor(e.target.value)}
                placeholder="e.g. 12"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Default factor is a company-wide hint. On each product you can still set a
            product-specific conversion (e.g. 1 Box = 24 PCS for this item).
          </p>
          <DialogFooter className="pt-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : isEdit ? 'Save' : 'Create unit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
