import {
  Activity,
  Archive,
  ShieldAlert,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';

function StatCard({ label, value, hint, icon: Icon, tone }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-[0.04em] text-slate-500">
            {label}
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-950 tracking-tight">
            {Number(value || 0).toLocaleString()}
          </div>
          {hint ? (
            <div className="mt-1 text-xs text-slate-500 truncate" title={hint}>
              {hint}
            </div>
          ) : null}
        </div>
        <span
          className={cn(
            'size-9 rounded-lg border flex items-center justify-center shrink-0',
            tone,
          )}
        >
          <Icon className="size-4" />
        </span>
      </div>
    </div>
  );
}

export function AuditStatsStrip({ stats, loading }) {
  if (loading && !stats) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-[88px] rounded-xl border border-slate-200 bg-slate-50 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard
        label="Events today"
        value={stats.events_today}
        hint={`${Number(stats.events_period || 0).toLocaleString()} in period`}
        icon={Activity}
        tone="bg-sky-50 text-sky-700 border-sky-100"
      />
      <StatCard
        label="Failed logins"
        value={stats.failed_logins}
        hint="Authentication failures"
        icon={ShieldAlert}
        tone="bg-amber-50 text-amber-700 border-amber-100"
      />
      <StatCard
        label="Security events"
        value={stats.security_events}
        hint={`${Number(stats.api_activity || 0).toLocaleString()} via API`}
        icon={ShieldCheck}
        tone="bg-violet-50 text-violet-700 border-violet-100"
      />
      <StatCard
        label="Backup / restore"
        value={stats.backup_restore_events}
        hint="Backup activity in period"
        icon={Archive}
        tone="bg-emerald-50 text-emerald-700 border-emerald-100"
      />
      <StatCard
        label="Top module"
        value={stats.top_modules?.[0]?.total || 0}
        hint={stats.top_module || 'No module activity'}
        icon={Layers}
        tone="bg-slate-50 text-slate-700 border-slate-200"
      />
    </div>
  );
}
