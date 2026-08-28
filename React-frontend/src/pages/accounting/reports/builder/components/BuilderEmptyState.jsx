import { Clock, FileStack, LayoutTemplate, Sparkles, Wand2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { datasetIcon } from '../dataset-meta';
import { REPORT_TEMPLATES, TEMPLATE_CATEGORY_LABELS } from '../report-templates';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function ReportRow({ report, onOpen }) {
  const Icon = datasetIcon(report.dataset_key);
  return (
    <button
      type="button"
      onClick={() => onOpen(report)}
      className="group flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-left transition-all hover:border-slate-300 hover:shadow-sm"
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500">
        <Icon className="size-4" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-800">{report.name}</p>
        <p className="text-xs text-slate-400">
          {report.last_run_at ? `Last run ${timeAgo(report.last_run_at)}` : 'Not run yet'}
        </p>
      </div>
    </button>
  );
}

function TemplateCard({ template, onUse }) {
  const Icon = template.icon;
  return (
    <button
      type="button"
      onClick={() => onUse(template)}
      className="group flex flex-col items-start gap-2 rounded-lg border border-slate-200 bg-white p-3.5 text-left transition-all hover:border-slate-300 hover:shadow-sm"
    >
      <div className="flex size-9 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500 transition-colors group-hover:border-slate-300 group-hover:text-slate-700">
        <Icon className="size-4.5" strokeWidth={1.75} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800">{template.label}</p>
        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-500">{template.description}</p>
      </div>
      <span className="mt-auto rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
        {TEMPLATE_CATEGORY_LABELS[template.category] || template.category}
      </span>
    </button>
  );
}

/**
 * Landing state before a dataset is chosen: recent reports, starter
 * templates, and frequently-run reports across the company — all
 * derived from data the hub already fetches (reportCenterApi.index()),
 * no new endpoints.
 */
export function BuilderEmptyState({ recentReports, popularReports, onStartBlank, onUseTemplate, onOpenReport }) {
  const { id: workspaceId } = useParams();
  const createPath = `/workspace/${workspaceId}/accounting/reports/create`;

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col gap-8 overflow-y-auto px-6 py-10">
      <div className="flex flex-col items-center text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 shadow-sm">
          <Sparkles className="size-6 text-slate-400" strokeWidth={1.5} />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-slate-900">Advanced report builder</h2>
        <p className="mt-1 max-w-md text-sm text-slate-500">
          New here? Start with the guided setup — it takes about 30 seconds. Or pick a template below.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Link
            to={createPath}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800"
          >
            <Wand2 className="size-3.5" />
            Guided setup
          </Link>
          <button
            type="button"
            onClick={onStartBlank}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <FileStack className="size-3.5" />
            Choose data source
          </button>
        </div>
      </div>

      {recentReports?.length > 0 ? (
        <section>
          <SectionHeading icon={Clock} title="Recent Reports" />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {recentReports.slice(0, 4).map((r) => (
              <ReportRow key={r.id} report={r} onOpen={onOpenReport} />
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <SectionHeading icon={LayoutTemplate} title="Report Templates" subtitle="Pre-built starting points using your data" />
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {REPORT_TEMPLATES.map((t) => (
            <TemplateCard key={t.id} template={t} onUse={onUseTemplate} />
          ))}
        </div>
      </section>

      {popularReports?.length > 0 ? (
        <section>
          <SectionHeading icon={Sparkles} title="Popular Reports" subtitle="Frequently run across your company" />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {popularReports.slice(0, 4).map((r) => (
              <ReportRow key={r.id} report={r} onOpen={onOpenReport} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function SectionHeading({ icon: Icon, title, subtitle }) {
  return (
    <div className={cn('mb-2.5 flex items-baseline gap-2')}>
      <Icon className="size-3.5 text-slate-400" strokeWidth={1.75} />
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      {subtitle ? <span className="text-xs text-slate-400">— {subtitle}</span> : null}
    </div>
  );
}
