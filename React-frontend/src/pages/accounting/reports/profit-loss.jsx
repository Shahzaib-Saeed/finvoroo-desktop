import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { reportsApi } from "./api/reports.api";
import { defaultReportPeriod, formatCurrency } from "./constants";
import { PROFIT_LOSS_COLUMNS } from "./constants/report-columns";
import { ReportPageShell } from "./components/ReportPageShell";
import { ReportDateFilter } from "./components/ReportDateFilter";
import { ReportTableToolbar } from "./components/ReportTableToolbar";
import { ReportActionBar } from "./components/ReportActionBar";
import { ProfitLossStatement } from "./components/ProfitLossStatement";
import { usePersistedReportColumns } from "./hooks/usePersistedReportColumns";
import {
  buildReportFilename,
  downloadReportPdf,
  printReportSheet,
} from "./report-print.lib";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

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

function downloadProfitLossCsv({
  filename,
  companyName,
  periodFrom,
  periodTo,
  currency,
  sections,
  summary,
}) {
  const out = [];
  out.push(["Profit & Loss Statement"]);
  out.push([companyName || ""]);
  out.push([`Period: ${periodFrom || ""} to ${periodTo || ""}`]);
  out.push([`Currency: ${currency || ""}`]);
  out.push([]);
  out.push(["Section", "Account ID", "Description", "Period amount"]);

  const pushRows = (section, rows) => {
    for (const row of rows) {
      out.push([
        section,
        row.code || "",
        row.name || "",
        formatAmountCsv(row.amount),
      ]);
    }
  };

  const sectionList = [
    ["Revenue", sections.revenue?.rows || []],
    ["Other income", sections.other_income?.rows || []],
    ["Cost of goods sold", sections.cogs?.rows || []],
    ["Operating expenses", sections.operating_expenses?.rows || []],
    ["Other expenses", sections.other_expenses?.rows || []],
  ];

  for (const [section, rows] of sectionList) {
    if (!rows.length) continue;
    pushRows(section, rows);
  }

  out.push([]);
  out.push(["", "", "Total revenue", formatAmountCsv(summary.total_revenue ?? 0)]);
  out.push(["", "", "Total cost of goods sold", formatAmountCsv(summary.total_cogs ?? 0)]);
  out.push(["", "", "Gross profit", formatAmountCsv(summary.gross_profit ?? 0)]);
  out.push(["", "", "Total expenses", formatAmountCsv((summary.total_operating_expenses ?? 0) + (summary.total_other_expenses ?? 0))]);
  out.push(["", "", "Net income", formatAmountCsv(summary.net_income ?? 0)]);

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

function SummaryMetric({ label, value, currency, hint }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-base font-bold tabular-nums tracking-tight text-slate-900">
        {formatCurrency(value, currency)}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

function pctOf(n, base) {
  const num = Number(n);
  const den = Number(base);
  if (!Number.isFinite(num) || !Number.isFinite(den) || Math.abs(den) < 0.005) {
    return "0.00";
  }
  return ((num / den) * 100).toFixed(2);
}

export function ProfitLossReportPage() {
  const { id: workspaceId } = useParams();
  const user = useAuthStore((s) => s.user);
  const [period, setPeriod] = useState(defaultReportPeriod());
  const [draft, setDraft] = useState(defaultReportPeriod());
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [showCodes, setShowCodes] = useState(true);
  const sheetRef = useRef(null);

  const load = useCallback(() => {
    setLoading(true);
    reportsApi
      .profitLoss({ from: period.from, to: period.to })
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
    company.logo_url ||
    company.logo ||
    company.logoUrl ||
    company.image_url ||
    null;
  const printedAt = format(new Date(), "dd/MM/yyyy 'at' hh:mm a");
  const generatedBy = user?.name || user?.full_name || null;
  const periodEnd = data?.period?.to ?? period.to;
  const fiscalYear = resolveFiscalYear(periodEnd, company);
  const sections = useMemo(() => data?.sections || {}, [data?.sections]);
  const summary = useMemo(() => data?.summary || {}, [data?.summary]);
  const showReport = Boolean(data);

  const revenue = summary.total_revenue ?? 0;
  const cogs = summary.total_cogs ?? 0;
  const grossProfit = summary.gross_profit ?? revenue - cogs;
  const operating = summary.total_operating_expenses ?? 0;
  const otherExp = summary.total_other_expenses ?? 0;
  const netIncome =
    summary.net_income ?? revenue - (cogs + operating + otherExp);
  const totalExp = operating + otherExp;

  const {
    allColumns,
    visibleColumns,
    toggleColumn,
    isColumnVisible,
    reorderColumns,
  } = usePersistedReportColumns(workspaceId, "profit-loss", PROFIT_LOSS_COLUMNS);

  const applyFilters = () => setPeriod({ ...draft });

  const reportFilename = useMemo(
    () => buildReportFilename("profit-loss", companyName, periodEnd),
    [companyName, periodEnd],
  );

  const runReportPrint = useCallback(
    async (mode) => {
      const node = sheetRef.current;
      if (!node) return;
      try {
        await (mode === "pdf" ? downloadReportPdf : printReportSheet)(node, {
          title: reportFilename,
          rootClass: "profit-loss-report-root",
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
    downloadProfitLossCsv({
      filename: `profit-loss-${safeName || "report"}-${periodEnd || "export"}.csv`,
      companyName,
      periodFrom: period.from,
      periodTo: periodEnd,
      currency,
      sections,
      summary,
    });
    toast.success("Export downloaded");
  }, [
    showReport,
    companyName,
    period.from,
    periodEnd,
    currency,
    sections,
    summary,
  ]);

  return (
    <ReportPageShell
      workspaceId={workspaceId}
      title="Profit & Loss"
      subtitle="Revenue, cost of sales, operating expenses, and net income for the selected period."
      actions={
        <ReportActionBar
          leading={
            <ReportTableToolbar
              columns={allColumns}
              isColumnVisible={isColumnVisible}
              onToggle={toggleColumn}
            />
          }
          onExport={handleExport}
          exportDisabled={!showReport || loading}
          onPdf={() => runReportPrint("pdf")}
          pdfDisabled={!showReport || loading}
          onPrint={() => runReportPrint("print")}
          printDisabled={!showReport || loading}
        />
      }
      contentClassName="w-full max-w-[1024px] mx-auto space-y-4 profit-loss-report-root"
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
          hint="Amounts reflect posted journal activity for income and expense accounts in the selected period."
        >
          <div className="flex h-8 items-center gap-2 rounded-md border border-border/60 bg-muted/20 px-2.5">
            <Switch
              id="pl-show-codes"
              checked={showCodes}
              onCheckedChange={setShowCodes}
            />
            <Label
              htmlFor="pl-show-codes"
              className="cursor-pointer whitespace-nowrap text-xs font-normal text-foreground"
            >
              Account codes
            </Label>
          </div>
        </ReportDateFilter>
      </div>

      {showReport ? (
        <div className="no-print grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryMetric
            label="Revenue"
            value={revenue}
            currency={currency}
            hint="Current period"
          />
          <SummaryMetric
            label="Gross profit"
            value={grossProfit}
            currency={currency}
            hint={`${pctOf(grossProfit, revenue)}% of revenue`}
          />
          <SummaryMetric
            label="Total expenses"
            value={totalExp}
            currency={currency}
            hint={`${pctOf(totalExp, revenue)}% of revenue`}
          />
          <SummaryMetric
            label={netIncome >= 0 ? "Net profit" : "Net loss"}
            value={netIncome}
            currency={currency}
            hint={`${pctOf(netIncome, revenue)}% margin`}
          />
        </div>
      ) : null}

      {loading && !data ? (
        <Skeleton className="h-[640px] w-full rounded-xl" />
      ) : showReport ? (
        <div
          ref={sheetRef}
          className="report-print-sheet profit-loss-print overflow-visible rounded-lg border border-slate-200 bg-white print:overflow-visible print:rounded-none print:border-0"
        >
          <ProfitLossStatement
            companyName={companyName}
            logoUrl={companyLogoUrl}
            periodFrom={period.from}
            periodTo={periodEnd}
            currency={currency}
            fiscalYear={fiscalYear}
            generatedBy={generatedBy}
            printedAt={printedAt}
            sections={sections}
            summary={summary}
            workspaceId={workspaceId}
            period={period}
            visibleColumns={visibleColumns}
            reorderColumns={reorderColumns}
            showCodes={showCodes}
          />
        </div>
      ) : null}
    </ReportPageShell>
  );
}
