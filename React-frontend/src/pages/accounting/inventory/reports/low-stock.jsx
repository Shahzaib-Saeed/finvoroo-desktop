import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router';
import { getPaginationRowModel, getSortedRowModel } from '@tanstack/react-table';
import { toast } from 'sonner';
import { inventoryReportsApi } from '../api/inventory-reports.api';
import { INVENTORY_LOW_STOCK_COLUMNS } from '@/pages/accounting/reports/constants/report-columns';
import { useReportDataGridTable } from '@/pages/accounting/reports/hooks/useReportDataGridTable';
import { ReportTableToolbar } from '@/pages/accounting/reports/components/ReportTableToolbar';
import { ReportPageShell } from '@/pages/accounting/reports/components/ReportPageShell';
import { ReportActionBar } from '@/pages/accounting/reports/components/ReportActionBar';
import { ReportSummaryStrip } from '@/pages/accounting/reports/components/ReportSummaryStrip';
import { Badge } from '@/components/ui/badge';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTableDnd } from '@/components/ui/data-grid-table-dnd';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useProductDialog } from '@/components/workspace/product/product-dialog-provider';
import { ProductDetailsSheet } from '@/pages/accounting/products/components/ProductDetailsSheet';

export function InventoryLowStockReportPage() {
  const { id: workspaceId } = useParams();
  const productDialog = useProductDialog();
  const invBase = `/workspace/${workspaceId}/accounting/inventory`;
  const base = `${invBase}/reports`;

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsProductId, setDetailsProductId] = useState(null);
  const [totals, setTotals] = useState({ low_stock_count: 0, out_of_stock_count: 0 });

  const load = useCallback(() => {
    setLoading(true);
    inventoryReportsApi
      .lowStock()
      .then((res) => {
        const d = res.data?.data || {};
        setRows(d.rows ?? []);
        setTotals(d.totals ?? { low_stock_count: 0, out_of_stock_count: 0 });
      })
      .catch((err) => toast.error(err?.response?.data?.message || 'Failed to load low stock'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openProductDetails = useCallback((productId) => {
    if (!productId) return;
    setDetailsProductId(productId);
    setDetailsOpen(true);
  }, []);

  const buildAllColumns = useCallback(
    () => [
      {
        id: 'sku',
        accessorKey: 'sku',
        header: 'SKU',
        cell: ({ row }) => (
          <span className="text-sm font-mono text-muted-foreground">{row.original.sku || '—'}</span>
        ),
      },
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Product',
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => openProductDetails(row.original.product_id)}
            className="text-sm font-medium text-left text-primary hover:underline underline-offset-2"
          >
            {row.original.name}
          </button>
        ),
      },
      {
        id: 'category',
        accessorKey: 'category',
        header: 'Category',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.category || '—'}</span>
        ),
      },
      {
        id: 'reorder_level',
        accessorKey: 'reorder_level',
        header: () => <span className="block text-right w-full">Reorder</span>,
        cell: ({ row }) => (
          <span className="text-sm tabular-nums block text-right">{row.original.reorder_level}</span>
        ),
      },
      {
        id: 'current_stock',
        accessorKey: 'current_stock',
        header: () => <span className="block text-right w-full">Stock</span>,
        cell: ({ row }) => (
          <span className="text-sm tabular-nums block text-right">{row.original.current_stock}</span>
        ),
      },
      {
        id: 'shortage',
        accessorKey: 'shortage',
        header: () => <span className="block text-right w-full">Shortage</span>,
        cell: ({ row }) => (
          <span className="text-sm tabular-nums block text-right text-amber-700">
            {row.original.shortage}
          </span>
        ),
      },
      {
        id: 'alert',
        header: 'Alert',
        cell: ({ row }) =>
          row.original.is_out_of_stock ? (
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
              Out
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
              Low
            </Badge>
          ),
      },
    ],
    [openProductDetails],
  );

  const {
    table,
    allColumns,
    toggleColumn,
    isColumnVisible,
    handleDragEnd,
  } = useReportDataGridTable(
    workspaceId,
    'inventory-low-stock',
    INVENTORY_LOW_STOCK_COLUMNS,
    buildAllColumns,
    rows,
    {
      state: { pagination: { pageIndex: 0, pageSize: 20 } },
      getPaginationRowModel: getPaginationRowModel(),
      getSortedRowModel: getSortedRowModel(),
    },
  );

  return (
    <ReportPageShell
      workspaceId={workspaceId}
      title="Low Stock"
      subtitle="Products at or below reorder level."
      breadcrumbs={[
        { label: 'Inventory reports', to: base },
        { label: 'Low Stock' },
      ]}
      backTo={base}
      backLabel="Reports"
      actions={
        <ReportActionBar
          leading={
            <ReportTableToolbar
              columns={allColumns}
              isColumnVisible={isColumnVisible}
              onToggle={toggleColumn}
            />
          }
        />
      }
      contentClassName="w-full max-w-none space-y-3"
    >
      <ReportSummaryStrip
        items={[
          {
            label: 'Low / at reorder',
            value: totals.low_stock_count ?? rows.length,
            tone: 'warning',
          },
          {
            label: 'Out of stock',
            value: totals.out_of_stock_count ?? 0,
            tone: 'negative',
          },
          { label: 'Products shown', value: rows.length },
        ]}
        context="Replenishment attention required"
      />

      <DataGrid table={table} recordCount={rows.length} isLoading={loading}>
        <div className="w-full space-y-2">
          <DataGridContainer className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-none">
            <ScrollArea className="w-full">
              <DataGridTableDnd handleDragEnd={handleDragEnd} />
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </DataGridContainer>
          <DataGridPagination sizes={[15, 25, 50, 100]} />
        </div>
      </DataGrid>

      <ProductDetailsSheet
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open);
          if (!open) setDetailsProductId(null);
        }}
        productId={detailsProductId}
        workspaceId={workspaceId}
        onEdit={(product) => productDialog.openEdit(product, { onSuccess: load })}
        onListRefresh={load}
      />
    </ReportPageShell>
  );
}
