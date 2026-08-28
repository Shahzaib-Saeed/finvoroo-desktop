import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { useCustomerDialog } from '@/components/workspace/customer/customer-dialog-provider';

const NEW_CUSTOMER = '__cn_customer_new__';

export function CreditNoteDetailsSection({
  form, errors, customers, invoices, loadingInvoices, canCreateCustomer,
  onCustomerChange, onFieldChange, readOnly, financialLocked, showLines,
}) {
  const customerDialog = useCustomerDialog();
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-sm">Credit note date <span className="text-destructive">*</span></Label>
        <DatePicker value={form.credit_note_date} onChange={(v) => onFieldChange('credit_note_date', v)} allowClear={false} disabled={readOnly || financialLocked} />
        {errors.credit_note_date && <p className="text-xs text-destructive">{errors.credit_note_date}</p>}
      </div>
      <div className="space-y-1">
        <Label className="text-sm">Customer <span className="text-destructive">*</span></Label>
        <Select
          value={form.customer_id ? String(form.customer_id) : undefined}
          onValueChange={(v) => {
            if (v === NEW_CUSTOMER) {
              customerDialog.openCreate({ onSuccess: (c) => { if (c?.id) onCustomerChange(String(c.id), c); } });
              return;
            }
            onCustomerChange(v);
          }}
          disabled={readOnly || financialLocked}
        >
          <SelectTrigger className="h-10"><SelectValue placeholder="Select customer" /></SelectTrigger>
          <SelectContent>
            {canCreateCustomer && !readOnly && <SelectItem value={NEW_CUSTOMER} className="text-primary font-medium">+ Create customer…</SelectItem>}
            {customers.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {errors.customer_id && <p className="text-xs text-destructive">{errors.customer_id}</p>}
      </div>
      <div className="space-y-1">
        <Label className="text-sm">Link to invoice</Label>
        <Select value={form.invoice_id || '_none'} onValueChange={(v) => onFieldChange('invoice_id', v === '_none' ? '' : v)} disabled={!form.customer_id || readOnly || financialLocked || loadingInvoices}>
          <SelectTrigger className="h-10"><SelectValue placeholder={loadingInvoices ? 'Loading…' : 'Optional'} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_none">None — optional</SelectItem>
            {invoices.map((inv) => (
              <SelectItem key={inv.id} value={String(inv.id)}>{inv.invoice_number} (due {inv.balance_due})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-sm">Amount</Label>
          <Input type="number" step="0.01" min="0" className="h-10 tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" value={form.amount} onChange={(e) => onFieldChange('amount', e.target.value)} placeholder="0.00" disabled={readOnly || financialLocked || showLines} />
          <p className="text-xs text-muted-foreground">
            Enter an amount for a discount or adjustment. If you linked an invoice, use Returned items
            from invoice (under Credit total) to credit specific lines.
          </p>
        </div>
        <div className="space-y-1">
          <Label className="text-sm">Reason / notes</Label>
          <Input value={form.reason} onChange={(e) => onFieldChange('reason', e.target.value)} placeholder="e.g. Return" disabled={readOnly} />
        </div>
      </div>
    </div>
  );
}
