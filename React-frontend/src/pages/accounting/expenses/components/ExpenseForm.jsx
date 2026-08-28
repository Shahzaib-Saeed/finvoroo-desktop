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
import { useParams } from 'react-router';
import { JobOrderPickerSelect } from '@/components/accounting/JobOrderPickerSelect';
import { MetadataCustomFields } from '@/components/accounting/MetadataCustomFields';
import { SourceDocumentBanner } from '@/components/accounting/SourceDocumentBanner';
import { accountLabel } from '../constants';

function FieldError({ message }) {
  if (!message) return null;
  return <p className="text-sm text-destructive mt-1">{message}</p>;
}

export function ExpenseForm({
  form,
  setField,
  errors,
  vendors,
  expenseAccounts,
  paymentAccounts,
  currencies,
  multiCurrency,
  loadingOptions,
  saving,
  isEdit,
  onSubmit,
  onCancel,
  customFieldDefinitions = [],
  setMetadataField,
  jobSource,
}) {
  const { id: workspaceId } = useParams();
  if (loadingOptions) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="size-6 animate-spin mr-2" />
        Loading…
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {jobSource ? (
        <SourceDocumentBanner
          source={jobSource}
          workspaceId={workspaceId}
          accent="primary"
          targetDocument="expense"
        />
      ) : null}
      {customFieldDefinitions.length > 0 ? (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Custom fields</Label>
          <MetadataCustomFields
            definitions={customFieldDefinitions}
            values={form.expense_metadata_custom_fields || {}}
            onChange={setMetadataField}
            errors={errors}
            errorsPrefix="expense_metadata_custom_fields"
          />
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <JobOrderPickerSelect
            value={form.job_order_id || ''}
            onValueChange={(v) => setField('job_order_id', v === 'none' ? '' : v)}
            hint="Costs tagged here roll up into the job financial summary."
          />
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
          <Label>
            Expense account <span className="text-destructive">*</span>
          </Label>
          <Select
            value={form.expense_account_id || ''}
            onValueChange={(v) => setField('expense_account_id', v)}
          >
            <SelectTrigger className={errors.expense_account_id ? 'border-destructive' : ''}>
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {expenseAccounts.map((a) => (
                <SelectItem key={a.id} value={String(a.id)}>
                  {accountLabel(a)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={errors.expense_account_id} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>
            Payment from (cash/bank) <span className="text-destructive">*</span>
          </Label>
          <Select
            value={form.payment_account_id || ''}
            onValueChange={(v) => setField('payment_account_id', v)}
          >
            <SelectTrigger className={errors.payment_account_id ? 'border-destructive' : ''}>
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {paymentAccounts.map((a) => (
                <SelectItem key={a.id} value={String(a.id)}>
                  {accountLabel(a)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={errors.payment_account_id} />
        </div>
        <div className="space-y-2">
          <Label>
            Amount <span className="text-destructive">*</span>
          </Label>
          <Input
            type="number"
            step="0.01"
            min="0.01"
            value={form.amount}
            onChange={(e) => setField('amount', e.target.value)}
          />
          <FieldError message={errors.amount} />
        </div>
        <div className="space-y-2">
          <Label>Currency</Label>
          {multiCurrency ? (
            <Select value={form.currency} onValueChange={(v) => setField('currency', v)}>
              <SelectTrigger>
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
          ) : (
            <Input value={form.currency} readOnly className="bg-muted" />
          )}
        </div>
        <div className="space-y-2">
          <Label>
            Date <span className="text-destructive">*</span>
          </Label>
          <DatePicker value={form.expense_date} onChange={(v) => setField('expense_date', v)} />
          <FieldError message={errors.expense_date} />
        </div>
        <div className="space-y-2">
          <Label>Reference</Label>
          <Input
            value={form.reference}
            onChange={(e) => setField('reference', e.target.value)}
            placeholder="Optional"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Description</Label>
          <Textarea
            rows={3}
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
            placeholder="Optional"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Receipt (optional)</Label>
          <Input
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={(e) => setField('receipt', e.target.files?.[0] || null)}
          />
          <p className="text-xs text-muted-foreground">JPEG, PNG, or PDF up to 5 MB</p>
          {isEdit && form.existing_receipt_url && !form.receipt && (
            <p className="text-xs text-muted-foreground">
              Current receipt:{' '}
              <a
                href={form.existing_receipt_url}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                View
              </a>
              . Upload a new file to replace it.
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 border-t pt-4">
        <Button type="submit" disabled={saving}>
          {saving ? (
            <Loader2 className="size-4 mr-2 animate-spin" />
          ) : (
            <Save className="size-4 mr-2" />
          )}
          {isEdit ? 'Save changes' : 'Save expense'}
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
