import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import { useVendorDialog } from '@/components/workspace/vendor/vendor-dialog-provider';
import { JobOrderPickerSelect } from '@/components/accounting/JobOrderPickerSelect';

const NEW_VENDOR = '__bill_vendor_new__';

export function BillVendorSection({
  form,
  errors,
  vendors,
  warehouses = [],
  canCreateVendor,
  vendorLocked,
  addressUnlocked,
  setAddressUnlocked,
  purchaseOrders,
  onVendorChange,
  onVendorCreated,
  onFieldChange,
  onJobOrderChange,
  onLoadFromPo,
  readOnly,
}) {
  const vendorDialog = useVendorDialog();
  const hasPos = purchaseOrders?.length > 0;
  const disabled = readOnly || vendorLocked;

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-sm">
          Vendor <span className="text-destructive">*</span>
        </Label>
        <SearchableCombobox
          value={form.vendor_id ? String(form.vendor_id) : undefined}
          onValueChange={(v) => {
            if (disabled || v === NEW_VENDOR) return;
            onVendorChange(v);
          }}
          options={vendors.map((v) => ({
            value: String(v.id),
            label: v.name,
            keywords: [v.email, v.currency].filter(Boolean),
          }))}
          placeholder="Select vendor"
          searchPlaceholder="Search vendors…"
          disabled={disabled}
          triggerClassName="h-10"
          actionItems={
            disabled || !canCreateVendor
              ? []
              : [
                  {
                    value: NEW_VENDOR,
                    label: '+ Create vendor…',
                    className: 'text-primary font-medium',
                    onSelect: () => {
                      vendorDialog.openCreate({
                        onSuccess: (vendor) => {
                          if (!vendor?.id) return;
                          onVendorCreated?.(vendor);
                          onVendorChange(String(vendor.id));
                        },
                      });
                    },
                  },
                ]
          }
        />
        {errors.vendor_id && (
          <p className="text-xs text-destructive">{errors.vendor_id}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-sm">Address</Label>
          {!readOnly && (
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-xs"
              onClick={() => setAddressUnlocked((u) => !u)}
            >
              {addressUnlocked ? 'Lock' : 'Change'}
            </Button>
          )}
        </div>
        <Textarea
          rows={2}
          className="text-sm resize-y min-h-[2.5rem]"
          value={form.vendor_address}
          onChange={(e) => onFieldChange('vendor_address', e.target.value)}
          disabled={!addressUnlocked || readOnly}
          placeholder="Vendor address"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm">Vendor bill no.</Label>
        <Input
          className="h-10"
          value={form.reference}
          onChange={(e) => onFieldChange('reference', e.target.value)}
          disabled={readOnly}
          placeholder="Supplier invoice #"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm">Receive stock into</Label>
        <Select
          value={form.warehouse_id || '_none'}
          onValueChange={(v) => onFieldChange('warehouse_id', v === '_none' ? '' : v)}
          disabled={readOnly}
        >
          <SelectTrigger className="h-10 w-full">
            <SelectValue placeholder="Default warehouse" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_none">— Default warehouse —</SelectItem>
            {warehouses.map((w) => (
              <SelectItem key={w.id} value={String(w.id)}>
                {w.name}
                {w.is_default ? ' — main' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <JobOrderPickerSelect
          value={form.job_order_id}
          onValueChange={onJobOrderChange || ((v) => onFieldChange('job_order_id', v))}
          disabled={readOnly}
          label="Job order"
        />
      </div>

      {hasPos && !readOnly ? (
        <Button type="button" variant="outline" size="sm" onClick={onLoadFromPo}>
          Load from purchase order
        </Button>
      ) : null}
    </div>
  );
}
