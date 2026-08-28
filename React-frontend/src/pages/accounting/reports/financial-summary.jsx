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
import { FinancialSummaryStatement } from "./components/FinancialSummaryStatement";
import {
  buildReportFilename,
  downloadReportPdf,
  printReportSheet,
} from "./report-print.lib";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const ASSET_RANGES = [
  { key: "current", label: "Current Assets", min: 10000, max: 13999 },
  {
    key: "non_current",
    label: "Property & Equipment",
    min: 14000,
    max: 19999,
  },
];
const LIABILITY_RANGES = [
  { key: "current", label: "Current Liabilities", min: 20000, max: 22999 },
  { key: "long_term", label: "Long-Term Liabilities", min: 23000, max: 29999 },
];
const EQUITY_RANGES = [
  {
    key: "capital",
    label: "Share Capital / Owner Equity",
    min: 30000,
    max: 30999,
  },
  { key: "drawings", label: "Drawings / Dividends", min: 31000, max: 31999 },
  { key: "retained", label: "Retained Earnings", min: 32000, max: 32999 },
];

import { sortRowsByAccountCode } from "./report-account-sort";

function useGroups(rows, ranges) {
  return useMemo(
    () =>
      ranges.map((range) => ({
        ...range,
        rows: sortRowsByAccountCode(
          rows.filter((row) => {
            const n = Number(row.code);
            return n >= range.min && n <= range.max;
          }),
        ),
      })),
    [rows, ranges],
  );
}

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

