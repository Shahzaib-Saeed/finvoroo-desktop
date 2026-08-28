import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from "@tanstack/react-table";
import { Search, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { inventoryReportsApi } from "../api/inventory-reports.api";
import { formatCurrency } from "../constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Premium DataGrid Component Ecosystem Imports
import { DataGrid, DataGridContainer } from "@/components/ui/data-grid";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useProductDialog } from "@/components/workspace/product/product-dialog-provider";
import { ProductDetailsSheet } from "@/pages/accounting/products/components/ProductDetailsSheet";
import { ProductStockDisplay } from "@/pages/accounting/products/components/ProductStockDisplay";
import { cn } from "@/lib/utils";
import { ReportPageShell } from "@/pages/accounting/reports/components/ReportPageShell";
import { ReportSummaryStrip } from "@/pages/accounting/reports/components/ReportSummaryStrip";
import { ReportCompactFilterBar } from "@/pages/accounting/reports/components/ReportCompactFilterBar";

function formatInventoryQty(value) {
  const v = Number(value);
  if (!Number.isFinite(v)) return "—";
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(4).replace(/\.?0+$/, "");
}

function stockRowAsProduct(row) {
  return {
    unit: row.unit_key,
    unit_label: row.unit_label,
    qty_conversion: row.qty_conversion,
  };
}

