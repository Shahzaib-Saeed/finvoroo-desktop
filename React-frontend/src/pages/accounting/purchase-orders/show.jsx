import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  ArrowLeft,
  Edit3,
  ExternalLink,
  FileInput,
  Loader2,
  Printer,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { purchaseOrdersApi } from './api/purchase-orders.api';
import { formatCurrency, STATUS_COLORS, APPROVAL_COLORS } from './constants';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DocumentCreateRelatedDropdown } from '../components/DocumentCreateRelatedDropdown';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

export function PurchaseOrderShowPage() {
  const { id: workspaceId, purchaseOrderId } = useParams();
  const navigate = useNavigate();
  const base = `/workspace/${workspaceId}/accounting/purchase-orders`;
  const billsBase = `/workspace/${workspaceId}/accounting/bills`;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [converting, setConverting] = useState(false);

  const load = () => {
    setLoading(true);
    purchaseOrdersApi
      .show(purchaseOrderId)
      .then((res) => setOrder(res.data?.data || null))
      .catch((err) => {
        toast.error(err?.response?.data?.message || 'Failed to load purchase order');
        setOrder(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [purchaseOrderId]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await purchaseOrdersApi.delete(purchaseOrderId);
      toast.success('Purchase order deleted');
      navigate(base);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not delete purchase order');
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleConvert = async () => {
    setConverting(true);
    try {
      const res = await purchaseOrdersApi.convertToBill(purchaseOrderId);
      toast.success(res.data?.message || 'Converted to bill');
      const billId = res.data?.data?.bill_id;
      if (billId) navigate(`${billsBase}/${billId}`);
      else load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not convert to bill');
    } finally {
      setConverting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground mb-4">Purchase order not found</p>
        <Button asChild>
          <Link to={base}>Back to purchase orders</Link>
        </Button>
      </div>
    );
  }

  const flags = order.flags || {};
  const status = order.status || 'draft';
  const approval = order.approval_status || 'approved';

  return (
    <div className="space-y-6 w-full min-w-0 print:space-y-4">
      <div className="print:hidden">
        <PageHeader
          title={order.po_number}
          subtitle={order.vendor?.name}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to={base}>
                  <ArrowLeft className="size-4 mr-1" /> Back
                </Link>
              </Button>
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
              {flags.can_edit && (
                <Button variant="outline" size="sm" asChild>
                  <Link to={`${base}/${purchaseOrderId}/edit`}>
                    <Edit3 className="size-4 mr-1" /> Edit
                  </Link>
                </Button>
              )}
              {flags.can_convert_to_bill && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleConvert}
                  disabled={converting}
                >
                  <FileInput className="size-4 mr-1" /> Convert to bill
                </Button>
              )}
              {order.bill_id && (
                <Button variant="outline" size="sm" asChild>
                  <Link to={`${billsBase}/${order.bill_id}`}>
                    <ExternalLink className="size-4 mr-1" /> View bill
                  </Link>
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="size-4 mr-1" /> Print
              </Button>
              {flags.can_delete && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="size-4 mr-1" /> Delete
                </Button>
              )}
            </div>
          }
        />
      </div>

      <div className="rounded-lg border bg-card shadow-sm p-4 sm:p-6 lg:p-8 print:shadow-none">
        <div className="flex flex-col sm:flex-row sm:justify-between gap-4 mb-6 pb-4 border-b">
          <div>
            <h2 className="text-2xl font-bold text-purple-600 uppercase tracking-wide">
              Purchase order
            </h2>
          </div>
          <div className="sm:text-right space-y-1">
            <p className="font-semibold text-lg">{order.po_number}</p>
            <p className="text-sm text-muted-foreground">
              {order.order_date_display || order.order_date}
            </p>
            <Badge variant="outline" className={cn('capitalize', STATUS_COLORS[status] || '')}>
              {status}
            </Badge>
            {approval !== 'approved' && (
              <Badge variant="outline" className={cn('ml-1 capitalize', APPROVAL_COLORS[approval])}>
                {approval}
              </Badge>
            )}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-xs font-bold uppercase text-muted-foreground mb-2">Vendor</h3>
            <p className="font-semibold">{order.vendor?.name || '—'}</p>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase text-muted-foreground mb-2">Dates</h3>
            <dl className="text-sm space-y-1">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Expected delivery</dt>
                <dd>
                  {order.expected_delivery_display || order.expected_delivery || '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-4 font-medium">
                <dt>Total</dt>
                <dd className="tabular-nums text-primary">
                  {formatCurrency(order.total)}
                </dd>
              </div>
            </dl>
            {order.bill && (
              <p className="text-sm mt-3">
                Linked bill:{' '}
                <Link
                  to={`${billsBase}/${order.bill.id}`}
                  className="text-primary hover:underline"
                >
                  {order.bill.bill_number}
                </Link>
              </p>
            )}
          </div>
        </div>

        {order.notes && (
          <p className="text-sm text-muted-foreground mb-6">
            <span className="font-medium text-foreground">Notes:</span> {order.notes}
          </p>
        )}

        {(order.lines || []).length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase text-muted-foreground mb-2">Line items</h3>
            <div className="overflow-x-auto border rounded-md">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="p-2 text-left">Description</th>
                    <th className="p-2 text-right">Qty</th>
                    <th className="p-2 text-right">Rate</th>
                    <th className="p-2 text-right">Disc %</th>
                    <th className="p-2 text-right">Tax</th>
                    <th className="p-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {order.lines.map((line) => (
                    <tr key={line.id} className="border-t">
                      <td className="p-2">
                        {line.description}
                        {line.product_name && (
                          <span className="block text-xs text-muted-foreground">
                            {line.product_name}
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-right tabular-nums">{line.quantity}</td>
                      <td className="p-2 text-right tabular-nums">
                        {formatCurrency(line.unit_price)}
                      </td>
                      <td className="p-2 text-right tabular-nums">
                        {line.discount_percent > 0 ? `${line.discount_percent}%` : '—'}
                      </td>
                      <td className="p-2 text-right tabular-nums">
                        {formatCurrency(line.tax_amount)}
                      </td>
                      <td className="p-2 text-right tabular-nums font-medium">
                        {formatCurrency(line.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/30">
                    <td colSpan={5} className="p-2 text-right text-muted-foreground">
                      Subtotal / Tax / Total
                    </td>
                    <td className="p-2 text-right tabular-nums font-semibold">
                      {formatCurrency(order.subtotal)} / {formatCurrency(order.tax_amount)} /{' '}
                      {formatCurrency(order.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete purchase order?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
