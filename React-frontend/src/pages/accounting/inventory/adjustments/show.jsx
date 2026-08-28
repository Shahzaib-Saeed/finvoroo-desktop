import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from '@tanstack/react-table';
import { ArrowLeft, Edit3, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { stockAdjustmentsApi } from '../api/stock-adjustments.api';
import { formatCurrency } from '../constants';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataGridLayout } from '@/components/ui/data-grid-layout';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export function StockAdjustmentShowPage() {
  const { id: workspaceId, adjustmentId } = useParams();
  const navigate = useNavigate();
  const invBase = `/workspace/${workspaceId}/accounting/inventory`;
  const base = `${invBase}/adjustments`;

  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    stockAdjustmentsApi
      .show(adjustmentId)
      .then((res) => {
        if (!cancelled) setRow(res.data?.data || null);
      })
      .catch((err) => {
        if (!cancelled) toast.error(err?.response?.data?.message || 'Adjustment not found');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [adjustmentId]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await stockAdjustmentsApi.destroy(adjustmentId);
      toast.success(res.data?.message || 'Stock adjustment deleted');
      navigate(base);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not delete stock adjustment');
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const lines = row?.lines || [];

  const columns = useMemo(
    () => [
      {
        id: 'product',
        header: 'Product',
        cell: ({ row: r }) => (
          <span className="text-sm font-medium">
            {r.original.product_name || `#${r.original.product_id}`}
            {r.original.product_sku ? (
              <span className="text-muted-foreground font-normal"> ({r.original.product_sku})</span>
            ) : null}
          </span>
        ),
      },
      {
        accessorKey: 'quantity_before',
        header: () => <span className="block text-right w-full">Before</span>,
        cell: ({ row: r }) => (
          <span className="text-sm tabular-nums block text-right">{r.original.quantity_before}</span>
        ),
      },
      {
        accessorKey: 'quantity_after',
        header: () => <span className="block text-right w-full">After</span>,
        cell: ({ row: r }) => (
          <span className="text-sm tabular-nums block text-right">{r.original.quantity_after}</span>
        ),
      },
      {
        accessorKey: 'quantity_change',
        header: () => <span className="block text-right w-full">Change</span>,
        cell: ({ row: r }) => (
          <span className="text-sm tabular-nums block text-right">{r.original.quantity_change}</span>
        ),
      },
      {
        accessorKey: 'unit_cost',
        header: () => <span className="block text-right w-full">Unit cost</span>,
        cell: ({ row: r }) => (
          <span className="text-sm tabular-nums block text-right">
            {formatCurrency(r.original.unit_cost ?? 0)}
          </span>
        ),
      },
      {
        accessorKey: 'total_value_change',
        header: () => <span className="block text-right w-full">Value Δ</span>,
        cell: ({ row: r }) => (
          <span className="text-sm tabular-nums block text-right">
            {formatCurrency(r.original.total_value_change ?? 0)}
          </span>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    columns,
    data: lines,
    state: { pagination: { pageIndex: 0, pageSize: 15 } },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="size-6 animate-spin mr-2" /> Loading…
      </div>
    );
  }

  if (!row) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" asChild>
          <Link to={base}>
            <ArrowLeft className="size-4 mr-1" /> Back
          </Link>
        </Button>
        <p className="text-muted-foreground">Adjustment not found.</p>
      </div>
    );
  }

  const canEdit = row.flags?.can_edit;
  const canDelete = row.flags?.can_delete;

  return (
    <div className="space-y-6 w-full min-w-0">
      <PageHeader
        title={row.adjustment_number || `Adjustment #${row.id}`}
        subtitle={`${row.warehouse?.name || '—'} · ${row.adjustment_date_display || row.adjustment_date || ''}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={base}>
                <ArrowLeft className="size-4 mr-1" /> All adjustments
              </Link>
            </Button>
            {canEdit ? (
              <Button variant="outline" size="sm" asChild>
                <Link to={`${base}/${adjustmentId}/edit`}>
                  <Edit3 className="size-4 mr-1" /> Edit
                </Link>
              </Button>
            ) : null}
            {canDelete ? (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="size-4 mr-1" /> Delete
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Reason</span>
              <span>{row.reason_label || row.reason}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Posted</span>
              {row.is_posted ? (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                  Yes
                </Badge>
              ) : (
                <span>No</span>
              )}
            </div>
            {row.notes ? (
              <div className="pt-2 border-t">
                <p className="text-muted-foreground text-xs mb-1">Notes</p>
                <p className="whitespace-pre-wrap">{row.notes}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Lines</span>
              <span>{row.line_count ?? lines.length}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Total value change</span>
              <span className="tabular-nums font-medium">
                {formatCurrency(row.total_value_change ?? 0)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border bg-card shadow-sm">
        <div className="px-4 py-3 border-b">
          <h3 className="text-sm font-medium">Lines</h3>
        </div>
        <DataGridLayout table={table} recordCount={lines.length} isLoading={false} />
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete stock adjustment?"
        description={`Delete ${row.adjustment_number || `#${row.id}`}? This will restore the pre-adjustment quantity${row.is_posted ? ' and remove its GL journal entry' : ''}. This cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        isLoading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
