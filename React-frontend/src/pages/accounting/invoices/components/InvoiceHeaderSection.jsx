import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function Field({ label, required, error, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function InvoiceHeaderSection({
  form,
  errors,
  customers,
  postedLocked,
  onFieldChange,
  onCustomerChange,
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Bill to
        </h3>
        <Field label="Customer" required error={errors.customer_id}>
          <Select
            value={form.customer_id ? String(form.customer_id) : undefined}
            onValueChange={onCustomerChange}
            disabled={postedLocked}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select customer" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Invoice details
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Invoice date" required error={errors.invoice_date}>
            <DatePicker
              value={form.invoice_date}
              onChange={(v) => onFieldChange('invoice_date', v)}
              disabled={postedLocked}
              placeholder="Invoice date"
              allowClear={false}
            />
          </Field>
          <Field label="Due date" required error={errors.due_date}>
            <DatePicker
              value={form.due_date}
              onChange={(v) => onFieldChange('due_date', v)}
              placeholder="Due date"
              allowClear={false}
            />
          </Field>
          <Field label="Reference" error={errors.reference_number}>
            <Input
              value={form.reference_number}
              onChange={(e) => onFieldChange('reference_number', e.target.value)}
              placeholder="PO / ref #"
            />
          </Field>
          <Field label="Currency" error={errors.currency}>
            <Input
              value={form.currency}
              onChange={(e) => onFieldChange('currency', e.target.value)}
              placeholder="USD"
              className="font-mono uppercase"
            />
          </Field>
        </div>
        <Field label="Payment & banking details" error={errors.notes}>
          <Textarea
            rows={5}
            value={form.notes}
            onChange={(e) => onFieldChange('notes', e.target.value)}
            placeholder={`Optional extras for this invoice only. Company-wide bank/legal text is set once in Settings → Profile → Document footer.\nExample for this invoice:\nSpecial delivery terms for this shipment…`}
          />
        </Field>
      </div>
    </div>
  );
}
