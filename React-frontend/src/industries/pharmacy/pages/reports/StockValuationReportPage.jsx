import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import { format } from "date-fns";
import { Filter, Loader2, RotateCcw } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
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
      subtitle="On-hand stock by category, valued at purchase price, average cost, and sale price."
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
      contentClassName="w-full max-w-[1200px] mx-auto space-y-4 stock-valuation-report-root"
    >
      <div className="no-print">
        <ReportCompactFilterBar
          footer={
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Purchase uses catalog cost. Average uses inventory / batch cost.
              Sale uses the item selling price.
            </p>
          }
        >
          <select
            value={draft.warehouseId}
            onChange={(e) =>
              setDraft((p) => ({ ...p, warehouseId: e.target.value }))
            }
            disabled={loading}
            aria-label="Warehouse"
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="">All warehouses</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          <Input
            value={draft.search}
            onChange={(e) => setDraft((p) => ({ ...p, search: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyFilters();
            }}
            placeholder="Search item or SKU"
            aria-label="Search item or SKU"
            className="h-8 w-[200px] text-xs"
          />
          <label className="flex items-center gap-1.5 text-xs text-slate-600">
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
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={resetFilters}
            disabled={loading}
            className="ml-1 h-8 shrink-0 gap-1.5 rounded-sm px-3 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-3.5" />
            Reset
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={applyFilters}
            disabled={loading}
            className="ml-auto h-8 min-w-[7.5rem] shrink-0 gap-1.5 rounded-sm bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-none hover:bg-primary/90"
          >
            {loading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Filter className="size-3.5" />
            )}
            {loading ? "Loading…" : "Apply filters"}
          </Button>
        </ReportCompactFilterBar>
      </div>

      {showReport ? (
        <ReportSummaryStrip
          items={[
            {
              label: "Purchase value",
              value: formatDisplayAmount(totals.purchase ?? 0),
            },
            {
              label: "Average value",
              value: formatDisplayAmount(totals.average ?? 0),
            },
            {
              label: "Sale value",
              value: formatDisplayAmount(totals.sale ?? 0),
              tone: "positive",
            },
            {
              label: "Potential profit",
              value: formatDisplayAmount(profit),
              tone: profit >= 0 ? "positive" : "negative",
            },
          ]}
          context={currency}
        />
      ) : null}

      {truncated ? (
        <p className="no-print text-xs text-amber-800">
          Showing the first 2,500 items. Search or pick a warehouse to narrow
          the list.
        </p>
      ) : null}

      {loading && !showReport ? (
        <Skeleton className="h-[520px] w-full rounded-xl" />
      ) : showReport ? (
        <div
          ref={sheetRef}
          className="report-print-sheet stock-valuation-print overflow-visible rounded-lg border border-slate-200 bg-white print:overflow-visible print:rounded-none print:border-0"
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
          />
        </div>
      ) : null}
    </ReportPageShell>
  );
}
