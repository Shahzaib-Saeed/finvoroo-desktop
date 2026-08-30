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
import { ManufacturerExpiryStatement } from "./ManufacturerExpiryStatement";
import { resolveFiscalYear } from "./PharmacyReportChrome";

const DEFAULT_FILTERS = { mode: "all", withinDays: 90 };

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

function statusLabel(row) {
  if (row.status === "expired") return "Expired";
  if (row.status === "near") return "Near expiry";
  return "OK";
}

export function ManufacturerExpiryReportPage() {
  const { id: workspaceId } = useParams();
  const user = useAuthStore((s) => s.user);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [draft, setDraft] = useState(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [data, setData] = useState(null);
  const sheetRef = useRef(null);

  const load = useCallback(() => {
    setLoading(true);
    setForbidden(false);
    pharmacyApi
      .manufacturerExpiryReport({
        mode: filters.mode,
        within_days: filters.withinDays,
      })
      .then((res) => setData(res.data?.data || null))
      .catch((err) => {
        if (err?.response?.status === 403) {
          setForbidden(true);
          setData(null);
          return;
        }
        toast.error(
          err?.response?.data?.message ||
            "Failed to load manufacturer expiry report",
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
  const showReport = Boolean(data);

  const applyFilters = () => {
    const days = Number(draft.withinDays);
    setFilters({
      mode: draft.mode,
      withinDays: Number.isFinite(days) ? Math.min(730, Math.max(1, days)) : 90,
    });
  };
  const resetFilters = () => setDraft(DEFAULT_FILTERS);

  const filename = useMemo(
    () => buildReportFilename("manufacturer-expiry", companyName, asOf),
    [companyName, asOf],
  );

  const runReportPrint = (mode) => {
    if (!sheetRef.current) return;
    const options = {
      title: `${companyName} — Manufacturer-wise Expiry`,
      filename,
      rootClass: "manufacturer-expiry-report-root",
    };
    if (mode === "pdf") downloadReportPdf(sheetRef.current, options);
    else printReportSheet(sheetRef.current, options);
  };

  const handleExport = () => {
    if (!data) return;
    const out = [];
    out.push(["Manufacturer-wise Expiry"]);
    out.push([companyName]);
    out.push([`As of: ${asOf}`]);
    out.push([`Mode: ${filters.mode}`]);
    out.push([`Near-expiry window: ${filters.withinDays} days`]);
    out.push([`Currency: ${currency}`]);
    out.push([]);
    out.push([
      "Manufacturer",
      "Item",
      "SKU",
      "Batch",
      "Expiry",
      "Days until expiry",
      "Status",
      "Warehouse",
      "Qty",
      "Value",
    ]);
    for (const group of groups) {
      for (const row of group.rows || []) {
        out.push([
          group.manufacturer_name || "",
          row.item || "",
          row.sku || "",
          row.batch_number || "",
          row.expiry_date || "",
          row.days_until_expiry ?? "",
          statusLabel(row),
          row.warehouse_name || "",
          row.qty ?? "",
          formatAmountCsv(row.value),
        ]);
      }
    }
    out.push([
      "TOTAL",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      totals.qty ?? "",
      formatAmountCsv(totals.value),
    ]);

    const csv = out.map((line) => line.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const safeName = String(companyName || "report")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    link.download = `manufacturer-expiry-${safeName || "report"}-${asOf || "export"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ReportPageShell
      workspaceId={workspaceId}
      title="Manufacturer-wise Expiry"
      subtitle="On-hand items with expiry, grouped by manufacturer — expired, near, and remaining stock."
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
      contentClassName="w-full max-w-[1200px] mx-auto space-y-4 manufacturer-expiry-report-root"
    >
      <div className="no-print">
        <ReportCompactFilterBar
          footer={
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              On-hand batches with an expiry date. Near expiry uses the selected
              window from today.
            </p>
          }
        >
          <select
            value={draft.mode}
            onChange={(e) =>
              setDraft((p) => ({ ...p, mode: e.target.value }))
            }
            disabled={loading}
            aria-label="Expiry view"
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="all">All with expiry</option>
            <option value="near">Near expiry</option>
            <option value="expired">Expired only</option>
          </select>
          {draft.mode !== "expired" ? (
            <Input
              type="number"
              min={1}
              max={730}
              value={draft.withinDays}
              onChange={(e) =>
                setDraft((p) => ({ ...p, withinDays: e.target.value }))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") applyFilters();
              }}
              aria-label="Near-expiry window in days"
              className="h-8 w-[110px] text-xs"
            />
          ) : null}
          {draft.mode !== "expired" ? (
            <span className="text-[11px] text-muted-foreground">days</span>
          ) : null}
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

      {forbidden ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-6 text-center text-sm text-amber-900">
          Batch & expiry is not enabled for this company. Turn it on in pharmacy
          settings to see this report.
        </p>
      ) : null}

      {showReport ? (
        <ReportSummaryStrip
          items={[
            {
              label: "Manufacturers",
              value: Number(totals.manufacturers ?? 0).toLocaleString("en-US"),
            },
            {
              label: "Batches",
              value: Number(totals.batches ?? 0).toLocaleString("en-US"),
            },
            {
              label: "Expired",
              value: Number(totals.expired ?? 0).toLocaleString("en-US"),
              tone: Number(totals.expired ?? 0) > 0 ? "negative" : undefined,
            },
            {
              label: "Near expiry",
              value: Number(totals.near ?? 0).toLocaleString("en-US"),
              tone: Number(totals.near ?? 0) > 0 ? "warning" : undefined,
            },
            {
              label: "Stock value",
              value: formatDisplayAmount(totals.value ?? 0),
            },
          ]}
          context={currency}
        />
      ) : null}

      {loading && !showReport && !forbidden ? (
        <Skeleton className="h-[520px] w-full rounded-xl" />
      ) : showReport ? (
        <div
          ref={sheetRef}
          className="report-print-sheet manufacturer-expiry-print overflow-visible rounded-lg border border-slate-200 bg-white print:overflow-visible print:rounded-none print:border-0"
        >
          <ManufacturerExpiryStatement
            companyName={companyName}
            logoUrl={companyLogoUrl}
            asOf={asOf}
            currency={currency}
            fiscalYear={fiscalYear}
            generatedBy={generatedBy}
            printedAt={printedAt}
            groups={groups}
            totals={totals}
            mode={data?.mode || filters.mode}
            withinDays={data?.within_days || filters.withinDays}
          />
        </div>
      ) : null}
    </ReportPageShell>
  );
}
