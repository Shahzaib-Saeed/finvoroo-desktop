import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { ArrowLeft, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/PageHeader';
import { DeliveryNoteForm } from './components/DeliveryNoteForm';
import { useDeliveryNoteForm } from './hooks/useDeliveryNoteForm';

export function DeliveryNoteCreatePage() {
  const { id: workspaceId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const salesOrderId =
    searchParams.get('from_sales_order') || searchParams.get('sales_order_id') || '';
  const base = `/workspace/${workspaceId}/accounting/delivery-notes`;
  const salesOrderBase = `/workspace/${workspaceId}/accounting/sales-orders`;

  const formState = useDeliveryNoteForm({
    mode: 'create',
    salesOrderId: salesOrderId || undefined,
    onSuccess: (created) => {
      if (created?.id) navigate(`${base}/${created.id}`);
      else navigate(base);
    },
  });

  return (
    <div className="space-y-6 w-full min-w-0 pb-8">
      <PageHeader
        title="Create delivery note"
        subtitle={
          salesOrderId
            ? 'Review shipment quantities from the sales order, then save as draft.'
            : 'Record a customer shipment linked to a sales order.'
        }
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to={salesOrderId ? `${salesOrderBase}/${salesOrderId}` : base}>
              <ArrowLeft className="size-4 mr-1" /> Back
            </Link>
          </Button>
        }
      />

      {!salesOrderId && !formState.loadingLookups ? (
        <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
          <Truck className="size-8 mx-auto mb-2 opacity-40" />
          <p>Open a sales order and choose <span className="font-medium text-foreground">Create delivery</span> to start.</p>
        </div>
      ) : null}

      <DeliveryNoteForm
        {...formState}
        workspaceId={workspaceId}
        onSubmit={formState.handleSubmit}
        onCancel={() => navigate(salesOrderId ? `${salesOrderBase}/${salesOrderId}` : base)}
      />
    </div>
  );
}
