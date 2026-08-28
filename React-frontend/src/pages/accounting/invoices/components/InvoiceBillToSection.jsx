import { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import { JobOrderPickerSelect } from '@/components/accounting/JobOrderPickerSelect';
import { useOptionalCustomerDialog } from '@/components/workspace/customer/customer-dialog-provider';
import { useParams, useNavigate } from 'react-router';
import { NO_NUMBER_SPINNER } from '../constants';
import { cn } from '@/lib/utils';
import { invoiceFieldLabelClass } from './invoice-form-design';
import { InvoiceCustomerInfoPanel } from './InvoiceCustomerInfoPanel';
import { createInvoiceEnterKeyDownHandler } from './invoice-form-keyboard';

const onEnterNextField = createInvoiceEnterKeyDownHandler();

const NEW_CUSTOMER = '__invoice_customer_new__';

export function InvoiceBillToSection({
  form,
  errors,
  customers,
  postedLocked,
  formLocked: formLockedProp,
  customerContext,
  loadingCustomerContext = false,
  addressUnlocked,
  setAddressUnlocked,
  paymentTermsUnlocked,
  setPaymentTermsUnlocked,
  onCustomerChange,
  onAddressDisplayChange,
  onFieldChange,
  onJobOrderChange,
}) {
  const { id: workspaceId } = useParams();
  const navigate = useNavigate();
  const customerDialog = useOptionalCustomerDialog();
  const formLocked = formLockedProp ?? postedLocked;

  const customerOptions = useMemo(
    () =>
      customers.map((c) => ({
        value: String(c.id),
        label: c.name,
      })),
    [customers],
  );

  const openCreateCustomer = () => {
    if (customerDialog) {
      customerDialog.openCreate({
        onSuccess: (c) => {
          if (c?.id) onCustomerChange(String(c.id), c);
        },
      });
      return;
    }
    navigate(`/workspace/${workspaceId}/accounting/customers/create`);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className={invoiceFieldLabelClass}>
          Customer <span className="text-destructive">*</span>
        </Label>
        <SearchableCombobox
          value={form.customer_id}
          onValueChange={(v) => {
            if (v === NEW_CUSTOMER) return;
            onCustomerChange(v);
          }}
          options={customerOptions}
          placeholder="Select customer"
          searchPlaceholder="Search customers…"
          disabled={formLocked}
          triggerClassName="h-9"
          triggerProps={{
            'data-enter-nav': '1',
            onKeyDown: onEnterNextField,
          }}
          actionItems={
            formLocked
              ? []
              : [
                  {
                    value: NEW_CUSTOMER,
                    label: '+ Create customer…',
                    className: 'text-primary font-medium',
                    onSelect: openCreateCustomer,
                  },
                ]
          }
        />
        {errors.customer_id ? (
          <p className="text-xs text-destructive">{errors.customer_id}</p>
        ) : null}
        {formLocked ? (
          <p className="text-xs text-muted-foreground">This invoice cannot be edited.</p>
        ) : null}
      </div>

      {form.customer_id && (customerContext || loadingCustomerContext) ? (
        <InvoiceCustomerInfoPanel
          customerContext={customerContext}
          form={form}
          loading={loadingCustomerContext}
          trailingAction={
            !formLocked ? (
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-[11px] text-muted-foreground hover:text-primary"
                onClick={() => setPaymentTermsUnlocked(!paymentTermsUnlocked)}
              >
                {paymentTermsUnlocked ? 'Hide terms' : 'Edit payment terms'}
              </Button>
            ) : null
          }
          expandedContent={
            !formLocked && paymentTermsUnlocked ? (
              <PaymentTermsEditor form={form} onFieldChange={onFieldChange} />
            ) : null
          }
        />
      ) : null}

      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <Label className={invoiceFieldLabelClass}>Address</Label>
          {!formLocked ? (
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-xs"
              onClick={() => setAddressUnlocked(!addressUnlocked)}
            >
              {addressUnlocked ? 'Lock' : 'Change'}
            </Button>
          ) : null}
        </div>
        <Textarea
          rows={2}
          className="min-h-[2.25rem] resize-y text-sm"
          value={form.address_display}
          onChange={(e) => onAddressDisplayChange(e.target.value)}
          disabled={formLocked || !addressUnlocked}
          placeholder={form.customer_id ? '' : 'Select a customer to load address'}
          data-enter-nav="1"
          onKeyDown={onEnterNextField}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:items-end">
        <div className="space-y-1 sm:col-span-4">
          <Label className={invoiceFieldLabelClass}>Reference no.</Label>
          <Input
            className="h-9"
            value={form.reference_number}
            onChange={(e) => onFieldChange('reference_number', e.target.value)}
            disabled={formLocked}
            placeholder="PO / ref."
            data-enter-nav="1"
            onKeyDown={onEnterNextField}
          />
        </div>
        <div className="sm:col-span-8">
          <JobOrderPickerSelect
            value={form.job_order_id}
            onValueChange={onJobOrderChange || ((v) => onFieldChange('job_order_id', v))}
            customerId={form.customer_id}
            requireCustomer
            disabled={formLocked}
            label="Job order"
            hint=""
            className="space-y-1 [&_button]:h-9"
          />
        </div>
      </div>
    </div>
  );
}

function PaymentTermsEditor({ form, onFieldChange }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <div>
        <Label className="text-xs">Terms type</Label>
        <SearchableCombobox
          value={form.payment_terms_type}
          onValueChange={(v) => onFieldChange('payment_terms_type', v)}
          options={[
            { value: 'net_days', label: 'Net days' },
            { value: 'prepaid', label: 'Prepaid' },
            { value: 'cod', label: 'C.O.D.' },
            { value: 'end_of_next_month', label: 'Due at end of next month' },
            { value: 'fixed_day_next_month', label: 'Due on fixed day next month' },
          ]}
          placeholder="Select terms"
          searchPlaceholder="Search payment terms…"
          triggerClassName="mt-1 h-8"
        />
      </div>
      {form.payment_terms_type === 'net_days' ? (
        <div>
          <Label className="text-xs">Net days</Label>
          <input
            type="number"
            min={0}
            max={365}
            className={cn(
              'mt-1 flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm tabular-nums',
              NO_NUMBER_SPINNER,
            )}
            value={form.payment_terms_days}
            onChange={(e) => onFieldChange('payment_terms_days', e.target.value)}
          />
        </div>
      ) : null}
      {form.payment_terms_type === 'fixed_day_next_month' ? (
        <div>
          <Label className="text-xs">Fixed due day (1–31)</Label>
          <input
            type="number"
            min={1}
            max={31}
            className={cn(
              'mt-1 flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm tabular-nums',
              NO_NUMBER_SPINNER,
            )}
            value={form.payment_terms_fixed_day}
            onChange={(e) => onFieldChange('payment_terms_fixed_day', e.target.value)}
          />
        </div>
      ) : null}
    </div>
  );
}
