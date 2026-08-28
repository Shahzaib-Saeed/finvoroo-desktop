import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import { format, parseISO } from "date-fns";
import { Landmark, TrendingUp, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { reportsApi } from "./api/reports.api";
import { defaultReportPeriod, formatCurrency } from "./constants";
import { ReportPageShell } from "./components/ReportPageShell";
import { ReportActionBar } from "./components/ReportActionBar";
import { ReportDateFilter } from "./components/ReportDateFilter";
import { CashFlowStatement } from "./components/CashFlowStatement";
import {
  buildReportFilename,
  downloadReportPdf,
  printReportSheet,
} from "./report-print.lib";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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

function downloadCashFlowCsv({
  filename,
  companyName,
  periodFrom,
  periodTo,
  currency,
  operating,
  investing,
  financing,
  netChange,
}) {
  const out = [];
  out.push(["Statement of Cash Flows"]);
  out.push([companyName || ""]);
  out.push([`Period: ${periodFrom || ""} to ${periodTo || ""}`]);
  out.push([`Currency: ${currency || ""}`]);
  out.push([]);
  out.push(["Activity", "Amount"]);
  out.push(["Net cash from operating activities", formatAmountCsv(operating)]);
  out.push(["Net cash from investing activities", formatAmountCsv(investing)]);
  out.push(["Net cash from financing activities", formatAmountCsv(financing)]);
  out.push([]);
  out.push([
    netChange >= 0 ? "Net increase in cash" : "Net decrease in cash",
    formatAmountCsv(netChange),
  ]);

  const blob = new Blob(
    [out.map((row) => row.map(csvCell).join(",")).join("\n")],
    { type: "text/csv;charset=utf-8;" },
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function SummaryMetric({ label, value, currency, hint, icon: Icon, tone = "neutral" }) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-700"
      : tone === "negative"
        ? "text-rose-700"
        : "text-slate-900";

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
          {label}
        </p>
        {Icon ? (
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500">
            <Icon className="size-3.5" strokeWidth={1.75} />
          </span>
        ) : null}
      </div>
      <p className={cn("mt-1 text-base font-bold tabular-nums tracking-tight", toneClass)}>
        {formatCurrency(value, currency)}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

function toneFor(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || Math.abs(n) < 0.005) return "neutral";
  return n >= 0 ? "positive" : "negative";
}

export function CashFlowReportPage() {
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
      .cashFlow({ from: period.from, to: period.to })
      .then((res) => setData(res.data?.data || null))
      .catch((err) =>
        toast.error(err?.response?.data?.message || "Failed to load report"),
      )
      .finally(() => setLoading(false));
  }, [period]);

  useEffect(() => load(), [load]);

  const currency = data?.base_currency || "USD";
  const company = data?.company || {};
  const companyName = company.name || "Company";
  const companyLogoUrl =
    company.logo_url || company.logo || company.logoUrl || company.image_url || null;
  const printedAt = format(new Date(), "dd/MM/yyyy 'at' hh:mm a");
  const generatedBy = user?.name || user?.full_name || null;
  const periodEnd = data?.period?.to ?? period.to;
  const fiscalYear = resolveFiscalYear(periodEnd, company);
  const showReport = Boolean(data);

  const operating = data?.operating ?? 0;
  const investing = data?.investing ?? 0;
  const financing = data?.financing ?? 0;
  const netChange = data?.net_change ?? 0;

  const applyFilters = () => setPeriod({ ...draft });

  const reportFilename = useMemo(
    () => buildReportFilename("cash-flow", companyName, periodEnd),
    [companyName, periodEnd],
  );

  const runReportPrint = useCallback(
    async (mode) => {
      const node = sheetRef.current;
      if (!node) return;
      try {
        await (mode === "pdf" ? downloadReportPdf : printReportSheet)(node, {
          title: reportFilename,
          rootClass: "cash-flow-report-root",
        });
        if (mode === "pdf") {
          toast.success("Save as PDF", {
            description: 'In the print dialog, set Destination to "Save as PDF".',
            duration: 5000,
          });
        }
      } catch (err) {
        toast.error(err?.message || "Could not open print preview");
      }
    },
    [reportFilename],
  );

  const handleExport = useCallback(() => {
    if (!showReport) return;
    const safeName = String(companyName)
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .toLowerCase();
    downloadCashFlowCsv({
      filename: `cash-flow-${safeName || "report"}-${periodEnd || "export"}.csv`,
      companyName,
      periodFrom: period.from,
      periodTo: periodEnd,
      currency,
      operating,
      investing,
      financing,
      netChange,
    });
    toast.success("Export downloaded");
  }, [showReport, companyName, period.from, periodEnd, currency, operating, investing, financing, netChange]);

  return (
    <ReportPageShell
      workspaceId={workspaceId}
      title="Cash Flow"
      subtitle="Statement of cash flows — operating, investing, and financing activities."
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
      contentClassName="w-full max-w-[1024px] mx-auto space-y-4 cash-flow-report-root"
    >
      <div className="no-print">
        <ReportDateFilter
          compact
          from={draft.from}
          to={draft.to}
          onFromChange={(v) => setDraft((p) => ({ ...p, from: v }))}
          onToChange={(v) => setDraft((p) => ({ ...p, to: v }))}
          onApply={applyFilters}
          loading={loading}
          currency={currency}
          hint="Cash flow is derived from posted journal activity classified by activity type."
        />
      </div>

      {showReport ? (
        <div className="no-print grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryMetric
            label="Operating"
            value={operating}
            currency={currency}
            hint="From operations"
            icon={Wallet}
            tone={toneFor(operating)}
          />
          <SummaryMetric
            label="Investing"
            value={investing}
            currency={currency}
            hint="From asset activity"
            icon={TrendingUp}
            tone={toneFor(investing)}
          />
          <SummaryMetric
            label="Financing"
            value={financing}
            currency={currency}
            hint="From owners & lenders"
            icon={Landmark}
            tone={toneFor(financing)}
          />
          <SummaryMetric
            label={netChange >= 0 ? "Net increase" : "Net decrease"}
            value={netChange}
            currency={currency}
            hint="In cash for the period"
            tone={toneFor(netChange)}
          />
        </div>
      ) : null}

      {loading && !data ? (
        <Skeleton className="h-[520px] w-full rounded-xl" />
      ) : showReport ? (
        <div
          ref={sheetRef}
          className="report-print-sheet cash-flow-print overflow-visible rounded-lg border border-slate-200 bg-white print:overflow-visible print:rounded-none print:border-0"
        >
          <CashFlowStatement
            companyName={companyName}
            logoUrl={companyLogoUrl}
            periodFrom={period.from}
            periodTo={periodEnd}
            currency={currency}
            fiscalYear={fiscalYear}
            generatedBy={generatedBy}
            printedAt={printedAt}
            operating={operating}
            investing={investing}
            financing={financing}
            netChange={netChange}
          />
        </div>
      ) : null}
    </ReportPageShell>
  );
}
