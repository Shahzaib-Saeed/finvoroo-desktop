import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { salesOrdersApi } from './api/sales-orders.api';
import { SALES_ORDER_STATUSES } from './constants';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { SalesOrderShowActions } from './components/SalesOrderShowActions';
import { SalesOrderShowDetail } from './components/SalesOrderShowDetail';
import { SalesOrderPrintDocument } from './components/SalesOrderPrintDocument';
import { DocumentActionConfirmDialog } from '../components/DocumentActionConfirmDialog';
import { printSalesOrderDocument } from '@/lib/print-sales-order';
import {
  confirmCompleteMessage,
  confirmCreateInvoiceMessage,
  confirmDeleteMessage,
  confirmEditMessage,
} from '../components/document-confirm-messages';

export function SalesOrderShowPage() {
  const { id: workspaceId, salesOrderId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const base = `/workspace/${workspaceId}/accounting/sales-orders`;
  const invoiceBase = `/workspace/${workspaceId}/accounting/invoices`;

  const [salesOrder, setSalesOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = () => {
    setLoading(true);
    salesOrdersApi
      .show(salesOrderId)
      .then((res) => setSalesOrder(res.data?.data || null))
      .catch((err) => {
        toast.error(err?.response?.data?.message || 'Failed to load sales order');
        setSalesOrder(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [salesOrderId]);

  useEffect(() => {
    if (searchParams.get('print') === '1' && salesOrder && !loading) {
      const t = setTimeout(() => printSalesOrderDocument(), 400);
      return () => clearTimeout(t);
    }
  }, [salesOrder, loading, searchParams]);

  const closeConfirm = () => {
    if (!actionLoading) setConfirmAction(null);
  };

  const confirmMessage = useMemo(() => {
    if (!confirmAction || !salesOrder) return null;
    const num = salesOrder.so_number;
    switch (confirmAction) {
      case 'delete':
        return confirmDeleteMessage('sales order', num);
      case 'edit':
        return confirmEditMessage('sales order', num);
      case 'convert':
        return confirmCreateInvoiceMessage(num);
      case 'complete':
        return confirmCompleteMessage('sales order', num);
      default:
        return null;
    }
  }, [confirmAction, salesOrder]);

  const runConfirmedAction = async () => {
    if (!confirmAction) return;

    if (confirmAction === 'edit') {
      setConfirmAction(null);
      navigate(`${base}/${salesOrderId}/edit`);
      return;
    }

    setActionLoading(true);
    try {
      if (confirmAction === 'delete') {
        await salesOrdersApi.delete(salesOrderId);
        toast.success('Sales order deleted');
        navigate(base);
        return;
      }
      if (confirmAction === 'complete') {
        const res = await salesOrdersApi.complete(salesOrderId);
        setSalesOrder(res.data?.data || null);
        toast.success(res.data?.message || 'Sales order marked complete');
      }
      if (confirmAction === 'convert') {
        const res = await salesOrdersApi.convertToInvoice(salesOrderId);
        const invoiceId = res.data?.data?.invoice_id;
        toast.success(res.data?.message || 'Invoice created from sales order');
        if (invoiceId) {
          navigate(`${invoiceBase}/${invoiceId}`);
          return;
        }
        setSalesOrder(res.data?.data?.sales_order || salesOrder);
        load();
      }
      setConfirmAction(null);
    } catch (err) {
      const messages = {
        delete: 'Could not delete sales order',
        complete: 'Could not complete sales order',
        convert: 'Could not create invoice',
      };
      toast.error(err?.response?.data?.message || messages[confirmAction]);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenJob = () => {
    if (salesOrder?.job_order?.id) {
      navigate(`/workspace/${workspaceId}/accounting/job-orders/${salesOrder.job_order.id}`);
      return;
    }
    toast.info(
      'Create a job from Job Orders, then tag invoices and expenses to it for profitability tracking.',
    );
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
      <div className="text-center py-16">
        <p className="text-muted-foreground mb-4">Sales order not found</p>
        <Button asChild>
          <Link to={base}>Back to sales orders</Link>
        </Button>
      </div>
    );
  }

  const status = salesOrder.status || 'draft';
  const statusLabel =
    SALES_ORDER_STATUSES.find((s) => s.value === status)?.label || status;
  const flags = salesOrder.flags || {};
  const busy = actionLoading;

  return (
    <div className="space-y-6 w-full min-w-0 print:space-y-4">
      <div className="print:hidden">
        <PageHeader
          title={salesOrder.so_number}
          subtitle={`${salesOrder.customer?.name || 'Customer'} · ${statusLabel}`}
          actions={
            <SalesOrderShowActions
              workspaceId={workspaceId}
              salesOrderId={salesOrderId}
              salesOrder={salesOrder}
              base={base}
              canEdit={flags.can_edit !== false && status !== 'cancelled'}
              canDelete={flags.can_delete !== false}
              canMarkComplete={flags.can_mark_complete === true}
              canConvert={flags.can_convert_to_invoice === true}
              canCreateDelivery={flags.can_create_delivery_note === true}
              canCreateProduction={flags.can_create_production_order === true}
              canOpenJob={Boolean(salesOrder?.job_order?.id)}
              onEdit={() => setConfirmAction('edit')}
              onComplete={() => setConfirmAction('complete')}
              onConvert={() => setConfirmAction('convert')}
              onOpenJob={handleOpenJob}
              onDelete={() => setConfirmAction('delete')}
              busy={busy}
            />
          }
        />
      </div>

      <div className="print:hidden">
        <SalesOrderShowDetail
          salesOrder={salesOrder}
          workspaceId={workspaceId}
          salesOrderId={salesOrderId}
          canCreateDelivery={flags.can_create_delivery_note === true}
        />
      </div>

      <SalesOrderPrintDocument salesOrder={salesOrder} />

      <DocumentActionConfirmDialog
        open={!!confirmAction}
        message={confirmMessage}
        isLoading={actionLoading}
        onConfirm={runConfirmedAction}
        onCancel={closeConfirm}
      />
    </div>
  );
}
