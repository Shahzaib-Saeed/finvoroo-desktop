import { useEffect, useState, useCallback } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
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
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const EMPTY_FORM = {
  coa2_main_type_id: '',
  name: '',
  number_min: '',
  number_max: '',
};

/**
 * CreateAccountTypeDialog — global reusable component.
 *
 * Props:
 *   trigger      – custom trigger element. Defaults to a "+ New Type" button.
 *   open         – controlled open state (optional).
 *   onOpenChange – controlled open change handler (optional).
 *   onCreated    – callback fired after a successful create (receives the new subtype data).
 */
export function CreateAccountTypeDialog({ trigger, open: openProp, onOpenChange, onCreated }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;
  const setOpen = (val) => {
    if (!isControlled) setInternalOpen(val);
    onOpenChange?.(val);
  };

  const [saving, setSaving] = useState(false);
  const [mainTypes, setMainTypes] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const loadMainTypes = useCallback(async () => {
    try {
      const res = await api.get('/workspace/coa-subtypes');
      setMainTypes(res.data.data?.main_types || []);
    } catch {}
  }, []);

  useEffect(() => {
    if (open) loadMainTypes();
  }, [open, loadMainTypes]);

  const set = (field, val) => {
    setForm((f) => ({ ...f, [field]: val }));
    setErrors((e) => { const n = { ...e }; delete n[field]; return n; });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const payload = {
        coa2_main_type_id: parseInt(form.coa2_main_type_id),
        name: form.name,
      };
      if (form.number_min !== '') payload.number_min = parseInt(form.number_min);
      if (form.number_max !== '') payload.number_max = parseInt(form.number_max);

      const res = await api.post('/workspace/coa-subtypes', payload);
      toast.success('Account type created successfully.');
      setOpen(false);
      setForm(EMPTY_FORM);
      onCreated?.(res.data.data);
    } catch (err) {
      const errs = err?.response?.data?.errors || {};
      setErrors(errs);
      toast.error(err?.response?.data?.message || 'Failed to create account type.');
    } finally {
      setSaving(false);
    }
  };

  const defaultTrigger = (
    <Button size="sm" variant="outline" className="gap-1.5">
      <Plus className="size-4" />
      New Type
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Account Type</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <form id="create-account-type-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Main Category <span className="text-destructive">*</span></Label>
              <Select value={form.coa2_main_type_id} onValueChange={(v) => set('coa2_main_type_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category…" />
                </SelectTrigger>
                <SelectContent>
                  {mainTypes.map((mt) => (
                    <SelectItem key={mt.id} value={String(mt.id)}>
                      {mt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.coa2_main_type_id && (
                <p className="text-xs text-destructive">{errors.coa2_main_type_id[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Type Name <span className="text-destructive">*</span></Label>
              <Input
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. Inventory, Prepaid Expenses…"
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name[0]}</p>
              )}
            </div>
{/* 
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Account # Min</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.number_min}
                  onChange={(e) => set('number_min', e.target.value)}
                  placeholder="e.g. 1000"
                />
                {errors.number_min && (
                  <p className="text-xs text-destructive">{errors.number_min[0]}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Account # Max</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.number_max}
                  onChange={(e) => set('number_max', e.target.value)}
                  placeholder="e.g. 1999"
                />
                {errors.number_max && (
                  <p className="text-xs text-destructive">{errors.number_max[0]}</p>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Account number range is optional — used to suggest valid account numbers for this type.
            </p> */}
          </form>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="create-account-type-form" disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="size-4 animate-spin" />}
            Create Type
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
