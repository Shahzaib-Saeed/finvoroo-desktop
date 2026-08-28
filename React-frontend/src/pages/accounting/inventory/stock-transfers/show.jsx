import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle,
  Coins,
  Edit3,
  FileText,
  Loader2,
  Package,
  StickyNote,
  Trash2,
  User,
  Warehouse,
} from 'lucide-react';
import { toast } from 'sonner';
import { stockTransfersApi } from '../api/stock-transfers.api';
import { TRANSFER_STATUS_COLORS, formatCurrency } from '../constants';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTable,
  CardTitle,
} from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { cn } from '@/lib/utils';

function StatCard({ icon: Icon, label, value, sub, tone = 'default' }) {
  const tones = {
    default: 'bg-muted/40 text-muted-foreground',
    primary: 'bg-primary/10 text-primary',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
  };
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
            <p className="text-2xl font-bold tabular-nums leading-none text-foreground">
              {value}
            </p>
            {sub ? <p className="text-xs text-muted-foreground pt-1">{sub}</p> : null}
          </div>
          <div
            className={cn(
              'size-10 rounded-xl flex items-center justify-center shrink-0',
              tones[tone] || tones.default,
            )}
          >
            <Icon className="size-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailRow({ icon: Icon, label, children }) {
  return (
    <div className="flex gap-3 py-2.5 border-b last:border-0">
      <div className="size-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <div className="text-sm font-medium mt-0.5 wrap-break-word">{children}</div>
      </div>
    </div>
  );
}

