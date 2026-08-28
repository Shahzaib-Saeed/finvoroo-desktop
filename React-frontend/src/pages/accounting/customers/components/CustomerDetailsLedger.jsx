import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { reportsApi } from '@/pages/accounting/reports/api/reports.api';
import { defaultReportPeriod } from '@/pages/accounting/reports/constants';
import { getReportDisplayReference } from '@/pages/accounting/reports/report-reference';
import { getLedgerEntryTypeMeta } from '@/pages/accounting/reports/journal-type-codes';
import { formatMoney } from '../constants';

function formatLedgerAmount(value) {
  const n = Number(value) || 0;
  if (!n || Math.abs(n) < 0.005) return '';
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(n));
}

function formatLedgerBalance(value) {
  const n = Number(value) || 0;
  const text = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(n));
  return n < 0 ? `-${text}` : text;
}

function formatLedgerDate(value) {
  if (!value) return '—';
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Compact customer ledger for the customer details Overview tab
 * (and in-sheet peeks such as Receive payment).
 */
export function CustomerDetailsLedger({
  customerId,
  workspaceId,
  currency = 'USD',
  embedded = false,
  hideFullReportLink = false,
}) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const period = defaultReportPeriod();

  const load = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const res = await reportsApi.customerLedger({
        customer_id: customerId,
        from: period.from,
        to: period.to,
      });
      setData(res.data?.data || null);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load customer ledger');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [customerId, period.from, period.to]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = data?.rows || [];
  const openingBalance = Number(data?.opening_balance) || 0;
  const closingBalance = Number(data?.totals?.closing_balance ?? 0);
  const cur = data?.currency || currency;
  const ledgerHref = `/workspace/${workspaceId}/accounting/reports/customer-ledger?customer_id=${customerId}&from=${period.from}&to=${period.to}`;

  const shellClass = embedded
    ? 'overflow-hidden rounded-lg border border-border/70 bg-background'
    : 'shadow-none overflow-hidden border border-border/80';

  return (
    <Card className={shellClass}>
      <div className="flex items-center justify-between gap-3 border-b bg-muted/20 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {embedded ? 'Activity' : 'Customer Ledger'}
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {formatLedgerDate(period.from)} – {formatLedgerDate(period.to)}
          </p>
        </div>
        {!hideFullReportLink && workspaceId ? (
          <Button variant="outline" size="sm" className="h-7 text-xs shrink-0" asChild>
            <Link to={ledgerHref} target="_blank" rel="noreferrer">
              Full report
              <ExternalLink className="size-3 ml-1.5" />
            </Link>
          </Button>
        ) : null}
      </div>

      <CardContent className="px-0 pt-0 pb-0">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : !rows.length ? (
          <p className="text-sm text-muted-foreground text-center py-12 px-4">
            No ledger transactions for this period.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-1 px-4 py-2.5 bg-muted/15 border-b text-xs">
              <span className="text-muted-foreground">
                Opening{' '}
                <strong className="text-foreground tabular-nums">
                  {formatLedgerBalance(openingBalance)}
                </strong>
              </span>
              <span className="text-muted-foreground">
                Closing{' '}
                <strong className="text-foreground tabular-nums">
                  {formatLedgerBalance(closingBalance)}
                </strong>{' '}
                <span className="text-muted-foreground/80">({cur})</span>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/10 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <th className="py-2.5 px-4 font-medium">Date</th>
                    <th className="py-2.5 px-4 font-medium">Reference</th>
                    <th className="py-2.5 px-3 font-medium text-center w-12">Type</th>
                    <th className="py-2.5 px-4 font-medium">Description</th>
                    <th className="py-2.5 px-4 font-medium text-right">Debit</th>
                    <th className="py-2.5 px-4 font-medium text-right">Credit</th>
                    <th className="py-2.5 px-4 font-medium text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((entry) => {
                    const type = getLedgerEntryTypeMeta(entry, 'ar');
                    return (
                      <tr
                        key={entry.row_key || entry.id}
                        className="border-b border-border/50 last:border-0 hover:bg-muted/15 transition-colors"
                      >
                        <td className="py-2.5 px-4 whitespace-nowrap text-muted-foreground">
                          {formatLedgerDate(entry.txn_date)}
                        </td>
                        <td className="py-2.5 px-4 font-medium">
                          {getReportDisplayReference(entry)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className="text-xs font-semibold text-slate-600"
                            title={type.label}
                          >
                            {type.code}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-muted-foreground max-w-[200px] truncate">
                          {entry.description || '—'}
                        </td>
                        <td className="py-2.5 px-4 text-right tabular-nums">
                          {formatLedgerAmount(entry.debit) || '—'}
                        </td>
                        <td className="py-2.5 px-4 text-right tabular-nums">
                          {formatLedgerAmount(entry.credit) || '—'}
                        </td>
                        <td className="py-2.5 px-4 text-right tabular-nums font-medium">
                          {formatLedgerBalance(entry.running_balance)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end gap-3 border-t bg-muted/10 px-4 py-2.5 text-xs text-muted-foreground">
              Closing balance{' '}
              <strong className="text-sm text-foreground tabular-nums">
                {formatMoney(closingBalance, cur)}
              </strong>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
