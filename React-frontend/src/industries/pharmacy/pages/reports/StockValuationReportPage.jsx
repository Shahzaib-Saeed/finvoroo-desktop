import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import { format } from "date-fns";
import { Filter, LayoutGrid, List, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { pharmacyApi } from "../../api/pharmacy.api";
import { ReportPageShell } from "@/pages/accounting/reports/components/ReportPageShell";
import { ReportCompactFilterBar } from "@/pages/accounting/reports/components/ReportCompactFilterBar";
import { ReportActionBar } from "@/pages/accounting/reports/components/ReportActionBar";
import { ReportSummaryStrip } from "@/pages/accounting/reports/components/ReportSummaryStrip";
import {
  buildReportFilename,
  downloadReportPdf,
  printReportSheet,
} from "@/pages/accounting/reports/report-print.lib";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { StockValuationStatement } from "./StockValuationStatement";
import { resolveFiscalYear } from "./PharmacyReportChrome";

const DEFAULT_FILTERS = { warehouseId: "", search: "", includeZero: false };

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function formatAmountCsv(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0.00";
  return n.toFixed(2);
}

function formatDisplayAmount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0.00";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function StockValuationReportPage() {
  const { id: workspaceId } = useParams();
  const user = useAuthStore((s) => s.user);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [draft, setDraft] = useState(DEFAULT_FILTERS);
  const [view, setView] = useState("summary");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const sheetRef = useRef(null);

  const load = useCallback(() => {
    setLoading(true);
    pharmacyApi
      .stockValuationReport({
        warehouse_id: filters.warehouseId || undefined,
        search: filters.search || undefined,
        include_zero: filters.includeZero ? 1 : undefined,
      })
      .then((res) => setData(res.data?.data || null))
      .catch((err) => {
        toast.error(
          err?.response?.data?.message || "Failed to load stock valuation",
        );
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const currency = data?.base_currency || "USD";
  const company = data?.company || {};
  const companyName = company.name || "Company";
  const companyLogoUrl =
    company.logo_url || company.logo || company.logoUrl || company.image_url || null;
  const printedAt = format(new Date(), "dd/MM/yyyy 'at' hh:mm a");
  const generatedBy = user?.name || user?.full_name || null;
  const asOf = data?.as_of || format(new Date(), "yyyy-MM-dd");
  const fiscalYear = resolveFiscalYear(asOf, company);
  const groups = data?.groups || [];
  const totals = data?.totals || {};
  const warehouses = data?.warehouses || [];
  const truncated = Boolean(data?.truncated);
  const showReport = Boolean(data);
  const warehouseName =
    warehouses.find((w) => String(w.id) === String(filters.warehouseId))?.name ||
    null;

  const applyFilters = () =>
    setFilters({
      warehouseId: draft.warehouseId,
      search: draft.search.trim(),
      includeZero: Boolean(draft.includeZero),
    });
  const resetFilters = () => setDraft(DEFAULT_FILTERS);

  const filename = useMemo(
    () => buildReportFilename("stock-valuation", companyName, asOf),
    [companyName, asOf],
  );

  const runReportPrint = (mode) => {
    if (!sheetRef.current) return;
    const options = {
      title: `${companyName} — Stock Valuation`,
      filename,
      rootClass: "stock-valuation-report-root",
    };
    if (mode === "pdf") downloadReportPdf(sheetRef.current, options);
    else printReportSheet(sheetRef.current, options);
  };

  const handleExport = () => {
    if (!data) return;
    const out = [];
    out.push(["Stock Valuation"]);
    out.push([companyName]);
    out.push([`As of: ${asOf}`]);
    if (warehouseName) out.push([`Warehouse: ${warehouseName}`]);
    out.push([`Currency: ${currency}`]);
    out.push([]);
    out.push(["Category", "Items", "Qty", "Purchase", "Average", "Sale"]);
    for (const group of groups) {
      out.push([
        group.category_name || "",
        group.item_count ?? "",
        group.qty ?? "",
        formatAmountCsv(group.purchase_value),
        formatAmountCsv(group.average_value),
        formatAmountCsv(group.sale_value),
      ]);
    }
    out.push([
      "TOTAL",
      totals.items ?? "",
      totals.qty ?? "",
      formatAmountCsv(totals.purchase),
      formatAmountCsv(totals.average),
      formatAmountCsv(totals.sale),
    ]);
    out.push([]);
    out.push([
      "Category",
      "Item",
      "SKU",
      "Qty",
      "Purchase rate",
      "Purchase value",
      "Average rate",
      "Average value",
      "Sale rate",
      "Sale value",
    ]);
    for (const group of groups) {
      for (const row of group.rows || []) {
        out.push([
          group.category_name || "",
          row.item || "",
          row.sku || "",
          row.qty ?? "",
          formatAmountCsv(row.purchase_rate),
          formatAmountCsv(row.purchase_value),
          formatAmountCsv(row.average_rate),
          formatAmountCsv(row.average_value),
          formatAmountCsv(row.sale_rate),
          formatAmountCsv(row.sale_value),
        ]);
      }
    }

    const csv = out.map((line) => line.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const safeName = String(companyName || "report")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    link.download = `stock-valuation-${safeName || "report"}-${asOf || "export"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const profit = Number(totals.potential_profit ?? 0);

  return (
    <ReportPageShell
      workspaceId={workspaceId}
      title="Stock Valuation"
      subtitle="On-hand inventory valued at purchase, average cost, and sale price."
      showFavorite={false}
      actions={
        <ReportActionBar
          onExport={handleExport}
          exportDisabled={!showReport || loading}
          onPdf={() => runReportPrint("pdf")}
          pdfDisabled={!showReport || loading}
          onPrint={() => runReportPrint("print")}
          printDisabled={!showReport || loading}
        />
      }
      contentClassName="w-full min-w-0 max-w-full mx-auto space-y-4 stock-valuation-report-root"
    >
      <div className="no-print space-y-3">
        <ReportCompactFilterBar>
          <div className="flex min-w-[140px] flex-col gap-1">
            <Label htmlFor="sv-warehouse" className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Warehouse
            </Label>
            <select
              id="sv-warehouse"
              value={draft.warehouseId}
              onChange={(e) =>
                setDraft((p) => ({ ...p, warehouseId: e.target.value }))
              }
              disabled={loading}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            >
              <option value="">All warehouses</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex min-w-[180px] flex-1 flex-col gap-1 sm:max-w-xs">
            <Label htmlFor="sv-search" className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Search
            </Label>
            <Input
              id="sv-search"
              value={draft.search}
              onChange={(e) => setDraft((p) => ({ ...p, search: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyFilters();
              }}
              placeholder="Item name or SKU"
              className="h-8 text-xs"
            />
          </div>

          <label className="flex items-end gap-2 pb-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={draft.includeZero}
              onChange={(e) =>
                setDraft((p) => ({ ...p, includeZero: e.target.checked }))
              }
              className="size-3.5 accent-primary"
            />
            Include zero stock
          </label>

          <div className="ml-auto flex items-end gap-1.5 pb-0.5">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={resetFilters}
              disabled={loading}
              className="h-8 gap-1.5 px-3 text-xs text-muted-foreground"
            >
              <RotateCcw className="size-3.5" />
              Reset
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={applyFilters}
              disabled={loading}
              className="h-8 min-w-[7rem] gap-1.5 px-4 text-xs font-semibold"
            >
              {loading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Filter className="size-3.5" />
              )}
              {loading ? "Loading…" : "Apply"}
            </Button>
          </div>
        </ReportCompactFilterBar>

        {showReport ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <ReportSummaryStrip
              variant="cards"
              className="flex-1"
              items={[
                {
                  key: "items",
                  label: "Items",
                  value: Number(totals.items || 0).toLocaleString("en-US"),
                },
                {
                  key: "qty",
                  label: "Total qty",
                  value: Number(totals.qty || 0).toLocaleString("en-US", {
                    maximumFractionDigits: 2,
                  }),
                },
                {
                  key: "purchase",
                  label: "Purchase value",
                  value: formatDisplayAmount(totals.purchase ?? 0),
                },
                {
                  key: "average",
                  label: "Average value",
                  value: formatDisplayAmount(totals.average ?? 0),
                },
                {
                  key: "sale",
                  label: "Sale value",
                  value: formatDisplayAmount(totals.sale ?? 0),
                  tone: "positive",
                },
                {
                  key: "profit",
                  label: "Potential profit",
                  value: formatDisplayAmount(profit),
                  tone: profit >= 0 ? "positive" : "negative",
                },
              ]}
              context={currency}
            />
          </div>
        ) : null}

        {showReport ? (
          <Tabs value={view} onValueChange={setView}>
            <TabsList className="h-9 bg-muted/50 p-1">
              <TabsTrigger value="summary" className="gap-1.5 px-3 text-xs">
                <LayoutGrid className="size-3.5" />
                By category
              </TabsTrigger>
              <TabsTrigger value="items" className="gap-1.5 px-3 text-xs">
                <List className="size-3.5" />
                Item detail
              </TabsTrigger>
            </TabsList>
          </Tabs>
        ) : null}

        {truncated ? (
          <div className="rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Showing the first 2,500 items. Narrow with search or pick a warehouse.
          </div>
        ) : null}
      </div>

      {loading && !showReport ? (
        <Skeleton className="h-[480px] w-full rounded-xl" />
      ) : showReport ? (
        <div
          ref={sheetRef}
          className={cn(
            "report-print-sheet stock-valuation-print overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm",
            "print:overflow-visible print:rounded-none print:border-0 print:shadow-none",
          )}
        >
          <StockValuationStatement
            companyName={companyName}
            logoUrl={companyLogoUrl}
            asOf={asOf}
            currency={currency}
            fiscalYear={fiscalYear}
            generatedBy={generatedBy}
            printedAt={printedAt}
            groups={groups}
            totals={totals}
            warehouseName={warehouseName}
            truncated={truncated}
            view={view}
            compact
          />
        </div>
      ) : null}
    </ReportPageShell>
  );
}
