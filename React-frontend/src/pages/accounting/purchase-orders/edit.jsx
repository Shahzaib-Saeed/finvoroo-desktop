import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/PageHeader';
import { purchaseOrdersApi } from './api/purchase-orders.api';
import { PurchaseOrderForm } from './components/PurchaseOrderForm';
import { usePurchaseOrderForm } from './hooks/usePurchaseOrderForm';
import { DocumentCreateRelatedDropdown } from '../components/DocumentCreateRelatedDropdown';

export function PurchaseOrderEditPage() {
  const { id: workspaceId, purchaseOrderId } = useParams();
  const navigate = useNavigate();
  const base = `/workspace/${workspaceId}/accounting/purchase-orders`;

  const [purchaseOrder, setPurchaseOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    purchaseOrdersApi
      .show(purchaseOrderId)
      .then((res) => {
        if (!cancelled) setPurchaseOrder(res.data?.data || null);
      })
      .catch((err) => {
        toast.error(err?.response?.data?.message || 'Failed to load purchase order');
        if (!cancelled) setPurchaseOrder(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [purchaseOrderId]);

  const poForm = usePurchaseOrderForm({
    mode: 'edit',
    purchaseOrder,
    onSuccess: () => navigate(`${base}/${purchaseOrderId}`),
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!purchaseOrder) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-muted-foreground">Purchase order not found</p>
        <Button asChild>
          <Link to={base}>
            <ArrowLeft className="size-4 mr-1" /> Back to purchase orders
          </Link>
        </Button>
      </div>
    );
  }

  if (!purchaseOrder.flags?.can_edit) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-muted-foreground">This purchase order cannot be edited.</p>
        <Button asChild>
          <Link to={`${base}/${purchaseOrderId}`}>
            <ArrowLeft className="size-4 mr-1" /> View purchase order
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full min-w-0">
      <PageHeader
        title={`Edit ${purchaseOrder.po_number}`}
        subtitle={purchaseOrder.vendor?.name}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <DocumentCreateRelatedDropdown
              workspaceId={workspaceId}
              sourceType="purchase_order"
              sourceId={purchaseOrderId}
              targets={[
                { target: 'quotation' },
                { target: 'sales_order' },
                { target: 'invoice' },
                { target: 'bill' },
                { target: 'purchase_order' },
              ]}
            />
            <Button variant="outline" size="sm" asChild>
              <Link to={`${base}/${purchaseOrderId}`}>
                <ArrowLeft className="size-4 mr-1" /> Back
              </Link>
            </Button>
          </div>
        }
      />
      <PurchaseOrderForm
        {...poForm}
        isEdit
        onSubmit={poForm.handleSubmit}
        onCancel={() => navigate(`${base}/${purchaseOrderId}`)}
      />
    </div>
  );
}
