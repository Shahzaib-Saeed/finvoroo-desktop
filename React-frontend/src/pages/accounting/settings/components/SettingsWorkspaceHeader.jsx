import { Link } from 'react-router';
import { Building2, History, RefreshCw, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { timezoneLabel } from '@/lib/timezone-options';

function MetaChip({ label, value, className }) {
  if (!value || value === '—') return null;
  return (
    <div className={cn('flex flex-col gap-0.5 min-w-0', className)}>
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-xs font-semibold text-foreground truncate tabular-nums">{value}</span>
    </div>
  );
}

function formatFiscalYear(company) {
  const start = company?.fiscal_year_start?.slice?.(0, 10) || company?.fiscal_year_start;
  const end = company?.fiscal_year_end?.slice?.(0, 10) || company?.fiscal_year_end;
  if (!start && !end) return '—';
  if (start && end) return `${start} → ${end}`;
  return start || end || '—';
}

function formatUpdatedAt(value) {
  if (!value) return null;
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return null;
  }
}

export function SettingsWorkspaceHeader({
  company,
  logoUrl,
  autoPost,
  workspaceId,
  planLabel,
  onRefresh,
  refreshing = false,
}) {
  const accountingBase = workspaceId ? `/workspace/${workspaceId}/accounting` : '#';
  const companyName = company?.name || 'Workspace';
  const updatedLabel = formatUpdatedAt(company?.updated_at);

  return (
    <div className="rounded-xl border border-border/80 bg-card shadow-sm overflow-hidden">
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt=""
              className="size-11 shrink-0 rounded-lg border bg-background object-contain p-1"
            />
          ) : (
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border bg-muted/30">
              <Building2 className="size-5 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base font-semibold text-foreground truncate">{companyName}</h1>
              {company?.country ? (
                <Badge variant="outline" className="h-5 px-2 text-[10px] font-medium rounded-md">
                  {company.country}
                </Badge>
              ) : null}
              <Badge
                variant="outline"
                className="h-5 px-2 text-[10px] font-medium rounded-md border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-400"
              >
                Active
              </Badge>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-7">
              <MetaChip
                label="Auto posting"
                value={autoPost ? 'Enabled' : 'Manual'}
              />
              <MetaChip label="Fiscal year" value={formatFiscalYear(company)} />
              <MetaChip label="Currency" value={company?.currency || '—'} />
              <MetaChip
                label="Timezone"
                value={company?.timezone ? timezoneLabel(company.timezone) : 'UTC'}
              />
              {planLabel ? <MetaChip label="Plan" value={planLabel} /> : null}
              {updatedLabel ? (
                <MetaChip label="Last updated" value={updatedLabel} className="sm:col-span-2 lg:col-span-1" />
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 lg:pl-4">
          <Badge
            variant="outline"
            className={cn(
              'gap-1 px-2 py-0.5 text-[11px] font-medium',
              autoPost
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40'
                : 'text-muted-foreground',
            )}
          >
            <Zap className="size-3" />
            {autoPost ? 'Auto-post on' : 'Manual posting'}
          </Badge>
          {onRefresh ? (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={onRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={cn('size-3.5', refreshing && 'animate-spin')} />
              Refresh
            </Button>
          ) : null}
          {workspaceId ? (
            <Button variant="outline" size="sm" className="h-8 gap-1.5" asChild>
              <Link to={`${accountingBase}/audit-logs`}>
                <History className="size-3.5" />
                Audit history
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
