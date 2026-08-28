import { formatCurrency } from '@/pages/accounting/invoices/constants';
import { formatJobType, STATUS_COLORS, PRIORITY_COLORS } from '../constants';
import { formatFieldLabel, formatManifestDate } from '../lib/job-order-list.lib';
import { cn } from '@/lib/utils';

const COL_LABEL =
  'text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-3';

function KvLine({ label, value }) {
  return (
    <div className="border-b border-slate-100/60 py-2 text-xs last:border-0">
      <span className="block font-medium text-slate-400 mb-1">{label}</span>
      <span
        className="block text-sm font-semibold text-slate-800 wrap-break-word"
        title={value || undefined}
      >
        {value || '—'}
      </span>
    </div>
  );
}

function StubMoney({ label, value, accent }) {
  return (
    <div className="flex w-full items-center justify-between border-b border-slate-100 py-2 last:border-0">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <span
        className={cn(
          'text-sm font-bold tabular-nums tracking-tight text-slate-800',
          accent,
        )}
      >
        {value}
      </span>
    </div>
  );
}

function formatIssuedDate(raw) {
  if (!raw) return '—';
  const str = String(raw).trim();
  if (/[A-Za-z]/.test(str) && !str.includes('T')) return str;
  const d = new Date(str.includes('T') || str.includes('-') ? str : `${str}T00:00:00`);
  if (Number.isNaN(d.getTime())) return formatManifestDate(str) || str;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Universal Document Pass — premium ticket-stub layout for job preview / show.
 */
export function JobOrderBoardingPass({ job }) {
  const statusKey = job.status || 'scheduled';
  const statusLabel = job.status_label || String(statusKey).replace(/_/g, ' ');
  const statusClass = STATUS_COLORS[statusKey] || STATUS_COLORS.scheduled;

  const priorityKey = String(job.priority || 'normal').toLowerCase();
  const priorityLabel = job.priority_label || job.priority || 'Normal';
  const priorityClass = PRIORITY_COLORS[priorityKey] || PRIORITY_COLORS.normal;

  const jobNumber = job.job_number || `#${job.id || '—'}`;
  const jobTypeLabel = formatJobType(job.job_type) || '—';
  const dateIssued = formatIssuedDate(
    job.created_at_display || job.created_at || job.start_date,
  );
  const startDate = job.start_date_display || job.start_date || '—';
  const dueDate = job.due_date_display || job.due_date || '—';

  const customFields = (
    Array.isArray(job.custom_fields_display)
      ? job.custom_fields_display
      : Array.isArray(job.custom_fields)
        ? job.custom_fields
        : []
  ).filter((f) => f && String(f.value ?? '').trim() !== '');

  const fin = job.financial_summary || job.list_financials || {};
  const currency = fin.currency || job.currency || null;
  const revenue = fin.revenue ?? fin.total_revenue ?? fin.income ?? null;
  const cost = fin.cost ?? fin.total_cost ?? fin.expense ?? null;
  const estimated = fin.estimated_profit ?? fin.estimated ?? null;
  const profit = fin.profit ?? fin.net_profit ?? estimated ?? (
    revenue != null && cost != null ? Number(revenue) - Number(cost) : null
  );
  const hasProfit = profit != null && !Number.isNaN(Number(profit));
  const profitVal = Number(profit ?? 0);

  const moneyOrDash = (val) => (
    val == null || Number.isNaN(Number(val))
      ? '—'
      : formatCurrency(Number(val), currency)
  );

  const remarks = (job.notes || '').trim();

  return (
    <>
      <style>{`
        @media print {
          @page { margin: 12mm; size: A4 landscape; }
          html, body { background: #fff !important; }
          [data-jo-noprint] { display: none !important; }
          .jo-pass {
            box-shadow: none !important;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="jo-pass w-full space-y-4">
        {/* Main ticket — horizontal document pass */}
        <div className="relative flex min-h-95 w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:min-h-110 md:flex-row">
          {/* Left — Document Manifest */}
          <div className="flex flex-1 flex-col justify-between p-7 sm:p-8 lg:p-10">
            <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Job Order
                </p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  {jobNumber}
                </h2>
                {job.title ? (
                  <p className="mt-1.5 text-sm text-slate-500 sm:text-base">{job.title}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
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

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-10">
              <div className="min-w-0">
                <p className={COL_LABEL}>Primary Entity</p>
                <p className="text-base font-bold text-slate-800 wrap-break-word">
                  {job.customer?.name || '—'}
                </p>
                {job.customer?.email ? (
                  <p className="mt-1.5 text-sm text-slate-500 wrap-break-word">
                    {job.customer.email}
                  </p>
                ) : null}
                <p className="mt-1.5 text-sm font-medium text-slate-600">
                  {jobTypeLabel}
                </p>
              </div>

              <div className="min-w-0">
                <p className={COL_LABEL}>Schedule &amp; Timelines</p>
                <div>
                  <KvLine label="Date Issued" value={dateIssued} />
                  <KvLine label="Start Date" value={startDate} />
                  <KvLine label="Due Date" value={dueDate} />
                  {job.end_date || job.completed_at ? (
                    <KvLine
                      label="End Date"
                      value={job.end_date_display || job.end_date || job.completed_at}
                    />
                  ) : null}
                  {(job.assigned_user?.name || job.assignee?.name) ? (
                    <KvLine
                      label="Assigned"
                      value={job.assigned_user?.name || job.assignee?.name}
                    />
                  ) : null}
                </div>
              </div>

              <div className="min-w-0">
                <p className={COL_LABEL}>Tracking &amp; Specs</p>
                {customFields.length ? (
                  <div>
                    {customFields.map((f) => (
                      <KvLine
                        key={f.id || f.label}
                        label={formatFieldLabel(f.label) || f.label}
                        value={f.value}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm italic text-slate-400">No specs recorded</p>
                )}
              </div>
            </div>
          </div>

          {/* Perforated divider (desktop) */}
          <div className="relative hidden w-0 shrink-0 md:block">
            <div className="absolute inset-y-0 -left-px h-full border-r-2 border-dashed border-slate-200" />
            <div className="absolute -top-[6px] left-1/2 size-3 -translate-x-1/2 rounded-full border border-slate-200 bg-white" />
            <div className="absolute -bottom-[6px] left-1/2 size-3 -translate-x-1/2 rounded-full border border-slate-200 bg-white" />
          </div>

          {/* Mobile dashed rule */}
          <div className="relative border-t-2 border-dashed border-slate-200 md:hidden">
            <div className="absolute -left-[6px] -top-[6px] size-3 rounded-full border border-slate-200 bg-white" />
            <div className="absolute -right-[6px] -top-[6px] size-3 rounded-full border border-slate-200 bg-white" />
          </div>

          {/* Right — Financial stub (pure white) */}
          <div className="flex w-full min-w-75 flex-col justify-center border-t border-slate-200 bg-white p-7 sm:p-8 md:w-80 md:border-t-0 md:border-l lg:w-105 lg:p-10">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Financial Summary
            </p>
            <div className="w-full">
              <StubMoney label="Revenue" value={moneyOrDash(revenue)} />
              <StubMoney label="Cost" value={moneyOrDash(cost)} />
              <StubMoney
                label="Estimated Profit"
                value={moneyOrDash(hasProfit ? profitVal : null)}
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
          </div>
        </div>

        {/* Internal Remarks */}
        {remarks ? (
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Internal Remarks
            </p>
            <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-600 whitespace-pre-line">
              {remarks}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
