import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from './format-relative-time';

export function RecentActivityTimeline({ items, className }) {
  if (!items.length) return null;

  return (
    <div className={cn('rounded-2xl border border-gray-200/70 bg-white p-4 shadow-sm sm:p-5', className)}>
      <ol className="relative space-y-0">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.id} className="relative flex gap-4 pb-5 last:pb-0">
              {!isLast ? (
                <span
                  className="absolute left-[15px] top-8 h-[calc(100%-12px)] w-px bg-gray-200"
                  aria-hidden
                />
              ) : null}

              <div className="relative z-[1] flex size-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm">
                <Eye className="size-3.5 text-primary" strokeWidth={1.75} />
              </div>

              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm text-gray-700">
                    Opened{' '}
                    <Link
                      to={item.path}
                      onClick={item.onOpen}
                      className="font-medium text-gray-900 transition-colors hover:text-blue-600"
                    >
                      {item.title}
                    </Link>
                  </p>
                  <time className="shrink-0 text-xs tabular-nums text-gray-400">
                    {formatRelativeTime(item.timestamp)}
                  </time>
                </div>
                {item.subtitle ? (
                  <p className="mt-0.5 text-xs text-gray-400">{item.subtitle}</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function RecentActivitySkeleton() {
  return (
    <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="size-8 animate-pulse rounded-full bg-gray-100" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-3 w-2/3 animate-pulse rounded bg-gray-100" />
            <div className="h-2 w-1/4 animate-pulse rounded bg-gray-50" />
          </div>
        </div>
      ))}
    </div>
  );
}
