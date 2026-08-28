import { Link } from 'react-router';
import { cn } from '@/lib/utils';
import { BillClassicBody } from './BillClassicBody';

/**
 * Paper vendor bill — identical layout for screen view and print.
 */
export function BillDocument({ bill, workspaceId, className }) {
  return (
    <div
      id="bill-document"
      className={cn(
        'bg-white overflow-hidden',
        'border border-neutral-900',
        'shadow-sm print:shadow-none',
        className,
      )}
    >
      {bill.job_order && workspaceId ? (
        <div className="px-8 py-2 border-b border-neutral-200 text-sm print:hidden bg-neutral-50">
          <span className="text-neutral-500">Job order: </span>
          <Link
            to={`/workspace/${workspaceId}/accounting/job-orders/${bill.job_order.id}`}
            className="font-medium text-blue-600 hover:underline"
          >
            {bill.job_order.job_number || `JO-${bill.job_order.id}`}
          </Link>
          {bill.job_order.title ? (
            <span className="text-neutral-500"> — {bill.job_order.title}</span>
          ) : null}
        </div>
      ) : null}

      <BillClassicBody bill={bill} />
    </div>
  );
}
