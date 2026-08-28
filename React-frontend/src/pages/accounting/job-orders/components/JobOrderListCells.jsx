import { Link } from 'react-router';
import { formatJobType } from '../constants';
import { statusBadgeClass, statusLabel } from '../lib/job-order-list-options';
import { formatCurrency } from '@/pages/accounting/invoices/constants';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function isJobOverdue(job) {
  if (!job?.due_date) return false;
  const terminal = ['completed', 'cancelled'];
  if (terminal.includes(String(job.status || '').toLowerCase())) return false;
  const due = new Date(job.due_date);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

export function jobBarSegments(financials) {
  const fin = financials || {};
  const revenue = Math.max(0, Number(fin.revenue) || 0);
  const cost = Math.max(0, Number(fin.cost) || 0);
  const profit = Number(fin.profit) || 0;
  const isLoss = profit < 0;

  if (fin.basis === 'none' && revenue === 0 && cost === 0) {
    return { costPct: 0, profitPct: 0, isLoss: false, empty: true };
  }

  if (revenue > 0) {
    const costPct = Math.min(100, Math.round((cost / revenue) * 100));
    const profitPct = isLoss ? 0 : Math.min(100 - costPct, Math.round((Math.max(profit, 0) / revenue) * 100));

    return { costPct, profitPct, isLoss, empty: false };
  }

  if (cost > 0) {
    return { costPct: 100, profitPct: 0, isLoss: true, empty: false };
  }

  return { costPct: 0, profitPct: 0, isLoss: false, empty: true };
}

export function JobOrderListFinancialBarCell({ job }) {
  const fin = job.list_financials || {};
  const { costPct, profitPct, isLoss, empty } = jobBarSegments(fin);
  const isEstimate = fin.basis === 'estimated';

  if (empty) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <div className="min-w-[120px] max-w-[180px]">
      <div className="h-1.5 rounded-full bg-muted overflow-hidden flex">
        {costPct > 0 ? (
          <div
            className={cn('h-full', isLoss ? 'bg-red-400' : 'bg-amber-500')}
            style={{ width: `${Math.max(costPct, 2)}%` }}
          />
        ) : null}
        {profitPct > 0 ? (
          <div
            className="h-full bg-emerald-500"
            style={{ width: `${Math.max(profitPct, 2)}%` }}
          />
        ) : null}
      </div>
      <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">
        {fin.margin_percent != null ? `${fin.margin_percent}% margin` : 'Margin —'}
        {isEstimate ? ' · Est.' : fin.basis === 'actual' ? ' · Act.' : ''}
      </p>
    </div>
  );
}

export function JobOrderListSummaryCell({ job, base, statusOptions }) {
  const fin = job.list_financials || {};
  const currency = fin.currency || 'USD';
  const overdue = isJobOverdue(job);
  const { costPct, profitPct, isLoss, empty } = jobBarSegments(fin);
  const isEstimate = fin.basis === 'estimated';

  const status = job.status || 'scheduled';
  const dueText = job.due_date_display || job.due_date;

  return (
    <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-8 py-1 min-w-[520px]">
      <div className="lg:w-[38%] shrink-0 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <Link
                to={`${base}/${job.id}`}
                className="font-mono text-sm font-semibold text-primary hover:underline shrink-0"
              >
                {job.job_number || '—'}
              </Link>
              <span className="text-sm font-medium truncate">{job.title || 'Untitled job'}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {job.customer?.name || 'No customer'}
              {dueText ? (
                <>
                  {' · '}
                  <span className={cn(overdue && 'text-amber-600 dark:text-amber-400 font-medium')}>
                    Due {dueText}
                  </span>
                </>
              ) : null}
              {' · '}
              {formatJobType(job.job_type)}
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn(
              'rounded-full capitalize text-[10px] shrink-0',
              job.status_badge_class || statusBadgeClass(statusOptions, status),
            )}
          >
            {job.status_label || statusLabel(statusOptions, status)}
          </Badge>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        {empty ? (
          <p className="text-xs text-muted-foreground">No financial activity yet</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 text-xs mb-2">
              <div>
                <p className="text-muted-foreground">Revenue</p>
                <p className="font-semibold tabular-nums mt-0.5">
                  {formatCurrency(fin.revenue ?? 0, currency)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Cost</p>
                <p className="font-semibold tabular-nums mt-0.5 text-amber-700 dark:text-amber-400">
                  {formatCurrency(fin.cost ?? 0, currency)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground">Profit</p>
                <p
                  className={cn(
                    'font-bold tabular-nums mt-0.5',
                    isLoss ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400',
                  )}
                >
                  {formatCurrency(fin.profit ?? 0, currency)}
                </p>
              </div>
            </div>

            <div className="h-2 rounded-full bg-muted overflow-hidden flex">
              {costPct > 0 ? (
                <div
                  className={cn('h-full', isLoss ? 'bg-red-400' : 'bg-amber-500')}
                  style={{ width: `${Math.max(costPct, 2)}%` }}
                />
              ) : null}
              {profitPct > 0 ? (
                <div
                  className="h-full bg-emerald-500"
                  style={{ width: `${Math.max(profitPct, 2)}%` }}
                />
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-2 mt-1.5 text-[10px] text-muted-foreground">
              <span>
                {fin.margin_percent != null ? `${fin.margin_percent}% margin` : 'Margin —'}
                {isEstimate ? ' · Estimated' : fin.basis === 'actual' ? ' · Actual' : ''}
              </span>
              <span className="tabular-nums">
                {costPct > 0 || profitPct > 0 ? `${costPct}% cost · ${profitPct}% profit` : ''}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
