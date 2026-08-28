import { cn } from '@/lib/utils';
import { useReportEntityDetails } from './ReportEntityDetailsProvider';

/**
 * Opens the customer details sheet when a customer name is clicked in reports.
 */
export function CustomerDrillLink({ customerId, children, className, onOpen, title = 'View customer' }) {
  const ctx = useReportEntityDetails();
  const open = onOpen ?? ctx?.openCustomer;
  const id = Number(customerId);
  const label = children ?? '—';

  if (!id || !open) {
    return <span className={className}>{label}</span>;
  }

  return (
    <button
      type="button"
      className={cn(
        'font-medium text-primary hover:underline underline-offset-2 text-left',
        className,
      )}
      title={title}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        open(id);
      }}
    >
      {label}
    </button>
  );
}
