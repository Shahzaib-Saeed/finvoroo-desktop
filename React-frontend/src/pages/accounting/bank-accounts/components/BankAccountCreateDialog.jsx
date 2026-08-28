import { useState } from 'react';
import { BookOpen, CircleDollarSign, Landmark, Wallet } from 'lucide-react';
import { BankAccountForm } from './BankAccountForm';
import { BankAccountModalShell } from './BankAccountModalShell';
import { EMPTY_BANK_ACCOUNT_FORM } from '../constants';
import { useCompanyCurrency } from '@/hooks/use-company-currency';
import { useParams } from 'react-router';

/**
 * Modal replacement for the standalone /create page.
 */
export function BankAccountCreateDialog({ open, onOpenChange, onSuccess }) {
  const { id: workspaceId } = useParams();
  const { formatMoney } = useCompanyCurrency(workspaceId);
  const [preview, setPreview] = useState({ ...EMPTY_BANK_ACCOUNT_FORM });

  const openingAmount = Number(preview.opening_balance) || 0;
  const bankLabel = preview.bank_name?.trim() || 'New bank account';
  const accountLabel = preview.account_number?.trim();

  return (
    <BankAccountModalShell
      open={open}
      onOpenChange={(next) => {
        if (!next) setPreview({ ...EMPTY_BANK_ACCOUNT_FORM });
        onOpenChange?.(next);
      }}
      title="Add bank account"
      description="Create a bank account with an automatic ledger link. Opening balance posts as a journal entry when you save."
      icon={Landmark}
      main={
        <BankAccountForm
          mode="create"
          variant="modal"
          onCancel={() => onOpenChange?.(false)}
          onSuccess={() => {
            setPreview({ ...EMPTY_BANK_ACCOUNT_FORM });
            onSuccess?.();
            onOpenChange?.(false);
          }}
          onFormChange={setPreview}
        />
      }
      sidebar={
        <>
          <div className="border-b bg-background px-6 py-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Preview
            </p>
            <p className="mt-2 text-2xl font-bold tracking-tight">{bankLabel}</p>
            {accountLabel ? (
              <p className="mt-1 font-mono text-sm text-muted-foreground">Acct #{accountLabel}</p>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">Account number not set yet</p>
            )}
            <div className="mt-5 rounded-xl border bg-muted/40 px-4 py-4">
              <p className="text-xs font-medium text-muted-foreground">Opening balance</p>
              <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight">
                {formatMoney(openingAmount)}
              </p>
              {preview.opening_balance_date ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  As of {preview.opening_balance_date}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <p className="text-sm font-semibold">What happens when you save</p>
            <ul className="mt-4 space-y-4">
              <li className="flex gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <BookOpen className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Ledger account is created</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    A chart-of-accounts entry is linked automatically so this bank can be used in
                    journals, payments, and expenses.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700">
                  <CircleDollarSign className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Opening balance is posted</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    If you enter an opening balance, the system posts the opening-balance journal
                    on the date you choose.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700">
                  <Wallet className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Ready for banking activity</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    Use this account for deposits, withdrawals, transfers, and customer or vendor
                    payments.
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </>
      }
    />
  );
}
