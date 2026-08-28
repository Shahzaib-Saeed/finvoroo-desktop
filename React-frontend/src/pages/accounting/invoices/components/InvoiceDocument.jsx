import { Link } from 'react-router';
import { cn } from '@/lib/utils';
import { InvoiceClassicBody } from './InvoiceClassicBody';

/**
 * Paper invoice — identical layout for screen view and print.
 */
export function InvoiceDocument({
  invoice,
  display,
  sectionOrder: _sectionOrder,
  workspaceId,
  className,
}) {
  return (
    <div
      id="invoice-document"
      className={cn(
        'bg-white overflow-hidden',
        'border border-neutral-200 shadow-sm print:shadow-none print:border-0',
        className,
      )}
    >
      {invoice.sales_order && workspaceId ? (
        <div className="px-8 py-2 border-b border-neutral-200 text-sm print:hidden bg-neutral-50">
          <span className="text-neutral-500">Sales order: </span>
          <Link
            to={`/workspace/${workspaceId}/accounting/sales-orders/${invoice.sales_order.id}`}
            className="font-medium text-blue-600 hover:underline"
          >
            {invoice.sales_order.so_number || `SO-${invoice.sales_order.id}`}
          </Link>
        </div>
      ) : null}

      <InvoiceClassicBody invoice={invoice} display={display} />
    </div>
  );
}
