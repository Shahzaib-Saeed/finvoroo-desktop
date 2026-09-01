import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
} from "@tanstack/react-table";
import {
  AlertTriangle,
  ArrowDown,
  ArrowRightLeft,
  ArrowUp,
  ChevronDown,
  ChevronsUpDown,
  FileEdit,
  Package,
  Plus,
  RefreshCw,
  Search,
  TrendingUp,
  Warehouse,
  X,
} from "lucide-react";
import { toast } from "sonner";
import ApexChart from "react-apexcharts";
import { inventoryApi } from "./api/inventory.api";
import { warehousesApi } from "./api/warehouses.api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTable,
  CardTitle,
  CardToolbar,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useCompanyCurrency } from "@/hooks/use-company-currency";
import { cn } from "@/lib/utils";

function SortableHeader({ column, children, className }) {
  const sorted = column.getIsSorted();

  return (
    <button
      type="button"
      onClick={column.getToggleSortingHandler()}
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors",
        className,
      )}
    >
      {children}
      {sorted === "asc" ? (
        <ArrowUp className="size-3.5 text-foreground" />
      ) : sorted === "desc" ? (
        <ArrowDown className="size-3.5 text-foreground" />
      ) : (
        <ChevronsUpDown className="size-3.5 text-muted-foreground/70" />
      )}
    </button>
  );
}

