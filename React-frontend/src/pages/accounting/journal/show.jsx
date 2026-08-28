import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  Edit3,
  ExternalLink,
  Loader2,
  Scale,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { journalsApi } from './api/journals.api';
import { STATUS_COLORS, TYPE_COLORS } from './constants';
import { getJournalSourceLinks, getJournalDisplayReference, getJournalEditGuidance } from './journal-source-links';
import { JournalEditGuidanceBanner } from './components/JournalEditGuidanceBanner';
import { useCompanyCurrency } from '@/hooks/use-company-currency';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

function MetricCard({ label, value, hint, valueClassName }) {
  return (
    <Card className="shadow-none h-full">
      <CardContent className="p-4">
        <p className="text-[0.7rem] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
          {label}
        </p>
        <p className={cn('text-2xl font-bold tabular-nums leading-none', valueClassName)}>{value}</p>
        {hint ? <p className="text-xs text-muted-foreground mt-1.5">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export function JournalShowPage() {
  const { id: workspaceId, journalId } = useParams();
  const navigate = useNavigate();
  const base = `/workspace/${workspaceId}/accounting/journal`;
  const { formatMoney, resolveCurrency } = useCompanyCurrency(workspaceId);

  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    journalsApi
      .show(journalId)
      .then((res) => setEntry(res.data?.data || null))
      .catch((err) => {
        toast.error(err?.response?.data?.message || 'Failed to load journal entry');
        setEntry(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [journalId]);

  const handlePost = async () => {
    setPosting(true);
    try {
      const res = await journalsApi.post(journalId);
      toast.success(res.data?.message || 'Journal entry posted');
      setEntry(res.data?.data || null);
      if (!res.data?.data) load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not post entry');
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await journalsApi.destroy(journalId);
      toast.success(res.data?.message || 'Journal entry deleted');
      navigate(base);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not delete entry');
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const sourceLinks = useMemo(
    () => (entry ? getJournalSourceLinks(entry, workspaceId) : []),
    [entry, workspaceId],
  );
  const editGuidance = useMemo(
    () => (entry ? getJournalEditGuidance(entry, workspaceId) : []),
    [entry, workspaceId],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground mb-4">Journal entry not found</p>
        <Button asChild>
          <Link to={base}>Back to journal entries</Link>
        </Button>
      </div>
    );
  }

  const lines = entry.lines || [];
  const currency = resolveCurrency(entry.currency);
  const flags = entry.flags || {};
  const status = entry.status || 'draft';
  const ref = getJournalDisplayReference(entry);
  const internalRef = entry.reference || entry.journal_number;
  const typeKey = entry.type || 'general';
  const isBalanced = entry.is_balanced !== false;
  const customerHref = entry.customer_id
    ? `/workspace/${workspaceId}/accounting/customers/${entry.customer_id}`
    : null;
  const reversalHref = entry.reversal_entry_id ? `${base}/${entry.reversal_entry_id}` : null;

  return (
    <div className="space-y-6 w-full min-w-0 max-w-5xl mx-auto">
      <PageHeader
        title={ref}
        subtitle={entry.description || 'Journal entry details'}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={base}>
                <ArrowLeft className="size-4 mr-1" /> Back
              </Link>
            </Button>
            {!entry.is_opening_balance && flags.can_edit ? (
              <Button variant="outline" size="sm" asChild>
                <Link to={`${base}/${journalId}/edit`}>
                  <Edit3 className="size-4 mr-1" /> Edit
                </Link>
              </Button>
            ) : null}
            {!flags.can_edit && editGuidance.length > 0
              ? editGuidance.slice(0, 2).map((link) => {
                  const Icon = link.icon;
                  return (
                    <Button key={`${link.kind}-${link.id || link.href}`} variant="outline" size="sm" asChild>
                      <Link to={link.href}>
                        <Icon className="size-4 mr-1" /> {link.label}
                      </Link>
                    </Button>
                  );
                })
              : null}
            {customerHref && !editGuidance.some((l) => l.kind === 'customer') ? (
              <Button variant="outline" size="sm" asChild>
                <Link to={customerHref}>
                  <Edit3 className="size-4 mr-1" /> Edit on customer
                </Link>
              </Button>
            ) : null}
            {flags.can_post ? (
              <Button size="sm" onClick={handlePost} disabled={posting}>
                <BadgeCheck className="size-4 mr-1" />
                {posting ? 'Posting…' : 'Post entry'}
              </Button>
            ) : null}
            {flags.can_delete ? (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="size-4 mr-1" /> Delete
              </Button>
            ) : null}
          </div>
        }
      />

      <JournalEditGuidanceBanner entry={entry} workspaceId={workspaceId} />

      {sourceLinks.length > 0 ? (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground mr-1">Linked documents:</span>
          {sourceLinks.map((source) => {
            const Icon = source.icon;
            return (
              <Button key={`${source.kind}-${source.id}`} variant="outline" size="sm" asChild>
                <Link to={source.href}>
                  <Icon className="size-4 mr-1.5" />
                  {source.label}
                  <ExternalLink className="size-3.5 ml-1.5 opacity-60" />
                </Link>
              </Button>
            );
          })}
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MetricCard
          label="Total debit"
          value={formatMoney(entry.total_debit, entry.currency)}
          valueClassName="text-emerald-700 dark:text-emerald-400"
        />
        <MetricCard
          label="Total credit"
          value={formatMoney(entry.total_credit, entry.currency)}
          valueClassName="text-red-700 dark:text-red-400"
        />
        <MetricCard
          label="Balance check"
          value={isBalanced ? 'Balanced' : 'Out of balance'}
          hint={`${lines.length} line${lines.length === 1 ? '' : 's'}`}
          valueClassName={isBalanced ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}
        />
      </div>

      <Card className="shadow-none">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 border-b pb-5 mb-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <BookOpen className="size-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Journal entry</h2>
                  <p className="text-sm text-muted-foreground font-mono">{ref}</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Date:</span>{' '}
                  <span className="font-medium">{entry.date || entry.entry_date || '—'}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Created by:</span>{' '}
                  <span className="font-medium">{entry.created_by_name || '—'}</span>
                </p>
                <p className="flex items-center gap-2 flex-wrap">
                  <span className="text-muted-foreground">Type:</span>
                  <Badge
                    variant="outline"
                    className={cn('capitalize rounded-full', TYPE_COLORS[typeKey] || '')}
                  >
                    {entry.type_label || typeKey.replace(/_/g, ' ')}
                  </Badge>
                </p>
                {entry.exchange_rate && Number(entry.exchange_rate) !== 1 ? (
                  <p>
                    <span className="text-muted-foreground">Exchange rate:</span>{' '}
                    <span className="font-medium tabular-nums">
                      {currency} @ {Number(entry.exchange_rate).toFixed(4)}
                    </span>
                  </p>
                ) : null}
              </div>
              {entry.description ? (
                <p className="text-sm text-muted-foreground max-w-2xl">{entry.description}</p>
              ) : null}
            </div>

            <div className="lg:text-right space-y-2 shrink-0">
              <Badge
                variant="outline"
                className={cn('capitalize rounded-full', STATUS_COLORS[status] || '')}
              >
                {status}
              </Badge>
              {status === 'draft' ? (
                <p className="text-xs text-muted-foreground max-w-xs lg:ml-auto">
                  Draft entries do not affect account balances until posted.
                </p>
              ) : null}
              {status === 'voided' ? (
                <p className="text-xs text-muted-foreground max-w-xs lg:ml-auto">
                  This entry was voided — a reversal entry cancelled its GL impact.
                  {reversalHref ? (
                    <>
                      {' '}
                      <Link to={reversalHref} className="text-primary hover:underline">
                        View reversal entry
                      </Link>
                    </>
                  ) : null}
                </p>
              ) : null}
              {entry.is_empty_opening_balance ? (
                <p className="text-xs text-amber-600 max-w-xs lg:ml-auto">
                  Empty opening balances shell — safe to delete. Customer opening balances now use separate CUST-OB entries.
                </p>
              ) : null}
              {entry.is_opening_balance ? (
                <p className="text-xs text-amber-600 max-w-xs lg:ml-auto">
                  Bank and cash opening balances are edited on each bank account. Other account
                  balances are edited on the chart of accounts.
                </p>
              ) : null}
              {entry.is_customer_opening_balance ? (
                <p className="text-xs text-amber-600 max-w-xs lg:ml-auto">
                  Customer opening balance — edit the amount and date on the customer record, or delete this entry to clear it.
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-[40%]">Account</TableHead>
                  <TableHead>Line description</TableHead>
                  <TableHead className="text-right w-32">Debit</TableHead>
                  <TableHead className="text-right w-32">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No journal lines
                    </TableCell>
                  </TableRow>
                ) : (
                  lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>
                        <p className="font-mono text-xs text-muted-foreground">
                          {line.account_code || '—'}
                        </p>
                        <p className="font-medium text-sm">{line.account_name || '—'}</p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {line.description || '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-emerald-700 dark:text-emerald-400 font-medium">
                        {line.debit ? formatMoney(line.debit, entry.currency) : '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-red-700 dark:text-red-400 font-medium">
                        {line.credit ? formatMoney(line.credit, entry.currency) : '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              <TableFooter>
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  <TableCell colSpan={2} className="font-semibold">
                    <span className="inline-flex items-center gap-2">
                      <Scale className="size-4 text-muted-foreground" />
                      Totals
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                    {formatMoney(entry.total_debit, entry.currency)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-bold text-red-700 dark:text-red-400">
                    {formatMoney(entry.total_credit, entry.currency)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete journal entry?"
        description={
          entry?.is_empty_opening_balance
            ? 'Delete this empty opening balances entry? It has no amounts and is no longer used.'
            : entry?.is_customer_opening_balance
            ? 'Delete this entry and clear the opening balance on the customer record?'
            : entry?.is_posted
              ? 'Delete this posted journal entry? Account balances will be updated.'
              : 'Permanently delete this draft entry? This cannot be undone.'
        }
        confirmLabel="Delete"
        confirmVariant="destructive"
        isLoading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />

    </div>
  );
}
