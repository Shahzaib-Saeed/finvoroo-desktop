import { useState } from 'react';
import {
  Banknote,
  ChevronDown,
  Loader2,
  Paperclip,
  Pill,
  Save,
  Scale,
  Store,
  Tag,
  X,
} from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { accountLabel } from '@/pages/accounting/expenses/constants';

function FieldError({ message }) {
  if (!message) return null;
  return <p className="mt-1 text-[11px] text-destructive">{message}</p>;
}

function FormField({ label, hint, required, error, children, className }) {
  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <Label className="text-xs font-medium text-slate-700">
          {label}
          {required ? <span className="ms-0.5 text-destructive">*</span> : null}
        </Label>
        {hint ? <span className="text-[10px] text-muted-foreground">{hint}</span> : null}
      </div>
      {children}
      <FieldError message={error} />
    </div>
  );
}

function categoryIcon(name) {
  const n = String(name || '').toLowerCase();
  if (n.includes('medicine') || n.includes('pharma') || n.includes('drug')) return Pill;
  if (n.includes('general') || n.includes('store') || n.includes('grocery')) return Store;
  return Tag;
}

function categoryAccent(name, active) {
  const n = String(name || '').toLowerCase();
  if (n.includes('medicine') || n.includes('pharma')) {
    return active
      ? 'border-violet-300 bg-violet-50 text-violet-950 ring-1 ring-violet-400'
      : 'border-slate-200 bg-white hover:border-violet-200';
  }
  if (n.includes('general') || n.includes('store')) {
    return active
      ? 'border-amber-300 bg-amber-50 text-amber-950 ring-1 ring-amber-400'
      : 'border-slate-200 bg-white hover:border-amber-200';
  }
  return active
    ? 'border-sky-300 bg-sky-50 text-sky-950 ring-1 ring-sky-400'
    : 'border-slate-200 bg-white hover:border-sky-200';
}