function StockStatusBadge({ row }) {
  if (row.is_low_stock) {
    return (
      <Badge
        variant="outline"
        className="rounded-full border-amber-200 bg-amber-50 text-amber-800"
      >
        Low stock
      </Badge>
    );
  }
  if (Number(row.total_quantity) <= 0) {
    return (
      <Badge
        variant="outline"
        className="rounded-full border-red-200 bg-red-50 text-red-700"
      >
        Out of stock
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-800"
    >
      In stock
    </Badge>
  );
}

const STATUS_PILL = {
  posted:
    "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-500",
  draft: "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400",
  completed:
    "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-500",
  in_transit: "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-500",
  pending:
    "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-500",
  cancelled: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-500",
  received:
    "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-500",
};

function InventoryKpiStrip({
  productCount,
  warehouseCount,
  lowStockCount,
  totalValuation,
  formatMoney,
  loading,
}) {
  const items = [
    {
      icon: Package,
      value: loading ? "—" : (productCount ?? 0).toLocaleString(),
      label: "Products",
    },
    {
      icon: Warehouse,
      value: loading ? "—" : (warehouseCount ?? 0).toLocaleString(),
      label: warehouseCount === 1 ? "Warehouse" : "Warehouses",
    },
    {
      icon: AlertTriangle,
      value: loading ? "—" : (lowStockCount ?? 0).toLocaleString(),
      label: lowStockCount === 1 ? "Low stock item" : "Low stock items",
      warn: lowStockCount > 0,
    },
    {
      icon: TrendingUp,
      value: loading
        ? "—"
        : totalValuation != null
          ? formatMoney(totalValuation)
          : "—",
      label: "Stock value",
    },
  ];

  return (
    <div className="grid grid-cols-2 border-y border-border py-4 lg:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className="min-w-0 border-b border-border/70 px-0 py-3 last:border-b-0 sm:px-5 sm:first:pl-0 sm:last:pr-0 lg:border-b-0 lg:border-r lg:last:border-r-0"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                  {item.label}
                </p>
                <p
                  className={cn(
                    "mt-1 text-xl font-semibold tabular-nums tracking-tight",
                    item.warn ? "text-amber-700" : "text-foreground",
                  )}
                >
                  {item.value}
                </p>
              </div>
              <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground/70" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function useMovementTrend(adjustments, transfers) {
  return useMemo(() => {
    const now = new Date();
    const buckets = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      buckets.push({
        key,
        label: d.toLocaleDateString("en-US", { month: "short" }),
        value: 0,
      });
    }
    const byKey = new Map(buckets.map((b) => [b.key, b]));
    const bump = (dateStr) => {
      if (!dateStr) return;
      const b = byKey.get(String(dateStr).slice(0, 7));
      if (b) b.value += 1;
    };
    (adjustments || []).forEach((a) => bump(a.adjustment_date));
    (transfers || []).forEach((t) => bump(t.transfer_date));
    return buckets;
  }, [adjustments, transfers]);
}

function EarningsChart({ data, loading }) {
  const categories = data.map((d) => d.label);
  const seriesValues = data.map((d) => d.value);

  const options = {
    series: [{ name: "Movements", data: seriesValues }],
    chart: { height: 350, type: "area", toolbar: { show: false } },
    dataLabels: { enabled: false },
    legend: { show: false },
    stroke: {
      curve: "smooth",
      show: true,
      width: 3,
      colors: ["var(--color-primary)"],
    },
    xaxis: {
      categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: {
          colors: "var(--color-secondary-foreground)",
          fontSize: "12px",
        },
      },
      crosshairs: {
        position: "front",
        stroke: { color: "var(--color-primary)", width: 1, dashArray: 3 },
      },
      tooltip: { enabled: false },
    },
    yaxis: {
      min: 0,
      tickAmount: 4,
      axisTicks: { show: false },
      labels: {
        style: {
          colors: "var(--color-secondary-foreground)",
          fontSize: "12px",
        },
        formatter: (v) => Number(v).toFixed(0),
      },
    },
    tooltip: {
      enabled: true,
      custom({ series, seriesIndex, dataPointIndex }) {
        const value = series[seriesIndex][dataPointIndex];
        const monthName = categories[dataPointIndex] || "";
        return `
          <div class="flex flex-col gap-1 p-3">
            <div class="text-xs text-muted-foreground">${monthName}</div>
            <div class="text-sm font-semibold tabular-nums">${value} movement${value === 1 ? "" : "s"}</div>
          </div>
        `;
      },
    },
    markers: {
      size: 0,
      colors: "var(--color-white)",
      strokeColors: "var(--color-primary)",
      strokeWidth: 4,
      strokeOpacity: 1,
      strokeDashArray: 0,
      fillOpacity: 1,
      shape: "circle",
      hover: { size: 8, sizeOffset: 0 },
    },
    fill: { gradient: { opacityFrom: 0.25, opacityTo: 0 } },
    grid: {
      borderColor: "var(--color-border)",
      strokeDashArray: 5,
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
    },
  };

  return (
    <Card className="h-full">
      <CardHeader className="py-3.5">
        <CardTitle>Stock activity</CardTitle>
      </CardHeader>
      <CardContent className="px-3 py-1">
        {loading ? (
          <Skeleton className="h-64 w-full rounded-lg" />
        ) : (
          <ApexChart
            id="inventory_stock_activity"
            options={options}
            series={options.series}
            type="area"
            height={260}
          />
        )}
      </CardContent>
    </Card>
  );
}

