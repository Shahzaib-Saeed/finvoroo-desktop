import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Download,
  ExternalLink,
  FileEdit,
  FilePlus2,
  KeyRound,
  Link2,
  LogIn,
  LogOut,
  ShieldAlert,
  Trash2,
  Activity,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDateTime } from '@/lib/format-datetime';
import { cn } from '@/lib/utils';
import { buildAuditDiff, buildAuditSnapshotRows, formatAuditValue, humanizeField } from './audit-diff';

const SKIP_SNAPSHOT_KEYS = new Set([
  'created_at',
  'updated_at',
  'deleted_at',
  'password',
  'remember_token',
  'company_id',
  'inventory_movements',
  'message',
  'url',
]);

const SEVERITY_BADGES = {
  critical: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300',
  security: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30',
  financial: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30',
  warning: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300',
  info: 'bg-muted/60 text-muted-foreground border-border',
  high: 'bg-amber-50 text-amber-800 border-amber-200',
  medium: 'bg-blue-50 text-blue-800 border-blue-200',
  low: 'bg-muted/60 text-muted-foreground border-border',
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
    case 'posted':
      return KeyRound;
    default:
      return BookOpen;
  }
}

function actionLabel(action) {
  if (!action) return 'Unknown';
  return action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function userInitials(name) {
  const parts = String(name || 'System')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return 'SY';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function maskIp(ip) {
  if (!ip) return null;
  const parts = String(ip).split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.***.${parts[3]}`;
  }
  return ip.length > 8 ? `${ip.slice(0, 6)}…` : ip;
}

function formatRole(role) {
  if (!role) return null;
  return String(role)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function InfoTable({ rows, labelWidth = 'w-[160px]' }) {
  const visible = rows.filter((r) => r.value != null && r.value !== '');
  if (!visible.length) return null;

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <tbody className="divide-y divide-border/80">
          {visible.map((row) => (
            <tr key={row.label}>
              <th
                className={cn(
                  labelWidth,
                  'shrink-0 bg-muted/25 px-5 py-3.5 text-left text-[13px] font-normal text-muted-foreground align-top',
                )}
              >
                {row.label}
              </th>
              <td className="px-5 py-3.5 align-top text-[13px] leading-relaxed text-foreground">
                {row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChangeCell({ value, variant = 'neutral' }) {
  const empty = value == null || value === '—';
  return (
    <span
      className={cn(
        'block rounded-md border px-3 py-2 text-[13px] leading-relaxed break-all',
        empty && 'border-transparent text-muted-foreground',
        !empty && variant === 'before' && 'border-red-100/80 bg-red-50/70 text-red-900 dark:border-red-900/30 dark:bg-red-950/20',
        !empty && variant === 'after' && 'border-emerald-100/80 bg-emerald-50/70 text-emerald-900 dark:border-emerald-900/30 dark:bg-emerald-950/20',
        !empty && variant === 'neutral' && 'border-border bg-muted/25 text-foreground',
      )}
    >
      {empty ? '—' : value}
    </span>
  );
}

/** Full-width diff table — best for multiple field changes. */
function ChangesTable({ rows }) {
  if (!rows.length) return null;

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="w-[22%] px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Field
            </th>
            <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Before
            </th>
            <th className="w-10 px-0" aria-hidden />
            <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              After
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/70">
          {rows.map((row) => {
            const changed = row.changed !== false && row.before !== row.after;
            return (
              <tr key={row.path} className="align-top">
                <td className="px-4 py-3 text-[13px] font-medium text-foreground">{row.field}</td>
                <td className="px-4 py-3">
                  <ChangeCell value={row.before} variant={changed ? 'before' : 'neutral'} />
                </td>
                <td className="px-0 py-3 text-center text-muted-foreground/35">
                  <ArrowRight className="inline-block size-4" />
                </td>
                <td className="px-4 py-3">
                  <ChangeCell value={row.after} variant={changed ? 'after' : 'neutral'} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Side-by-side cards — only for a single prominent change on Details tab. */
function SingleChangeCard({ row }) {
  if (!row) return null;
  const changed = row.changed !== false && row.before !== row.after;

  return (
    <div className="rounded-lg border p-5">
      <p className="mb-4 text-sm font-semibold">{row.field}</p>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-start">
        <div className="space-y-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Before
          </span>
          <ChangeCell value={row.before} variant={changed ? 'before' : 'neutral'} />
        </div>
        <div className="hidden lg:flex items-center justify-center pt-8 text-muted-foreground/35">
          <ArrowRight className="size-5" />
        </div>
        <div className="space-y-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            After
          </span>
          <ChangeCell value={row.after} variant={changed ? 'after' : 'neutral'} />
        </div>
      </div>
    </div>
  );
}

function UserAgentCell({ value }) {
  const [expanded, setExpanded] = useState(false);
  if (!value) return '—';
  const long = String(value).length > 72;

  return (
    <div className="space-y-1">
      <p className={cn('break-all text-[13px]', !expanded && long && 'line-clamp-2')}>
        {value}
      </p>
      {long ? (
        <button
          type="button"
          className="text-xs font-medium text-primary hover:underline"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      ) : null}
    </div>
  );
}

function downloadLogJson(log) {
  const blob = new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `audit-log-${log.id || 'entry'}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function AuditLogDetailDialog({
  log,
  open,
  onOpenChange,
  onViewHistory,
  onViewRelatedEvents,
}) {
  const [tab, setTab] = useState('details');
  const Icon = actionIcon(log?.action);

  const presentationChanges = log?.presentation?.changes;
  const highlights = log?.presentation?.highlights || [];

  const diff = useMemo(
    () =>
      buildAuditDiff(
        log?.old_values,
        log?.new_values,
        log?.changed_fields,
        presentationChanges,
      ),
    [log, presentationChanges],
  );

  const snapshotRows = useMemo(() => {
    if (diff.length > 0) return [];
    if (!log?.old_values && !log?.new_values) return [];
    if (!['updated', 'created', 'deleted', 'posted'].includes(log?.action)) return [];
    return buildAuditSnapshotRows(log?.old_values, log?.new_values);
  }, [diff.length, log]);

  const isAuthEvent = ['login', 'logout', 'failed_login', 'request'].includes(log?.action);
  const hasOwnRecord = Boolean(log?.auditable_type_short && log?.auditable_id);
  const hasRelated = Boolean(log?.related_id && (log?.related_label || log?.related_type));
  const changeCount = diff.length || snapshotRows.length;

  const snapshotEntries = useMemo(() => {
    if (
      isAuthEvent ||
      diff.length > 0 ||
      snapshotRows.length > 0 ||
      log?.action !== 'created' ||
      !log?.new_values
    ) {
      return [];
    }
    return Object.entries(log.new_values)
      .filter(([key, value]) => {
        if (SKIP_SNAPSHOT_KEYS.has(key)) return false;
        if (value && typeof value === 'object') return false;
        return formatAuditValue(value) != null;
      })
      .slice(0, 12)
      .map(([key, value]) => ({
        key,
        label: humanizeField(key),
        value: formatAuditValue(value) ?? '—',
      }));
  }, [diff.length, isAuthEvent, log, snapshotRows.length]);

  const title = log?.event_label || actionLabel(log?.event || log?.action);
  const tz = log?.timezone || log?.event_timezone;
  const whenLabel = formatDateTime(log?.created_at_iso || log?.created_at, {
    showTimezone: Boolean(tz),
    timeZone: tz,
  });
  const recordLabel =
    log?.record_label ||
    (log?.entity_label
      ? `${log.entity_label}${log.auditable_id ? ` #${log.auditable_id}` : ''}`
      : null);
  const sourceLabel =
    log?.channel_label ||
    (log?.channel ? String(log.channel).replace(/_/g, ' ') : null);

  useEffect(() => {
    setTab('details');
  }, [log?.id]);

  if (!log) return null;

  const additionalRows = [
    {
      label: 'IP address',
      value: log.ip_address ? (
        <span className="font-mono text-[13px]">{log.ip_address}</span>
      ) : null,
    },
    {
      label: 'User agent',
      value: log.user_agent ? <UserAgentCell value={log.user_agent} /> : null,
    },
    {
      label: 'Session ID',
      value: log.session_id ? (
        <code className="break-all font-mono text-[12px]">{log.session_id}</code>
      ) : null,
    },
    {
      label: 'Severity',
      value: log.severity ? (
        <Badge
          variant="outline"
          className={cn(
            'rounded-md capitalize text-[11px] font-medium',
            SEVERITY_BADGES[log.severity] || SEVERITY_BADGES.info,
          )}
        >
          {log.severity}
        </Badge>
      ) : null,
    },
    {
      label: 'Source',
      value: sourceLabel ? <span className="capitalize">{sourceLabel}</span> : null,
    },
    {
      label: 'Event ID',
      value: log.correlation_id ? (
        <code className="break-all font-mono text-[12px]">{log.correlation_id}</code>
      ) : null,
    },
    {
      label: 'Integrity hash',
      value: log.integrity_hash ? (
        <code className="break-all font-mono text-[12px]">{log.integrity_hash}</code>
      ) : null,
    },
    {
      label: 'Fiscal period',
      value: log.period_context_label || null,
    },
    {
      label: 'Reason',
      value: log.reason || null,
    },
    {
      label: 'Result',
      value: log.result ? (
        <span className="capitalize">
          {log.result}
          {log.failure_reason ? (
            <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
              {log.failure_reason}
            </span>
          ) : null}
        </span>
      ) : null,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'gap-0 p-0 overflow-hidden flex flex-col',
          'left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]',
          'w-[min(calc(100vw-2rem),1180px)] max-w-none',
          'h-[min(calc(100vh-2rem),940px)] max-h-none',
        )}
        overlayClassName="bg-black/50 backdrop-blur-[3px]"
      >
        <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
          {/* Header */}
          <DialogHeader className="shrink-0 space-y-0 border-b px-8 pb-0 pt-6 text-start mb-0">
            <div className="flex items-start gap-3.5 pe-10">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border bg-primary/5 text-primary">
                <Icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1 pb-4">
                <DialogTitle className="text-lg font-semibold leading-snug tracking-tight">
                  {title}
                </DialogTitle>
                <DialogDescription className="mt-1 text-[14px] leading-relaxed">
                  {log.message || 'Audit log entry'}
                </DialogDescription>
              </div>
            </div>

            <TabsList
              variant="line"
              size="md"
              className="h-auto w-full justify-start gap-0 rounded-none border-0 bg-transparent px-0"
            >
              <TabsTrigger value="details" className="rounded-none px-4 pb-3 pt-0 text-sm">
                Details
              </TabsTrigger>
              <TabsTrigger value="changes" className="rounded-none px-4 pb-3 pt-0 text-sm">
                Changes
                {changeCount > 0 ? (
                  <Badge
                    variant="secondary"
                    className="ml-2 h-5 min-w-5 rounded-full px-1.5 text-[10px] tabular-nums"
                  >
                    {changeCount}
                  </Badge>
                ) : null}
              </TabsTrigger>
              {log.correlation_id && onViewRelatedEvents ? (
                <TabsTrigger value="related" className="rounded-none px-4 pb-3 pt-0 text-sm">
                  Related events
                </TabsTrigger>
              ) : null}
            </TabsList>
          </DialogHeader>

          {/* Actor strip */}
          <div className="shrink-0 grid grid-cols-1 gap-4 border-b bg-muted/15 px-8 py-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="flex min-w-0 items-center gap-3.5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {userInitials(log.user_name)}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[15px] font-semibold">{log.user_name || 'System'}</p>
                  {log.user_role ? (
                    <Badge
                      variant="secondary"
                      className="rounded-full px-2.5 py-0.5 text-[11px] font-normal capitalize"
                    >
                      {formatRole(log.user_role)}
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-[13px] tabular-nums text-muted-foreground">{whenLabel}</p>
              </div>
            </div>
            {log.ip_address ? (
              <div className="lg:text-right">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  IP address
                </p>
                <p className="mt-0.5 font-mono text-[13px] text-foreground">{maskIp(log.ip_address)}</p>
              </div>
            ) : null}
          </div>

          <DialogBody className="min-h-0 flex-1 overflow-y-auto px-8 py-6 mb-0">
            <TabsContent value="details" className="mt-0">
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px] xl:gap-8">
                {/* Primary column */}
                <div className="min-w-0 space-y-6">
                  {(log.module || recordLabel || hasOwnRecord) && (
                    <div className="overflow-hidden rounded-lg border">
                      <table className="w-full text-sm">
                        <tbody>
                          {log.module ? (
                            <tr className="border-b border-border/80 bg-muted/10">
                              <th className="w-[140px] px-5 py-3.5 text-left text-[13px] font-normal text-muted-foreground align-middle">
                                Module
                              </th>
                              <td className="px-5 py-3.5 font-medium">{log.module}</td>
                            </tr>
                          ) : null}
                          {recordLabel ? (
                            <tr>
                              <th className="w-[140px] px-5 py-3.5 text-left text-[13px] font-normal text-muted-foreground align-middle">
                                Record
                              </th>
                              <td className="px-5 py-3.5">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <span className="font-medium break-words">{recordLabel}</span>
                                  {hasOwnRecord && onViewHistory ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 shrink-0 gap-1.5 text-xs"
                                      onClick={() =>
                                        onViewHistory({
                                          type: log.auditable_type_short,
                                          id: log.auditable_id,
                                        })
                                      }
                                    >
                                      View record
                                      <ExternalLink className="size-3.5" />
                                    </Button>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {highlights.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {highlights.map((item) => (
                        <div
                          key={`${item.label}-${item.value}`}
                          className="rounded-lg border bg-muted/10 px-4 py-3.5"
                        >
                          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                            {item.label}
                          </div>
                          <div className="mt-1 text-sm font-medium break-words" title={item.value}>
                            {item.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {isAuthEvent ? (
                    <div className="space-y-2.5">
                      <h3 className="text-sm font-semibold">Authentication</h3>
                      <InfoTable
                        rows={[
                          { label: 'Email', value: log.new_values?.email || null },
                          { label: 'IP address', value: log.ip_address || null },
                        ]}
                      />
                    </div>
                  ) : null}

                  {changeCount > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="text-sm font-semibold">What changed</h3>
                        <button
                          type="button"
                          className="text-xs text-primary hover:underline tabular-nums"
                          onClick={() => setTab('changes')}
                        >
                          {changeCount} {changeCount === 1 ? 'field' : 'fields'} · View all
                        </button>
                      </div>
                      {changeCount === 1 ? (
                        <SingleChangeCard row={(diff.length > 0 ? diff : snapshotRows)[0]} />
                      ) : (
                        <ChangesTable rows={(diff.length > 0 ? diff : snapshotRows).slice(0, 3)} />
                      )}
                      {changeCount > 3 ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => setTab('changes')}
                        >
                          View all {changeCount} changes
                        </Button>
                      ) : null}
                    </div>
                  ) : null}

                  {snapshotEntries.length > 0 ? (
                    <div className="space-y-2.5">
                      <h3 className="text-sm font-semibold">Created record</h3>
                      <div className="overflow-hidden rounded-lg border divide-y">
                        {snapshotEntries.map((row) => (
                          <div
                            key={row.key}
                            className="grid grid-cols-1 gap-1 px-5 py-3 text-sm sm:grid-cols-[200px_1fr] sm:gap-4"
                          >
                            <span className="text-muted-foreground">{row.label}</span>
                            <span className="font-medium break-words">{row.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {!isAuthEvent && changeCount === 0 && snapshotEntries.length === 0 ? (
                    <div className="rounded-lg border border-dashed px-4 py-14 text-center text-sm text-muted-foreground">
                      No field-level changes were recorded for this event.
                    </div>
                  ) : null}

                  {hasRelated && onViewHistory ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-5 py-4 xl:hidden">
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          Related record
                        </p>
                        <p className="mt-0.5 text-sm font-medium">
                          {log.related_label ||
                            `${log.related_type_short || 'Record'} #${log.related_id}`}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-xs"
                        onClick={() =>
                          onViewHistory({
                            type: log.related_type_short || log.related_type?.split('\\').pop(),
                            id: log.related_id,
                          })
                        }
                      >
                        Open related
                        <ExternalLink className="size-3.5" />
                      </Button>
                    </div>
                  ) : null}
                </div>

                {/* Sidebar column — additional info always visible on wide screens */}
                <div className="min-w-0 space-y-6 xl:sticky xl:top-0 xl:self-start">
                  <div className="space-y-2.5">
                    <h3 className="text-sm font-semibold">Additional information</h3>
                    <InfoTable rows={additionalRows} labelWidth="w-[160px]" />
                  </div>

                  {hasRelated && onViewHistory ? (
                    <div className="hidden rounded-lg border px-5 py-4 xl:flex xl:flex-col xl:gap-3">
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          Related record
                        </p>
                        <p className="mt-1 text-sm font-medium break-words">
                          {log.related_label ||
                            `${log.related_type_short || 'Record'} #${log.related_id}`}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-fit gap-1.5 text-xs"
                        onClick={() =>
                          onViewHistory({
                            type: log.related_type_short || log.related_type?.split('\\').pop(),
                            id: log.related_id,
                          })
                        }
                      >
                        Open related
                        <ExternalLink className="size-3.5" />
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="changes" className="mt-0 space-y-4">
              {changeCount > 0 ? (
                <>
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-base font-semibold">Field changes</h3>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {changeCount} {changeCount === 1 ? 'field' : 'fields'}
                    </span>
                  </div>
                  <ChangesTable rows={diff.length > 0 ? diff : snapshotRows} />
                </>
              ) : (
                <div className="rounded-lg border border-dashed px-4 py-20 text-center text-sm text-muted-foreground">
                  No field-level changes were recorded for this event.
                </div>
              )}
            </TabsContent>

            {log.correlation_id && onViewRelatedEvents ? (
              <TabsContent value="related" className="mt-0">
                <div className="rounded-lg border px-6 py-10 text-center">
                  <Link2 className="mx-auto size-8 text-muted-foreground/60" />
                  <p className="mt-3 text-sm font-medium">Related events</p>
                  <p className="mt-1 text-[13px] text-muted-foreground max-w-md mx-auto">
                    View other audit entries tied to the same correlation ID for this transaction
                    chain.
                  </p>
                  <code className="mt-3 inline-block rounded-md bg-muted px-2 py-1 font-mono text-[11px]">
                    {log.correlation_id}
                  </code>
                  <div className="mt-5">
                    <Button
                      className="gap-1.5"
                      onClick={() => onViewRelatedEvents(log.correlation_id)}
                    >
                      <Link2 className="size-4" />
                      View related events
                    </Button>
                  </div>
                </div>
              </TabsContent>
            ) : null}
          </DialogBody>

          <DialogFooter className="shrink-0 border-t px-8 py-4 mb-0 pt-4 sm:justify-between">
            <Button variant="outline" className="gap-1.5" onClick={() => downloadLogJson(log)}>
              <Download className="size-4" />
              Download JSON
            </Button>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

/** @deprecated Use AuditLogDetailDialog */
export const AuditLogDetailSheet = AuditLogDetailDialog;
