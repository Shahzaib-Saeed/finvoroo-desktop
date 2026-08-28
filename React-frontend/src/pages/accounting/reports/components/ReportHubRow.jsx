import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { datasetIcon } from '../builder/dataset-meta';
import { definitionOpenPath, recordViewPayload } from '../lib/report-definition-links';
import { reportCenterApi } from '../api/report-center.api';

function formatWhen(value) {
  if (!value) return null;
  const d = new Date(value);
  const now = new Date();
  const diffMs = now - d;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function ReportHubRow({
  title,
  description,
  to,
  icon: IconOverride,
  datasetKey,
  meta,
  badge,
  onOpen,
  className,
}) {
  const Icon = IconOverride || (datasetKey ? datasetIcon(datasetKey) : null);

  return (
    <Link
      to={to}
      onClick={onOpen}
      className={cn(
        'group flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3.5 py-3 transition-all',
        'hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-sm',
        className,
      )}
    >
      {Icon ? (
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 group-hover:border-slate-300">
          <Icon className="size-4" strokeWidth={1.75} />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-slate-900">{title}</p>
          {badge ? (
            <Badge variant="secondary" appearance="light" size="sm" className="shrink-0 capitalize">
              {badge}
            </Badge>
          ) : null}
        </div>
        {description ? (
          <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{description}</p>
        ) : null}
      </div>
      {meta ? <span className="hidden shrink-0 text-[11px] text-slate-400 sm:block">{meta}</span> : null}
      <ArrowUpRight className="size-4 shrink-0 text-slate-300 transition-colors group-hover:text-slate-500" />
    </Link>
  );
}

export function DefinitionHubRow({ definition, workspaceBase, standardItemsByKey, metaField = 'updated_at' }) {
  const path = definitionOpenPath(definition, workspaceBase, standardItemsByKey);
  const isCustom = definition.source_type === 'custom' || Boolean(definition.dataset_key);
  const datasetLabel = definition.dataset_key?.split('.').pop()?.replace(/_/g, ' ');

  const handleOpen = () => {
    const payload = recordViewPayload(definition);
    if (payload) reportCenterApi.recordView(payload).catch(() => {});
  };

  return (
    <ReportHubRow
      title={definition.name}
      description={definition.description}
      to={path}
      datasetKey={isCustom ? definition.dataset_key : undefined}
      badge={isCustom ? datasetLabel : 'Standard'}
      meta={formatWhen(definition[metaField] || definition.last_run_at)}
      onOpen={handleOpen}
    />
  );
}

export function HubSectionBlock({ title, count, onViewAll, emptyMessage, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {typeof count === 'number' ? (
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-slate-500">
              {count}
            </span>
          ) : null}
        </div>
        {onViewAll ? (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-medium text-slate-500 transition-colors hover:text-slate-900"
          >
            View all
          </button>
        ) : null}
      </div>
      <div className="p-3">
        {children ?? (
          <p className="px-1 py-6 text-center text-xs text-slate-400">{emptyMessage}</p>
        )}
      </div>
    </section>
  );
}
