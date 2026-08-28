import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Banknote,
  CalendarDays,
  ClipboardList,
  Layers,
  SearchX,
  StickyNote,
  TrendingDown,
  TrendingUp,
  UserRound,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { jobOrdersApi } from '../api/job-orders.api';
import { formatCurrency } from '@/pages/accounting/invoices/constants';
import { formatJobType, STATUS_COLORS, PRIORITY_COLORS } from '../constants';
import { formatFieldLabel } from '../lib/job-order-list.lib';
import { JobOrderAttachmentPanel } from './JobOrderAttachmentPanel';
import { JobOrderShowActions } from './JobOrderShowActions';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/* ───────────────────────── helpers ───────────────────────── */

function initialsOf(name) {
  return String(name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

function moneyOrDash(val, currency) {
  return val == null || Number.isNaN(Number(val))
    ? '—'
    : formatCurrency(Number(val), currency);
}

/**
 * The show endpoint returns a *nested* `financial_summary`
 * (revenue.recognized, cost.total, profitability.gross_profit, estimates.*)
 * while the list endpoint returns flat `list_financials`
 * (revenue / cost / profit / margin_percent). Normalise both to one flat
 * shape, using the same actual-first → estimates-fallback rule as the list.
 */
function extractFinancials(job) {
  const fs = job?.financial_summary;
  const nested =
    fs && (typeof fs.revenue === 'object' || typeof fs.cost === 'object');

  if (nested) {
    const currency = fs.currency || job.currency || null;
    const actualRevenue = Number(fs.revenue?.primary ?? fs.revenue?.recognized ?? 0);
    const actualCost = Number(fs.cost?.total ?? 0);

    if (actualRevenue > 0 || actualCost > 0) {
      const profit = fs.profitability?.gross_profit ?? actualRevenue - actualCost;
      return {
        currency,
        basis: 'actual',
        revenue: actualRevenue,
        cost: actualCost,
        profit,
        marginPercent: fs.profitability?.margin_percent ?? null,
      };
    }

    const est = fs.estimates || {};
    if (est.estimated_revenue != null || est.estimated_cost != null) {
      const revenue = Number(est.estimated_revenue ?? 0);
      const cost = Number(est.estimated_cost ?? 0);
      const profit =
        est.estimated_profit != null ? Number(est.estimated_profit) : revenue - cost;
      return {
        currency,
        basis: 'estimated',
        revenue,
        cost,
        profit,
        marginPercent: revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : null,
      };
    }

    return { currency, basis: 'none', revenue: null, cost: null, profit: null, marginPercent: null };
  }

  const fin = job?.list_financials || fs || {};
  const revenue = fin.revenue ?? fin.total_revenue ?? fin.income ?? null;
  const cost = fin.cost ?? fin.total_cost ?? fin.expense ?? null;
  const profit =
    fin.profit ??
    fin.net_profit ??
    (revenue != null && cost != null ? Number(revenue) - Number(cost) : null);
  return {
    currency: fin.currency || job?.currency || null,
    basis: fin.basis || (revenue != null || cost != null ? 'actual' : 'none'),
    revenue,
    cost,
    profit,
    marginPercent: fin.margin_percent ?? null,
  };
}

/* ───────────────────────── building blocks ───────────────────────── */

function StatTile({ icon: Icon, label, value, accent, iconClass }) {
  return (
    <div className="flex items-center gap-3.5 px-5 py-4 sm:px-6">
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-xl',
          iconClass || 'bg-slate-100 text-slate-500',
        )}
      >
        <Icon className="size-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <p
          className={cn(
            'mt-0.5 truncate text-lg font-bold tabular-nums tracking-tight text-slate-900',
            accent,
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function SectionCard({ icon: Icon, title, children, className }) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs',
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
        <Icon className="size-3.5 text-slate-400" />
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
          {title}
        </h3>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

/** Vertical milestone timeline: Issued → Start → Due → End. */
function ScheduleTimeline({ items }) {
  const visible = items.filter((i) => i.value && i.value !== '—');
  const list = visible.length ? visible : items.slice(0, 3);
  return (
    <ol className="relative space-y-0">
      {list.map((item, idx) => (
        <li key={item.label} className="relative flex gap-3.5 pb-5 last:pb-0">
          {idx < list.length - 1 ? (
            <span className="absolute left-[7px] top-5 h-full w-px bg-slate-200" aria-hidden />
          ) : null}
          <span
            className={cn(
              'relative z-10 mt-1 size-[15px] shrink-0 rounded-full border-[3px] bg-white',
              item.emphasis ? 'border-primary' : 'border-slate-300',
            )}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {item.label}
            </p>
            <p
              className={cn(
                'mt-0.5 text-sm font-semibold',
                item.value && item.value !== '—' ? 'text-slate-800' : 'text-slate-400',
              )}
            >
              {item.value || 'Not set'}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function SpecRow({ label, value }) {
  return (
    <div className="min-w-0 border-b border-slate-100 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p
        className="mt-0.5 text-sm font-semibold text-slate-800 wrap-break-word"
        title={value || undefined}
      >
        {value || '—'}
      </p>
    </div>
  );
}

/* ───────────────────────── detail body ───────────────────────── */

function JobOrderDetail({ job }) {
  const statusKey = job.status || 'scheduled';
  const statusLabel = job.status_label || String(statusKey).replace(/_/g, ' ');
  const statusClass = STATUS_COLORS[statusKey] || STATUS_COLORS.scheduled;

  const priorityKey = String(job.priority || 'normal').toLowerCase();
  const priorityLabel = job.priority_label || job.priority || 'Normal';
  const priorityClass = PRIORITY_COLORS[priorityKey] || PRIORITY_COLORS.normal;

  const customerName = job.customer?.name || '—';
  const assignedName = job.assigned_user?.name || job.assignee?.name || null;
  const jobTypeLabel = formatJobType(job.job_type) || null;

  const customFields = (
    Array.isArray(job.custom_fields_display)
      ? job.custom_fields_display
      : Array.isArray(job.custom_fields)
        ? job.custom_fields
        : []
  ).filter((f) => f && String(f.value ?? '').trim() !== '');

  const fin = extractFinancials(job);
  const { currency, revenue, cost, profit, marginPercent } = fin;
  const hasProfit = profit != null && !Number.isNaN(Number(profit));
  const profitVal = Number(profit ?? 0);
  const profitLabel = fin.basis === 'estimated' ? 'Estimated profit' : 'Profit';

  const remarks = (job.notes || '').trim();

  const scheduleItems = [
    { label: 'Date issued', value: job.created_at_display || null },
    { label: 'Start date', value: job.start_date_display || job.start_date || null },
    { label: 'Due date', value: job.due_date_display || job.due_date || null, emphasis: true },
    {
      label: 'End date',
      value: job.end_date_display || job.end_date || job.completed_at || null,
    },
  ];

  return (
    <div className="space-y-5">
      {/* ── Hero: identity + badges + parties ── */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4 px-5 pt-5 sm:px-6">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Job order
            </p>
            <h2 className="mt-1 font-mono text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">
              {job.job_number || `#${job.id || '—'}`}
            </h2>
            {job.title ? (
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-500 sm:text-[15px]">
                {job.title}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide',
                statusClass,
              )}
            >
              {statusLabel}
            </span>
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold capitalize',
                priorityClass,
              )}
            >
              {priorityLabel}
            </span>
          </div>
        </div>

        {/* Party strip: customer / type / assignee */}
        <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-slate-100 bg-slate-50/50 px-5 py-3.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
              {initialsOf(customerName) || '—'}
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Customer
              </p>
              <p className="truncate text-sm font-semibold text-slate-800">
                {customerName}
                {job.customer?.email ? (
                  <span className="ml-2 hidden font-normal text-slate-400 sm:inline">
                    {job.customer.email}
                  </span>
                ) : null}
              </p>
            </div>
          </div>

          {jobTypeLabel ? (
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Job type
              </p>
              <p className="truncate text-sm font-semibold text-slate-800">{jobTypeLabel}</p>
            </div>
          ) : null}

          {assignedName ? (
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-200/80 text-slate-500">
                <UserRound className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Assigned to
                </p>
                <p className="truncate text-sm font-semibold text-slate-800">{assignedName}</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* ── Financial performance strip ── */}
      <div className="grid grid-cols-1 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <StatTile
          icon={Banknote}
          label="Revenue"
          value={moneyOrDash(revenue, currency)}
          iconClass="bg-blue-50 text-blue-600"
        />
        <StatTile
          icon={Wallet}
          label="Cost"
          value={moneyOrDash(cost, currency)}
          iconClass="bg-amber-50 text-amber-600"
        />
        <StatTile
          icon={hasProfit && profitVal < 0 ? TrendingDown : TrendingUp}
          label={
            marginPercent != null ? `${profitLabel} · ${marginPercent}% margin` : profitLabel
          }
          value={moneyOrDash(hasProfit ? profitVal : null, currency)}
          iconClass={
            hasProfit && profitVal < 0
              ? 'bg-red-50 text-red-600'
              : 'bg-emerald-50 text-emerald-600'
          }
          accent={
            hasProfit
              ? profitVal < 0
                ? 'text-red-600'
                : profitVal > 0
                  ? 'text-emerald-600'
                  : undefined
              : undefined
          }
        />
      </div>

      {/* ── Schedule + specs ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <SectionCard icon={CalendarDays} title="Schedule & timeline" className="lg:col-span-2">
          <ScheduleTimeline items={scheduleItems} />
        </SectionCard>

        <SectionCard icon={Layers} title="Tracking & specs" className="lg:col-span-3">
          {customFields.length ? (
            <div className="grid grid-cols-1 gap-x-10 sm:grid-cols-2 xl:grid-cols-3">
              {customFields.map((f) => (
                <SpecRow
                  key={f.id || f.label}
                  label={formatFieldLabel(f.label) || f.label}
                  value={f.value}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-8 text-center">
              <Layers className="size-6 text-slate-300" />
              <p className="mt-2 text-sm text-slate-400">No specs recorded for this job.</p>
            </div>
          )}
        </SectionCard>
      </div>

      <JobOrderAttachmentPanel jobOrderId={job.id} />

      {/* ── Internal remarks ── */}
      {remarks ? (
        <SectionCard icon={StickyNote} title="Internal remarks">
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">{remarks}</p>
        </SectionCard>
      ) : null}
    </div>
  );
}

/* ───────────────────────── skeleton ───────────────────────── */

function DetailSkeleton() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </div>
        <div className="mt-5 flex gap-8 border-t border-slate-100 pt-4">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-8 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-slate-200/80 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 bg-white p-5">
            <Skeleton className="size-10 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-24" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <Skeleton className="h-56 rounded-xl lg:col-span-2" />
        <Skeleton className="h-56 rounded-xl lg:col-span-3" />
      </div>
    </div>
  );
}

/* ───────────────────────── dialog shell ───────────────────────── */

/**
 * Read-only "View details" modal — fetches the full job order and renders a
 * premium document-style summary with the same action toolbar as the show page.
 */
export function JobOrderViewDialog({ open, onOpenChange, jobOrderId, onEdit, onDelete }) {
  const { id: workspaceId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !jobOrderId) {
      setJob(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    jobOrdersApi
      .show(jobOrderId)
      .then((res) => {
        if (!cancelled) setJob(res.data?.data || null);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err?.response?.data?.message || 'Failed to load job order');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, jobOrderId]);

  const flags = job?.flags || {};
  const canEdit = flags.can_edit !== false && (job?.status || '') !== 'cancelled';
  const canDelete = flags.can_delete === true;

  const base = `/workspace/${workspaceId}/accounting/job-orders`;
  const plByJobReport = `/workspace/${workspaceId}/accounting/reports/profit-loss-by-job`;

  const recordPaths = useMemo(
    () => ({
      invoiceCreate: `/workspace/${workspaceId}/accounting/invoices/create?job_order_id=${jobOrderId}`,
      expenseCreate: `/workspace/${workspaceId}/accounting/journal/create?job_order_id=${jobOrderId}`,
      billCreate: `/workspace/${workspaceId}/accounting/bills/create?job_order_id=${jobOrderId}`,
    }),
    [workspaceId, jobOrderId],
  );

  const handleEdit = () => {
    if (!job) return;
    onOpenChange(false);
    onEdit?.(job);
  };

  const handleDelete = () => {
    if (!job) return;
    onOpenChange(false);
    onDelete?.(job);
  };

  // Close the dialog before navigating so Radix removes its
  // pointer-events lock from <body>; otherwise the destination page
  // (e.g. invoice create) is frozen until a manual refresh.
  const handleNavigate = (to) => {
    onOpenChange(false);
    setTimeout(() => {
      // Belt-and-braces: Radix restores this asynchronously and can lose the
      // race against unmount, which is exactly the frozen-page bug.
      document.body.style.pointerEvents = '';
      navigate(to);
    }, 0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[96vw] max-w-7xl! max-h-[94vh] overflow-hidden rounded-2xl bg-white p-0"
        overlayClassName="bg-black/30 backdrop-blur-none"
      >
        <DialogHeader className="border-b border-slate-200/80 bg-white px-5 py-3.5 sm:px-6">
          <div className="flex items-center gap-3 pr-8">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ClipboardList className="size-4" />
            </span>
            <DialogTitle className="text-sm font-semibold text-slate-900">
              Job order details
            </DialogTitle>
          </div>
        </DialogHeader>

        <DialogBody className="overflow-y-auto bg-white p-4 sm:p-5 lg:p-6">
          {loading ? (
            <DetailSkeleton />
          ) : job ? (
            <JobOrderDetail job={job} />
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-slate-100">
                <SearchX className="size-6 text-slate-400" />
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-700">Job order not found</p>
              <p className="mt-1 text-sm text-slate-500">
                It may have been deleted, or you may not have access to it.
              </p>
            </div>
          )}
        </DialogBody>

        {job ? (
          <DialogFooter className="flex-col items-stretch gap-0 border-t border-slate-200/80 bg-white px-5 py-3.5 sm:flex-col sm:items-stretch sm:px-6">
            <JobOrderShowActions
              base={base}
              plByJobReport={plByJobReport}
              jobOrderId={jobOrderId}
              canEdit={canEdit}
              canDelete={canDelete}
              paths={recordPaths}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onNavigate={handleNavigate}
              showNavigation={false}
              showPlReport={false}
              convertButtonLabel="Convert"
              className="justify-end"
            />
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
