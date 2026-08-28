import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { getPaginationRowModel, getSortedRowModel } from '@tanstack/react-table';
import { RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { inventoryReportsApi } from '../api/inventory-reports.api';
import { formatCurrency } from '../constants';
import { INVENTORY_VALUATION_COLUMNS } from '@/pages/accounting/reports/constants/report-columns';
import { useReportDataGridTable } from '@/pages/accounting/reports/hooks/useReportDataGridTable';
import { ReportTableToolbar } from '@/pages/accounting/reports/components/ReportTableToolbar';
import { ReportPageShell } from '@/pages/accounting/reports/components/ReportPageShell';
import { ReportActionBar } from '@/pages/accounting/reports/components/ReportActionBar';
import { ReportSummaryStrip } from '@/pages/accounting/reports/components/ReportSummaryStrip';
import { ReportCompactFilterBar } from '@/pages/accounting/reports/components/ReportCompactFilterBar';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTableDnd } from '@/components/ui/data-grid-table-dnd';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useProductDialog } from '@/components/workspace/product/product-dialog-provider';
import { ProductDetailsSheet } from '@/pages/accounting/products/components/ProductDetailsSheet';

export function InventoryValuationReportPage() {
  const { id: workspaceId } = useParams();
  const productDialog = useProductDialog();
  const invBase = `/workspace/${workspaceId}/accounting/inventory`;
  const base = `${invBase}/reports`;

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsProductId, setDetailsProductId] = useState(null);
  const [totals, setTotals] = useState({ value: 0, potential_value: 0, product_count: 0 });
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseId, setWarehouseId] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (warehouseId) params.warehouse_id = Number(warehouseId);

    inventoryReportsApi
      .valuation(params)
      .then((res) => {
        const d = res.data?.data || {};
        setRows(d.rows ?? []);
        setTotals(d.totals ?? { value: 0, potential_value: 0, product_count: 0 });
        setWarehouses(d.warehouses ?? []);
      })
      .catch((err) => toast.error(err?.response?.data?.message || 'Failed to load valuation'))
      .finally(() => setLoading(false));
  }, [warehouseId]);

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
        id: 'quantity',
        accessorKey: 'quantity',
        header: () => <span className="block text-right w-full">Qty</span>,
        cell: ({ row }) => (
          <span className="text-sm tabular-nums block text-right">{row.original.quantity}</span>
        ),
      },
      {
        id: 'unit_cost',
        accessorKey: 'unit_cost',
        header: () => <span className="block text-right w-full">Unit cost</span>,
        cell: ({ row }) => (
          <span className="text-sm tabular-nums block text-right">
            {formatCurrency(row.original.unit_cost ?? 0)}
          </span>
        ),
      },
      {
        id: 'value',
        accessorKey: 'value',
        header: () => <span className="block text-right w-full">Value</span>,
        cell: ({ row }) => (
          <span className="text-sm tabular-nums block text-right font-medium">
            {formatCurrency(row.original.value ?? 0)}
          </span>
        ),
      },
      {
        id: 'potential_value',
        accessorKey: 'potential_value',
        header: () => <span className="block text-right w-full">Resale</span>,
        cell: ({ row }) => (
          <span className="text-sm tabular-nums block text-right">
            {formatCurrency(row.original.potential_value ?? 0)}
          </span>
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
    'inventory-valuation',
    INVENTORY_VALUATION_COLUMNS,
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
      title="Inventory Valuation"
      subtitle="Stock on hand valued at cost. Only products with quantity greater than zero appear here."
      breadcrumbs={[
        { label: 'Inventory reports', to: base },
        { label: 'Inventory Valuation' },
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
          { label: 'Total cost value', value: formatCurrency(totals.value ?? 0) },
          {
            label: 'Potential resale',
            value: formatCurrency(totals.potential_value ?? 0),
            tone: 'positive',
          },
          { label: 'SKUs', value: totals.product_count ?? rows.length },
        ]}
        context={warehouseId ? 'Selected warehouse' : 'All warehouses'}
      />

      <ReportCompactFilterBar>
        <span className="shrink-0 text-xs font-medium text-slate-600">Warehouse</span>
        <Select
          value={warehouseId || '__all__'}
          onValueChange={(v) => setWarehouseId(v === '__all__' ? '' : v)}
        >
          <SelectTrigger className="h-8 w-full rounded-sm border-slate-300 bg-white text-xs shadow-none sm:w-56">
            <SelectValue placeholder="All warehouses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All warehouses</SelectItem>
            {warehouses.map((w) => (
              <SelectItem key={w.id} value={String(w.id)}>
                {w.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {warehouseId ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-2 text-xs text-slate-600"
            onClick={() => setWarehouseId('')}
          >
            <RotateCcw className="size-3.5" />
            Reset
          </Button>
        ) : null}
      </ReportCompactFilterBar>

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

      {!loading && rows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-2">
          No stock on hand to value. Record stock via adjustments, purchase receipts, or transfers —
          or check the{' '}
          <Link to={`${invBase}/reports/stock-summary`} className="text-primary hover:underline">
            stock summary
          </Link>{' '}
          for products with zero quantity.
        </p>
      ) : null}

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
