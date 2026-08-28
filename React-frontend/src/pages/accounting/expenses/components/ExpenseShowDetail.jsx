import { Link } from 'react-router';
import {
  BookOpen,
  Building2,
  ExternalLink,
  FileText,
  Landmark,
  Receipt,
  User,
  Wallet,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { APPROVAL_COLORS, accountLabel, formatCurrency } from '../constants';

const cardHeaderTight = 'min-h-0 items-start border-0 py-4 px-5 max-sm:px-4';
const cardContentTight = 'px-5 pb-5 max-sm:px-4';

const postedColors = {
  posted: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  unposted: 'bg-amber-100 text-amber-700 border-amber-200',
};

function StatTile({ label, value, sub, variant = 'default', icon: Icon }) {
  const variants = {
    default: 'bg-muted/40 border-border',
    cost: 'bg-orange-50/80 border-orange-200 dark:bg-orange-950/30 dark:border-orange-900/50',
    success: 'bg-emerald-50/80 border-emerald-200 dark:bg-emerald-950/30',
    warning: 'bg-amber-50/80 border-amber-200 dark:bg-amber-950/30',
  };
  return (
    <div className={cn('rounded-lg border px-3 py-2.5 flex gap-3', variants[variant])}>
      {Icon ? (
        <div className="size-9 rounded-lg bg-background/80 border flex items-center justify-center shrink-0">
          <Icon className="size-4 text-muted-foreground" />
        </div>
      ) : null}
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-lg font-semibold tabular-nums mt-0.5">{value}</p>
        {sub ? <p className="text-xs text-muted-foreground mt-0.5">{sub}</p> : null}
      </div>
    </div>
  );
}

function RelatedLink({ to, label, meta }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/50 transition-colors group"
    >
      <span className="font-medium group-hover:text-primary truncate">{label}</span>
      <span className="flex items-center gap-1.5 text-muted-foreground shrink-0">
        {meta ? (
          <Badge variant="outline" className="text-[10px] font-normal capitalize">
            {meta}
          </Badge>
        ) : null}
        <ExternalLink className="size-3.5 opacity-60" />
      </span>
    </Link>
  );
}

