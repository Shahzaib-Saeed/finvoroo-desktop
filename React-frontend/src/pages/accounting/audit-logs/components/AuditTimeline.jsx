import { useState } from 'react';
import {
  Activity,
  ChevronDown,
  FileEdit,
  FilePlus2,
  KeyRound,
  Loader2,
  LogIn,
  LogOut,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/format-datetime';
import { cn } from '@/lib/utils';
import { buildAuditDiff } from './audit-diff';

const SEVERITY_BADGES = {
  critical: 'bg-red-50 text-red-700 border-red-200',
  security: 'bg-violet-50 text-violet-700 border-violet-200',
  financial: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  info: 'bg-slate-50 text-slate-700 border-slate-200',
};

function actionIcon(action) {
  switch (action) {
    case 'login':
      return LogIn;
    case 'logout':
      return LogOut;
    case 'failed_login':
      return ShieldAlert;
    case 'created':
      return FilePlus2;
    case 'updated':
      return FileEdit;
    case 'deleted':
      return Trash2;
    case 'request':
      return Activity;
    default:
      return KeyRound;
  }
}

function TimelineItem({ log, onOpen }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = actionIcon(log.action);
  const diffs = buildAuditDiff(
    log.old_values,
    log.new_values,
    log.changed_fields,
    log.presentation?.changes,
  ).slice(0, 6);

  return (
    <li className="relative pl-10">
      <span className="absolute left-[11px] top-3 bottom-[-18px] w-px bg-slate-200 last:hidden" />
      <span className="absolute left-0 top-2.5 size-6 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-600">
        <Icon className="size-3.5" />
      </span>

      <button
        type="button"
        onClick={() => onOpen?.(log)}
        className="w-full text-left rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm hover:border-slate-300 transition-colors"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-medium text-slate-950">
              {log.message || log.event_label || log.action}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
              <span>
                {formatDateTime(log.created_at_iso || log.created_at, {
                  timeZone: log.timezone || log.event_timezone,
                })}
              </span>
              <span>·</span>
              <span>{log.user_name || 'System'}</span>
              {log.module ? (
                <>
                  <span>·</span>
                  <span>{log.module}</span>
                </>
              ) : null}
              {log.channel_label ? (
                <>
                  <span>·</span>
                  <span>{log.channel_label}</span>
                </>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {log.severity ? (
              <Badge
                variant="outline"
                className={cn(
                  'rounded-md capitalize',
                  SEVERITY_BADGES[log.severity] || SEVERITY_BADGES.info,
                )}
              >
                {log.severity}
              </Badge>
            ) : null}
            {log.result === 'failed' ? (
              <Badge variant="outline" className="rounded-md border-red-200 bg-red-50 text-red-700">
                Failed
              </Badge>
            ) : null}
          </div>
        </div>

        {diffs.length > 0 ? (
          <div className="mt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((v) => !v);
              }}
            >
              {expanded ? 'Hide changes' : `Show ${diffs.length} change${diffs.length === 1 ? '' : 's'}`}
              <ChevronDown className={cn('size-3.5 ml-1 transition-transform', expanded && 'rotate-180')} />
            </Button>
            {expanded ? (
              <ul className="mt-2 space-y-1.5 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
                {diffs.map((row) => (
                  <li key={row.path} className="text-xs text-slate-600">
                    <span className="font-medium text-slate-800">{row.field}</span>
                    {': '}
                    <span className="line-through text-slate-400 mr-1">
                      {String(row.before ?? '—')}
                    </span>
                    <span>{String(row.after ?? '—')}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </button>
    </li>
  );
}

export function AuditTimeline({
  rows,
  loading,
  hasMore,
  onLoadMore,
  onOpen,
}) {
  if (loading && rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
        <Loader2 className="size-4 mr-2 animate-spin" />
        Loading timeline…
      </div>
    );
  }

  if (!loading && rows.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        No audit events match your current filters.
      </div>
    );
  }

  return (
    <div className="px-5 py-4">
      <ul className="space-y-3">
        {rows.map((log) => (
          <TimelineItem key={log.id} log={log} onOpen={onOpen} />
        ))}
      </ul>
      {hasMore ? (
        <div className="mt-4 flex justify-center">
          <Button variant="outline" size="sm" onClick={onLoadMore} disabled={loading}>
            {loading ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : null}
            Load more
          </Button>
        </div>
      ) : null}
    </div>
  );
}
