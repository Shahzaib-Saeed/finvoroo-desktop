import { Edit3, Trash2 } from 'lucide-react';
import { formatJobType, STATUS_COLORS, PRIORITY_COLORS } from '../constants';
import { isJobOverdue, jobBarSegments } from './JobOrderListCells';
import { formatCurrency } from '@/pages/accounting/invoices/constants';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Clean enterprise job card. Replaces the previous boarding-pass layout with a
 * single rounded rectangle:
 *
 *   ┌─┬──────────────────────────────────────────────┐
 *   │ │  JO-26-0012                    [IN PROGRESS] │  ← header row
 *   │A│  Export – custom only                        │  ← title
 *   │ │  ┌────────────────┬─────────────────┐        │
 *   │ │  │ Client         │ Type            │        │
 *   │ │  │ Type           │ Due             │        │  ← 2×2 details
 *   │ │  └────────────────┴─────────────────┘        │
 *   │ │  Profit chip · $ amount · progress bar       │  ← finance line
 *   └─┴──────────────────────────────────────────────┘
 *      ↑ 4px financial-status accent (green / orange / red)
 */

// Left-accent color driven by job P&L. Cost = orange only when we've booked
// spend but no revenue yet; a positive profit trumps cost.
function resolveFinanceAccent(fin, isLoss, empty) {
  if (empty) return null;
  if (isLoss) {
    return {
      border: 'border-l-red-500',
      chip: 'bg-red-50 text-red-700 border-red-200',
      value: 'text-red-600',
      label: 'Loss',
    };
  }
  if ((fin.profit ?? 0) > 0) {
    return {
      border: 'border-l-emerald-500',
      chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      value: 'text-emerald-600',
      label: 'Profit',
    };
  }
  return {
    border: 'border-l-orange-500',
    chip: 'bg-orange-50 text-orange-700 border-orange-200',
    value: 'text-orange-600',
    label: 'Cost',
  };
}

function DetailCell({ label, children }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="min-w-0 truncate text-[13px] font-semibold text-foreground">
        {children}
      </div>
    </div>
  );
}

export function JobOrderListCard({ job, onView, onEdit, onDelete }) {
  const fin = job.list_financials || {};
  const currency = fin.currency || 'USD';
  const overdue = isJobOverdue(job);
  const { costPct, profitPct, isLoss, empty } = jobBarSegments(fin);
  const canDelete = job.flags?.can_delete;
  const canEdit = job.flags?.can_edit !== false && (job.status || '') !== 'cancelled';

  const statusKey = job.status || 'scheduled';
  const statusLabel = job.status_label || String(statusKey).replace(/_/g, ' ');
  const statusClass = STATUS_COLORS[statusKey] || STATUS_COLORS.scheduled;

  const priorityKey = (job.priority || 'normal').toLowerCase();
  const priorityLabel = job.priority_label || job.priority || 'Normal';
  const priorityClass = PRIORITY_COLORS[priorityKey] || PRIORITY_COLORS.normal;

  const jobTypeLabel = formatJobType(job.job_type) || '—';
  const dueText = job.due_date_display || job.due_date;

  const accent = resolveFinanceAccent(fin, isLoss, empty);

  return (
    <div className="group relative h-full">
      <div
        role="button"
        tabIndex={0}
        onClick={() => onView?.(job)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onView?.(job);
          }
        }}
        className={cn(
          // 4px left-border accent is the primary financial signal. When there's
          // no financial data yet (draft jobs) we render a neutral border so the
          // card doesn't visually shout "everything is fine".
          // min-h locks the card to a fixed silhouette so badges like "Urgent"
          // vs "Normal" can't cause subtle inter-row height shifts.
          'flex h-full min-h-64 cursor-pointer flex-col rounded-lg border border-l-4 bg-card p-4 shadow-sm transition-all',
          'hover:-translate-y-0.5 hover:border-border hover:shadow-md',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          accent ? accent.border : 'border-l-slate-300',
        )}
      >
        {/* Header row: Job # · Status badge */}
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-mono text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {job.job_number || `#${job.id}`}
          </p>
          <span
            className={cn(
              'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
              statusClass,
            )}
          >
            {statusLabel}
          </span>
        </div>

        {/* Title */}
        <h3 className="mt-2 line-clamp-2 text-[15px] font-bold leading-snug text-foreground group-hover:text-primary">
          {job.title || 'Untitled job'}
        </h3>

        {/* 2×2 details grid */}
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
          <DetailCell label="Client">
            <span>{job.customer?.name || '—'}</span>
          </DetailCell>
          <DetailCell label="Type">
            <span>{jobTypeLabel}</span>
          </DetailCell>
          <DetailCell label="Due date">
            {dueText ? (
              <span
                className={cn('tabular-nums', overdue && 'text-amber-700')}
              >
                {dueText}
              </span>
            ) : (
              <span className="font-medium italic text-muted-foreground/70">
                No due date
              </span>
            )}
          </DetailCell>
          <DetailCell label="Priority">
            <span
              className={cn(
                'inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-semibold capitalize',
                priorityClass,
              )}
            >
              {priorityLabel}
            </span>
          </DetailCell>
        </div>

        {/*
          Finance summary — ALWAYS rendered so every card ends at the same
          y-offset regardless of whether it has revenue/cost booked yet.
          Empty state gets a neutral "No financials" line + a hollow bar,
          which prevents subtle vertical shifts across the grid.
        */}
        <div className="mt-4 border-t border-border pt-3">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                accent
                  ? accent.chip
                  : 'border-dashed border-border bg-muted/40 text-muted-foreground',
              )}
            >
              {accent ? accent.label : 'No financials'}
            </span>
            <span
              className={cn(
                'font-bold tabular-nums',
                accent ? accent.value : 'text-muted-foreground',
              )}
            >
              {formatCurrency(fin.profit ?? 0, currency)}
            </span>
          </div>
          <div className="mt-2 flex h-1 overflow-hidden rounded-full bg-muted">
            {costPct > 0 ? (
              <div
                className={cn('h-full', isLoss ? 'bg-red-400' : 'bg-orange-500')}
                style={{ width: `${Math.max(costPct, 4)}%` }}
              />
            ) : null}
            {profitPct > 0 ? (
              <div
                className="h-full bg-emerald-500"
                style={{ width: `${Math.max(profitPct, 4)}%` }}
              />
            ) : null}
          </div>
        </div>
      </div>

      <div className="absolute right-2 top-2 z-10 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {canEdit ? (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="size-7 bg-background/90 shadow-sm backdrop-blur-sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEdit?.(job);
            }}
            title="Edit job"
          >
            <Edit3 className="size-3.5 text-sky-700" />
          </Button>
        ) : null}
        {canDelete ? (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="size-7 bg-background/90 shadow-sm backdrop-blur-sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete?.(job);
            }}
            title="Delete job"
          >
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
