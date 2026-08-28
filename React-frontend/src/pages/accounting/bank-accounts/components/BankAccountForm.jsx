import { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { bankAccountsApi } from '../api/bank-accounts.api';
import {
  EMPTY_BANK_ACCOUNT_FORM,
  mapBankAccountToForm,
  buildBankAccountCreatePayload,
  buildBankAccountUpdatePayload,
} from '../constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { cn } from '@/lib/utils';

function FieldError({ message }) {
  if (!message) return null;
  return <p className="text-sm text-destructive mt-1">{message}</p>;
}

function SectionTitle({ children }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}

export function BankAccountForm({
  mode = 'create',
  variant = 'page',
  accountId,
  initialAccount,
  ledgerLabel,
  onSuccess,
  onCancel,
  onFormChange,
  hideFooterActions = false,
}) {
  const isEdit = mode === 'edit';
  const isModal = variant === 'modal';
  const [form, setForm] = useState(() =>
    isEdit ? mapBankAccountToForm(initialAccount) : { ...EMPTY_BANK_ACCOUNT_FORM },
  );
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit && initialAccount) {
      setForm(mapBankAccountToForm(initialAccount));
    }
  }, [isEdit, initialAccount]);

  useEffect(() => {
    onFormChange?.(form);
  }, [form, onFormChange]);

  const setField = (key, value) => {
    setForm((f) => {
      const next = { ...f, [key]: value };
      return next;
    });
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const applyServerErrors = (err) => {
    const serverErrors = err?.response?.data?.errors;
    if (serverErrors && typeof serverErrors === 'object') {
      const next = {};
      Object.entries(serverErrors).forEach(([k, v]) => {
        next[k] = Array.isArray(v) ? v[0] : String(v);
      });
      setErrors(next);
      return;
    }
    toast.error(err?.response?.data?.message || 'Something went wrong');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      if (isEdit) {
        const res = await bankAccountsApi.update(
          accountId,
          buildBankAccountUpdatePayload(form),
        );
        toast.success(res.data?.message || 'Bank account updated');
      } else {
        const res = await bankAccountsApi.create(buildBankAccountCreatePayload(form));
        toast.success(res.data?.message || 'Bank account created');
      }
      onSuccess?.();
    } catch (err) {
      applyServerErrors(err);
    } finally {
      setSaving(false);
    }
  };

  const inputClass = isModal ? 'h-10' : undefined;
  const selectTriggerClass = isModal ? 'h-10' : undefined;

  return (
    <form onSubmit={handleSubmit} className={cn('flex flex-col', isModal ? 'gap-8' : 'space-y-6')}>
      {!isEdit && !isModal && (
        <p className="text-sm text-muted-foreground">
          Each bank account gets its own ledger account automatically. It will appear in payments,
          expenses, journal entries, and anywhere cash or bank accounts are needed.
        </p>
      )}

      {isEdit && ledgerLabel ? (
        <div
          className={cn(
            'rounded-xl border bg-muted/30 px-4 py-3 text-sm',
            isModal && 'border-dashed',
          )}
        >
          <span className="text-muted-foreground">Ledger: </span>
          <span className="font-medium text-foreground">{ledgerLabel}</span>
        </div>
      ) : null}

      <div className="space-y-4">
        <SectionTitle>Bank details</SectionTitle>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-1">
            <Label htmlFor="bank_name">
              Bank name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="bank_name"
              className={inputClass}
              value={form.bank_name}
              onChange={(e) => setField('bank_name', e.target.value)}
              placeholder="e.g. Meezan Bank Ltd."
              maxLength={100}
              required
            />
            <FieldError message={errors.bank_name} />
          </div>

          <div className="space-y-2 sm:col-span-1">
            <Label htmlFor="account_number">
              Account number <span className="text-destructive">*</span>
            </Label>
            <Input
              id="account_number"
              className={inputClass}
              value={form.account_number}
              onChange={(e) => setField('account_number', e.target.value)}
              placeholder="Must be unique"
              maxLength={50}
              required
            />
            <FieldError message={errors.account_number} />
          </div>

          <div className="space-y-2 sm:col-span-1">
            <Label htmlFor="routing_number">Routing number</Label>
            <Input
              id="routing_number"
              className={inputClass}
              value={form.routing_number}
              onChange={(e) => setField('routing_number', e.target.value)}
              maxLength={50}
            />
            <FieldError message={errors.routing_number} />
          </div>

          {isEdit ? (
            <div className="space-y-2 sm:col-span-1">
              <Label>Status</Label>
              <Select
                value={form.is_active ? '1' : '0'}
                onValueChange={(v) => setField('is_active', v === '1')}
              >
                <SelectTrigger className={selectTriggerClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Active</SelectItem>
                  <SelectItem value="0">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <FieldError message={errors.is_active} />
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-4">
        <SectionTitle>Opening balance</SectionTitle>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-1">
            <Label htmlFor="opening_balance">Opening balance</Label>
            <Input
              id="opening_balance"
              className={inputClass}
              type="number"
              step="0.01"
              value={form.opening_balance}
              onChange={(e) => setField('opening_balance', e.target.value)}
            />
            <FieldError message={errors.opening_balance} />
            {isEdit ? (
              <p className="text-xs text-muted-foreground">
                Editing this re-posts the opening balance journal for this bank.
              </p>
            ) : null}
          </div>

          <div className="space-y-2 sm:col-span-1">
            <Label>Opening balance date</Label>
            <DatePicker
              value={form.opening_balance_date}
              onChange={(v) => setField('opening_balance_date', v)}
              maxDate={new Date()}
              className={isModal ? 'h-10' : undefined}
            />
            <FieldError message={errors.opening_balance_date} />
          </div>
        </div>
      </div>

      <div
        className={cn(
          'mt-auto flex flex-wrap items-center justify-end gap-3 pt-2',
          (hideFooterActions || isModal) && 'border-t pt-5',
        )}
      >
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving} className="min-w-[140px]">
          {saving ? (
            <Loader2 className="size-4 mr-2 animate-spin" />
          ) : (
            <Save className="size-4 mr-2" />
          )}
          {isEdit ? (hideFooterActions || isModal ? 'Save changes' : 'Update') : 'Create account'}
        </Button>
      </div>
    </form>
  );
}
