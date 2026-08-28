import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import {
  ArrowDownLeft,
  ArrowUpRight,
  History,
  Loader2,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { bankAccountsApi } from '../api/bank-accounts.api';
import { BankAccountForm } from './BankAccountForm';
import { BankAccountModalShell } from './BankAccountModalShell';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCompanyCurrency } from '@/hooks/use-company-currency';
import { cn } from '@/lib/utils';

/**
 * Modal replacement for the standalone /edit page. Loads the freshest bank
 * account server-side, lets the user edit every field including opening balance,
 * shows recent GL activity, and offers trash / permanent delete actions.
 */
export function BankAccountEditDialog({
  bankAccountId,
  open,
  onOpenChange,
  onSuccess,
  canDelete = false,
}) {
  const { id: workspaceId } = useParams();
  const { formatMoney } = useCompanyCurrency(workspaceId);

  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [confirmTrash, setConfirmTrash] = useState(false);
  const [confirmPermanent, setConfirmPermanent] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const reloadAccount = () => {
    if (!bankAccountId) return;
    bankAccountsApi
      .show(bankAccountId)
      .then((res) => setAccount(res.data?.data || null))
      .catch(() => {});
  };

  useEffect(() => {
    if (!open || !bankAccountId) {
      setAccount(null);
      setTransactions([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setTransactionsLoading(true);
    bankAccountsApi
      .show(bankAccountId)
      .then((res) => {
        if (!cancelled) setAccount(res.data?.data || null);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err?.response?.data?.message || 'Bank account not found');
          onOpenChange?.(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    bankAccountsApi
      .transactions(bankAccountId, { limit: 20 })
      .then((res) => {
        if (!cancelled) setTransactions(res.data?.data?.transactions || []);
      })
      .catch(() => {
        if (!cancelled) setTransactions([]);
      })
      .finally(() => {
        if (!cancelled) setTransactionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, bankAccountId, onOpenChange]);

  const ledgerLabel = useMemo(() => {
    const coa = account?.chart_of_account;
    if (!coa) return null;
    return coa.label || `${coa.code || ''} — ${coa.name || ''}`.trim();
  }, [account]);

  const handleMoveToTrash = async () => {
    if (!bankAccountId) return;
    setDeleting(true);
    try {
      const res = await bankAccountsApi.delete(bankAccountId);
      toast.success(res.data?.message || 'Bank account moved to trash');
      setConfirmTrash(false);
      onSuccess?.();
      onOpenChange?.(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not move to trash');
    } finally {
      setDeleting(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (!bankAccountId) return;
    setDeleting(true);
    try {
      const res = await bankAccountsApi.forceDelete(bankAccountId);
      toast.success(res.data?.message || 'Bank account permanently deleted');
      setConfirmPermanent(false);
      onSuccess?.();
      onOpenChange?.(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not permanently delete');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <BankAccountModalShell
        open={open}
        onOpenChange={onOpenChange}
        title={account ? `Edit ${account.bank_name}` : 'Edit bank account'}
        description="Update bank details, opening balance, and status. Recent cash in / out is shown on the right."
        loading={loading}
        loadingLabel="Loading bank account…"
        main={
          account ? (
            <>
              <BankAccountForm
                mode="edit"
                variant="modal"
                accountId={bankAccountId}
                initialAccount={account}
                ledgerLabel={ledgerLabel}
                onCancel={() => onOpenChange?.(false)}
                onSuccess={() => {
                  reloadAccount();
                  onSuccess?.();
                }}
                hideFooterActions
              />

              {canDelete ? (
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-5 py-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-destructive">
                    Delete account
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    <strong className="text-foreground">Move to trash</strong> keeps GL history and
                    can be restored from trash.{' '}
                    <strong className="text-foreground">Delete permanently</strong> is only allowed
                    when there are no posted payments, deposits, or transfers on this bank (opening
                    balance alone is OK).
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setConfirmTrash(true)}
                    >
                      <Trash2 className="size-4 mr-1.5" /> Move to trash
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setConfirmPermanent(true)}
                    >
                      <Trash2 className="size-4 mr-1.5" /> Delete permanently
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          ) : null
        }
        sidebar={
          account ? (
            <>
              <div className="border-b bg-background px-6 py-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Current balance
                </p>
                <p className="mt-2 text-4xl font-bold tabular-nums tracking-tight">
                  {formatMoney(account.current_balance ?? 0)}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {account.account_number ? `Acct #${account.account_number}` : '—'}
                </p>
                {account.is_active === false ? (
                  <Badge variant="outline" className="mt-3 rounded-full">
                    Inactive
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="mt-3 rounded-full border-emerald-200 bg-emerald-50 text-emerald-800"
                  >
                    Active
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2 border-b px-6 py-4">
                <History className="size-4 text-muted-foreground" />
                <p className="text-sm font-semibold">Recent activity</p>
                <span className="ml-auto text-xs text-muted-foreground">Cash in / Cash out</span>
              </div>

              <ScrollArea className="min-h-0 flex-1">
                {transactionsLoading ? (
                  <div className="flex items-center justify-center py-16 text-muted-foreground">
                    <Loader2 className="size-4 animate-spin mr-2" /> Loading history…
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="px-6 py-16 text-center">
                    <p className="text-sm text-muted-foreground">
                      No cash in or cash out on this bank.
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Voided journal reversals are kept in the audit log but do not count here.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y">
                    {transactions.map((tx) => {
                      const isIn = tx.direction === 'in';
                      return (
                        <li key={tx.id} className="flex items-start gap-3 px-6 py-4">
                          <div
                            className={cn(
                              'flex size-9 shrink-0 items-center justify-center rounded-full',
                              isIn
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-red-50 text-red-700',
                            )}
                          >
                            {isIn ? (
                              <ArrowDownLeft className="size-4" />
                            ) : (
                              <ArrowUpRight className="size-4" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {tx.description || tx.reference || '—'}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="font-mono text-[11px] text-muted-foreground">
                                {tx.reference || '—'}
                              </span>
                              {tx.entry_date ? (
                                <span className="text-[11px] text-muted-foreground">
                                  · {tx.entry_date}
                                </span>
                              ) : null}
                              {tx.is_opening_balance ? (
                                <Badge
                                  variant="outline"
                                  className="h-5 rounded-full px-2 text-[10px]"
                                >
                                  Opening balance
                                </Badge>
                              ) : tx.type ? (
                                <Badge
                                  variant="outline"
                                  className="h-5 rounded-full px-2 text-[10px] capitalize"
                                >
                                  {String(tx.type).replace(/_/g, ' ')}
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <p
                              className={cn(
                                'text-sm font-semibold tabular-nums',
                                isIn ? 'text-emerald-700' : 'text-red-700',
                              )}
                            >
                              {isIn ? '+' : '−'}
                              {formatMoney(Math.abs(tx.amount || 0))}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </ScrollArea>
            </>
          ) : null
        }
      />

      <AlertDialog open={confirmTrash} onOpenChange={setConfirmTrash}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move to trash?</AlertDialogTitle>
            <AlertDialogDescription>
              Move <strong>{account?.bank_name}</strong> to trash? You can restore it within 30
              days. Only works when this account has no GL transaction history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMoveToTrash}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Moving…' : 'Move to trash'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmPermanent} onOpenChange={setConfirmPermanent}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete <strong>{account?.bank_name}</strong>? This skips trash and cannot
              be undone. Blocked if this account has transaction history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePermanentDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting…' : 'Delete permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
