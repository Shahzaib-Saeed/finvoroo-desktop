import { Link } from 'react-router';
import {
  ArrowLeft,
  ClipboardList,
  Edit3,
  Loader2,
  Printer,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DocumentCreateRelatedDropdown } from '../../components/DocumentCreateRelatedDropdown';
import { cn } from '@/lib/utils';

function ToolbarDivider() {
  return <div className="hidden sm:block w-px h-6 bg-border shrink-0" aria-hidden />;
}

export function QuotationShowActions({
  workspaceId,
  quotationId,
  quotation,
  base,
  canEdit,
  canDelete,
  canCreateSalesOrder,
  onEdit,
  onCreateSalesOrder,
  onDelete,
  busy = false,
}) {
  const linkedSo = quotation?.sales_order;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" asChild>
        <Link to={base}>
          <ArrowLeft className="size-4 mr-1" /> Back
        </Link>
      </Button>

      <DocumentCreateRelatedDropdown
        workspaceId={workspaceId}
        sourceType="quotation"
        sourceId={quotationId}
        targets={[
          { target: 'quotation' },
          { target: 'sales_order' },
          { target: 'invoice' },
          { target: 'bill' },
          { target: 'purchase_order' },
        ]}
      />

      {(canEdit || canCreateSalesOrder) && <ToolbarDivider />}

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

      {canCreateSalesOrder && (
        <Button size="sm" variant="mono" disabled={busy} onClick={onCreateSalesOrder}>
          <ClipboardList className="size-4 mr-1" /> Create sales order
        </Button>
      )}

      {linkedSo?.id && (
        <Button
          variant="outline"
          size="sm"
          asChild
          className="border-violet-200 bg-violet-50/50 text-violet-800 hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300"
        >
          <Link to={`/workspace/${workspaceId}/accounting/sales-orders/${linkedSo.id}`}>
            <ClipboardList className="size-4 mr-1" /> View sales order
          </Link>
        </Button>
      )}

      <ToolbarDivider />

      <Button variant="outline" size="sm" onClick={() => window.print()}>
        <Printer className="size-4 mr-1" /> Print
      </Button>

      {canDelete && (
        <Button
          variant="destructive"
          size="sm"
          onClick={onDelete}
          disabled={busy}
          className={cn(busy && 'opacity-70')}
        >
          {busy ? (
            <Loader2 className="size-4 mr-1 animate-spin" />
          ) : (
            <Trash2 className="size-4 mr-1" />
          )}
          Delete
        </Button>
      )}
    </div>
  );
}
