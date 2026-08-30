import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, Calculator, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Container } from '@/components/common/container';
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
import { cn } from '@/lib/utils';
import { investmentsApi } from '../../api/investments.api';

function money(value, { signed = false } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(n));

  return n < -0.004 ? `−${formatted}` : signed && n > 0.004 ? formatted : formatted;
}

function isNegative(value) {
  const n = Number(value);
  return Number.isFinite(n) && n < -0.004;
}

/** One line of the calculation, laid out as a statement row. */
function Line({ label, amount, deduct = false, indent = false, muted = false }) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 py-1 leading-snug',
        indent && 'pl-4',
      )}
    >
      <div className={cn('min-w-0 flex-1 text-sm', muted ? 'text-slate-500' : 'text-slate-700')}>
        {label}
      </div>
      <span
        className={cn(
          'w-40 shrink-0 text-right text-sm tabular-nums',
          isNegative(amount) ? 'text-red-600' : 'text-slate-900',
        )}
      >
        {deduct && Number(amount) > 0.004 ? `(${money(amount)})` : money(amount)}
      </span>
    </div>
  );
}

function Subtotal({ label, amount }) {
  return (
    <div className="mt-2 flex items-baseline gap-2 border-t border-slate-300 pt-2">
      <span className="min-w-0 flex-1 text-sm font-semibold text-slate-900">{label}</span>
      <span
        className={cn(
          'w-40 shrink-0 text-right text-sm font-semibold tabular-nums',
          isNegative(amount) ? 'text-red-600' : 'text-slate-900',
        )}
      >
        {money(amount)}
      </span>
    </div>
  );
}

function GrandTotal({ label, amount }) {
  return (
    <div className="flex items-baseline gap-2 border-t-[3px] border-double border-slate-900 py-2.5">
      <span className="min-w-0 flex-1 text-sm font-semibold text-slate-900">{label}</span>
      <span
        className={cn(
          'w-40 shrink-0 text-right text-base font-bold tabular-nums',
          isNegative(amount) ? 'text-red-600' : 'text-emerald-700',
        )}
      >
        {money(amount)}
      </span>
    </div>
  );
}

