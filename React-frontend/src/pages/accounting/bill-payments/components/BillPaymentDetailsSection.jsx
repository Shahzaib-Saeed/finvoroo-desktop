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
import { AccountPickerSelect } from '@/components/accounting/AccountPickerSelect';
import { JobOrderPickerSelect } from '@/components/accounting/JobOrderPickerSelect';
import { cn } from '@/lib/utils';

const NEW_VENDOR = '__bill_payment_vendor_new__';

export function BillPaymentDetailsSection({
  form,
  errors,
  vendors,
  depositAccounts,
  groupedAccounts = [],
  paymentMethods,
  multiCurrency,
  currencies,
  baseCurrency = 'USD',
  canCreateCoa,
  onAccountCreated,
  onVendorChange,
  onFieldChange,
}) {
  const vendorDialog = useVendorDialog();

  return (
    <div className="space-y-3 min-w-0 w-full">
      <h3 className="text-xs font-bold uppercase tracking-wide text-foreground">
        Vendor & payment details
      </h3>

      <div className="space-y-1.5">
        <Label className="text-sm">
          Vendor <span className="text-destructive">*</span>
        </Label>
        <Select
          value={form.vendor_id ? String(form.vendor_id) : undefined}
          onValueChange={(v) => {
            if (v === NEW_VENDOR) {
              vendorDialog.openCreate({
                onSuccess: (created) => {
                  if (created?.id) onVendorChange(String(created.id), created);
                },
              });
              return;
            }
            onVendorChange(v);
          }}
        >
          <SelectTrigger className={cn(errors.vendor_id && 'border-destructive', 'h-10')}>
            <SelectValue placeholder="Select vendor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NEW_VENDOR} className="text-primary font-medium">
              + Create vendor…
            </SelectItem>
            {vendors.map((v) => (
              <SelectItem key={v.id} value={String(v.id)}>
                {v.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.vendor_id ? (
          <p className="text-xs text-destructive">{errors.vendor_id}</p>
        ) : null}
      </div>

      <div
        className={
          multiCurrency
            ? 'grid grid-cols-1 sm:grid-cols-2 gap-3'
            : 'grid grid-cols-1 gap-3'
        }
      >
        <div className="space-y-1">
          <Label className="text-sm">
            Payment date <span className="text-destructive">*</span>
          </Label>
          <DatePicker
            value={form.payment_date}
            onChange={(v) => onFieldChange('payment_date', v)}
            placeholder="Pick date"
            allowClear={false}
          />
          {errors.payment_date ? (
            <p className="text-xs text-destructive">{errors.payment_date}</p>
          ) : null}
        </div>
        {multiCurrency ? (
          <div className="space-y-1">
            <Label className="text-sm">Currency</Label>
            <Select
              value={form.currency || 'USD'}
              onValueChange={(v) => onFieldChange('currency', v)}
            >
              <SelectTrigger className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(currencies || ['USD']).map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-3 space-y-1.5">
        <Label className="text-sm font-medium">
          Amount paid <span className="text-destructive">*</span>
        </Label>
        <p className="text-[11px] text-muted-foreground leading-snug">
          Updates automatically when you check bills below (adds each open balance). Uncheck to
          remove; uncheck all to clear. You can still edit this total or use{' '}
          <strong className="font-medium text-foreground">Auto-apply cash</strong> to split an
          amount across selected rows.
        </p>
        <Input
          type="number"
          step="0.01"
          min="0"
          className="h-10 tabular-nums font-medium bg-background [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          value={form.amount}
          onChange={(e) => onFieldChange('amount', e.target.value)}
          placeholder="e.g. 1500.00"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Payment method</Label>
          <Select
            value={form.payment_method || 'cash'}
            onValueChange={(v) => onFieldChange('payment_method', v)}
          >
            <SelectTrigger className="h-10 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {paymentMethods.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Reference</Label>
          <Input
            className="h-10"
            value={form.reference}
            onChange={(e) => onFieldChange('reference', e.target.value)}
            placeholder="Optional"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm">Pay from</Label>
        <AccountPickerSelect
          value={form.payment_account_id || '_none'}
          onValueChange={(v) => onFieldChange('payment_account_id', v === '_none' ? '' : v)}
          accounts={depositAccounts}
          groupedAccounts={groupedAccounts}
          allowNone
          noneValue="_none"
          noneLabel="Select account"
          placeholder="Required if cash &gt; 0"
          currency={baseCurrency}
          canCreate={canCreateCoa}
          onAccountCreated={onAccountCreated}
          className={cn('h-10 w-full', errors.payment_account_id && 'border-destructive')}
        />
        {errors.payment_account_id ? (
          <p className="text-xs text-destructive">{errors.payment_account_id}</p>
        ) : null}
      </div>

      <JobOrderPickerSelect
        value={form.job_order_id}
        onValueChange={(v) => onFieldChange('job_order_id', v)}
        label="Job order (profitability)"
      />

      <div className="space-y-1">
        <Label className="text-xs">Memo</Label>
        <Input
          value={form.memo}
          onChange={(e) => onFieldChange('memo', e.target.value)}
          placeholder="Optional note"
        />
      </div>
    </div>
  );
}
