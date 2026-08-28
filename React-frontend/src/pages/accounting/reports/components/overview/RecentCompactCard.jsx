import { Link } from 'react-router-dom';
import { Clock, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

export function RecentCompactCard({ title, subtitle, to, onOpen, className }) {
  return (
    <Link
      to={to}
      onClick={onOpen}
      className={cn(
        'group flex items-center gap-3 rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-sm transition-all',
        'hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md',
        className,
      )}
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500 group-hover:bg-slate-100">
        <Clock className="size-4" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900">{title}</p>
        {subtitle ? <p className="mt-0.5 text-[11px] text-slate-400">{subtitle}</p> : null}
      </div>
      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-slate-500 opacity-0 transition-opacity group-hover:opacity-100">
        Open
        <ExternalLink className="size-3.5" />
      </span>
    </Link>
  );
}
