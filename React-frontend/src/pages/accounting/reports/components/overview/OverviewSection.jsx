import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function OverviewSection({
  id,
  title,
  subtitle,
  count,
  onViewAll,
  children,
  className,
  /** When true, section is just a header + content (no outer card). */
  flush = false,
}) {
  const header = (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold tracking-tight text-slate-900">{title}</h2>
          {typeof count === 'number' ? (
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-slate-600">
              {count}
            </span>
          ) : null}
        </div>
        {subtitle ? <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {onViewAll ? (
        <button
          type="button"
          onClick={onViewAll}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-slate-500 transition-colors hover:text-slate-900"
        >
          View all
          <ArrowRight className="size-3.5" />
        </button>
      ) : null}
    </div>
  );

  if (flush) {
    return (
      <section id={id} className={cn('space-y-3', className)}>
        {header}
        {children}
      </section>
    );
  }

  return (
    <section
      id={id}
      className={cn(
        'overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
        className,
      )}
    >
      <div className="border-b border-slate-100 px-4 py-3">{header}</div>
      <div className="p-3 sm:p-4">{children}</div>
    </section>
  );
}
