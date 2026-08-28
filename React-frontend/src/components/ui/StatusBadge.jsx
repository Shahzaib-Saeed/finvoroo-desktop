import { cn } from '@/lib/utils';

const STATUS_MAP = {
  // Payments / Invoices
  paid:       'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  partial:    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  overdue:    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  draft:      'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  pending:    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  cancelled:  'bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-500 line-through',
  canceled:   'bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-500 line-through',
  open:       'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  sent:       'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  // Entities
  active:     'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  inactive:   'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  // Orders
  completed:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  received:   'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  // Journal
  posted:     'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  unposted:   'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  // Generic
  approved:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  rejected:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  processing: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
};

/**
 * StatusBadge — maps a status string to a colored pill badge.
 *
 * Usage:
 *   <StatusBadge status="paid" />
 *   <StatusBadge status="overdue" className="text-xs" />
 */
export function StatusBadge({ status, className }) {
  if (!status) return null;
  const key = String(status).toLowerCase();
  const colorClass = STATUS_MAP[key] ?? 'bg-muted text-muted-foreground';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize whitespace-nowrap',
        colorClass,
        className,
      )}
    >
      {status}
    </span>
  );
}
