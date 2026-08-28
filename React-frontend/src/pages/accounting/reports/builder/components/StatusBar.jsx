import { CheckCircle2, Circle, Clock, Database, Filter, Loader2, Rows3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { countFilterConditions } from '../filter-tree';

const STATUS_META = {
  draft: { label: 'Unsaved draft', icon: Circle, className: 'text-slate-400', chip: 'bg-slate-100 text-slate-600' },
  saved: { label: 'Saved', icon: CheckCircle2, className: 'text-emerald-600', chip: 'bg-emerald-50 text-emerald-700' },
  running: { label: 'Running…', icon: Loader2, className: 'text-blue-600 animate-spin', chip: 'bg-blue-50 text-blue-700' },
};

export function StatusBar({ datasetLabel, result, loading, durationMs, filters, status }) {
  const meta = STATUS_META[status] || STATUS_META.draft;
  const StatusIcon = meta.icon;
  const filterCount = countFilterConditions(filters);

  return (
    <div className="flex h-9 shrink-0 items-center gap-3 border-t border-slate-200/80 bg-white px-4 text-[11px] text-slate-500">
      <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium', meta.chip)}>
        <StatusIcon className={cn('size-3', meta.className)} />
        {meta.label}
      </span>

      {datasetLabel ? (
        <span className="hidden items-center gap-1.5 sm:inline-flex">
          <Database className="size-3 text-slate-400" />
          <span className="font-medium text-slate-600">{datasetLabel}</span>
        </span>
      ) : null}

      {result ? (
        <span className="inline-flex items-center gap-1.5">
          <Rows3 className="size-3 text-slate-400" />
          {result.total.toLocaleString()} row{result.total === 1 ? '' : 's'}
        </span>
      ) : null}

      {filterCount > 0 ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2 py-0.5 font-medium text-blue-700">
          <Filter className="size-3" />
          {filterCount} filter{filterCount === 1 ? '' : 's'}
        </span>
      ) : null}

      {typeof durationMs === 'number' && !loading ? (
        <span className="ml-auto inline-flex items-center gap-1.5 text-slate-400">
          <Clock className="size-3" />
          {durationMs < 1000 ? `${durationMs}ms` : `${(durationMs / 1000).toFixed(1)}s`}
        </span>
      ) : (
        <span className="ml-auto" />
      )}
    </div>
  );
}
