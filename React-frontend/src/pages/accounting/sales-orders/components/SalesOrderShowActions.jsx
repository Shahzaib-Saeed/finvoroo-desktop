import { Link } from 'react-router';
import {
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  Edit3,
  Factory,
  FileText,
  Printer,
  Trash2,
  Truck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DocumentCreateRelatedDropdown } from '../../components/DocumentCreateRelatedDropdown';
import { printSalesOrderDocument } from '@/lib/print-sales-order';
import { cn } from '@/lib/utils';

function ToolbarDivider() {
  return <div className="hidden sm:block w-px h-6 bg-border shrink-0" aria-hidden />;
}

export function SalesOrderShowActions({
  workspaceId,
  salesOrderId,
  salesOrder,
  base,
  canEdit,
  canDelete,
  canMarkComplete,
  canConvert,
  canCreateDelivery,
  canCreateProduction,
  canOpenJob,
  onEdit,
  onComplete,
  onConvert,
  onOpenJob,
  onDelete,
  busy = false,
}) {
  const deliveryBase = `/workspace/${workspaceId}/accounting/delivery-notes`;
  const productionBase = `/workspace/${workspaceId}/accounting/production-orders`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" asChild>
        <Link to={base}>
          <ArrowLeft className="size-4 mr-1" /> Back
        </Link>
      </Button>

      <DocumentCreateRelatedDropdown
        workspaceId={workspaceId}
        sourceType="sales_order"
        sourceId={salesOrderId}
        targets={[
          { target: 'quotation' },
          { target: 'sales_order' },
          { target: 'invoice' },
          { target: 'bill' },
          { target: 'purchase_order' },
        ]}
      />

      {(canEdit || canMarkComplete || canConvert) && <ToolbarDivider />}

      {canEdit && (
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={onEdit}
          className="border-sky-200 bg-sky-50/50 text-sky-800 hover:bg-sky-100 hover:text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300 dark:hover:bg-sky-950/70"
        >
          <Edit3 className="size-4 mr-1" /> Edit
        </Button>
      )}

      {canMarkComplete && (
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={onComplete}
          className="border-emerald-200 bg-emerald-50/50 text-emerald-800 hover:bg-emerald-100 hover:text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          <CheckCircle2 className="size-4 mr-1" />
          Mark complete
        </Button>
      )}

      {canConvert && (
        <Button size="sm" variant="mono" disabled={busy} onClick={onConvert}>
          <FileText className="size-4 mr-1" />
          Create invoice
        </Button>
      )}

      {(canOpenJob || canCreateDelivery || canCreateProduction) && <ToolbarDivider />}

      {canOpenJob && (
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={onOpenJob}
          className="border-violet-200 bg-violet-50/50 text-violet-800 hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300"
        >
          <Briefcase className="size-4 mr-1" />
          View job
        </Button>
      )}

      {canCreateDelivery && (
        <Button
          variant="outline"
          size="sm"
          asChild
          className="border-amber-200 bg-amber-50/50 text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
        >
          <Link to={`${deliveryBase}/create?from_sales_order=${salesOrderId}`}>
            <Truck className="size-4 mr-1" /> Create delivery
          </Link>
        </Button>
      )}

      {canCreateProduction && (
        <Button
          variant="outline"
          size="sm"
          asChild
          className="border-orange-200 bg-orange-50/50 text-orange-900 hover:bg-orange-100 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300"
        >
          <Link to={`${productionBase}/create?from_sales_order=${salesOrderId}`}>
            <Factory className="size-4 mr-1" /> Production
          </Link>
        </Button>
      )}

      <ToolbarDivider />

      <Button variant="outline" size="sm" onClick={() => printSalesOrderDocument()}>
        <Printer className="size-4 mr-1" /> Print order
      </Button>

      {canDelete && (
        <Button
          variant="destructive"
          size="sm"
          onClick={onDelete}
          className={cn(busy && 'opacity-70')}
        >
          <Trash2 className="size-4 mr-1" /> Delete
        </Button>
      )}
    </div>
  );
}