export function StockTransferShowPage() {
  const { id: workspaceId, transferId } = useParams();
  const navigate = useNavigate();
  const invBase = `/workspace/${workspaceId}/accounting/inventory`;
  const base = `${invBase}/stock-transfers`;

  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    stockTransfersApi
      .show(transferId)
      .then((res) => setRow(res.data?.data || null))
      .catch((err) => toast.error(err?.response?.data?.message || 'Transfer not found'))
      .finally(() => setLoading(false));
  }, [transferId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleComplete = async () => {
    setCompleting(true);
    try {
      const res = await stockTransfersApi.complete(transferId);
      toast.success(res.data?.message || 'Transfer completed');
      setRow(res.data?.data || null);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not complete transfer');
    } finally {
      setCompleting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await stockTransfersApi.destroy(transferId);
      toast.success(res.data?.message || 'Stock transfer deleted');
      navigate(base);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not delete stock transfer');
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
        accessorFn: (line) => line.product_name || `#${line.product_id}`,
        header: ({ column }) => <DataGridColumnHeader title="Product" column={column} />,
        cell: ({ row: r }) => (
          <div className="flex items-center gap-2 min-w-0">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Package className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                {r.original.product_name || `#${r.original.product_id}`}
              </p>
              {r.original.product_sku ? (
                <p className="text-xs text-muted-foreground truncate font-mono">
                  {r.original.product_sku}
                </p>
              ) : null}
            </div>
          </div>
        ),
        size: 320,
        enableSorting: true,
        meta: {
          headerTitle: 'Product',
          skeleton: <Skeleton className="h-8 w-40" />,
        },
      },
      {
        id: 'quantity',
        accessorKey: 'quantity',
        header: ({ column }) => <DataGridColumnHeader title="Qty" column={column} />,
        cell: ({ row: r }) => (
          <span className="text-sm tabular-nums font-medium">{r.original.quantity}</span>
        ),
        size: 100,
        enableSorting: true,
        meta: {
          headerTitle: 'Qty',
          cellClassName: 'text-end',
          skeleton: <Skeleton className="h-5 w-10 ms-auto" />,
        },
      },
      {
        id: 'unit_cost',
        accessorKey: 'unit_cost',
        header: ({ column }) => <DataGridColumnHeader title="Unit cost" column={column} />,
        cell: ({ row: r }) => (
          <span className="text-sm tabular-nums text-muted-foreground">
            {formatCurrency(r.original.unit_cost ?? 0)}
          </span>
        ),
        size: 130,
        enableSorting: true,
        meta: {
          headerTitle: 'Unit cost',
          cellClassName: 'text-end',
          skeleton: <Skeleton className="h-5 w-16 ms-auto" />,
        },
      },
      {
        id: 'total_cost',
        accessorKey: 'total_cost',
        header: ({ column }) => <DataGridColumnHeader title="Total" column={column} />,
        cell: ({ row: r }) => (
          <span className="text-sm tabular-nums font-semibold">
            {formatCurrency(r.original.total_cost ?? 0)}
          </span>
        ),
        size: 130,
        enableSorting: true,
        meta: {
          headerTitle: 'Total',
          cellClassName: 'text-end',
          skeleton: <Skeleton className="h-5 w-16 ms-auto" />,
        },
      },
    ],
    [],
  );

  const table = useReactTable({
    columns,
    data: lines,
    state: { pagination: { pageIndex: 0, pageSize: 25 } },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (r) => String(r.id ?? `${r.product_id}-${r.quantity}`),
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
        <p className="text-muted-foreground">Transfer not found.</p>
      </div>
    );
  }

  const canComplete = row.flags?.can_complete;
  const canEdit = row.flags?.can_edit;
  const canDelete = row.flags?.can_delete;
  const status = row.status || 'draft';
  const statusLabel = (status || '').replace('_', ' ');

  return (
    <div className="space-y-6 w-full min-w-0">
      <div>
        <nav className="text-sm text-muted-foreground mb-3 flex flex-wrap items-center gap-1.5">
          <Link to={base} className="hover:text-foreground transition-colors">
            Stock transfers
          </Link>
          <span aria-hidden>/</span>
          <span className="text-foreground font-medium">
            {row.transfer_number || `#${row.id}`}
          </span>
        </nav>

        <PageHeader
          title={row.transfer_number || `Transfer #${row.id}`}
          subtitle={
            <span className="inline-flex items-center gap-2">
              <Warehouse className="size-3.5" />
              {row.from_warehouse?.name || '—'}
              <ArrowRight className="size-3.5 text-muted-foreground/70" />
              <Warehouse className="size-3.5" />
              {row.to_warehouse?.name || '—'}
            </span>
          }
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to={base}>
                  <ArrowLeft className="size-4 mr-1" /> All transfers
                </Link>
              </Button>
              {canComplete ? (
                <Button size="sm" onClick={handleComplete} disabled={completing}>
                  {completing ? (
                    <Loader2 className="size-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="size-4 mr-2" />
                  )}
                  Complete
                </Button>
              ) : null}
              {canEdit ? (
                <Button variant="outline" size="sm" asChild>
                  <Link to={`${base}/${transferId}/edit`}>
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
      </div>

      {/* KPI strip */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Package}
          label="Line items"
          value={row.line_count ?? lines.length}
          sub="Distinct products moved"
          tone="primary"
        />
        <StatCard
          icon={Coins}
          label="Total value"
          value={formatCurrency(row.total_value ?? 0)}
          sub="Cost of moved stock"
          tone="emerald"
        />
        <StatCard
          icon={Calendar}
          label="Transfer date"
          value={row.transfer_date_display || row.transfer_date || '—'}
          sub={row.completed_at ? `Completed ${row.completed_at}` : 'Not yet completed'}
          tone="amber"
        />
        <StatCard
          icon={CheckCircle}
          label="Status"
          value={
            <Badge
              variant="outline"
              className={cn(
                'rounded-full capitalize text-xs px-2.5 py-0.5',
                TRANSFER_STATUS_COLORS[status] || '',
              )}
            >
              {statusLabel}
            </Badge>
          }
          sub={
            row.created_by_name
              ? `Created by ${row.created_by_name}`
              : 'Created on system'
          }
          tone="default"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Lines table */}
        <div className="xl:col-span-2">
          <Card>
            <CardHeader className="py-3 border-b">
              <CardTitle className="text-base font-semibold inline-flex items-center gap-2">
                <FileText className="size-4 text-muted-foreground" />
                Line items
                <span className="text-muted-foreground font-normal">
                  ({row.line_count ?? lines.length})
                </span>
              </CardTitle>
            </CardHeader>
            <DataGrid
              table={table}
              recordCount={lines.length}
              isLoading={false}
              tableLayout={{
                cellBorder: true,
                rowBorder: true,
                headerBackground: true,
                headerBorder: true,
              }}
            >
              <CardTable>
                <ScrollArea>
                  <DataGridTable />
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </CardTable>
              {lines.length > 25 ? (
                <CardFooter className="border-t">
                  <DataGridPagination sizes={[25, 50, 100]} />
                </CardFooter>
              ) : null}
            </DataGrid>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="py-3 border-b">
              <CardTitle className="text-base font-semibold">Details</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 pt-0">
              <DetailRow icon={Warehouse} label="From warehouse">
                {row.from_warehouse?.name || '—'}
              </DetailRow>
              <DetailRow icon={Warehouse} label="To warehouse">
                {row.to_warehouse?.name || '—'}
              </DetailRow>
              <DetailRow icon={Calendar} label="Transfer date">
                {row.transfer_date_display || row.transfer_date || '—'}
              </DetailRow>
              {row.completed_at ? (
                <DetailRow icon={CheckCircle} label="Completed">
                  {row.completed_at}
                </DetailRow>
              ) : null}
              {row.created_by_name ? (
                <DetailRow icon={User} label="Created by">
                  {row.created_by_name}
                </DetailRow>
              ) : null}
            </CardContent>
          </Card>

          {row.notes ? (
            <Card>
              <CardHeader className="py-3 border-b">
                <CardTitle className="text-base font-semibold inline-flex items-center gap-2">
                  <StickyNote className="size-4 text-muted-foreground" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 pt-4">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {row.notes}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete stock transfer?"
        description={`Delete ${row.transfer_number || `#${row.id}`}? This will restore ${row.from_warehouse?.name || 'the source warehouse'}'s quantity and remove the movement into ${row.to_warehouse?.name || 'the destination warehouse'}. This cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        isLoading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