function StockStatusBadge({ status }) {
  if (status === "out") {
    return (
      <Badge variant="outline" className="rounded-full bg-red-50 text-red-700 border-red-200">
        Out of stock
      </Badge>
    );
  }
  if (status === "low") {
    return (
      <Badge variant="outline" className="rounded-full bg-amber-50 text-amber-800 border-amber-200">
        Low stock
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="rounded-full bg-emerald-50 text-emerald-700 border-emerald-200">
      In stock
    </Badge>
  );
}

export function InventoryStockSummaryReportPage() {
  const { id: workspaceId } = useParams();
  const productDialog = useProductDialog();
  const invBase = `/workspace/${workspaceId}/accounting/inventory`;
  const base = `${invBase}/reports`;

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsProductId, setDetailsProductId] = useState(null);
  const [totals, setTotals] = useState({
    value: 0,
    potential_value: 0,
    product_count: 0,
    out_of_stock_count: 0,
    low_stock_count: 0,
  });
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [warehouseName, setWarehouseName] = useState("");
  const [costMethodLabel, setCostMethodLabel] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 50,
  });
  const [sorting, setSorting] = useState([{ id: "name", desc: false }]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (warehouseId) params.warehouse_id = Number(warehouseId);
    if (search) params.search = search;

    inventoryReportsApi
      .stockSummary(params)
      .then((res) => {
        const d = res.data?.data || {};
        setRows(d.rows ?? []);
        setTotals(
          d.totals ?? {
            value: 0,
            potential_value: 0,
            product_count: 0,
            out_of_stock_count: 0,
            low_stock_count: 0,
          },
        );
        setWarehouses(d.warehouses ?? []);
        setWarehouseName(d.warehouse_name ?? "");
        setCostMethodLabel(d.cost_method_label ?? "");
      })
      .catch((err) =>
        toast.error(err?.response?.data?.message || "Failed to load report"),
      )
      .finally(() => setLoading(false));
  }, [warehouseId, search]);

  useEffect(() => {
    load();
  }, [load]);

  const openProductDetails = useCallback((productId) => {
    if (!productId) return;
    setDetailsProductId(productId);
    setDetailsOpen(true);
  }, []);

  const columns = useMemo(
    () => [
      {
        id: "sr_no",
        header: "#",
        cell: ({ row }) => (
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
            {row.index + 1}
          </span>
        ),
        size: 70,
      },
      {
        accessorKey: "name",
        id: "name",
        header: "Product",
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => openProductDetails(row.original.product_id)}
            className="flex flex-col text-left rounded-md -mx-1 px-1 py-0.5 hover:bg-muted/60 transition-colors group"
          >
            <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
              {row.original.name}
            </span>
            <span className="text-xs text-muted-foreground">
              SKU #{row.original.sku}
            </span>
          </button>
        ),
        size: 280,
      },
      {
        accessorKey: "category",
        id: "category",
        header: "Category",
        cell: ({ row }) => (
          <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium bg-background">
            {row.original.category || "Uncategorized"}
          </span>
        ),
        size: 160,
      },
      {
        accessorKey: "quantity",
        id: "quantity",
        header: () => <div className="text-right">On hand</div>,
        cell: ({ row }) => {
          const r = row.original;
          const statusClass =
            r.stock_status === "out"
              ? "text-destructive"
              : r.stock_status === "low"
                ? "text-amber-600"
                : "text-emerald-600";
          return (
            <div className="text-right">
              <ProductStockDisplay
                stock={r.quantity}
                product={stockRowAsProduct(r)}
                qtyOnly
                className={cn("font-semibold tabular-nums", statusClass)}
              />
            </div>
          );
        },
        size: 110,
      },
      {
        id: "unit",
        header: "Unit",
        cell: ({ row }) => {
          const r = row.original;
          const hasConversion =
            r.unit_conversion_label || r.qty_conversion?.family_units?.length > 1;
          return (
            <div className="text-sm">
              <span className="font-medium text-foreground">
                {r.unit_label || "—"}
              </span>
              {hasConversion ? (
                <p
                  className="text-xs text-muted-foreground mt-0.5 cursor-help"
                  title={
                    r.unit_conversion_label ||
                    "Hover quantity for alternate unit equivalents"
                  }
                >
                  {r.unit_conversion_label || "Has unit conversions"}
                </p>
              ) : null}
            </div>
          );
        },
        size: 120,
      },
      {
        id: "reorder_level",
        header: () => <div className="text-right">Reorder</div>,
        cell: ({ row }) => (
          <span className="block text-right tabular-nums text-sm text-muted-foreground">
            {row.original.reorder_level != null
              ? formatInventoryQty(row.original.reorder_level)
              : "—"}
          </span>
        ),
        size: 90,
      },
      {
        id: "stock_status",
        header: "Status",
        cell: ({ row }) => (
          <StockStatusBadge status={row.original.stock_status || "ok"} />
        ),
        size: 120,
      },
      {
        accessorKey: "unit_cost",
        id: "unit_cost",
        header: () => (
          <div className="text-right">
            <div>Unit cost</div>
            <div className="text-xs font-normal text-muted-foreground normal-case">
              per storage unit
            </div>
          </div>
        ),
        cell: ({ row }) => (
          <span className="block text-right tabular-nums text-muted-foreground">
            {formatCurrency(row.original.unit_cost ?? 0)}
          </span>
        ),
        size: 120,
      },
      {
        accessorKey: "unit_price",
        id: "unit_price",
        header: () => (
          <div className="text-right">
            <div>Sell price</div>
            <div className="text-xs font-normal text-muted-foreground normal-case">
              per storage unit
            </div>
          </div>
        ),
        cell: ({ row }) => (
          <span className="block text-right font-medium tabular-nums text-primary">
            {formatCurrency(row.original.unit_price ?? 0)}
          </span>
        ),
        size: 120,
      },
      {
        accessorKey: "value",
        id: "value",
        header: () => <div className="text-right">Cost value</div>,
        cell: ({ row }) => (
          <span className="block text-right font-bold tabular-nums text-foreground">
            {formatCurrency(row.original.value ?? 0)}
          </span>
        ),
        size: 130,
      },
      {
        accessorKey: "potential_value",
        id: "potential_value",
        header: () => <div className="text-right">Resale value</div>,
        cell: ({ row }) => (
          <span className="block text-right font-medium tabular-nums text-emerald-700">
            {formatCurrency(row.original.potential_value ?? 0)}
          </span>
        ),
        size: 130,
      },
    ],
    [openProductDetails],
  );
  const table = useReactTable({
    columns,
    data: rows,
    pageCount: Math.ceil((rows?.length || 0) / pagination.pageSize),
    state: {
      pagination,
      sorting,
    },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <ReportPageShell
      workspaceId={workspaceId}
      title="Stock Summary"
      subtitle="On-hand quantities in each product’s storage unit, with cost and resale valuation."
      breadcrumbs={[
        { label: "Inventory reports", to: base },
        { label: "Stock Summary" },
      ]}
      backTo={base}
      backLabel="Reports"
      contentClassName="w-full max-w-none space-y-3"
    >
      <ReportSummaryStrip
        items={[
          { label: "Total cost value", value: formatCurrency(totals.value ?? 0) },
          {
            label: "Potential resale",
            value: formatCurrency(totals.potential_value ?? 0),
            tone: "positive",
          },
          {
            label: "Products",
            value: totals.product_count ?? rows.length,
          },
          {
            label: "Low stock",
            value: totals.low_stock_count ?? 0,
            tone: "warning",
          },
          {
            label: "Out of stock",
            value: totals.out_of_stock_count ?? 0,
            tone: "negative",
          },
        ]}
        context={warehouseName || "All warehouses"}
      />

      <ReportCompactFilterBar
        footer={
          <p className="text-[11px] leading-relaxed text-slate-500">
            On hand uses each product’s inventory unit. Cost value uses{" "}
            {costMethodLabel || "your inventory costing"} method; resale value is
            on hand × sell price.
          </p>
        }
      >
        <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            aria-label="Search products"
            placeholder="Search product or SKU…"
            className="h-8 rounded-sm border-slate-300 bg-white pl-8 text-xs shadow-none"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Select
          value={warehouseId || "__all__"}
          onValueChange={(v) => setWarehouseId(v === "__all__" ? "" : v)}
        >
          <SelectTrigger
            aria-label="Warehouse"
            className="h-8 w-full rounded-sm border-slate-300 bg-white text-xs shadow-none sm:w-56"
          >
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
        {(searchInput || warehouseId) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-2 text-xs text-slate-600"
            onClick={() => {
              setSearchInput("");
              setWarehouseId("");
            }}
          >
            <RotateCcw className="size-3.5" />
            Reset
          </Button>
        )}
      </ReportCompactFilterBar>

      <DataGrid
        table={table}
        recordCount={rows.length}
        isLoading={loading}
        tableLayout={{
          cellBorder: true,
        }}
      >
        <div className="w-full space-y-2">
          <DataGridContainer className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-none">
            <ScrollArea className="w-full">
              <DataGridTable />
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </DataGridContainer>
          <DataGridPagination sizes={[50, 100, 500, 1000]} />
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
        onEdit={(product) =>
          productDialog.openEdit(product, { onSuccess: load })
        }
        onListRefresh={load}
      />
    </ReportPageShell>
  );
}
