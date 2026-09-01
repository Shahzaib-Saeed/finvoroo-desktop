import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import { format } from "date-fns";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { pharmacyApi } from "../../api/pharmacy.api";
import { ReportPageShell } from "@/pages/accounting/reports/components/ReportPageShell";
import { ReportDateFilter } from "@/pages/accounting/reports/components/ReportDateFilter";
import { ReportActionBar } from "@/pages/accounting/reports/components/ReportActionBar";
import { ReportSummaryStrip } from "@/pages/accounting/reports/components/ReportSummaryStrip";
import {
  buildReportFilename,
  downloadReportPdf,
  printReportSheet,
} from "@/pages/accounting/reports/report-print.lib";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PosItemSalesStatement } from "./PosItemSalesStatement";
import { resolveFiscalYear } from "./PharmacyReportChrome";

function todayPeriod() {
  const d = format(new Date(), "yyyy-MM-dd");
  return { from: d, to: d };
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

export function PosItemSalesReportPage() {
  const { id: workspaceId } = useParams();
  const user = useAuthStore((s) => s.user);
  const [period, setPeriod] = useState(todayPeriod);
  const [draft, setDraft] = useState(todayPeriod);
  const [search, setSearch] = useState("");
  const [draftSearch, setDraftSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const sheetRef = useRef(null);

  const load = useCallback(() => {
    setLoading(true);
    pharmacyApi
      .itemSalesReport({
        from: period.from,
        to: period.to,
        search: search || undefined,
      })
      .then((res) => setData(res.data?.data || null))
      .catch((err) => {
        toast.error(
          err?.response?.data?.message || "Failed to load item-wise POS sales",
        );
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [period, search]);

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
  const truncated = Boolean(data?.truncated);
  const showReport = Boolean(data);

  const applyFilters = () => {
    setPeriod({ ...draft });
    setSearch(draftSearch.trim());
  };
  const resetFilters = () => {
    const next = todayPeriod();
    setDraft(next);
    setDraftSearch("");
  };

  const filename = useMemo(
    () => buildReportFilename("item-wise-pos-sales", companyName, asOf),
    [companyName, asOf],
  );

  const runReportPrint = (mode) => {
    if (!sheetRef.current) return;
    const options = {
      title: `${companyName} — Item-wise POS Sales`,
      filename,
      rootClass: "pos-item-sales-report-root",
    };
    if (mode === "pdf") downloadReportPdf(sheetRef.current, options);
    else printReportSheet(sheetRef.current, options);
  };

  const handleExport = () => {
    if (!data) return;
    const out = [];
    out.push(["Item-wise POS Sales"]);
    out.push([companyName]);
    out.push([`Period: ${period.from} to ${period.to}`]);
    out.push([`Currency: ${currency}`]);
    out.push([]);
    out.push([
      "Item",
      "SKU",
      "Invoice",
      "Sold by",
      "Customer",
      "Date",
      "Time",
      "Qty",
      "Rate",
      "Discount",
      "Sale",
      "Cost",
      "Profit",
    ]);
    for (const row of rows) {
      out.push([
        row.item || "",
        row.sku || "",
        row.invoice_number || "",
        row.sold_by || "",
        row.customer_name || "",
        row.date || "",
        row.time || "",
        row.qty ?? "",
        formatAmountCsv(row.rate),
        formatAmountCsv(row.discount),
        formatAmountCsv(row.sale),
        formatAmountCsv(row.cost_available === false ? 'UNAVAILABLE' : row.cost),
        formatAmountCsv(row.profit_available === false ? 'UNAVAILABLE' : row.profit),
      ]);
    }
    out.push([
      "TOTAL",
      "",
      "",
      "",
      "",
      "",
      "",
      totals.qty ?? "",
      "",
      formatAmountCsv(totals.discount),
      formatAmountCsv(totals.sale),
      formatAmountCsv(totals.cost),
      formatAmountCsv(totals.profit),
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
    link.download = `item-wise-pos-sales-${safeName || "report"}-${asOf || "export"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const profit = Number(totals.profit ?? 0);

  return (
    <ReportPageShell
      workspaceId={workspaceId}
      title="Item-wise POS Sales"
      subtitle="Who sold each item, when, qty, rate, discount, and profit from posted counter sales."
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
      contentClassName="w-full min-w-0 max-w-full mx-auto space-y-4 pos-item-sales-report-root lg:max-w-[1280px]"
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
          hint="Posted counter receipts only. Defaults to today. Draft, cancelled, and void sales are excluded."
        >
          <Input
            value={draftSearch}
            onChange={(e) => setDraftSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyFilters();
            }}
            placeholder="Search item, SKU, or invoice"
            aria-label="Search item, SKU, or invoice"
            className="h-8 w-full min-w-0 text-xs sm:w-[220px]"
          />
        </ReportDateFilter>
      </div>

      {showReport ? (
        <ReportSummaryStrip
          items={[
            {
              label: "Lines",
              value: Number(totals.lines ?? 0).toLocaleString("en-US"),
            },
            {
              label: "Sale",
              value: formatDisplayAmount(totals.sale ?? 0),
            },
            {
              label: "Discount",
              value: formatDisplayAmount(totals.discount ?? 0),
            },
            {
              label: "Profit",
              value: formatDisplayAmount(profit),
              tone: profit >= 0 ? "positive" : "negative",
            },
            {
              label: "Margin",
              value:
                totals.margin_percent == null
                  ? "—"
                  : `${Number(totals.margin_percent).toFixed(1)}%`,
              tone:
                Number(totals.margin_percent ?? 0) >= 0 ? "positive" : "negative",
            },
          ]}
          context={currency}
        />
      ) : null}

      {showReport && totals?.profit_complete === false && Number(totals.missing_ledger_cogs_lines || 0) > 0 ? (
        <p className="no-print rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {totals.missing_ledger_cogs_lines} sale line
          {totals.missing_ledger_cogs_lines === 1 ? "" : "s"} missing ledger COGS — profit totals
          exclude those lines.
        </p>
      ) : null}

      {truncated ? (
        <p className="no-print text-xs text-amber-800">
          Showing the first 2,000 lines. Narrow the date range or search to see
          the rest.
        </p>
      ) : null}

      {loading && !showReport ? (
        <Skeleton className="h-[520px] w-full rounded-xl" />
      ) : showReport ? (
        <div
          ref={sheetRef}
          className="report-print-sheet pos-item-sales-print overflow-visible rounded-lg border border-slate-200 bg-white print:overflow-visible print:rounded-none print:border-0"
        >
          <PosItemSalesStatement
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
            truncated={truncated}
          />
        </div>
      ) : null}
    </ReportPageShell>
  );
}
