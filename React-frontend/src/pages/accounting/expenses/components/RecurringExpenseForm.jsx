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
import { accountLabel, FREQUENCIES } from '../constants';

function FieldError({ message }) {
  if (!message) return null;
  return <p className="text-sm text-destructive mt-1">{message}</p>;
}

export function RecurringExpenseForm({
  form,
  setField,
  errors,
  expenseAccounts,
  paymentAccounts,
  isEdit,
  loading,
  loadingOptions,
  saving,
  onSubmit,
  onCancel,
}) {
  if (loading || loadingOptions) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="size-6 animate-spin mr-2" />
        Loading…
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label>
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            maxLength={100}
            required
          />
          <FieldError message={errors.name} />
        </div>
        <div className="space-y-2">
          <Label>
            Expense account <span className="text-destructive">*</span>
          </Label>
          <Select
            value={form.expense_account_id || ''}
            onValueChange={(v) => setField('expense_account_id', v)}
          >
            <SelectTrigger>
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
        <div className="space-y-2">
          <Label>
            Payment from <span className="text-destructive">*</span>
          </Label>
          <Select
            value={form.payment_account_id || ''}
            onValueChange={(v) => setField('payment_account_id', v)}
          >
            <SelectTrigger>
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
          <Label>
            Frequency <span className="text-destructive">*</span>
          </Label>
          <Select value={form.frequency} onValueChange={(v) => setField('frequency', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FREQUENCIES.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>
            Start date <span className="text-destructive">*</span>
          </Label>
          <DatePicker value={form.start_date} onChange={(v) => setField('start_date', v)} />
          <FieldError message={errors.start_date} />
        </div>
        <div className="space-y-2">
          <Label>End date</Label>
          <DatePicker
            value={form.end_date}
            onChange={(v) => setField('end_date', v)}
            placeholder="Optional"
          />
        </div>
        {isEdit && (
          <>
            <div className="space-y-2">
              <Label>
                Next run date <span className="text-destructive">*</span>
              </Label>
              <DatePicker
                value={form.next_run_date}
                onChange={(v) => setField('next_run_date', v)}
              />
              <FieldError message={errors.next_run_date} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.is_active ? '1' : '0'}
                onValueChange={(v) => setField('is_active', v === '1')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Active</SelectItem>
                  <SelectItem value="0">Paused</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}
        <div className="space-y-2 sm:col-span-2">
          <Label>Description</Label>
          <Textarea
            rows={3}
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2 border-t pt-4">
        <Button type="submit" disabled={saving}>
          {saving ? (
            <Loader2 className="size-4 mr-2 animate-spin" />
          ) : (
            <Save className="size-4 mr-2" />
          )}
          {isEdit ? 'Update' : 'Create'}
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
