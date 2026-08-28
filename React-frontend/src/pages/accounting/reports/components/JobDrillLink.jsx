import { Link } from 'react-router';
import { cn } from '@/lib/utils';

/**
 * Opens the job order show page when a job number is clicked in reports.
 */
export function JobDrillLink({ workspaceId, jobId, children, className, onClick }) {
  const id = Number(jobId);
  const label = children ?? '—';
  const href =
    workspaceId && id
      ? `/workspace/${workspaceId}/accounting/job-orders/${id}/edit`
      : null;

  if (!href) {
    return <span className={className}>{label}</span>;
  }

  return (
    <Link
      to={href}
      className={cn(
        'font-medium text-primary hover:underline underline-offset-2',
        className,
      )}
      title="View job order"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
    >
      {label}
    </Link>
  );
}
