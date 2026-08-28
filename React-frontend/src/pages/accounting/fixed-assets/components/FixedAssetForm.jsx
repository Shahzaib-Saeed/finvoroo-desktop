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
import {
  ASSET_CATEGORIES,
  DEPRECIATION_METHODS,
  EDITABLE_STATUSES,
  accountLabel,
} from '../constants';

function FieldError({ message }) {
  if (!message) return null;
  return <p className="text-sm text-destructive mt-1">{message}</p>;
}

export function FixedAssetForm({
  form,
  setField,
  errors,
  vendors,
  depositAccounts,
  isEdit,
  loading,
  loadingOptions,
  saving,
  onSubmit,
  onCancel,
}) {
  if (loading || loadingOptions) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="size-6 animate-spin mr-2" />
        Loading…
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Basic info</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>
              Asset name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={form.asset_name}
              onChange={(e) => setField('asset_name', e.target.value)}
              placeholder="Asset name"
            />
            <FieldError message={errors.asset_name} />
          </div>
          <div className="space-y-2">
            <Label>Asset code / tag</Label>
            <Input
              value={form.asset_code}
              onChange={(e) => setField('asset_code', e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-2">
            <Label>
              Category <span className="text-destructive">*</span>
            </Label>
            <Select value={form.category} onValueChange={(v) => setField('category', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSET_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.category} />
          </div>
          <div className="space-y-2">
            <Label>
              Purchase date <span className="text-destructive">*</span>
            </Label>
            <DatePicker
              value={form.purchase_date}
              onChange={(v) => setField('purchase_date', v)}
            />
            <FieldError message={errors.purchase_date} />
          </div>
          <div className="space-y-2">
            <Label>
              Purchase cost <span className="text-destructive">*</span>
            </Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.purchase_cost}
              onChange={(e) => setField('purchase_cost', e.target.value)}
            />
            <FieldError message={errors.purchase_cost} />
          </div>
          <div className="space-y-2">
            <Label>Vendor</Label>
            <Select
              value={form.vendor_id || 'none'}
              onValueChange={(v) => setField('vendor_id', v === 'none' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {vendors.map((v) => (
                  <SelectItem key={v.id} value={String(v.id)}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
            <Input
              value={form.location}
              onChange={(e) => setField('location', e.target.value)}
              placeholder="Location"
            />
          </div>
          <div className="space-y-2">
            <Label>Serial / reg. number</Label>
            <Input
              value={form.serial_number}
              onChange={(e) => setField('serial_number', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Warranty expiry</Label>
            <DatePicker
              value={form.warranty_expiry}
              onChange={(v) => setField('warranty_expiry', v)}
              placeholder="Optional"
            />
          </div>
          {isEdit && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setField('status', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EDITABLE_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2 sm:col-span-2">
            <Label>Notes</Label>
            <Textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
              placeholder="Optional notes"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4 border-t pt-6">
        <h3 className="text-sm font-semibold text-foreground">Depreciation</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>
              Useful life (years) <span className="text-destructive">*</span>
            </Label>
            <Input
              type="number"
              min="1"
              max="100"
              value={form.useful_life_years}
              onChange={(e) => setField('useful_life_years', e.target.value)}
            />
            <FieldError message={errors.useful_life_years} />
          </div>
          <div className="space-y-2">
            <Label>Salvage value</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.salvage_value}
              onChange={(e) => setField('salvage_value', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Method</Label>
            <Select
              value={form.depreciation_method}
              onValueChange={(v) => setField('depreciation_method', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEPRECIATION_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {!isEdit && (
        <section className="space-y-4 border-t pt-6">
          <h3 className="text-sm font-semibold text-foreground">Accounting</h3>
          <div className="grid gap-4 sm:grid-cols-2 max-w-lg">
            <div className="space-y-2 sm:col-span-2">
              <Label>
                Payment from (bank/cash) <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.payment_account_id || ''}
                onValueChange={(v) => setField('payment_account_id', v)}
              >
                <SelectTrigger className={errors.payment_account_id ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select payment account" />
                </SelectTrigger>
                <SelectContent>
                  {depositAccounts.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {accountLabel(a)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Used for purchase journal: credit bank/cash.
              </p>
              <FieldError message={errors.payment_account_id} />
            </div>
          </div>
        </section>
      )}

      <div className="flex flex-wrap gap-2 border-t pt-6">
        <Button type="submit" disabled={saving}>
          {saving ? (
            <Loader2 className="size-4 mr-2 animate-spin" />
          ) : (
            <Save className="size-4 mr-2" />
          )}
          {isEdit ? 'Save changes' : 'Save & post purchase'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
