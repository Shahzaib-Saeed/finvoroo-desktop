import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import { format } from "date-fns";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { reportsApi } from "./api/reports.api";
import { defaultReportPeriod } from "./constants";
import { ReportPageShell } from "./components/ReportPageShell";
import { ReportActionBar } from "./components/ReportActionBar";
import {
  CategoryTradingReportView,
  CategoryTradingToolbar,
} from "./components/CategoryTradingReportView";
import {
  buildReportFilename,
  downloadReportPdf,
  printReportSheet,
} from "./report-print.lib";
import { Skeleton } from "@/components/ui/skeleton";

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function formatAmountCsv(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0.00";
  return n.toFixed(2);
}

export function CategoryTradingReportPage() {
  const { id: workspaceId } = useParams();
  const user = useAuthStore((s) => s.user);
  const [period, setPeriod] = useState(defaultReportPeriod());
  const [draft, setDraft] = useState(defaultReportPeriod());
  const [includeExpenses, setIncludeExpenses] = useState(true);
  const [draftIncludeExpenses, setDraftIncludeExpenses] = useState(true);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const sheetRef = useRef(null);

  const load = useCallback(() => {
    setLoading(true);
    reportsApi
      .categoryTrading({
        from: period.from,
        to: period.to,
        include_expenses: includeExpenses ? 1 : 0,
      })
      .then((res) => setData(res.data?.data || null))
      .catch((err) => {
        toast.error(
          err?.response?.data?.message ||
            "Failed to load category sales and purchases",
        );
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [period, includeExpenses]);

  useEffect(() => {
    load();
  }, [load]);

  const currency = data?.base_currency || "PKR";
  const company = data?.company || {};
  const companyName = company.name || "Company";
  // Same resolution order the financial summary uses, so one company cannot
  // show its logo on one statement and initials on another.
  const companyLogoUrl =
    company.logo_url ||
    company.logo ||
    company.logoUrl ||
    company.image_url ||
    null;
  const printedAt = format(new Date(), "dd/MM/yyyy 'at' hh:mm a");
  const generatedBy = user?.name || user?.full_name || null;
  const asOf = data?.period?.to || period.to;
  const rows = data?.rows || [];
  const totals = data?.totals || {};
  const expenses = data?.expenses || null;
  const showReport = Boolean(data);

  const applyFilters = () => {
    setPeriod({ ...draft });
    setIncludeExpenses(draftIncludeExpenses);
  };

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
    const gross = totals.gross_profit ?? totals.net_profit ?? 0;
    const out = [];
    out.push(["Category Sales & Purchases"]);
    out.push([companyName]);
    out.push([`Period: ${period.from} to ${period.to}`]);
    out.push([`Currency: ${currency}`]);
    out.push([]);
    out.push(["Category", "Purchase", "Sale", "Gross profit"]);
    for (const row of rows) {
      out.push([
        row.category_name || "",
        formatAmountCsv(row.purchase),
        formatAmountCsv(row.sale),
        formatAmountCsv(row.net_profit),
      ]);
    }
    out.push([
      "TOTAL",
      formatAmountCsv(totals.purchase),
      formatAmountCsv(totals.sale),
      formatAmountCsv(gross),
    ]);
    if (includeExpenses && expenses?.rows?.length) {
      out.push([]);
      out.push(["Operational expenses"]);
      for (const row of expenses.rows) {
        out.push([row.label, formatAmountCsv(row.amount)]);
      }
      out.push(["Total expenses", formatAmountCsv(expenses.total)]);
      out.push([
        "Net profit after expenses",
        formatAmountCsv(totals.net_profit_after_expenses),
      ]);
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
    link.download = `category-trading-${safeName || "report"}-${asOf || "export"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ReportPageShell
      workspaceId={workspaceId}
      title="Category Sales & Purchases"
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
      contentClassName="mx-auto w-full max-w-[1120px] space-y-4 category-trading-report-root"
    >
      <CategoryTradingToolbar
        from={draft.from}
        to={draft.to}
        onRangeChange={({ from, to }) => setDraft({ from, to })}
        onApply={applyFilters}
        loading={loading}
        includeExpenses={draftIncludeExpenses}
        onIncludeExpensesChange={setDraftIncludeExpenses}
      />

      {loading && !showReport ? (
        <Skeleton className="h-[640px] w-full rounded-xl" />
      ) : showReport ? (
        <div
          ref={sheetRef}
          className="report-print-sheet category-trading-print overflow-visible rounded-lg border border-slate-200 bg-white print:overflow-visible print:rounded-none print:border-0"
        >
          <CategoryTradingReportView
            companyName={companyName}
            logoUrl={companyLogoUrl}
            periodFrom={data?.period?.from || period.from}
            periodTo={data?.period?.to || period.to}
            currency={currency}
            rows={rows}
            totals={totals}
            expenses={expenses}
            includeExpenses={includeExpenses}
            printedAt={printedAt}
            generatedBy={generatedBy}
          />
        </div>
      ) : null}
    </ReportPageShell>
  );
}
