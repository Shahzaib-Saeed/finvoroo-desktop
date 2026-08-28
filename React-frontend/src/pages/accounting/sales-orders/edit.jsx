import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/PageHeader';
import { salesOrdersApi } from './api/sales-orders.api';
import { SalesOrderForm } from './components/SalesOrderForm';
import { useSalesOrderForm } from './hooks/useSalesOrderForm';
import { DocumentActionConfirmDialog } from '../components/DocumentActionConfirmDialog';
import { confirmUpdateMessage } from '../components/document-confirm-messages';
import { DocumentCreateRelatedDropdown } from '../components/DocumentCreateRelatedDropdown';

export function SalesOrderEditPage() {
  const { id: workspaceId, salesOrderId } = useParams();
  const navigate = useNavigate();
  const base = `/workspace/${workspaceId}/accounting/sales-orders`;

  const [salesOrder, setSalesOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmUpdate, setConfirmUpdate] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    salesOrdersApi
      .show(salesOrderId)
      .then((res) => {
        if (!cancelled) setSalesOrder(res.data?.data || null);
      })
      .catch((err) => {
        toast.error(err?.response?.data?.message || 'Failed to load sales order');
        if (!cancelled) setSalesOrder(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [salesOrderId]);

  const salesOrderForm = useSalesOrderForm({
    mode: 'edit',
    salesOrder,
    onSuccess: () => navigate(`${base}/${salesOrderId}`),
  });

  const updateConfirmMessage = useMemo(
    () =>
      salesOrder
        ? confirmUpdateMessage('sales order', salesOrder.so_number)
        : null,
    [salesOrder]
  );

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setConfirmUpdate(true);
  };

  const confirmSave = () => {
    setConfirmUpdate(false);
    salesOrderForm.handleSubmit();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!salesOrder) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-muted-foreground">Sales order not found</p>
        <Button asChild>
          <Link to={base}>
            <ArrowLeft className="size-4 mr-1" /> Back to sales orders
          </Link>
        </Button>
      </div>
    );
  }

  if (salesOrder.status === 'cancelled') {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-muted-foreground">Cancelled sales orders cannot be edited.</p>
        <Button asChild>
          <Link to={`${base}/${salesOrderId}`}>
            <ArrowLeft className="size-4 mr-1" /> View sales order
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full min-w-0">
      <PageHeader
        title={`Edit ${salesOrder.so_number}`}
        subtitle={salesOrder.customer?.name}
        actions={
          <div className="flex flex-wrap items-center gap-2">
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
            <Button variant="outline" size="sm" asChild>
              <Link to={`${base}/${salesOrderId}`}>
                <ArrowLeft className="size-4 mr-1" /> Back
              </Link>
            </Button>
          </div>
        }
      />
      <SalesOrderForm
        {...salesOrderForm}
        onSubmit={handleFormSubmit}
        onCancel={() => navigate(`${base}/${salesOrderId}`)}
      />

      <DocumentActionConfirmDialog
        open={confirmUpdate}
        message={updateConfirmMessage}
        isLoading={salesOrderForm.saving}
        onConfirm={confirmSave}
        onCancel={() => !salesOrderForm.saving && setConfirmUpdate(false)}
      />
    </div>
  );
}
