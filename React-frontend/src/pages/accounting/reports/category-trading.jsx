import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { reportsApi } from "./api/reports.api";
import { defaultReportPeriod } from "./constants";
import { ReportPageShell } from "./components/ReportPageShell";
import { ReportDateFilter } from "./components/ReportDateFilter";
import { ReportActionBar } from "./components/ReportActionBar";
import { ReportSummaryStrip } from "./components/ReportSummaryStrip";
import { CategoryTradingStatement } from "./components/CategoryTradingStatement";
import {
  buildReportFilename,
  downloadReportPdf,
  printReportSheet,
} from "./report-print.lib";
import { Skeleton } from "@/components/ui/skeleton";

function resolveFiscalYear(asOfDate, company) {
  if (company?.fiscal_year) return company.fiscal_year;
  if (company?.fiscal_year_label) return company.fiscal_year_label;
  if (company?.fiscal_year_start) {
    try {
      const start = parseISO(String(company.fiscal_year_start).slice(0, 10));
      const asOf = asOfDate
        ? parseISO(String(asOfDate).slice(0, 10))
        : new Date();
      const fyStartMonth = start.getMonth();
      const fyStartDay = start.getDate();
      let fyYear = asOf.getFullYear();
      const fyStartThisYear = new Date(fyYear, fyStartMonth, fyStartDay);
      if (asOf < fyStartThisYear) fyYear -= 1;
      return `FY ${fyYear}`;
    } catch {
      /* fall through */
    }
  }
  if (!asOfDate) return null;
  try {
    return `FY ${format(parseISO(String(asOfDate).slice(0, 10)), "yyyy")}`;
  } catch {
    return null;
  }
}

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

export function CategoryTradingReportPage() {
  const { id: workspaceId } = useParams();
  const user = useAuthStore((s) => s.user);
  const [period, setPeriod] = useState(defaultReportPeriod());
  const [draft, setDraft] = useState(defaultReportPeriod());
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const sheetRef = useRef(null);

  const load = useCallback(() => {
    setLoading(true);
    reportsApi
      .categoryTrading({ from: period.from, to: period.to })
      .then((res) => setData(res.data?.data || null))
      .catch((err) => {
        toast.error(
          err?.response?.data?.message ||
            "Failed to load category sales and purchases",
        );
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [period]);

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
  const asOf = data?.period?.to || period.to;
  const fiscalYear = resolveFiscalYear(asOf, company);
  const rows = data?.rows || [];
  const totals = data?.totals || {};
  const showReport = Boolean(data);

  const applyFilters = () => setPeriod({ ...draft });
  const resetFilters = () => setDraft(defaultReportPeriod());

  const filename = useMemo(
    () => buildReportFilename("category-trading", companyName, asOf),
    [companyName, asOf],
  );

  const runReportPrint = (mode) => {
    if (!sheetRef.current) return;
    const options = {
      title: `${companyName} — Category Sales & Purchases`,
      filename,
      rootClass: "category-trading-report-root",
    };
    if (mode === "pdf") downloadReportPdf(sheetRef.current, options);
    else printReportSheet(sheetRef.current, options);
  };

  const handleExport = () => {
    if (!data) return;
    const out = [];
    out.push(["Category Sales & Purchases"]);
    out.push([companyName]);
    out.push([`Period: ${period.from} to ${period.to}`]);
    out.push([`Currency: ${currency}`]);
    out.push([]);
    out.push(["Category", "Code", "Purchase", "Sale", "Net profit", "Margin %"]);
    for (const row of rows) {
      out.push([
        row.category_name || "",
        row.category_code || "",
        formatAmountCsv(row.purchase),
        formatAmountCsv(row.sale),
        formatAmountCsv(row.net_profit),
        row.margin_percent == null ? "" : Number(row.margin_percent).toFixed(2),
      ]);
    }
    out.push([
      "TOTAL",
      "",
      formatAmountCsv(totals.purchase),
      formatAmountCsv(totals.sale),
      formatAmountCsv(totals.net_profit),
      totals.margin_percent == null ? "" : Number(totals.margin_percent).toFixed(2),
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
    link.download = `category-trading-${safeName || "report"}-${asOf || "export"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const netProfit = Number(totals.net_profit ?? 0);

  return (
    <ReportPageShell
      workspaceId={workspaceId}
      title="Category Sales & Purchases"
      subtitle="Category-wise purchases, sales, and net profit for the selected period."
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
      contentClassName="mx-auto w-full max-w-[920px] space-y-4 category-trading-report-root"
    >
      <div className="no-print">
        <ReportDateFilter
          compact
          from={draft.from}
          to={draft.to}
          onFromChange={(v) => setDraft((p) => ({ ...p, from: v }))}
          onToChange={(v) => setDraft((p) => ({ ...p, to: v }))}
          onApply={applyFilters}
          onReset={resetFilters}
          loading={loading}
          currency={currency}
          hint="Posted invoices and bills in this date range, net of credit notes and vendor credits."
        />
      </div>

      {showReport ? (
        <ReportSummaryStrip
          items={[
            {
              label: "Total purchase",
              value: formatDisplayAmount(totals.purchase ?? 0),
            },
            {
              label: "Total sale",
              value: formatDisplayAmount(totals.sale ?? 0),
            },
            {
              label: "Net profit",
              value: formatDisplayAmount(netProfit),
              tone: netProfit >= 0 ? "positive" : "negative",
            },
            {
              label: "Margin",
              value:
                totals.margin_percent == null
                  ? "—"
                  : `${Number(totals.margin_percent).toFixed(1)}%`,
              tone: Number(totals.margin_percent ?? 0) >= 0 ? "positive" : "negative",
            },
          ]}
          context={currency}
        />
      ) : null}

      {loading && !showReport ? (
        <Skeleton className="h-[520px] w-full rounded-xl" />
      ) : showReport ? (
        <div
          ref={sheetRef}
          className="report-print-sheet category-trading-print overflow-visible rounded-lg border border-slate-200 bg-white print:overflow-visible print:rounded-none print:border-0"
        >
          <CategoryTradingStatement
            companyName={companyName}
            logoUrl={companyLogoUrl}
            periodFrom={data?.period?.from || period.from}
            periodTo={data?.period?.to || period.to}
            currency={currency}
            fiscalYear={fiscalYear}
            generatedBy={generatedBy}
            printedAt={printedAt}
            rows={rows}
            totals={totals}
          />
        </div>
      ) : null}
    </ReportPageShell>
  );
}
