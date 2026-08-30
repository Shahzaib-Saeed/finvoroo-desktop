import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Plus, RefreshCw, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Container } from '@/components/common/container';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { investmentsApi } from '../../api/investments.api';
import { InvestorFormDialog } from './InvestorFormDialog';

function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function StatCard({ label, value, tone = 'default' }) {
  return (
    <div className="min-w-0 flex-1 px-4 py-3 first:pl-0 last:pr-0 sm:px-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p
        className={cn(
          'mt-1.5 whitespace-nowrap text-lg font-bold tabular-nums tracking-tight',
          tone === 'outstanding' ? 'text-amber-700' : 'text-slate-900',
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function InvestorsListPage() {
  const { id: companyId } = useParams();
  const [investors, setInvestors] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, totals] = await Promise.all([
        investmentsApi.listInvestors(search ? { q: search } : undefined),
        investmentsApi.summary(),
      ]);
      setInvestors(list?.data?.data?.data ?? list?.data?.data ?? []);
      setSummary(totals?.data?.data ?? null);
    } catch {
      toast.error('Could not load investors.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Container className="py-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <Users className="size-4.5" />
          </span>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-slate-900">Investors</h1>
            <p className="text-xs text-slate-500">
              Capital contributed, and the share of profit each partner has earned
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          </Button>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" /> New investor
          </Button>
        </div>
      </div>

      {summary ? (
        <section className="mb-4 rounded-lg border border-slate-200 bg-white">
          <h2 className="border-b border-slate-900 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-900 sm:px-5">
            Overall position
          </h2>
          <div className="flex flex-col divide-y divide-slate-200 px-4 sm:flex-row sm:divide-x sm:divide-y-0 sm:px-5">
            <StatCard label="Investors" value={summary.total_investors ?? 0} />
            <StatCard label="Capital held" value={money(summary.total_capital)} />
            <StatCard label="Profit distributed" value={money(summary.total_distributed)} />
            <StatCard label="Outstanding" value={money(summary.total_outstanding)} tone="outstanding" />
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-900 px-4 py-2 sm:px-5">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-900">
            Investor list
          </h2>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name…"
            className="h-8 w-56 text-xs"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="border-b border-slate-300 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                <th className="py-2 pl-4 pr-3 text-left font-semibold sm:pl-5">Investor</th>
                <th className="px-3 py-2 text-right font-semibold">Capital</th>
                <th className="px-3 py-2 text-right font-semibold">Distributed</th>
                <th className="px-3 py-2 text-right font-semibold">Paid</th>
                <th className="px-3 py-2 text-right font-semibold">Outstanding</th>
                <th className="py-2 pl-3 pr-4 text-center font-semibold sm:pr-5">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-slate-400">
                    <Loader2 className="mx-auto size-5 animate-spin" />
                  </td>
                </tr>
              ) : investors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-slate-400">
                    No investors yet. Add one to start tracking capital and profit share.
                  </td>
                </tr>
              ) : (
                investors.map((investor) => (
                  <tr key={investor.id} className="border-b border-slate-100 hover:bg-slate-50/70">
                    <td className="py-2.5 pl-4 pr-3 sm:pl-5">
                      <p className="text-sm font-medium text-slate-900">{investor.name}</p>
                      {investor.phone ? (
                        <p className="text-[11px] text-slate-500">{investor.phone}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5 text-right text-sm tabular-nums text-slate-800">
                      {money(investor.capital_balance)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-sm tabular-nums text-slate-800">
                      {money(investor.total_distributed)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-sm tabular-nums text-slate-800">
                      {money(investor.total_paid)}
                    </td>
                    <td
                      className={cn(
                        'px-3 py-2.5 text-right text-sm font-semibold tabular-nums',
                        Number(investor.outstanding) > 0.004 ? 'text-amber-700' : 'text-slate-800',
                      )}
                    >
                      {money(investor.outstanding)}
                    </td>
                    <td className="py-2.5 pl-3 pr-4 text-center sm:pr-5">
                      <span
                        className={cn(
                          'rounded border px-1.5 py-0.5 text-[10px] font-medium capitalize',
                          investor.status === 'active'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 bg-slate-50 text-slate-500',
                        )}
                      >
                        {investor.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <InvestorFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        companyId={companyId}
        onSaved={load}
      />
    </Container>
  );
}