function RecentMovements({ adjustments, transfers, loading, base }) {
  const [searchQuery, setSearchQuery] = useState("");

  const data = useMemo(() => {
    const adjs = (adjustments || []).map((r) => ({
      id: `adj-${r.id}`,
      name: r.adjustment_number || "—",
      description: r.reason || "Inventory adjustment",
      type: "Adjustment",
      location: r.warehouse?.name || "—",
      statusKey: r.is_posted ? "posted" : "draft",
      statusLabel: r.is_posted ? "Posted" : "Draft",
      date: r.adjustment_date || "",
      href: `${base}/adjustments/${r.id}`,
    }));
    const xfrs = (transfers || []).map((r) => ({
      id: `xfr-${r.id}`,
      name: r.transfer_number || "—",
      description: `${r.from_warehouse?.name || "—"} → ${r.to_warehouse?.name || "—"}`,
      type: "Transfer",
      location: `${r.from_warehouse?.name || "—"} → ${r.to_warehouse?.name || "—"}`,
      statusKey: r.status || "pending",
      statusLabel: String(r.status || "—").replace(/_/g, " "),
      date: r.transfer_date || "",
      href: `${base}/stock-transfers/${r.id}`,
    }));
    return [...adjs, ...xfrs].sort((a, b) =>
      (b.date || "").localeCompare(a.date || ""),
    );
  }, [adjustments, transfers, base]);

  const filteredData = useMemo(() => {
    if (!searchQuery) return data;
    return data.filter(
      (item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [data, searchQuery]);

  return (
    <Card>
      <CardHeader className="py-3.5">
        <CardTitle>Recent Movements</CardTitle>
        <CardToolbar className="relative">
          <Search className="size-4 text-muted-foreground absolute inset-s-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search movements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-9 w-40 h-8 text-xs"
          />
          {searchQuery.length > 0 && (
            <Button
              mode="icon"
              variant="ghost"
              className="absolute inset-e-1.5 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={() => setSearchQuery("")}
            >
              <X className="size-3.5" />
            </Button>
          )}
        </CardToolbar>
      </CardHeader>
      <CardTable>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="py-3 px-5 font-medium">Reference</th>
              <th className="py-3 px-5 font-medium">Type</th>
              <th className="py-3 px-5 font-medium">Location</th>
              <th className="py-3 px-5 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="py-3 px-5">
                    <Skeleton className="h-4 w-24" />
                  </td>
                  <td className="py-3 px-5">
                    <Skeleton className="h-4 w-20" />
                  </td>
                  <td className="py-3 px-5">
                    <Skeleton className="h-4 w-32" />
                  </td>
                  <td className="py-3 px-5 text-right">
                    <Skeleton className="ml-auto h-4 w-16" />
                  </td>
                </tr>
              ))
            ) : filteredData.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="py-10 text-center text-muted-foreground"
                >
                  No stock movements found.
                </td>
              </tr>
            ) : (
              filteredData.slice(0, 8).map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30"
                >
                  <td className="py-3 px-5">
                    <Link
                      to={r.href}
                      className="font-medium text-mono hover:text-primary"
                    >
                      {r.name}
                    </Link>
                  </td>
                  <td className="py-3 px-5 text-muted-foreground">{r.type}</td>
                  <td className="py-3 px-5 text-muted-foreground">
                    {r.location}
                  </td>
                  <td className="py-3 px-5 text-right">
                    <span
                      className={cn(
                        "inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium uppercase",
                        STATUS_PILL[r.statusKey] ||
                          "bg-slate-100 text-slate-600",
                      )}
                    >
                      {r.statusLabel}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </CardTable>
    </Card>
  );
}

