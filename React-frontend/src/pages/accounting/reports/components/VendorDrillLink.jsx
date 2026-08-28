import { cn } from '@/lib/utils';
import { useReportEntityDetails } from './ReportEntityDetailsProvider';

/**
 * Opens the vendor details sheet when a vendor name is clicked in reports.
 */
export function VendorDrillLink({ vendorId, children, className, onOpen, title = 'View vendor' }) {
  const ctx = useReportEntityDetails();
  const open = onOpen ?? ctx?.openVendor;
  const id = Number(vendorId);
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
