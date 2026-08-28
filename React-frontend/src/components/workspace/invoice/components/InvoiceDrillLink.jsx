import { Link } from 'react-router';
import { cn } from '@/lib/utils';
import { buildInvoiceUrl } from '@/pages/accounting/reports/report-drilldown';
import { useInvoicePreview } from '../invoice-preview-provider';

/**
 * Opens the universal invoice preview sheet instead of navigating away.
 * Set navigateToPage to open the full invoice page directly.
 */
export function InvoiceDrillLink({
  invoiceId,
  workspaceId,
  children,
  className,
  title = 'View invoice',
  onClick,
  navigateToPage = false,
}) {
  const { openInvoice } = useInvoicePreview();
  const id = Number(invoiceId);
  const fullUrl = workspaceId && id ? buildInvoiceUrl(workspaceId, id) : null;
  const label = children ?? (id ? `#${id}` : '—');

  if (!id) {
    return <span className={className}>{label}</span>;
  }

  if (navigateToPage && fullUrl) {
    return (
      <Link
        to={fullUrl}
        className={cn('font-medium text-primary hover:underline underline-offset-2', className)}
        title={title}
        onClick={onClick}
      >
        {label}
      </Link>
    );
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
        onClick?.(e);
        openInvoice(id);
      }}
    >
      {label}
    </button>
  );
}
