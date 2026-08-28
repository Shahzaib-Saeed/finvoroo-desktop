import { cn } from '@/lib/utils';

const ACCENT = {
  blue: 'bg-blue-500',
  purple: 'bg-violet-500',
  amber: 'bg-amber-400',
  sky: 'bg-sky-500',
  emerald: 'bg-emerald-500',
};

export function OverviewStatCard({
  label,
  value,
  hint,
  badge,
  accent = 'blue',
  onClick,
  className,
}) {
  const Comp = onClick ? 'button' : 'div';
  const padded = String(value).padStart(2, '0');

  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white p-4 text-left',
        'shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-all duration-200',
        onClick && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-slate-600">{label}</p>
        {badge ? (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
              badge.tone === 'green' && 'bg-emerald-50 text-emerald-600',
              badge.tone === 'blue' && 'bg-blue-50 text-blue-600',
              badge.tone === 'amber' && 'bg-amber-50 text-amber-600',
              badge.tone === 'violet' && 'bg-violet-50 text-violet-600',
              !badge.tone && 'bg-slate-50 text-slate-500',
            )}
          >
            {badge.icon}
            {badge.text}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">
        {typeof value === 'number' ? padded : value}
      </p>
      {hint ? <p className="mt-1 text-[11px] text-slate-500">{hint}</p> : null}
      <div className={cn('absolute inset-x-0 bottom-0 h-1', ACCENT[accent] || ACCENT.blue)} />
    </Comp>
  );
}

export function OverviewStatsSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-[96px] animate-pulse rounded-xl border border-slate-100 bg-slate-50" />
      ))}
    </div>
  );
}
