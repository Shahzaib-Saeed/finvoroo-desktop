import { Link } from 'react-router-dom';
import { MoreHorizontal, Play, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  definitionEditPath,
  definitionOpenPath,
  recordViewPayload,
} from '../../lib/report-definition-links';
import { reportCenterApi } from '../../api/report-center.api';
import { ReportFavoriteToggle } from '../ReportFavoriteToggle';
import { formatRelativeTime } from './format-relative-time';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function OverviewReportCard({
  definition,
  workspaceBase,
  standardItemsByKey,
  isFavorited = false,
  onFavoriteChange,
  highlighted = false,
  lastOpenedAt,
  className,
}) {
  const openPath = definitionOpenPath(definition, workspaceBase, standardItemsByKey);
  const editPath = definitionEditPath(definition, workspaceBase);
  const datasetLabel = definition.dataset_key?.split('.').pop()?.replace(/_/g, ' ') || 'Custom';

  const trackOpen = () => {
    const payload = recordViewPayload(definition);
    if (payload) reportCenterApi.recordView(payload).catch(() => {});
  };

  return (
    <article
      className={cn(
        'group relative flex h-full flex-col rounded-xl border bg-white',
        'shadow-[0_1px_3px_rgba(15,23,42,0.05)] transition-all duration-200',
        'hover:-translate-y-0.5 hover:shadow-md',
        highlighted ? 'border-blue-500 ring-1 ring-blue-500/20' : 'border-slate-200/80',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2 px-4 pt-3.5">
        {lastOpenedAt || highlighted ? (
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
            Opened {formatRelativeTime(lastOpenedAt || definition.updated_at)}
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
            Updated {formatRelativeTime(definition.updated_at)}
          </span>
        )}
        <div className="flex items-center gap-0.5">
          <ReportFavoriteToggle
            favoritableKind="definition"
            reportDefinitionId={definition.id}
            isFavorited={isFavorited}
            onChange={onFavoriteChange}
            className="size-7 text-slate-500 hover:text-amber-500"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="size-7 p-0 text-slate-500">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem asChild>
                <Link to={openPath} onClick={trackOpen}>
                  Open
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to={editPath}>Edit</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to={openPath} onClick={trackOpen}>
                  Run report
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-4 pb-3 pt-2">
        <Link
          to={openPath}
          onClick={trackOpen}
          className="text-base font-semibold text-slate-900 hover:text-blue-600"
        >
          {definition.name}
        </Link>
        {definition.description ? (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
            {definition.description}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge variant="secondary" appearance="light" size="sm" className="capitalize">
            {datasetLabel}
          </Badge>
          <Badge variant="outline" size="sm" className="capitalize">
            {definition.visibility || 'private'}
          </Badge>
        </div>
      </div>

      <div className="mt-auto border-t border-slate-100 px-4 py-3">
        <div className="flex items-end justify-between gap-3">
          <div className="grid min-w-0 flex-1 grid-cols-3 gap-2">
            {[
              { label: 'Created', value: formatDate(definition.created_at) },
              { label: 'Updated', value: formatDate(definition.updated_at) },
              { label: 'Last run', value: formatDate(definition.last_run_at) },
            ].map((m) => (
              <div key={m.label} className="min-w-0">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                  {m.label}
                </p>
                <p className="mt-0.5 truncate text-[11px] font-medium text-slate-700">{m.value}</p>
              </div>
            ))}
          </div>
          <Button size="sm" className="h-8 shrink-0 gap-1 rounded-lg px-3 shadow-sm" asChild>
            <Link to={openPath} onClick={trackOpen}>
              <Play className="size-3 fill-current" />
              Run
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

export function OverviewCreateCard({ to }) {
  return (
    <Link
      to={to}
      className={cn(
        'group flex h-full min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/40 p-6 text-center',
        'transition-all duration-200 hover:border-blue-400 hover:bg-blue-50/30',
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full border border-dashed border-slate-300 bg-white text-slate-400 transition-colors group-hover:border-blue-400 group-hover:text-blue-600">
        <span className="text-2xl font-light leading-none">+</span>
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-800">Create Custom Report</p>
      <p className="mt-1 max-w-[180px] text-xs text-slate-500">
        Build your own report with filters and layouts
      </p>
    </Link>
  );
}

export function OverviewSharedCard({ inviteTo }) {
  return (
    <div
      className={cn(
        'flex h-full min-h-[220px] flex-col items-center justify-center rounded-xl border border-slate-200/80 bg-white p-6 text-center',
        'shadow-[0_1px_3px_rgba(15,23,42,0.05)]',
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-xl bg-violet-50 text-violet-500">
        <Users className="size-6" strokeWidth={1.5} />
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-800">Shared With Me</p>
      <p className="mt-1 max-w-[200px] text-xs leading-relaxed text-slate-500">
        Reports shared by teammates will show up here
      </p>
      {inviteTo ? (
        <Button
          size="sm"
          variant="outline"
          className="mt-4 h-8 rounded-lg border-violet-200 text-violet-700 hover:bg-violet-50"
          asChild
        >
          <Link to={inviteTo}>+ Invite Teammate</Link>
        </Button>
      ) : null}
    </div>
  );
}