export function ExpenseShowDetail({ expense, workspaceId }) {
  const currency = expense.currency || 'USD';
  const approval = expense.approval_status || 'approved';
  const title = expense.reference?.trim() || `Expense #${expense.id}`;
  const vendorBase = `/workspace/${workspaceId}/accounting/vendors`;
  const jobBase = `/workspace/${workspaceId}/accounting/job-orders`;
  const journalBase = `/workspace/${workspaceId}/accounting/journal`;
  const isPdf = expense.receipt_url
    ? String(expense.receipt_path || expense.receipt_url).toLowerCase().includes('.pdf')
    : false;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatTile
            label="Amount"
            value={formatCurrency(expense.amount, currency)}
            sub={currency}
            variant="cost"
            icon={Wallet}
          />
          <StatTile
            label="General ledger"
            value={expense.is_posted ? 'Posted' : 'Unposted'}
            sub={expense.journal_entry_id ? `JE #${expense.journal_entry_id}` : 'Not in GL yet'}
            variant={expense.is_posted ? 'success' : 'warning'}
            icon={BookOpen}
          />
          <StatTile
            label="Approval"
            value={approval}
            sub={expense.expense_date_display || expense.expense_date}
            variant={approval === 'approved' ? 'default' : 'warning'}
            icon={Receipt}
          />
        </div>

        <Card>
          <CardHeader className={cn(cardHeaderTight, 'border-b border-border pb-4')}>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 w-full">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-orange-600 mb-1">
                  Expense
                </p>
                <CardTitle className="text-2xl">{title}</CardTitle>
                <CardDescription className="mt-1">
                  {expense.vendor?.name || 'No vendor'}
                  {expense.vendor?.email ? ` · ${expense.vendor.email}` : ''}
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                {approval !== 'approved' && (
                  <Badge
                    variant="outline"
                    className={cn('capitalize text-sm px-2.5 py-0.5', APPROVAL_COLORS[approval])}
                  >
                    {approval}
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className={cn(
                    'capitalize text-sm px-2.5 py-0.5',
                    postedColors[expense.is_posted ? 'posted' : 'unposted'],
                  )}
                >
                  {expense.is_posted ? 'Posted' : 'Unposted'}
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className={cn(cardContentTight, 'pt-5 space-y-6')}>
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                  <User className="size-3.5" />
                  Vendor / payee
                </h3>
                {expense.vendor ? (
                  <>
                    <Link
                      to={`${vendorBase}/${expense.vendor.id}/edit`}
                      className="font-semibold text-primary hover:underline"
                    >
                      {expense.vendor.name}
                    </Link>
                    {expense.vendor.email ? (
                      <p className="text-sm text-muted-foreground mt-1">{expense.vendor.email}</p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No vendor specified</p>
                )}
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Landmark className="size-3.5" />
                  Payment
                </h3>
                <p className="text-sm text-muted-foreground">Paid from</p>
                <p className="font-semibold mt-0.5">{accountLabel(expense.payment_account)}</p>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Accounting entries
              </h3>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/60 border-b">
                      <th className="px-3 py-2.5 text-left font-medium">Account</th>
                      <th className="px-3 py-2.5 text-center font-medium w-24">Type</th>
                      <th className="px-3 py-2.5 text-right font-medium w-32">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="px-3 py-2.5">
                        <p className="font-medium">{accountLabel(expense.expense_account)}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Expense category</p>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <Badge variant="outline" className="text-xs font-normal">
                          Debit
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-medium">
                        {formatCurrency(expense.amount, currency)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2.5">
                        <p className="font-medium">{accountLabel(expense.payment_account)}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Cash / bank</p>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <Badge variant="outline" className="text-xs font-normal">
                          Credit
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-medium">
                        {formatCurrency(expense.amount, currency)}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-muted/50">
                      <td colSpan={2} className="px-3 py-3 text-right font-semibold">
                        Total
                      </td>
                      <td className="px-3 py-3 text-right text-lg font-bold text-orange-600 tabular-nums">
                        {formatCurrency(expense.amount, currency)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {expense.description?.trim() ? (
              <div className="rounded-lg border bg-muted/20 px-4 py-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                  Description
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {expense.description}
                </p>
              </div>
            ) : null}

            {expense.company?.name ? (
              <div className="flex items-start gap-3 rounded-lg border bg-muted/10 px-4 py-3 text-sm text-muted-foreground">
                <Building2 className="size-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">{expense.company.name}</p>
                  {expense.company.address_display ? (
                    <p className="whitespace-pre-line mt-1">{expense.company.address_display}</p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 print:hidden">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Expense date</span>
              <span className="font-medium tabular-nums">
                {expense.expense_date_display || expense.expense_date || '—'}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Reference</span>
              <span className="font-medium">{title}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Currency</span>
              <span className="font-medium">{currency}</span>
            </div>
            {expense.created_at && (
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Recorded</span>
                <span className="font-medium">{expense.created_at}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Related</CardTitle>
            <CardDescription>Linked records in your books</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {expense.vendor?.id ? (
              <RelatedLink
                to={`${vendorBase}/${expense.vendor.id}/edit`}
                label={expense.vendor.name}
                meta="Vendor"
              />
            ) : null}
            {expense.job_order?.id ? (
              <RelatedLink
                to={`${jobBase}/${expense.job_order.id}`}
                label={expense.job_order.job_number || `JO-${expense.job_order.id}`}
                meta="Job"
              />
            ) : null}
            {expense.journal_entry_id ? (
              <RelatedLink
                to={`${journalBase}/${expense.journal_entry_id}`}
                label={`Journal #${expense.journal_entry_id}`}
                meta={expense.is_posted ? 'Posted' : 'Draft'}
              />
            ) : null}
            {!expense.vendor?.id &&
              !expense.job_order?.id &&
              !expense.journal_entry_id && (
                <p className="text-sm text-muted-foreground py-2">No linked records.</p>
              )}
          </CardContent>
        </Card>

        {expense.receipt_url ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <FileText className="size-4" />
                Receipt
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" size="sm" className="w-full" asChild>
                <a href={expense.receipt_url} target="_blank" rel="noreferrer">
                  Open receipt
                  <ExternalLink className="size-3.5 ml-2 opacity-60" />
                </a>
              </Button>
              {!isPdf && (
                <div className="rounded-lg border overflow-hidden bg-muted/30">
                  <img
                    src={expense.receipt_url}
                    alt="Expense receipt"
                    className="w-full h-auto max-h-64 object-contain"
                  />
                </div>
              )}
              {isPdf && (
                <p className="text-xs text-muted-foreground">PDF attachment — open to view.</p>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
