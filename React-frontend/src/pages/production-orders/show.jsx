import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Edit3,
  Loader2,
  Printer,
} from 'lucide-react';
import { toast } from 'sonner';
import { productionOrdersApi } from './api/production-orders.api';
import {
  PO_STATUS_COLORS,
  formatCurrency,
  formatProductionProductName,
  formatStatus,
} from './constants';
import { CompleteProductionDialog } from './components/CompleteProductionDialog';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

function DetailRow({ label, children }) {
  return (
    <tr>
      <td className="text-muted-foreground align-top pe-4 py-2 w-2/5 text-sm">{label}</td>
      <td className="py-2 text-sm font-medium">{children}</td>
    </tr>
  );
}

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'planned', label: 'Planned' },
  { value: 'in_production', label: 'In production' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function ProductionOrderShowPage() {
  const { id: workspaceId, orderId } = useParams();
  const navigate = useNavigate();
  const base = `/workspace/${workspaceId}/production-orders`;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusValue, setStatusValue] = useState('');
  const [statusSaving, setStatusSaving] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    productionOrdersApi
      .show(orderId)
      .then((res) => {
        const data = res.data?.data;
        setOrder(data || null);
        if (data?.status) setStatusValue(data.status);
      })
      .catch((err) => {
        toast.error(err?.response?.data?.message || 'Failed to load production order');
        setOrder(null);
      })
      .finally(() => setLoading(false));
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatusUpdate = async () => {
    if (!statusValue || statusValue === order?.status) return;
    setStatusSaving(true);
    try {
      const res = await productionOrdersApi.bulkStatus({ ids: [order.id], status: statusValue });
      toast.success(res.data?.message || 'Status updated');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Status update failed');
    } finally {
      setStatusSaving(false);
    }
  };

  const handleDuplicate = async () => {
    try {
      const res = await productionOrdersApi.duplicate(orderId);
      toast.success(res.data?.message || 'Order duplicated');
      const newId = res.data?.data?.id;
      if (newId) navigate(`${base}/${newId}`);
      else load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Duplicate failed');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="size-6 animate-spin mr-2" />
        Loading production order…
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground mb-4">Production order not found.</p>
        <Button asChild variant="outline">
          <Link to={base}>Back to list</Link>
        </Button>
      </div>
    );
  }

  const flags = order.flags || {};
  const materials = order.materials || [];
  const shortages = order.material_shortages || [];
  const totalWithOverhead =
    Number(order.total_cost || 0) + Number(order.production_overhead || 0);
  const isTerminal = flags.is_terminal;

  return (
    <div className="space-y-6 w-full min-w-0 print:space-y-4">
      <PageHeader
        title={order.po_number}
        subtitle="Production order details and bill of materials."
        actions={
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button variant="outline" size="sm" asChild>
              <Link to={base}>
                <ArrowLeft className="size-4 mr-1" /> Back
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="size-4 mr-1" /> Print slip
            </Button>
            {flags.can_edit && (
              <Button variant="outline" size="sm" asChild>
                <Link to={`${base}/${orderId}/edit`}>
                  <Edit3 className="size-4 mr-1" /> Edit
                </Link>
              </Button>
            )}
            {flags.can_complete && (
              <Button size="sm" onClick={() => setCompleteOpen(true)}>
                <CheckCircle2 className="size-4 mr-1" /> Complete
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleDuplicate}>
              <Copy className="size-4 mr-1" /> Duplicate
            </Button>
          </div>
        }
      />

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b bg-muted/30 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-primary">{order.po_number}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {formatProductionProductName(order.product)} ·{' '}
              {Number(order.quantity).toLocaleString()} {order.uom || 'pcs'}
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn('capitalize', PO_STATUS_COLORS[order.status] || '')}
          >
            {formatStatus(order.status)}
          </Badge>
        </div>

        <div className="p-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border bg-muted/20 p-4">
            <h3 className="text-sm font-semibold mb-3">Order details</h3>
            <table className="w-full">
              <tbody>
                <DetailRow label="Product">
                  <div>
                    <div>{formatProductionProductName(order.product)}</div>
                    {order.product?.sku ? (
                      <div className="text-xs font-normal text-muted-foreground mt-0.5">
                        SKU: {order.product.sku}
                      </div>
                    ) : null}
                  </div>
                </DetailRow>
                <DetailRow label="Quantity">
                  {Number(order.quantity).toLocaleString()} {order.uom || 'pcs'}
                </DetailRow>
                <DetailRow label="Production date">
                  {order.production_date_display || order.production_date}
                </DetailRow>
                <DetailRow label="Expected completion">
                  {order.expected_completion_date_display ||
                    order.expected_completion_date ||
                    '—'}
                </DetailRow>
                <DetailRow label="Warehouse">{order.warehouse?.name || 'Default'}</DetailRow>
                <DetailRow label="Assigned to">
                  {order.assigned_user?.name || order.assigned_user?.email || '—'}
                </DetailRow>
                <DetailRow label="Machine / line">{order.machine_line || '—'}</DetailRow>
              </tbody>
            </table>
          </div>
          <div className="rounded-lg border bg-muted/20 p-4">
            <h3 className="text-sm font-semibold mb-3">Costs & progress</h3>
            <table className="w-full">
              <tbody>
                <DetailRow label="Materials cost">{formatCurrency(order.total_cost)}</DetailRow>
                <DetailRow label="Overhead">
                  {formatCurrency(order.production_overhead)}
                </DetailRow>
                <DetailRow label="Total cost">
                  <span className="text-primary font-bold">{formatCurrency(totalWithOverhead)}</span>
                </DetailRow>
                {order.quantity_completed > 0 && (
                  <DetailRow label="Quantity completed">
                    {Number(order.quantity_completed).toLocaleString()} {order.uom || 'pcs'}
                  </DetailRow>
                )}
                {order.quantity_remaining > 0 && order.status !== 'completed' && (
                  <DetailRow label="Remaining">
                    {Number(order.quantity_remaining).toLocaleString()} {order.uom || 'pcs'}
                  </DetailRow>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {order.notes && (
          <div className="mx-6 mb-6 rounded-md border bg-muted/30 p-4 text-sm">
            <p className="text-xs font-medium uppercase text-muted-foreground mb-1">Notes</p>
            <p className="whitespace-pre-wrap">{order.notes}</p>
          </div>
        )}

        {!isTerminal && (
          <div className="mx-6 mb-6 flex flex-wrap items-center gap-2 print:hidden">
            <span className="text-sm text-muted-foreground">Change status:</span>
            <Select value={statusValue} onValueChange={setStatusValue}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              onClick={handleStatusUpdate}
              disabled={statusSaving || statusValue === order.status}
            >
              {statusSaving ? 'Updating…' : 'Update'}
            </Button>
          </div>
        )}
      </div>

      {shortages.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h3 className="text-sm font-semibold text-amber-900 mb-2">
            Material shortage (snapshot at last save)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border bg-white rounded">
              <thead>
                <tr className="border-b bg-amber-100/50">
                  <th className="text-left p-2">Material</th>
                  <th className="text-right p-2">Required</th>
                  <th className="text-right p-2">Available</th>
                  <th className="text-right p-2">Short</th>
                </tr>
              </thead>
              <tbody>
                {shortages.map((row, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="p-2">{row.name || '—'}</td>
                    <td className="p-2 text-right tabular-nums">{row.required ?? 0}</td>
                    <td className="p-2 text-right tabular-nums">{row.available ?? 0}</td>
                    <td className="p-2 text-right tabular-nums font-semibold text-destructive">
                      {row.short ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-amber-800 mt-2">
            Inventory moves — recheck stock before completing production.
          </p>
        </div>
      )}

      <section className="rounded-lg border bg-card p-4 space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-primary">Bill of materials</h3>
          <p className="text-xs text-muted-foreground">Materials required for this order.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border rounded-lg overflow-hidden">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-right p-3 font-medium">Quantity</th>
                <th className="text-right p-3 font-medium">Unit cost</th>
                <th className="text-right p-3 font-medium">Total cost</th>
              </tr>
            </thead>
            <tbody>
              {materials.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-muted-foreground">
                    No materials.
                  </td>
                </tr>
              ) : (
                materials.map((m) => (
                  <tr key={m.id} className="border-b last:border-0">
                    <td className="p-3">{m.name}</td>
                    <td className="p-3 text-right tabular-nums">
                      {Math.round(Number(m.quantity)).toLocaleString()}
                    </td>
                    <td className="p-3 text-right tabular-nums">{formatCurrency(m.unit_cost)}</td>
                    <td className="p-3 text-right tabular-nums font-medium">
                      {formatCurrency(m.total_cost)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-muted/30 border-t">
              <tr>
                <td colSpan={3} className="p-3 text-right font-semibold">
                  Total production cost
                </td>
                <td className="p-3 text-right font-bold tabular-nums">
                  {formatCurrency(order.total_cost)}
                </td>
              </tr>
              {Number(order.production_overhead) > 0 && (
                <tr>
                  <td colSpan={3} className="p-3 text-right text-muted-foreground">
                    Overhead
                  </td>
                  <td className="p-3 text-right tabular-nums">
                    {formatCurrency(order.production_overhead)}
                  </td>
                </tr>
              )}
            </tfoot>
          </table>
        </div>
      </section>

      <CompleteProductionDialog
        orderId={orderId}
        orderQty={order.quantity_remaining || order.quantity}
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        onSuccess={load}
      />
    </div>
  );
}
