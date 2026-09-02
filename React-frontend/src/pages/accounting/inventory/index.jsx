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
  BarChart3,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  FileBarChart,
  FileEdit,
  LineChart,
  Package,
  PackageSearch,
  Plus,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
  Warehouse,
  X,
} from "lucide-react";
import { toast } from "sonner";
import ApexChart from "react-apexcharts";
import { inventoryApi } from "./api/inventory.api";
import { inventoryReportsApi } from "./api/inventory-reports.api";
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
  const status = row.stock_status;
  if (status === "low" || row.is_low_stock) {
    return (
      <Badge
        variant="outline"
        className="rounded-full border-amber-200 bg-amber-50 text-amber-800"
      >
        Low stock
      </Badge>
    );
  }
  if (status === "out" || Number(row.total_quantity) <= 0) {
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

const REPORT_LINKS = [
  {
    title: "Stock summary",
    description: "Qty, cost, and value by product",
    href: "stock-summary",
    icon: PackageSearch,
    tone: "bg-sky-500/10 text-sky-700",
  },
  {
    title: "Valuation",
    description: "Inventory value at cost",
    href: "valuation",
    icon: BarChart3,
    tone: "bg-emerald-500/10 text-emerald-700",
  },
  {
    title: "Inventory activity",
    description: "Purchases, sales, and adjustments",
    href: "movements",
    icon: LineChart,
    tone: "bg-violet-500/10 text-violet-700",
  },
  {
    title: "Low stock",
    description: "Items needing replenishment",
    href: "low-stock",
    icon: TrendingDown,
    tone: "bg-amber-500/10 text-amber-700",
  },
];

function InventoryKpiStrip({
  totals,
  formatMoney,
  loading,
  reportsBase,
}) {
  const items = [
    {
      key: "products",
      icon: Package,
      label: "Tracked products",
      value: loading ? "—" : (totals.product_count ?? 0).toLocaleString(),
      hint: `${totals.in_stock_count ?? 0} in stock · ${totals.out_of_stock_count ?? 0} out`,
    },
    {
      key: "warehouses",
      icon: Warehouse,
      label: totals.warehouse_count === 1 ? "Warehouse" : "Warehouses",
      value: loading ? "—" : (totals.warehouse_count ?? 0).toLocaleString(),
      hint: "Active locations",
    },
    {
      key: "low",
      icon: AlertTriangle,
      label: "Low stock",
      value: loading ? "—" : (totals.low_stock_count ?? 0).toLocaleString(),
      hint: "At or below reorder",
      warn: (totals.low_stock_count ?? 0) > 0,
    },
    {
      key: "value",
      icon: TrendingUp,
      label: "Stock value (cost)",
      value: loading
        ? "—"
        : totals.total_valuation != null
          ? formatMoney(totals.total_valuation)
          : "—",
      hint: "On-hand at average cost",
      href: `${reportsBase}/valuation`,
    },
    {
      key: "potential",
      icon: FileBarChart,
      label: "Potential sale value",
      value: loading
        ? "—"
        : totals.total_potential_value != null
          ? formatMoney(totals.total_potential_value)
          : "—",
      hint: "Qty × selling price",
      href: `${reportsBase}/stock-summary`,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {items.map((item) => {
        const Icon = item.icon;
        const inner = (
          <div
            className={cn(
              "rounded-xl border bg-card px-4 py-3.5 shadow-sm transition-colors min-w-0 h-full",
              item.warn ? "border-amber-200 bg-amber-50/40" : "border-border/80",
              item.href && "hover:border-primary/30 hover:bg-accent/20",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                  {item.label}
                </p>
                <p
                  className={cn(
                    "mt-1.5 text-lg font-bold tabular-nums tracking-tight sm:text-xl",
                    item.warn ? "text-amber-800" : "text-foreground",
                  )}
                >
                  {item.value}
                </p>
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{item.hint}</p>
              </div>
              <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground/70" />
            </div>
          </div>
        );

        return item.href ? (
          <Link key={item.key} to={item.href} className="block no-underline text-inherit">
            {inner}
          </Link>
        ) : (
          <div key={item.key}>{inner}</div>
        );
      })}
    </div>
  );
}

function InventoryReportsQuickLinks({ base }) {
  return (
    <div className="rounded-xl border border-border/80 bg-card shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Inventory reports</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Deep-dive into levels, valuation, activity, and alerts.
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-8 shrink-0 text-xs" asChild>
          <Link to={`${base}/reports`}>
            View all reports
            <ChevronRight className="ml-1 size-3.5" />
          </Link>
        </Button>
      </div>
      <div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-4">
        {REPORT_LINKS.map((report) => {
          const Icon = report.icon;
          return (
            <Link
              key={report.href}
              to={`${base}/reports/${report.href}`}
              className="group flex items-start gap-3 rounded-lg border border-transparent px-3 py-2.5 no-underline text-inherit transition-colors hover:border-border hover:bg-muted/30"
            >
              <div
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-lg",
                  report.tone,
                )}
              >
                <Icon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground group-hover:text-primary">
                  {report.title}
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                  {report.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function InventoryAlertsPanel({ rows, loading, reportsBase }) {
  const alerts = (rows || []).slice(0, 6);

  return (
    <Card className="h-full">
      <CardHeader className="border-b py-3.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm">Stock alerts</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Items at or below reorder level
            </p>
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
            <Link to={`${reportsBase}/low-stock`}>View all</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-medium text-foreground">No stock alerts</p>
            <p className="mt-1 text-xs text-muted-foreground">
              All tracked products are above reorder level.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {alerts.map((row) => (
              <li
                key={row.product_id}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/20"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{row.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {row.sku ? `${row.sku} · ` : ""}
                    Reorder {Number(row.reorder_level).toFixed(0)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      row.is_out_of_stock ? "text-red-700" : "text-amber-700",
                    )}
                  >
                    {Number(row.current_stock).toFixed(2)}
                  </p>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {row.is_out_of_stock ? "Out" : "Low"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
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
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(true);

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
    setAlertsLoading(true);
    inventoryApi
      .overview()
      .then((res) => setOverviewData(res.data?.data || null))
      .catch((err) =>
        toast.error(
          err?.response?.data?.message || "Failed to load inventory overview",
        ),
      )
      .finally(() => setOverviewLoading(false));

    inventoryReportsApi
      .lowStock()
      .then((res) => setLowStockAlerts(res.data?.data?.rows || []))
      .catch(() => setLowStockAlerts([]))
      .finally(() => setAlertsLoading(false));
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
  const reportsBase = `${base}/reports`;

  const stockColumns = useMemo(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <SortableHeader column={column}>Product</SortableHeader>
        ),
        cell: ({ row }) => (
          <div className="min-w-0 py-1">
            <p className="text-sm font-medium text-foreground leading-snug">
              {row.original.name}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {[row.original.sku, row.original.unit || "pcs"].filter(Boolean).join(" · ")}
            </p>
          </div>
        ),
        size: 240,
      },
      {
        accessorKey: "total_quantity",
        header: ({ column }) => (
          <div className="text-right">
            <SortableHeader column={column}>On hand</SortableHeader>
          </div>
        ),
        cell: ({ row }) => (
          <div className="text-right">
            <p className="font-semibold tabular-nums">
              {Number(row.original.total_quantity).toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
        ),
        size: 100,
      },
      {
        id: "reorder",
        header: () => (
          <span className="text-sm font-medium text-muted-foreground">Reorder</span>
        ),
        cell: ({ row }) => (
          <div className="text-right tabular-nums text-sm text-muted-foreground">
            {row.original.reorder_level != null && row.original.reorder_level > 0
              ? Number(row.original.reorder_level).toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })
              : "—"}
          </div>
        ),
        size: 90,
        enableSorting: false,
      },
      {
        accessorKey: "unit_cost",
        header: ({ column }) => (
          <div className="text-right">
            <SortableHeader column={column}>Unit cost</SortableHeader>
          </div>
        ),
        cell: ({ row }) => (
          <div className="text-right tabular-nums text-sm">
            {Number(row.original.total_quantity) > 0
              ? formatMoney(row.original.unit_cost ?? 0)
              : "—"}
          </div>
        ),
        size: 110,
      },
      {
        id: "valuation",
        header: ({ column }) => (
          <div className="text-right">
            <SortableHeader column={column}>Stock value</SortableHeader>
          </div>
        ),
        cell: ({ row }) => (
          <p className="text-right font-semibold tabular-nums text-sm">
            {formatMoney(row.original.valuation ?? 0)}
          </p>
        ),
        size: 120,
      },
      {
        id: "warehouses",
        header: "Warehouse breakdown",
        cell: ({ row }) => {
          const byWh = row.original.by_warehouse || [];
          if (!byWh.length) {
            return <span className="text-sm text-muted-foreground">—</span>;
          }
          return (
            <div className="flex flex-col gap-0.5">
              {byWh.map((wh) => {
                const whName =
                  warehouseOptions.find((o) => o.id === wh.warehouse_id)?.name ||
                  `WH #${wh.warehouse_id}`;
                return (
                  <span key={wh.warehouse_id} className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/80">{whName}</span>
                    {" · "}
                    {Number(wh.quantity).toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </span>
                );
              })}
            </div>
          );
        },
        size: 180,
        enableSorting: false,
      },
      {
        id: "status",
        header: ({ column }) => (
          <SortableHeader column={column}>Status</SortableHeader>
        ),
        cell: ({ row }) => <StockStatusBadge row={row.original} />,
        size: 120,
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
        subtitle="Stock on hand, valuation, and warehouse activity in one place."
        className="mb-0"
        actions={
          <div className="flex flex-wrap items-center gap-1.5">
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" asChild>
              <Link to={`${base}/reports`}>
                <FileBarChart className="size-3.5" />
                Reports
              </Link>
            </Button>
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
              <DropdownMenuContent align="end" className="w-52">
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
                <DropdownMenuItem asChild>
                  <Link to={`${base}/reports/stock-summary`}>
                    <PackageSearch className="size-3.5" />
                    Stock summary report
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      <InventoryKpiStrip
        totals={totals}
        formatMoney={formatMoney}
        loading={overviewLoading}
        reportsBase={reportsBase}
      />

      <InventoryReportsQuickLinks base={base} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="min-w-0">
          <CardHeader className="border-b py-3.5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <CardTitle>Stock levels</CardTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {stockPagination.total.toLocaleString()} tracked products · cost from inventory ledger
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
                  Alerts only
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

        <InventoryAlertsPanel
          rows={lowStockAlerts}
          loading={alertsLoading}
          reportsBase={reportsBase}
        />
      </div>

      <div className="grid items-stretch gap-5 lg:grid-cols-2">
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
