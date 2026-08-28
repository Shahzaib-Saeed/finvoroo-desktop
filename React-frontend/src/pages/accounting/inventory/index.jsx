import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
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
  ChevronsUpDown,
  FileEdit,
  MapPin,
  MoreVertical,
  Package,
  Plus,
  RefreshCw,
  Search,
  TrendingUp,
  Users,
  Warehouse,
  X,
} from "lucide-react";
import { toast } from "sonner";
import ApexChart from "react-apexcharts";
import { inventoryApi } from "./api/inventory.api";
import { warehousesApi } from "./api/warehouses.api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge, BadgeDot } from "@/components/ui/badge";
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
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch, SwitchWrapper } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useCompanyCurrency } from "@/hooks/use-company-currency";
import { toAbsoluteUrl } from "@/lib/helpers";
import { cn } from "@/lib/utils";
import { AvatarGroup } from "@/partials/common/avatar-group";

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

function ChannelStats({
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
      info: loading ? "—" : (productCount ?? 0).toLocaleString(),
      desc: "Products",
      tone: "bg-blue-50 text-blue-600",
      href: "",
    },
    {
      icon: Warehouse,
      info: loading ? "—" : (warehouseCount ?? 0).toLocaleString(),
      desc: "Warehouses",
      tone: "bg-emerald-50 text-emerald-600",
      href: "",
    },
    {
      icon: AlertTriangle,
      info: loading ? "—" : (lowStockCount ?? 0).toLocaleString(),
      desc: lowStockCount === 1 ? "Low stock item" : "Low stock items",
      tone:
        lowStockCount > 0
          ? "bg-red-50 text-red-600"
          : "bg-green-50 text-green-600",
      href: "",
    },
    {
      icon: TrendingUp,
      info: loading
        ? "—"
        : totalValuation != null
          ? formatMoney(totalValuation)
          : "—",
      desc: "Stock value",
      tone: "bg-violet-50 text-violet-600",
      href: "",
    },
  ];

  return (
    <Fragment>
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <Card key={index} className="h-full">
            <CardContent className="flex h-full flex-col justify-between gap-5 p-5">
              <div
                className={cn(
                  "flex size-9 items-center justify-center rounded-lg",
                  item.tone,
                )}
              >
                <Icon className="size-4.5" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-2xl font-semibold text-mono tabular-nums leading-none">
                  {item.info}
                </span>
                <span className="text-sm font-normal text-muted-foreground">
                  {item.desc}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </Fragment>
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
      custom({ series, seriesIndex, dataPointIndex, w }) {
        const value = series[seriesIndex][dataPointIndex];
        const month = w.globals.seriesX[seriesIndex][dataPointIndex];
        const monthName = categories[month] || "";
        return `
          <div class="flex flex-col gap-2 p-3.5">
            <div class="font-medium text-sm text-secondary-foreground">${monthName}, movements</div>
            <div class="flex items-center gap-1.5">
              <div class="font-semibold text-base text-mono">${value}</div>
              <span class="rounded-full border border-green-200 font-medium dark:border-green-850 text-green-700 bg-green-100 dark:bg-green-950/30 text-[11px] leading-none px-1.5 py-1">+12%</span>
            </div>
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
      <CardHeader>
        <CardTitle>Stock Activity</CardTitle>
        <div className="flex gap-5">
          <SwitchWrapper className="flex items-center gap-2">
            <Label htmlFor="transfers-only" className="text-sm">
              Transfers only
            </Label>
            <Switch id="transfers-only" defaultChecked={false} size="sm" />
          </SwitchWrapper>
          <Select defaultValue="6">
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent className="w-28">
              <SelectItem value="1">1 month</SelectItem>
              <SelectItem value="3">3 months</SelectItem>
              <SelectItem value="6">6 months</SelectItem>
              <SelectItem value="12">12 months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col justify-end items-stretch grow px-3 py-1">
        {loading ? (
          <Skeleton className="h-80 w-full rounded-xl" />
        ) : (
          <ApexChart
            id="inventory_stock_activity"
            options={options}
            series={options.series}
            type="area"
            height={350}
          />
        )}
      </CardContent>
    </Card>
  );
}

function Highlights({
  productCount,
  lowStockCount,
  totalValuation,
  formatMoney,
  loading,
}) {
  const total = Number(productCount || 0);
  const low = Number(lowStockCount || 0);
  const healthy = Math.max(total - low, 0);
  const healthyPct = total > 0 ? Math.round((healthy / total) * 100) : 100;
  const lowPct = total > 0 ? Math.round((low / total) * 100) : 0;

  const rows = [
    {
      icon: Package,
      text: "Healthy products",
      total: healthy,
      stats: 2.7,
      increase: true,
    },
    {
      icon: AlertTriangle,
      text: "Low stock",
      total: low,
      stats: 1.4,
      increase: false,
    },
    {
      icon: Warehouse,
      text: "Active warehouses",
      total: 0,
      stats: 0.0,
      increase: true,
    },
  ];

  const items = [
    { badgeColor: "bg-green-500", label: "Healthy" },
    { badgeColor: "bg-destructive", label: "Low Stock" },
    { badgeColor: "bg-violet-500", label: "Out of Stock" },
  ];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Highlights</CardTitle>
        <Button variant="ghost" mode="icon" className="text-muted-foreground">
          <MoreVertical className="size-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 p-5 lg:p-7.5 lg:pt-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-normal text-secondary-foreground">
            All stock value
          </span>
          <div className="flex items-center gap-2.5">
            <span className="text-3xl font-semibold text-mono tabular-nums">
              {loading
                ? "—"
                : totalValuation != null
                  ? formatMoney(totalValuation)
                  : "—"}
            </span>
            <Badge size="sm" variant="success" appearance="light">
              +2.7%
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-1 mb-1.5">
          <div className="bg-green-500 h-2 w-full max-w-[60%] rounded-xs"></div>
          <div className="bg-destructive h-2 w-full max-w-[25%] rounded-xs"></div>
          <div className="bg-violet-500 h-2 w-full max-w-[15%] rounded-xs"></div>
        </div>
        <div className="flex items-center flex-wrap gap-4 mb-1">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <BadgeDot className={item.badgeColor} />
              <span className="text-sm font-normal text-foreground">
                {item.label}
              </span>
            </div>
          ))}
        </div>
        <div className="border-b border-input"></div>
        <div className="grid gap-3">
          {rows.slice(0, 3).map((row, index) => (
            <div
              key={index}
              className="flex items-center justify-between flex-wrap gap-2"
            >
              <div className="flex items-center gap-1.5">
                <row.icon className="size-4.5 text-muted-foreground" />
                <span className="text-sm font-normal text-mono">
                  {row.text}
                </span>
              </div>
              <div className="flex items-center text-sm font-medium text-foreground gap-6">
                <span className="lg:text-right tabular-nums">
                  {loading ? "—" : row.total.toLocaleString()}
                </span>
                <span className="flex items-center justify-end gap-1">
                  {row.increase ? (
                    <ArrowUp className="text-green-500 size-4" />
                  ) : (
                    <ArrowDown className="text-destructive size-4" />
                  )}
                  {row.stats}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// function TeamMeeting({ movementCount, base }) {
//   return (
//     <Card className="h-full">
//       <CardContent className="grow lg:p-7.5 lg:pt-6 p-5">
//         <div className="mb-5">
//           <AvatarGroup
//             size="size-[38px]"
//             group={[
//               { filename: "300-4.png" },
//               { filename: "300-1.png" },
//               { filename: "300-2.png" },
//               {
//                 fallback: "+10",
//                 variant: "text-white border-success-soft bg-green-500",
//               },
//             ]}
//           />
//         </div>
//         <div className="flex flex-col gap-1 mb-4">
//           <span className="text-xl font-semibold text-mono leading-tight">
//             Operations Hub
//           </span>
//           <Link
//             to={`${base}/reports/low-stock`}
//             className="text-sm font-medium text-primary hover:underline"
//           >
//             {movementCount} recent movements
//           </Link>
//         </div>
//         <p className="text-sm font-normal text-muted-foreground leading-5.5">
//           Centralize stock transfers, adjustments, and warehouse alerts in one
//           place. Review low-stock items and coordinate replenishment across all
//           locations.
//         </p>
//         <div className="mt-6 flex flex-wrap items-center gap-x-10 gap-y-4 rounded-lg bg-accent/50 px-5 py-4">
//           <div className="flex items-center gap-1.5 text-sm text-foreground">
//             <MapPin size={16} className="text-muted-foreground" />
//             All warehouses
//           </div>
//           <div className="flex items-center gap-1.5 text-sm text-foreground">
//             <Warehouse size={16} className="text-muted-foreground" />
//             Transfers &amp; adjustments
//           </div>
//           <div className="flex items-center gap-1.5 text-sm text-foreground">
//             <Users size={16} className="text-muted-foreground" />
//             Whole team
//           </div>
//         </div>
//       </CardContent>
//       <CardFooter className="justify-center border-t">
//         <Button mode="link" underlined="dashed" asChild>
//           <Link to={`${base}/reports/low-stock`}>View Alerts</Link>
//         </Button>
//       </CardFooter>
//     </Card>
//   );
// }

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
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 48,
      },
      {
        accessorKey: "name",
        header: ({ column }) => (
          <SortableHeader column={column}>Product</SortableHeader>
        ),
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="font-medium text-foreground wrap-break-word leading-snug">
              {row.original.name}
            </p>
            <p className="text-xs text-muted-foreground">
              Unit: {row.original.unit || "pcs"}
            </p>
          </div>
        ),
        size: 120,
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
                  <Badge
                    key={wh.warehouse_id}
                    variant="outline"
                    className="rounded-md text-xs font-normal p-2 whitespace-normal"
                  >
                    {whName}: {Number(wh.quantity).toFixed(0)}
                  </Badge>
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
    enableRowSelection: true,
    enableSorting: true,
    getRowId: (row) => String(row.product_id),
  });

  const recentAdjustments = overviewData?.recent_adjustments || [];
  const recentTransfers = overviewData?.recent_transfers || [];

  const trendData = useMovementTrend(recentAdjustments, recentTransfers);

  return (
    <div className="space-y-6 w-[90%] mx-auto px-6 min-w-0">
      <PageHeader
        title="Inventory"
        subtitle="Track stock across warehouses, adjustments, transfers, and valuation reports."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadOverview}
              disabled={overviewLoading}
            >
              <RefreshCw
                className={cn("size-4 mr-1", overviewLoading && "animate-spin")}
              />
              Refresh
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to={`${base}/adjustments/create`}>
                <FileEdit className="size-4 mr-1" /> Adjustment
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to={`${base}/stock-transfers/create`}>
                <ArrowRightLeft className="size-4 mr-1" /> Transfer
              </Link>
            </Button>
            <Button size="sm" variant="mono" asChild>
              <Link to={`${base}/warehouses/create`}>
                <Plus className="size-4 mr-1" /> Warehouse
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-5 lg:gap-7.5">
        <div className="grid lg:grid-cols-3 gap-5 lg:gap-7.5 items-stretch">
          <div className="grid grid-cols-2 gap-5 lg:gap-7.5">
            <ChannelStats
              productCount={totals.product_count}
              warehouseCount={totals.warehouse_count}
              lowStockCount={lowStockCount}
              totalValuation={totalValuation}
              formatMoney={formatMoney}
              loading={overviewLoading}
            />
          </div>
          <div className="lg:col-span-2">
            {/* <TeamMeeting
              movementCount={recentAdjustments.length + recentTransfers.length}
              base={base}
            /> */}

            <Card>
              <CardHeader className="py-4 border-b">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Stock Levels</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {stockPagination.total.toLocaleString()} products tracked
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-40 sm:max-w-sm">
                      <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      <Input
                        placeholder="Search product name or SKU..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="h-9 pl-9 pr-9"
                      />
                      {searchInput ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 size-9"
                          onClick={() => setSearchInput("")}
                        >
                          <X className="size-4" />
                        </Button>
                      ) : null}
                    </div>

                    <Select
                      value={warehouseFilter}
                      onValueChange={setWarehouseFilter}
                    >
                      <SelectTrigger className="w-52 h-9">
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
                      variant={lowStockFilter ? "primary" : "outline"}
                      size="sm"
                      className="h-9"
                      onClick={() => setLowStockFilter((v) => !v)}
                    >
                      <AlertTriangle className="size-4 mr-1" />
                      Low stock
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 px-2.5"
                      onClick={fetchStockLevels}
                      disabled={stockLoading}
                    >
                      <RefreshCw
                        className={cn("size-4", stockLoading && "animate-spin")}
                      />
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
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-5 lg:gap-7.5 items-stretch">
          <Highlights
            productCount={totals.product_count}
            lowStockCount={lowStockCount}
            totalValuation={totalValuation}
            formatMoney={formatMoney}
            loading={overviewLoading}
          />
          <EarningsChart data={trendData} loading={overviewLoading} />
          <RecentMovements
            adjustments={recentAdjustments}
            transfers={recentTransfers}
            loading={overviewLoading}
            base={base}
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-5 lg:gap-7.5 items-stretch">
          {/* <TeamMeeting
            movementCount={recentAdjustments.length + recentTransfers.length}
            base={base}
          /> */}
        </div>
      </div>
    </div>
  );
}