function downloadFinancialSummaryCsv({
  filename,
  companyName,
  asOf,
  periodFrom,
  periodTo,
  currency,
  assetGroups,
  liabilityGroups,
  equityGroups,
  retainedEarnings,
  priorPeriodEarnings,
  totalAssets,
  liabilitiesPlusEquity,
  isBalanced,
  balanceDifference,
  profitLoss,
}) {
  const out = [];
  out.push(["Financial Summary"]);
  out.push([companyName || ""]);
  out.push([`Balance sheet as of ${asOf || ""}`]);
  out.push([`P&L period: ${periodFrom || ""} to ${periodTo || ""}`]);
  out.push([`Currency: ${currency || ""}`]);
  out.push([]);
  out.push(["Report", "Section", "Account ID", "Description", "Amount"]);

  const pushRows = (report, section, rows, amountKey = "balance") => {
    for (const row of rows) {
      out.push([
        report,
        section,
        row.code || "",
        row.name || "",
        formatAmountCsv(row[amountKey]),
      ]);
    }
  };

  for (const group of assetGroups) {
    if (!group.rows.length) continue;
    pushRows("Balance Sheet", group.label, group.rows);
    out.push([
      "Balance Sheet",
      group.label,
      "",
      `Total ${group.label}`,
      formatAmountCsv(
        group.rows.reduce((s, r) => s + Number(r.balance || 0), 0),
      ),
    ]);
  }
  out.push([
    "Balance Sheet",
    "Assets",
    "",
    "TOTAL ASSETS",
    formatAmountCsv(totalAssets),
  ]);
  out.push([]);

  for (const group of liabilityGroups) {
    if (!group.rows.length) continue;
    pushRows("Balance Sheet", group.label, group.rows);
  }

  const capitalGroup = equityGroups.find((g) => g.key === "capital");
  const drawingsGroup = equityGroups.find((g) => g.key === "drawings");
  const retainedGroup = equityGroups.find((g) => g.key === "retained");

  for (const row of [
    ...(capitalGroup?.rows || []),
    ...(drawingsGroup?.rows || []),
    ...(retainedGroup?.rows || []),
  ]) {
    pushRows("Balance Sheet", "Equity", [row]);
  }

  if (Math.abs(Number(priorPeriodEarnings) || 0) >= 0.005) {
    out.push([
      "Balance Sheet",
      "Equity",
      "",
      "Prior period profit / loss (unclosed)",
      formatAmountCsv(priorPeriodEarnings),
    ]);
  }
  out.push([
    "Balance Sheet",
    "Equity",
    "",
    "Current year profit / loss",
    formatAmountCsv(retainedEarnings),
  ]);
  out.push([
    "Balance Sheet",
    "",
    "",
    "TOTAL LIABILITIES & EQUITY",
    formatAmountCsv(liabilitiesPlusEquity),
  ]);
  out.push([
    "Balance Sheet",
    "",
    "",
    isBalanced ? "Balanced" : "Out of balance",
    isBalanced ? "0.00" : formatAmountCsv(balanceDifference),
  ]);
  out.push([]);

  const sections = profitLoss?.sections || {};
  const summary = profitLoss?.summary || {};
  const plSections = [
    ["Profit & Loss", "Revenue", sections.revenue?.rows || []],
    ["Profit & Loss", "Other income", sections.other_income?.rows || []],
    ["Profit & Loss", "Cost of goods sold", sections.cogs?.rows || []],
    [
      "Profit & Loss",
      "Operating expenses",
      sections.operating_expenses?.rows || [],
    ],
    ["Profit & Loss", "Other expenses", sections.other_expenses?.rows || []],
  ];

  for (const [report, section, rows] of plSections) {
    if (!rows.length) continue;
    pushRows(report, section, rows, "amount");
  }

  out.push([
    "Profit & Loss",
    "",
    "",
    "Gross profit",
    formatAmountCsv(summary.gross_profit ?? 0),
  ]);
  out.push([
    "Profit & Loss",
    "",
    "",
    "Net income",
    formatAmountCsv(summary.net_income ?? 0),
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

export function FinancialSummaryReportPage() {
  const { id: workspaceId } = useParams();
  const user = useAuthStore((s) => s.user);
  const [period, setPeriod] = useState(defaultReportPeriod());
  const [draft, setDraft] = useState(defaultReportPeriod());
  const [loading, setLoading] = useState(true);
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [profitLoss, setProfitLoss] = useState(null);
  const [showCodes, setShowCodes] = useState(true);
  const sheetRef = useRef(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = { from: period.from, to: period.to };

    Promise.all([
      reportsApi.balanceSheet(params),
      reportsApi.incomeStatement(params),
    ])
      .then(([bsRes, plRes]) => {
        setBalanceSheet(bsRes.data?.data || null);
        setProfitLoss(plRes.data?.data || null);
      })
      .catch((err) => {
        toast.error(
          err?.response?.data?.message || "Failed to load financial summary",
        );
        setBalanceSheet(null);
        setProfitLoss(null);
      })
      .finally(() => setLoading(false));
  }, [period]);

  useEffect(() => load(), [load]);

  const currency =
    balanceSheet?.base_currency || profitLoss?.base_currency || "USD";
  const company = balanceSheet?.company || profitLoss?.company || {};
  const companyName = company.name || "Company";
  const companyLogoUrl =
    company.logo_url ||
    company.logo ||
    company.logoUrl ||
    company.image_url ||
    null;
  const printedAt = format(new Date(), "dd/MM/yyyy 'at' hh:mm a");
  const generatedBy = user?.name || user?.full_name || null;
  const asOf = balanceSheet?.period?.to || period.to;
  const fiscalYear = resolveFiscalYear(asOf, company);
  const showReport = Boolean(balanceSheet || profitLoss);

  const assetRows = balanceSheet?.assets || [];
  const liabilityRows = balanceSheet?.liabilities || [];
  const equityRows = balanceSheet?.equity || [];
  const retainedEarnings = balanceSheet?.retained_earnings ?? 0;
  const priorPeriodEarnings = balanceSheet?.prior_period_earnings ?? 0;
  const totalAssets = balanceSheet?.totals?.assets ?? 0;
  const liabilitiesPlusEquity = balanceSheet?.totals?.liabilities_plus_equity ?? 0;
  const balanceDifference = Number(balanceSheet?.totals?.difference ?? 0);
  const unbalancedJournalCount = Number(
    balanceSheet?.totals?.unbalanced_journal_count ?? 0,
  );
  const isBalanced = balanceSheet?.totals?.is_balanced !== false;

  const assetGroups = useGroups(assetRows, ASSET_RANGES);
  const liabilityGroups = useGroups(liabilityRows, LIABILITY_RANGES);
  const equityGroups = useGroups(equityRows, EQUITY_RANGES);

  const applyFilters = () => setPeriod({ ...draft });
  const resetFilters = () => {
    setDraft(defaultReportPeriod());
    setShowCodes(true);
  };

  const reportFilename = useMemo(
    () => buildReportFilename("financial-summary", companyName, asOf),
    [companyName, asOf],
  );

  const runReportPrint = useCallback(
    async (mode) => {
      const node = sheetRef.current;
      if (!node) return;
      try {
        await (mode === "pdf" ? downloadReportPdf : printReportSheet)(node, {
          title: reportFilename,
          rootClass: "financial-summary-report-root",
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
    downloadFinancialSummaryCsv({
      filename: `financial-summary-${safeName || "report"}-${asOf || "export"}.csv`,
      companyName,
      asOf,
      periodFrom: period.from,
      periodTo: period.to,
      currency,
      assetGroups,
      liabilityGroups,
      equityGroups,
      retainedEarnings,
      priorPeriodEarnings,
      totalAssets,
      liabilitiesPlusEquity,
      isBalanced,
      balanceDifference,
      profitLoss,
    });
    toast.success("Export downloaded");
  }, [
    showReport,
    companyName,
    asOf,
    period.from,
    period.to,
    currency,
    assetGroups,
    liabilityGroups,
    equityGroups,
    retainedEarnings,
    priorPeriodEarnings,
    totalAssets,
    liabilitiesPlusEquity,
    isBalanced,
    balanceDifference,
    profitLoss,
  ]);

  return (
    <ReportPageShell
      workspaceId={workspaceId}
      title="Financial Summary"
      subtitle="Balance sheet and profit & loss — side-by-side financial overview."
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
      contentClassName="w-full max-w-[1600px] mx-auto space-y-4 financial-summary-report-root"
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
          hint="End date sets the balance sheet position. The from–to range drives profit & loss."
        >
          <div className="flex h-8 items-center gap-2 rounded-md border border-border/60 bg-muted/20 px-2.5">
            <Switch
              id="fs-show-codes"
              checked={showCodes}
              onCheckedChange={setShowCodes}
            />
            <Label
              htmlFor="fs-show-codes"
              className="cursor-pointer whitespace-nowrap text-xs font-normal text-foreground"
            >
              Account codes
            </Label>
          </div>
        </ReportDateFilter>
      </div>

      {showReport ? (
        <ReportSummaryStrip
          items={[
            { label: "Total assets", value: formatAmountCsv(totalAssets) },
            {
              label: "Liabilities + equity",
              value: formatAmountCsv(liabilitiesPlusEquity),
            },
            {
              label: "Balance check",
              value: isBalanced ? "Balanced" : formatAmountCsv(balanceDifference),
              tone: isBalanced ? "positive" : "negative",
            },
            {
              label: "Net income",
              value: formatAmountCsv(profitLoss?.summary?.net_income ?? 0),
              tone:
                Number(profitLoss?.summary?.net_income ?? 0) >= 0
                  ? "positive"
                  : "negative",
            },
          ]}
          context={currency}
        />
      ) : null}

      {loading && !showReport ? (
        <Skeleton className="h-[640px] w-full rounded-xl" />
      ) : showReport ? (
        <div
          ref={sheetRef}
          className="report-print-sheet financial-summary-print overflow-visible rounded-lg border border-slate-200 bg-white print:overflow-visible print:rounded-none print:border-0"
        >
          <FinancialSummaryStatement
            companyName={companyName}
            logoUrl={companyLogoUrl}
            periodFrom={period.from}
            periodTo={period.to}
            asOf={asOf}
            currency={currency}
            fiscalYear={fiscalYear}
            generatedBy={generatedBy}
            printedAt={printedAt}
            assetGroups={assetGroups}
            liabilityGroups={liabilityGroups}
            equityGroups={equityGroups}
            retainedEarnings={retainedEarnings}
            priorPeriodEarnings={priorPeriodEarnings}
            totalAssets={totalAssets}
            liabilitiesPlusEquity={liabilitiesPlusEquity}
            isBalanced={isBalanced}
            balanceDifference={balanceDifference}
            unbalancedJournalCount={unbalancedJournalCount}
            profitLoss={profitLoss}
            workspaceId={workspaceId}
            period={period}
            showCodes={showCodes}
          />
        </div>
      ) : null}
    </ReportPageShell>
  );
}
