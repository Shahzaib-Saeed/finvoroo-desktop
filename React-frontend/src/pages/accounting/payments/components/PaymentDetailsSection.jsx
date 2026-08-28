import { useMemo } from 'react';
import { BookOpenText } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import { DatePicker } from '@/components/ui/date-picker';
import { useCustomerDialog } from '@/components/workspace/customer/customer-dialog-provider';
import { AccountPickerSelect } from '@/components/accounting/AccountPickerSelect';
import { JobOrderPickerSelect } from '@/components/accounting/JobOrderPickerSelect';

export function PaymentDetailsSection({
  form,
  errors,
  customers,
  depositAccounts,
  groupedAccounts = [],
  paymentMethods,
  baseCurrency = 'USD',
  canCreateCustomer,
  canCreateCoa,
  onAccountCreated,
  onCustomerChange,
  onFieldChange,
  onViewLedger,
  readOnly,
}) {
  const customerDialog = useCustomerDialog();

  const customerOptions = useMemo(
    () =>
      (customers || []).map((c) => ({
        value: String(c.id),
        label: c.name || `Customer #${c.id}`,
        keywords: [c.name, c.email, c.phone, c.code, c.customer_code].filter(Boolean),
      })),
    [customers],
  );

  const paymentMethodOptions = useMemo(
    () =>
      (paymentMethods || []).map((m) => ({
        value: String(m.value),
        label: m.label,
        keywords: [m.label, m.value].filter(Boolean),
      })),
    [paymentMethods],
  );

  const createCustomerActions = useMemo(() => {
    if (!canCreateCustomer || readOnly) return [];
    return [
      {
        value: '__create_customer__',
        label: '+ Create customer…',
        keywords: ['new', 'create', 'add', 'customer'],
        className: 'text-primary font-medium',
        onSelect: () => {
          customerDialog.openCreate({
            onSuccess: (c) => {
              if (c?.id) onCustomerChange(String(c.id), c);
            },
          });
        },
      },
    ];
  }, [canCreateCustomer, readOnly, customerDialog, onCustomerChange]);

  return (
    <div className="rounded-lg border bg-card min-w-0 w-full">
      <div className="border-b px-4 py-2.5 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Payment details
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Pick the customer — then tick invoices below. Amount fills itself.
          </p>
        </div>
        {form.customer_id && onViewLedger ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 shrink-0 px-2.5 text-[11px]"
            onClick={onViewLedger}
          >
            <BookOpenText className="size-3.5 mr-1" />
            View ledger
          </Button>
        ) : null}
      </div>

      <div className="p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <div className="space-y-1.5 min-w-0 sm:col-span-2 xl:col-span-1">
            <Label className="text-sm">
              Customer <span className="text-destructive">*</span>
            </Label>
            <SearchableCombobox
              value={form.customer_id ? String(form.customer_id) : ''}
              onValueChange={(v) => onCustomerChange(v)}
              options={customerOptions}
              placeholder="Select customer"
              searchPlaceholder="Search customers…"
              emptyText="No customers found."
              disabled={readOnly}
              triggerClassName="h-10 w-full"
              actionItems={createCustomerActions}
            />
            {errors.customer_id && (
              <p className="text-xs text-destructive">{errors.customer_id}</p>
            )}
          </div>

          <div className="space-y-1.5 min-w-0">
            <Label className="text-sm">Reference number</Label>
            <Input
              className="h-10"
              value={form.reference}
              onChange={(e) => onFieldChange('reference', e.target.value)}
              placeholder="Optional"
              disabled={readOnly}
            />
          </div>

          <div className="space-y-1.5 min-w-0">
            <Label className="text-sm">Payment method</Label>
            <SearchableCombobox
              value={form.payment_method || 'cash'}
              onValueChange={(v) => onFieldChange('payment_method', v || 'cash')}
              options={paymentMethodOptions}
              placeholder="Select method"
              searchPlaceholder="Search payment methods…"
              emptyText="No payment methods found."
              disabled={readOnly}
              triggerClassName="h-10 w-full"
            />
          </div>

          <div className="space-y-1.5 min-w-0">
            <Label className="text-sm">
              Payment date <span className="text-destructive">*</span>
            </Label>
            <DatePicker
              value={form.payment_date}
              onChange={(v) => onFieldChange('payment_date', v)}
              placeholder="Pick date"
              allowClear={false}
              disabled={readOnly}
            />
            {errors.payment_date && (
              <p className="text-xs text-destructive">{errors.payment_date}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5 min-w-0">
            <Label className="text-sm">
              Amount received <span className="text-destructive">*</span>
            </Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              className="h-10 tabular-nums font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              value={form.amount}
              onChange={(e) => onFieldChange('amount', e.target.value)}
              placeholder="Auto from invoices"
              disabled={readOnly}
            />
            {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
          </div>

          <div className="space-y-1.5 min-w-0">
            <Label className="text-sm">Deposit to account</Label>
            <AccountPickerSelect
              value={form.deposit_account_id || '_none'}
              onValueChange={(v) =>
                onFieldChange('deposit_account_id', v === '_none' ? '' : v)
              }
              accounts={depositAccounts}
              groupedAccounts={groupedAccounts}
              allowNone
              noneValue="_none"
              noneLabel="Undeposited / default"
              placeholder="Select bank or undeposited funds account"
              currency={baseCurrency}
              canCreate={canCreateCoa}
              onAccountCreated={onAccountCreated}
              disabled={readOnly}
              className="h-10 w-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <JobOrderPickerSelect
            value={form.job_order_id}
            onValueChange={(v) => onFieldChange('job_order_id', v)}
            disabled={readOnly}
            label="Job order (profitability)"
          />
          <div className="space-y-1.5 min-w-0">
            <Label className="text-sm">Memo / internal notes</Label>
            <Input
              className="h-10"
              value={form.memo}
              onChange={(e) => onFieldChange('memo', e.target.value)}
              placeholder="Optional note for audit trail"
              disabled={readOnly}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