export function PharmacyExpenseForm({
  form,
  setField,
  errors,
  categories = [],
  vendors = [],
  expenseAccounts = [],
  paymentAccounts = [],
  currencies = ['PKR'],
  multiCurrency = false,
  saving = false,
  isEdit = false,
  onSubmit,
  onCancel,
}) {
  const [showExtras, setShowExtras] = useState(
    Boolean(form.vendor_id || form.reference || form.payment_account_id || form.receipt),
  );
  const selectedCategory = form.category_id || '';

  return (
    <form onSubmit={onSubmit} className="flex h-full min-h-0 flex-col text-sm">
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_108px]">
            <FormField label="Amount" required error={errors.amount}>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 start-2.5 flex items-center text-xs text-muted-foreground">
                  {form.currency || currencies[0]}
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.amount}
                  onChange={(e) => setField('amount', e.target.value)}
                  placeholder="0.00"
                  className="h-9 ps-12 text-base font-semibold tabular-nums"
                />
              </div>
            </FormField>
            <FormField label="Currency">
              {multiCurrency ? (
                <Select value={form.currency} onValueChange={(v) => setField('currency', v)}>
                  <SelectTrigger className="h-9 text-xs">
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
                <Input value={form.currency} readOnly className="h-9 bg-slate-50 text-xs" />
              )}
            </FormField>
          </div>
          <div className="mt-3">
            <FormField label="Date" required error={errors.expense_date}>
              <DatePicker value={form.expense_date} onChange={(v) => setField('expense_date', v)} />
            </FormField>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Category
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => setField('category_id', '')}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors',
                selectedCategory === ''
                  ? 'border-slate-400 bg-slate-100 ring-1 ring-slate-400'
                  : 'border-slate-200 bg-white hover:bg-slate-50',
              )}
            >
              <Scale className="size-3.5 shrink-0 text-slate-600" />
              <span className="min-w-0">
                <span className="block truncate text-xs font-medium">Shared</span>
              </span>
            </button>
            {categories.map((cat) => {
              const Icon = categoryIcon(cat.name);
              const active = selectedCategory === String(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setField('category_id', String(cat.id))}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors',
                    categoryAccent(cat.name, active),
                  )}
                >
                  <Icon className="size-3.5 shrink-0" />
                  <span className="block truncate text-xs font-medium">{cat.name}</span>
                </button>
              );
            })}
          </div>
          <FieldError message={errors.category_id} />
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-3">
          <FormField
            label="Expense account"
            hint="Default selected"
            required
            error={errors.expense_account_id}
          >
            <Select
              value={form.expense_account_id || ''}
              onValueChange={(v) => setField('expense_account_id', v)}
            >
              <SelectTrigger
                className={cn('h-9 text-xs', errors.expense_account_id && 'border-destructive')}
              >
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {expenseAccounts.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)} className="text-xs">
                    {accountLabel(a)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Description" required error={errors.description}>
            <Textarea
              rows={2}
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder="e.g. Chai, rent, electricity, staff salary…"
              className="min-h-[56px] resize-none text-xs"
            />
          </FormField>
        </div>

        <div className="overflow-hidden rounded-lg border border-dashed border-slate-200 bg-white">
          <button
            type="button"
            onClick={() => setShowExtras((open) => !open)}
            className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-slate-50"
          >
            <div className="flex items-center gap-2">
              <Banknote className="size-3.5 text-slate-500" />
              <span className="text-xs font-medium text-slate-700">Additional details</span>
              <span className="text-[10px] text-muted-foreground">(optional)</span>
            </div>
            <ChevronDown
              className={cn(
                'size-3.5 text-muted-foreground transition-transform',
                showExtras && 'rotate-180',
              )}
            />
          </button>

          {showExtras ? (
            <div className="space-y-3 border-t border-slate-100 px-3 py-3">
              <FormField label="Paid from (cash / bank)" hint="Optional" error={errors.payment_account_id}>
                <Select
                  value={form.payment_account_id || 'none'}
                  onValueChange={(v) => setField('payment_account_id', v === 'none' ? '' : v)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Uses default cash/bank" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Default cash / bank</SelectItem>
                    {paymentAccounts.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)} className="text-xs">
                        {accountLabel(a)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Vendor" hint="Optional">
                  <Select
                    value={form.vendor_id || 'none'}
                    onValueChange={(v) => setField('vendor_id', v === 'none' ? '' : v)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {vendors.map((v) => (
                        <SelectItem key={v.id} value={String(v.id)} className="text-xs">
                          {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField label="Reference" hint="Optional">
                  <Input
                    value={form.reference}
                    onChange={(e) => setField('reference', e.target.value)}
                    placeholder="Auto if blank"
                    className="h-9 text-xs"
                  />
                </FormField>
              </div>

              <FormField label="Receipt" hint="Optional">
                <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-slate-200 bg-slate-50/50 px-2 py-2">
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,application/pdf"
                    onChange={(e) => setField('receipt', e.target.files?.[0] ?? null)}
                    className="h-8 max-w-sm border-0 bg-transparent p-0 text-xs shadow-none file:me-2 file:rounded file:border-0 file:bg-white file:px-2 file:py-1 file:text-[11px]"
                  />
                  {form.existing_receipt_url ? (
                    <a
                      href={form.existing_receipt_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                    >
                      <Paperclip className="size-3" />
                      View
                    </a>
                  ) : null}
                </div>
              </FormField>
            </div>
          ) : null}
        </div>
      </div>

      <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={saving}>
            <X className="me-1 size-3.5" />
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={saving} className="min-w-[120px]">
            {saving ? (
              <Loader2 className="me-1 size-3.5 animate-spin" />
            ) : (
              <Save className="me-1 size-3.5" />
            )}
            {isEdit ? 'Save' : 'Record'}
          </Button>
        </div>
      </div>
    </form>
  );
}
