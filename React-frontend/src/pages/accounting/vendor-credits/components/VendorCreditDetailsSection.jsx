import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { useVendorDialog } from '@/components/workspace/vendor/vendor-dialog-provider';
import { formatCurrency } from '../constants';

const NEW_VENDOR = '__vc_vendor_new__';

export function VendorCreditDetailsSection({
  form,
  errors,
  vendors,
  billsForVendor,
  multiCurrency,
  currencies,
  baseCurrency,
  canCreateVendor,
  onVendorChange,
  onBillChange,
  onFieldChange,
  readOnly,
  showLines,
}) {
  const vendorDialog = useVendorDialog();
  const currency = form.currency || baseCurrency;

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-sm">
          Credit date <span className="text-destructive">*</span>
        </Label>
        <DatePicker
          value={form.credit_date}
          onChange={(v) => onFieldChange('credit_date', v)}
          allowClear={false}
          disabled={readOnly}
        />
        {errors.credit_date && (
          <p className="text-xs text-destructive">{errors.credit_date}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label className="text-sm">
          Vendor <span className="text-destructive">*</span>
        </Label>
        <Select
          value={form.vendor_id ? String(form.vendor_id) : undefined}
          onValueChange={(v) => {
            if (v === NEW_VENDOR) {
              vendorDialog.openCreate({
                onSuccess: (created) => {
                  if (created?.id) onVendorChange(String(created.id));
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
                + Create vendor…
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

      <div className="space-y-1">
        <Label className="text-sm">Link to bill</Label>
        <Select
          value={form.bill_id || '_none'}
          onValueChange={(v) => onBillChange(v === '_none' ? '' : v)}
          disabled={readOnly || !form.vendor_id}
        >
          <SelectTrigger className="h-10">
            <SelectValue placeholder="Optional" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_none">None — optional</SelectItem>
            {billsForVendor.map((b) => (
              <SelectItem key={b.id} value={String(b.id)}>
                {b.bill_number}
                {b.total != null ? ` (due ${formatCurrency(b.total, b.currency || currency)})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {multiCurrency && (
        <div className="space-y-1">
          <Label className="text-sm">
            Currency <span className="text-destructive">*</span>
          </Label>
          <Select
            value={form.currency}
            onValueChange={(v) => onFieldChange('currency', v)}
            disabled={readOnly}
          >
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.currency && (
            <p className="text-xs text-destructive">{errors.currency}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-sm">Amount</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            className="h-10 tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            value={form.amount}
            onChange={(e) => onFieldChange('amount', e.target.value)}
            placeholder="0.00"
            disabled={readOnly || showLines}
          />
          {errors.amount && (
            <p className="text-xs text-destructive">{errors.amount}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Enter an amount for a discount or adjustment. If you linked a bill, use Returned items
            from bill (under Debit total) to credit specific lines.
          </p>
        </div>
        <div className="space-y-1">
          <Label className="text-sm">Reason / notes</Label>
          <Input
            className="h-10"
            value={form.reason}
            onChange={(e) => onFieldChange('reason', e.target.value)}
            placeholder="e.g. Return of defective goods"
            disabled={readOnly}
          />
        </div>
      </div>

      {!multiCurrency && (
        <p className="text-xs text-muted-foreground">
          Currency: {form.currency || baseCurrency}
        </p>
      )}
    </div>
  );
}
