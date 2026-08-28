import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCustomerDialog } from '@/components/workspace/customer/customer-dialog-provider';

const NEW_CUSTOMER = '__quotation_customer_new__';

export function QuotationBillToSection({
  form,
  errors,
  customers,
  canCreateCustomer,
  addressUnlocked,
  setAddressUnlocked,
  onCustomerChange,
  onAddressDisplayChange,
}) {
  const customerDialog = useCustomerDialog();

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wide text-foreground">Customer</h3>

      <div className="space-y-1.5">
        <Label className="text-sm">
          Customer <span className="text-destructive">*</span>
        </Label>
        <Select
          value={form.customer_id ? String(form.customer_id) : undefined}
          onValueChange={(v) => {
            if (v === NEW_CUSTOMER) {
              customerDialog.openCreate({
                onSuccess: (c) => {
                  if (c?.id) onCustomerChange(String(c.id), c);
                },
              });
              return;
            }
            onCustomerChange(v);
          }}
        >
          <SelectTrigger className="h-10">
            <SelectValue placeholder="Select customer" />
          </SelectTrigger>
          <SelectContent>
            {canCreateCustomer && (
              <SelectItem value={NEW_CUSTOMER} className="text-primary font-medium">
                + Create customer…
              </SelectItem>
            )}
            {customers.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.customer_id && (
          <p className="text-xs text-destructive">{errors.customer_id}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Label className="text-sm mb-0">Address</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setAddressUnlocked((u) => !u)}
          >
            <Pencil className="size-3 mr-1" />
            {addressUnlocked ? 'Done' : 'Change'}
          </Button>
        </div>
        <Textarea
          rows={5}
          className="text-sm resize-y"
          value={form.address_display}
          onChange={(e) => onAddressDisplayChange(e.target.value)}
          disabled={!addressUnlocked}
          placeholder="Select a customer to load address"
        />
      </div>
    </div>
  );
}
