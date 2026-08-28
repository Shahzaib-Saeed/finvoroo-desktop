import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from '@tanstack/react-table';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { warehousesApi } from '../api/warehouses.api';
import { formatCurrency } from '../constants';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { DataGridLayout } from '@/components/ui/data-grid-layout';

export function WarehouseStockPage() {
  const { id: workspaceId, warehouseId } = useParams();
  const invBase = `/workspace/${workspaceId}/accounting/inventory`;
  const base = `${invBase}/warehouses`;

  const [warehouse, setWarehouse] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStock = useCallback(() => {
    setLoading(true);
    warehousesApi
      .stock(warehouseId)
      .then((res) => {
        const payload = res.data?.data || {};
        setWarehouse(payload.warehouse || null);
        setRows(Array.isArray(payload.rows) ? payload.rows : []);
      })
      .catch((err) => {
        toast.error(err?.response?.data?.message || 'Failed to load warehouse stock');
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, [warehouseId]);

  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  const columns = useMemo(
    () => [
      {
        accessorKey: 'sku',
        header: 'SKU',
        cell: ({ row }) => (
          <span className="text-sm font-mono text-muted-foreground">
            {row.original.sku || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Product',
        cell: ({ row }) => <span className="text-sm font-medium">{row.original.name || '—'}</span>,
      },
      {
        accessorKey: 'category',
        header: 'Category',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.category || '—'}</span>
        ),
      },
      {
        accessorKey: 'quantity',
        header: () => <span className="block text-right w-full">Qty</span>,
        cell: ({ row }) => (
          <span className="text-sm tabular-nums block text-right">
            {row.original.quantity ?? '—'}
          </span>
        ),
      },
      {
        accessorKey: 'unit_price',
        header: () => <span className="block text-right w-full">Unit price</span>,
        cell: ({ row }) => (
          <span className="text-sm tabular-nums block text-right">
            {formatCurrency(row.original.unit_price ?? 0)}
          </span>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    columns,
    data: rows,
    state: {
      pagination: { pageIndex: 0, pageSize: 15 },
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="space-y-6 w-full min-w-0">
      <PageHeader
        title={warehouse ? `${warehouse.name} — Stock` : 'Warehouse stock'}
        subtitle="On-hand quantities for this location."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to={base}>
              <ArrowLeft className="size-4 mr-1" /> Warehouses
            </Link>
          </Button>
        }
      />

      <DataGridLayout table={table} recordCount={rows.length} isLoading={loading} />
    </div>
  );
}
