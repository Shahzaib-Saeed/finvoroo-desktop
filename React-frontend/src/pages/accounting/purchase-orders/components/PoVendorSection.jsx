import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useVendorDialog } from '@/components/workspace/vendor/vendor-dialog-provider';

const NEW_VENDOR = '__po_vendor_new__';

export function PoVendorSection({
  form,
  errors,
  vendors,
  canCreateVendor,
  onVendorChange,
  readOnly,
}) {
  const vendorDialog = useVendorDialog();

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold uppercase text-muted-foreground">Vendor</h3>
      <div className="space-y-1">
        <Label className="text-sm">
          Vendor <span className="text-destructive">*</span>
        </Label>
        <Select
          value={form.vendor_id ? String(form.vendor_id) : undefined}
          onValueChange={(v) => {
            if (v === NEW_VENDOR) {
              vendorDialog.openCreate({
                onSuccess: (vendor) => {
                  if (vendor?.id) onVendorChange(String(vendor.id));
                },
              });
              return;
            }
            onVendorChange(v);
          }}
          disabled={readOnly}
        >
          <SelectTrigger className="h-10">
            <SelectValue placeholder="Select vendor" />
          </SelectTrigger>
          <SelectContent>
            {canCreateVendor && !readOnly && (
              <SelectItem value={NEW_VENDOR} className="text-primary font-medium">
                + New vendor…
              </SelectItem>
            )}
            {vendors.map((v) => (
              <SelectItem key={v.id} value={String(v.id)}>
                {v.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.vendor_id && (
          <p className="text-xs text-destructive">{errors.vendor_id}</p>
        )}
      </div>
    </div>
  );
}