export function InventoryDashboardPage() {
  const { id: workspaceId } = useParams();
  const base = `/workspace/${workspaceId}/accounting/inventory`;
  const { formatMoney } = useCompanyCurrency(workspaceId);

  const [overviewData, setOverviewData] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  const [stockRows, setStockRows] = useState([]);
  const [stockLoading, setStockLoading] = useState(true);
  const [warehouseOptions, setWarehouseOptions] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState({
    search: "",
    warehouseId: "all",
    lowStock: false,
  });
  const [stockPagination, setStockPagination] = useState({
    page: 1,
    perPage: 15,
    total: 0,
    lastPage: 1,
  });

  const loadOverview = useCallback(() => {
    setOverviewLoading(true);
    inventoryApi
      .overview()
      .then((res) => setOverviewData(res.data?.data || null))
      .catch((err) =>
        toast.error(
          err?.response?.data?.message || "Failed to load inventory overview",
        ),
      )
      .finally(() => setOverviewLoading(false));
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    warehousesApi
      .list({ per_page: 100 })
      .then((res) => setWarehouseOptions(res.data?.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setAppliedFilters({
        search: searchInput.trim(),
        warehouseId: warehouseFilter,
        lowStock: lowStockFilter,
      });
      setStockPagination((p) => ({ ...p, page: 1 }));
    }, 350);
    return () => clearTimeout(handler);
  }, [searchInput, warehouseFilter, lowStockFilter]);

  const fetchStockLevels = useCallback(async () => {
    setStockLoading(true);
    try {
      const params = {
        page: stockPagination.page,
        per_page: stockPagination.perPage,
      };
      if (appliedFilters.search) params.search = appliedFilters.search;
      if (appliedFilters.warehouseId && appliedFilters.warehouseId !== "all") {
        params.warehouse_id = Number(appliedFilters.warehouseId);
      }
      if (appliedFilters.lowStock) params.low_stock = 1;

      const res = await inventoryApi.stockLevels(params);
      setStockRows(res.data?.data || []);
      const meta = res.data?.meta || {};
      setStockPagination((p) => ({
        ...p,
        total: meta.total ?? (res.data?.data?.length || 0),
        lastPage: meta.last_page ?? 1,
      }));
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to fetch stock levels",
      );
    } finally {
      setStockLoading(false);
    }
  }, [stockPagination.page, stockPagination.perPage, appliedFilters]);

  useEffect(() => {
    fetchStockLevels();
  }, [fetchStockLevels]);

  const totals = overviewData?.totals || {};
  const lowStockCount = totals.low_stock_count ?? 0;
  const totalValuation =
    totals.total_valuation ?? totals.inventory_value ?? null;

  const stockColumns = useMemo(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <SortableHeader column={column}>Product</SortableHeader>
        ),
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground leading-snug">
              {row.original.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {row.original.unit || "pcs"}
            </p>
          </div>
        ),
        size: 220,
      },
      {
        accessorKey: "total_quantity",
        header: ({ column }) => (
          <div className="text-right">
            <SortableHeader column={column}>Qty</SortableHeader>
          </div>
        ),
        cell: ({ row }) => (
          <div className="text-right">
            <p className="font-semibold tabular-nums">
              {Number(row.original.total_quantity).toFixed(2)}
            </p>
          </div>
        ),
        size: 120,
      },
      {
        accessorKey: "unit_price",
        header: ({ column }) => (
          <div className="text-right">
            <SortableHeader column={column}>Unit price</SortableHeader>
          </div>
        ),
        cell: ({ row }) => (
          <div className="text-right tabular-nums">
            <p className="font-medium">
              {formatMoney(row.original.unit_price)}
            </p>
          </div>
        ),
        size: 100,
      },
      {
        id: "valuation",
        header: ({ column }) => (
          <div className="text-right">
            <SortableHeader column={column}>Value</SortableHeader>
          </div>
        ),
        cell: ({ row }) => {
          const valuation =
            (row.original.total_quantity || 0) *
            (row.original.purchase_price || row.original.unit_price || 0);
          return (
            <p className="text-right font-semibold tabular-nums">
              {formatMoney(valuation)}
            </p>
          );
        },
        size: 100,
      },
      {
        id: "warehouses",
        header: "By warehouse",
        cell: ({ row }) => {
          const byWh = row.original.by_warehouse || [];
          if (!byWh.length) {
            return (
              <span className="text-sm text-center text-muted-foreground">
                —
              </span>
            );
          }
          return (
            <div className="flex flex-wrap gap-1">
              {byWh.map((wh) => {
                const whName =
                  warehouseOptions.find((o) => o.id === wh.warehouse_id)
                    ?.name || `WH #${wh.warehouse_id}`;
                return (
                  <span
                    key={wh.warehouse_id}
                    className="text-xs text-muted-foreground"
                  >
                    {whName} · {Number(wh.quantity).toFixed(0)}
                  </span>
                );
              })}
            </div>
          );
        },
        size: 100,
        enableSorting: false,
      },
      {
        id: "status",
        header: ({ column }) => (
          <SortableHeader column={column}>Status</SortableHeader>
        ),
        cell: ({ row }) => <StockStatusBadge row={row.original} />,
        size: 130,
        enableSorting: false,
      },
    ],
    [formatMoney, warehouseOptions],
  );

  const stockTable = useReactTable({
    columns: stockColumns,
    data: stockRows,
    pageCount: stockPagination.lastPage,
    state: {
      pagination: {
        pageIndex: stockPagination.page - 1,
        pageSize: stockPagination.perPage,
      },
    },
    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function"
          ? updater({
              pageIndex: stockPagination.page - 1,
              pageSize: stockPagination.perPage,
            })
          : updater;
      setStockPagination((p) => ({
        ...p,
        page: (next.pageIndex ?? 0) + 1,
        perPage: next.pageSize ?? p.perPage,
      }));
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    enableRowSelection: false,
    enableSorting: true,
    getRowId: (row) => String(row.product_id),
  });

  const recentAdjustments = overviewData?.recent_adjustments || [];
  const recentTransfers = overviewData?.recent_transfers || [];

  const trendData = useMovementTrend(recentAdjustments, recentTransfers);

  return (
    <div className="space-y-5 min-w-0">
      <PageHeader
        title="Inventory"
        subtitle="Stock on hand across warehouses."
        className="mb-0"
        actions={
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-muted-foreground"
              onClick={() => {
                loadOverview();
                fetchStockLevels();
              }}
              disabled={overviewLoading || stockLoading}
            >
              <RefreshCw
                className={cn(
                  "size-3.5",
                  (overviewLoading || stockLoading) && "animate-spin",
                )}
              />
              Refresh
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs font-medium"
                >
                  Actions
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link to={`${base}/adjustments/create`}>
                    <FileEdit className="size-3.5" />
                    New adjustment
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={`${base}/stock-transfers/create`}>
                    <ArrowRightLeft className="size-3.5" />
                    New transfer
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={`${base}/warehouses/create`}>
                    <Plus className="size-3.5" />
                    New warehouse
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      <InventoryKpiStrip
        productCount={totals.product_count}
        warehouseCount={totals.warehouse_count}
        lowStockCount={lowStockCount}
        totalValuation={totalValuation}
        formatMoney={formatMoney}
        loading={overviewLoading}
      />

      <Card>
        <CardHeader className="py-3.5 border-b">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <CardTitle>Stock levels</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {stockPagination.total.toLocaleString()} products
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-48 flex-1 sm:max-w-xs">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search name or SKU"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="h-8 pl-8 pr-8 text-sm"
                />
                {searchInput ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 size-8"
                    onClick={() => setSearchInput("")}
                  >
                    <X className="size-3.5" />
                  </Button>
                ) : null}
              </div>
              <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                <SelectTrigger className="h-8 w-44 text-sm">
                  <SelectValue placeholder="All warehouses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All warehouses</SelectItem>
                  {warehouseOptions.map((wh) => (
                    <SelectItem key={wh.id} value={String(wh.id)}>
                      {wh.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant={lowStockFilter ? "secondary" : "outline"}
                size="sm"
                className="h-8 text-xs"
                onClick={() => setLowStockFilter((v) => !v)}
              >
                <AlertTriangle className="size-3.5" />
                Low stock
              </Button>
            </div>
          </div>
        </CardHeader>

        <DataGrid
          table={stockTable}
          recordCount={stockPagination.total}
          isLoading={stockLoading}
          emptyMessage="No stock levels match your filters."
          tableLayout={{
            columnsVisibility: false,
            cellBorder: false,
            rowBorder: true,
            width: "fixed",
          }}
        >
          <CardTable>
            <ScrollArea className="w-full">
              <DataGridTable />
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardTable>
          <CardFooter className="border-t py-2">
            <DataGridPagination />
          </CardFooter>
        </DataGrid>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2 items-stretch">
        <EarningsChart data={trendData} loading={overviewLoading} />
        <RecentMovements
          adjustments={recentAdjustments}
          transfers={recentTransfers}
          loading={overviewLoading}
          base={base}
        />
      </div>
    </div>
  );
}
