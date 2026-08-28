import { useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { warehousesApi } from '../../api/warehouses.api';
import {
  WAREHOUSE_STATUS_OPTIONS,
  EMPTY_WAREHOUSE_FORM,
  mapWarehouseToForm,
  buildWarehousePayload,
} from '../../constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AccountPickerSelect } from '@/components/accounting/AccountPickerSelect';

function FieldError({ message }) {
  if (!message) return null;
  return <p className="text-sm text-destructive mt-1">{message}</p>;
}

export function WarehouseForm({
  mode = 'create',
  warehouseId,
  initialWarehouse,
  assetAccounts = [],
  onAccountCreated,
  onSuccess,
  onCancel,
}) {
  const isEdit = mode === 'edit';
  const [form, setForm] = useState(() =>
    isEdit ? mapWarehouseToForm(initialWarehouse) : { ...EMPTY_WAREHOUSE_FORM }
  );
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const applyServerErrors = (err) => {
    const serverErrors = err?.response?.data?.errors;
    if (serverErrors && typeof serverErrors === 'object') {
      const next = {};
      Object.entries(serverErrors).forEach(([k, v]) => {
        next[k] = Array.isArray(v) ? v[0] : String(v);
      });
      setErrors(next);
      return;
    }
    toast.error(err?.response?.data?.message || 'Something went wrong');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const payload = buildWarehousePayload(form);
      if (isEdit) {
        const res = await warehousesApi.update(warehouseId, payload);
        toast.success(res.data?.message || 'Warehouse updated');
      } else {
        const res = await warehousesApi.create(payload);
        toast.success(res.data?.message || 'Warehouse created');
      }
      onSuccess?.();
    } catch (err) {
      applyServerErrors(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-1">
          <Label htmlFor="warehouse_name">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="warehouse_name"
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            placeholder="Main warehouse"
            maxLength={100}
            required
          />
          <FieldError message={errors.name} />
        </div>

        <div className="space-y-2 sm:col-span-1">
          <Label htmlFor="warehouse_code">Code</Label>
          <Input
            id="warehouse_code"
            value={form.code}
            onChange={(e) => setField('code', e.target.value)}
            placeholder="WH-01"
            maxLength={50}
          />
          <FieldError message={errors.code} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="warehouse_address">Address</Label>
          <Textarea
            id="warehouse_address"
            rows={2}
            value={form.address}
            onChange={(e) => setField('address', e.target.value)}
            placeholder="Street, city…"
          />
          <FieldError message={errors.address} />
        </div>

        <div className="space-y-2 sm:col-span-1">
          <Label htmlFor="warehouse_location">Location / bin</Label>
          <Input
            id="warehouse_location"
            value={form.location}
            onChange={(e) => setField('location', e.target.value)}
            maxLength={255}
          />
          <FieldError message={errors.location} />
        </div>

        <div className="space-y-2 sm:col-span-1">
          <Label htmlFor="warehouse_phone">Phone</Label>
          <Input
            id="warehouse_phone"
            value={form.phone}
            onChange={(e) => setField('phone', e.target.value)}
            maxLength={50}
          />
          <FieldError message={errors.phone} />
        </div>

        <div className="space-y-2 sm:col-span-1">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => setField('status', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WAREHOUSE_STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={errors.status} />
        </div>

        <div className="space-y-2 sm:col-span-1">
          <Label>Inventory account (asset)</Label>
          <AccountPickerSelect
            value={form.inventory_account_id ? String(form.inventory_account_id) : '__none__'}
            onValueChange={(v) =>
              setField('inventory_account_id', v === '__none__' ? '' : v)
            }
            accounts={assetAccounts}
            allowNone
            noneValue="__none__"
            noneLabel="Not set"
            placeholder="Optional"
            showBalance={false}
            onAccountCreated={onAccountCreated}
            className="w-full"
          />
          <FieldError message={errors.inventory_account_id} />
        </div>

        <div className="flex items-center gap-2 sm:col-span-2">
          <Checkbox
            id="warehouse_default"
            checked={form.is_default}
            onCheckedChange={(v) => setField('is_default', !!v)}
          />
          <Label htmlFor="warehouse_default" className="font-normal cursor-pointer">
            Default warehouse for new stock operations
          </Label>
        </div>
        <FieldError message={errors.is_default} />

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="warehouse_notes">Notes</Label>
          <Textarea
            id="warehouse_notes"
            rows={3}
            value={form.notes}
            onChange={(e) => setField('notes', e.target.value)}
          />
          <FieldError message={errors.notes} />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? (
            <Loader2 className="size-4 mr-2 animate-spin" />
          ) : (
            <Save className="size-4 mr-2" />
          )}
          {isEdit ? 'Update' : 'Save'}
        </Button>
      </div>
    </form>
  );
}
