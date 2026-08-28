import { Edit3, Trash2, FileText, Receipt } from 'lucide-react';
import { formatJobType, STATUS_COLORS, PRIORITY_COLORS } from '../constants';
import { isJobOverdue } from './JobOrderListCells';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * High-density Excel-style row for the jobs table.
 *
 * Columns: Job ID · Title (+ custom-field chips) · Client · Type · Due
 *          · Priority · Linked docs · Status · Actions
 *
 * The Linked cell shows small chips for any linked invoice / bill; the
 * whole row is clickable to open the view modal; the actions cell stops
 * propagation so Edit / Delete don't also open the viewer.
 */

export function JobOrderListRow({ job, onView, onEdit, onDelete }) {
  const overdue = isJobOverdue(job);
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

  // Custom fields (label + value) captured against this job. We show the
  // first two inline under the title; anything beyond gets a compact
  // "+N more" pill so the row height stays predictable.
  const customFields = (job.custom_fields || []).filter(
    (f) => f && (f.value ?? '').toString().trim() !== '',
  );
  const visibleCustomFields = customFields.slice(0, 2);
  const extraCustomFields = customFields.length - visibleCustomFields.length;

  // Documents linked to this job (primary invoice, tagged invoices, bills).
  const linked = Array.isArray(job.linked_documents) ? job.linked_documents : [];

  const handleRowActivate = () => onView?.(job);

  return (
    <tr
      onClick={handleRowActivate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleRowActivate();
        }
      }}
      tabIndex={0}
      className={cn(
        'group cursor-pointer border-b border-[#F1F5F9] bg-white text-sm text-foreground transition-colors',
        'hover:bg-slate-50/70 focus-visible:outline-none focus-visible:bg-slate-50',
      )}
    >
      {/* Job ID */}
      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs font-semibold uppercase tracking-wide text-slate-700">
        {job.job_number || `#${job.id}`}
      </td>

      {/* Title + inline custom-field chips */}
      <td className="px-3 py-2.5">
        <div className="max-w-xs truncate font-semibold text-foreground group-hover:text-primary">
          {job.title || 'Untitled job'}
        </div>
        {visibleCustomFields.length ? (
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {visibleCustomFields.map((f) => (
              <span
                key={`${f.label}-${f.value}`}
                className="inline-flex max-w-45 items-center gap-1 truncate rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-600"
                title={`${f.label}: ${f.value}`}
              >
                <span className="font-medium text-slate-500">{f.label}:</span>
                <span className="truncate">{f.value}</span>
              </span>
            ))}
            {extraCustomFields > 0 ? (
              <span className="inline-flex items-center rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-500">
                +{extraCustomFields} more
              </span>
            ) : null}
          </div>
        ) : null}
      </td>

      {/* Client */}
      <td className="px-3 py-2.5">
        <div className="max-w-45 truncate text-slate-700">
          {job.customer?.name || '—'}
        </div>
      </td>

      {/* Type */}
      <td className="whitespace-nowrap px-3 py-2.5 text-slate-700">
        {jobTypeLabel}
      </td>

      {/* Due Date */}
      <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">
        {dueText ? (
          <span className={cn(overdue ? 'font-medium text-amber-700' : 'text-slate-700')}>
            {dueText}
          </span>
        ) : (
          <span className="italic text-muted-foreground/70">—</span>
        )}
      </td>

      {/* Priority */}
      <td className="whitespace-nowrap px-3 py-2.5">
        <span
          className={cn(
            'inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-semibold capitalize',
            priorityClass,
          )}
        >
          {priorityLabel}
        </span>
      </td>

      {/* Linked documents (invoices / bills) */}
      <td className="whitespace-nowrap px-3 py-2.5">
        {linked.length ? (
          <div className="flex max-w-60 flex-wrap items-center gap-1">
            {linked.slice(0, 3).map((d) => {
              const isInvoice = d.type === 'invoice';
              const Icon = isInvoice ? FileText : Receipt;
              const tone = isInvoice
                ? 'border-sky-200 bg-sky-50 text-sky-700'
                : 'border-amber-200 bg-amber-50 text-amber-700';
              return (
                <span
                  key={`${d.type}-${d.id}`}
                  className={cn(
                    'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium',
                    tone,
                  )}
                  title={`${isInvoice ? 'Invoice' : 'Bill'} ${d.number}${d.status ? ` · ${d.status}` : ''}`}
                >
                  <Icon className="size-3" />
                  <span className="tabular-nums">{d.number || '—'}</span>
                </span>
              );
            })}
            {linked.length > 3 ? (
              <span className="inline-flex items-center rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-500">
                +{linked.length - 3}
              </span>
            ) : null}
          </div>
        ) : (
          <span className="italic text-muted-foreground/70">—</span>
        )}
      </td>

      {/* Status */}
      <td className="whitespace-nowrap px-3 py-2.5">
        <span
          className={cn(
            'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
            statusClass,
          )}
        >
          {statusLabel}
        </span>
      </td>

      {/* Actions */}
      <td
        className="whitespace-nowrap px-3 py-2.5 text-right"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-end gap-1">
          {canEdit ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 text-slate-500 hover:bg-sky-50 hover:text-sky-700"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEdit?.(job);
              }}
              title="Edit job"
            >
              <Edit3 className="size-3.5" />
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 text-slate-500 hover:bg-red-50 hover:text-destructive"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete?.(job);
              }}
              title="Delete job"
            >
              <Trash2 className="size-3.5" />
            </Button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}