export function DistributionCalculationPage() {
  const { investmentId } = useParams();
  const [investment, setInvestment] = useState(null);
  const [calc, setCalc] = useState(null);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [distributionId, setDistributionId] = useState(null);

  const load = useCallback(async () => {
    if (!investmentId) return;
    setLoading(true);
    try {
      const [contract, preview] = await Promise.all([
        investmentsApi.getInvestment(investmentId),
        investmentsApi.calculate(investmentId, { month: `${month}-01` }),
      ]);
      setInvestment(contract?.data?.data ?? null);
      setCalc(preview?.data?.data ?? null);
      setDistributionId(null);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not prepare the calculation.');
    } finally {
      setLoading(false);
    }
  }, [investmentId, month]);

  useEffect(() => {
    load();
  }, [load]);

  const unallocated = calc?.unallocated_expenses ?? [];
  const blocked = unallocated.length > 0;

  const expenseLines = useMemo(() => {
    const lines = calc?.expense_lines ?? [];
    return {
      direct: lines.filter((l) => l.basis === 'direct'),
      allocated: lines.filter((l) => l.basis === 'allocated'),
    };
  }, [calc]);

  const post = async () => {
    setPosting(true);
    try {
      // Two deliberate steps: record the calculation, then commit it. The
      // preview above wrote nothing.
      const created = distributionId
        ? { data: { data: { id: distributionId } } }
        : await investmentsApi.createDistribution({
            investment_id: Number(investmentId),
            period_start: calc.period.from,
            period_end: calc.period.to,
          });

      const id = created?.data?.data?.id ?? distributionId;
      setDistributionId(id);
      await investmentsApi.postDistribution(id);
      toast.success('Distribution posted to the ledger.');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not post the distribution.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <Container className="py-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <Calculator className="size-4.5" />
          </span>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-slate-900">
              Investor profit distribution
            </h1>
            <p className="text-xs text-slate-500">
              {investment?.investor?.name
                ? `${investment.investor.name} · ${Number(investment.profit_share_percentage)}% of eligible profit`
                : 'Review the calculation before posting'}
            </p>
          </div>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <Label htmlFor="period" className="text-[11px]">Period</Label>
            <Input
              id="period"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="h-9 w-44"
            />
          </div>
          <Button variant="outline" size="sm" className="h-9" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : 'Recalculate'}
          </Button>
        </div>
      </div>

      {blocked ? (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-900">
                {unallocated.length} expense{unallocated.length === 1 ? '' : 's'} in this period
                {unallocated.length === 1 ? ' has' : ' have'} not been assigned to a category
              </p>
              <p className="mt-0.5 text-xs text-amber-800">
                Until they are, this profit figure could be too high. Assign each one to a category,
                or add a shared-expense rule for its account, then recalculate.
              </p>
              <ul className="mt-2 space-y-1">
                {unallocated.map((row) => (
                  <li key={row.expense_id} className="flex items-center gap-2 text-xs text-amber-900">
                    <span className="tabular-nums">{row.expense_date}</span>
                    <span className="truncate">{row.account_name || row.description || 'Expense'}</span>
                    <span className="ml-auto font-semibold tabular-nums">{money(row.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-900 px-4 py-2 sm:px-5">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-900">
            Calculation
          </h2>
          <p className="text-[11px] text-slate-500">
            {calc?.period ? `${calc.period.from} – ${calc.period.to}` : ''}
            {calc?.scope?.categories?.length
              ? ` · ${calc.scope.categories.map((c) => c.name).join(', ')}`
              : ''}
          </p>
        </div>

        <div className="px-4 py-5 sm:px-6">
          {loading ? (
            <div className="py-10 text-center">
              <Loader2 className="mx-auto size-5 animate-spin text-slate-400" />
            </div>
          ) : !calc ? (
            <p className="py-10 text-center text-sm text-slate-400">No calculation available.</p>
          ) : (
            <>
              <Line label="Revenue" amount={calc.revenue} />
              <Line label="Cost of goods sold" amount={calc.cogs} deduct />
              <Subtotal label="Gross profit" amount={calc.gross_profit} />

              <div className="mt-4">
                <Line label="Direct expenses" amount={calc.direct_expenses} deduct />
                {expenseLines.direct.map((line, i) => (
                  <Line
                    key={`d-${line.expense_id}-${i}`}
                    label={line.account_name || line.description || 'Expense'}
                    amount={line.amount}
                    indent
                    muted
                  />
                ))}

                <Line label="Shared allocated expenses" amount={calc.allocated_expenses} deduct />
                {expenseLines.allocated.map((line, i) => (
                  <Line
                    key={`a-${line.expense_id}-${i}`}
                    label={`${line.account_name || line.description || 'Expense'} · ${line.percentage}%`}
                    amount={line.amount}
                    indent
                    muted
                  />
                ))}
              </div>

              <Subtotal label="Eligible profit" amount={calc.eligible_profit} />

              <div className="mt-4 flex items-center gap-3 py-1">
                <div className="min-w-0 flex-1 text-sm text-slate-700">
                  Profit share — {investment?.investor?.name || 'Investor'}
                </div>
                <span className="w-40 shrink-0 text-right text-sm tabular-nums text-slate-900">
                  {Number(calc.profit_share_percentage ?? 0)}%
                </span>
              </div>

              <GrandTotal label="Distribution" amount={calc.distribution_amount} />

              {Number(calc.eligible_profit) <= 0 ? (
                <p className="mt-2 text-xs text-slate-500">
                  The period made no profit, so nothing is distributed. The result is recorded so the
                  month is not silently skipped.
                </p>
              ) : null}
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 px-4 py-3 sm:px-5">
          <Button
            onClick={post}
            disabled={posting || loading || blocked || !calc}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {posting ? <Loader2 className="size-4 animate-spin" /> : 'Post distribution'}
          </Button>
        </div>
      </section>
    </Container>
  );
}
