import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import { format, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { reportsApi } from "./api/reports.api";
import { defaultReportPeriod, formatCurrency } from "./constants";
import { ReportPageShell } from "./components/ReportPageShell";
import { ReportDateFilter } from "./components/ReportDateFilter";
import { GeneralLedgerStatement } from "./components/GeneralLedgerStatement";
import { getReportDisplayReference } from "./report-reference";
import { useReportSearchParams } from "./hooks/useReportSearchParams";
import { usePersistedReportColumns } from "./hooks/usePersistedReportColumns";
import { useReportColumnWidths } from "./hooks/useReportColumnWidths";
import { ReportTableToolbar } from "./components/ReportTableToolbar";
import { SaveReportButton } from "./components/SaveReportButton";
import { ReportActionBar } from "./components/ReportActionBar";
import {
  GL_STANDARD_COLUMNS,
  mergeGlReportColumns,
  normalizeGlColumnOrder,
  sortGlReportColumns,
} from "./constants/report-columns";
import {
  buildReportFilename,
  downloadReportPdf,
  printReportSheet,
} from "./report-print.lib";
import { sortRowsByAccountCode } from "./report-account-sort";
import { formatJournalTypeCode } from "./journal-type-codes";
import { hasPrepaidCash, prepaidCashAmount } from "../shared/prepaid-cash";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportFilterTotalsSummary } from "./components/ReportFilterTotalsSummary";

const GL_PER_PAGE_OPTIONS = [
  { value: "50", label: "50 rows" },
  { value: "100", label: "100 rows" },
  { value: "500", label: "500 rows" },
  { value: "all", label: "All rows" },
];

const GL_MAX_PER_PAGE = 2000;

function resolveGlPerPage(choice, totalRecords) {
  if (choice === "all") {
    const total = Number(totalRecords) || GL_MAX_PER_PAGE;
    return Math.min(Math.max(total, 1), GL_MAX_PER_PAGE);
  }
  const n = Number(choice);
  return Number.isFinite(n) && n > 0 ? n : 50;
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

function formatCsvDate(value) {
  if (!value) return "";
  try {
    return format(parseISO(String(value).slice(0, 10)), "yyyy-MM-dd");
  } catch {
    return value;
  }
}

function downloadGeneralLedgerCsv({
  filename,
  companyName,
  periodFrom,
  periodTo,
  currency,
  rows,
  visibleColumns,
}) {
  const out = [];
  out.push(["General Ledger"]);
  out.push([companyName || ""]);
  out.push([`Period: ${periodFrom || ""} to ${periodTo || ""}`]);
  out.push([`Currency: ${currency || ""}`]);
  out.push([]);

  const headers = visibleColumns.map((col) => col.label);
  out.push(headers);

  for (const row of rows) {
    out.push(
      visibleColumns.map((col) => {
        if (col.id === "date") return formatCsvDate(row.entry_date);
        if (col.id === "reference") return getReportDisplayReference(row);
        if (col.id === "journal") {
          const code = formatJournalTypeCode(row.journal_type, {
            sourceKind: row.source_kind,
            reference: row.reference,
          });
          return hasPrepaidCash(row) ? `${code} · Prepaid` : code;
        }
        if (col.id === "description") {
          const desc = row.line_description || row.entry_description || "";
          const prepaid = hasPrepaidCash(row);
          const party = row.party_name || "";
          if (prepaid) {
            const side =
              row.party_type === "vendor" || row.prepaid_side === "vendor"
                ? "not applied to a bill"
                : "not applied to an invoice";
            const amt = prepaidCashAmount(row);
            const amtLabel =
              amt > 0 ? ` · ${formatCurrency(amt, currency)}` : "";
            const base = party
              ? `${party} — Prepaid — ${side}${amtLabel}`
              : `Prepaid — ${side}${amtLabel}`;
            return desc && !/prepaid|unapplied/i.test(desc)
              ? `${base} — ${desc}`
              : base;
          }
          return party ? `${party}${desc ? ` — ${desc}` : ""}` : desc;
        }
        if (col.id === "debit") return formatAmountCsv(row.debit);
        if (col.id === "credit") return formatAmountCsv(row.credit);
        if (col.id === "balance") return formatAmountCsv(row.balance);
        if (col.id === "aging") return row.aging_label || "";
        if (col.custom_field_id) {
          return row.custom_fields?.[col.custom_field_id] ?? "";
        }
        if (col.id === "account") {
          return `${row.code || ""} — ${row.account_name || ""}`;
        }
        return "";
      }),
    );
  }

  const blob = new Blob(
    [out.map((line) => line.map(csvCell).join(",")).join("\n")],
    { type: "text/csv;charset=utf-8;" },
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function GeneralLedgerReportPage() {
  const { id: workspaceId } = useParams();
  const user = useAuthStore((s) => s.user);
  const [period, setPeriod] = useState(defaultReportPeriod());
  const [draft, setDraft] = useState(defaultReportPeriod());
  const [accountId, setAccountId] = useState("");
  const [draftAccountId, setDraftAccountId] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [perPageChoice, setPerPageChoice] = useState("50");
  const sheetRef = useRef(null);

  const applyUrlParams = useCallback(
    ({ accountId: urlAccountId, period: urlPeriod }) => {
      setPeriod(urlPeriod);
      setDraft(urlPeriod);
      setAccountId(urlAccountId);
      setDraftAccountId(urlAccountId);
      setPage(1);
    },
    [],
  );

  useReportSearchParams({ onApply: applyUrlParams });

  // Debounce free-text search and always restart at page 1 — search is server-side
  // across the full ledger, not only the current page of rows.
  useEffect(() => {
    const handle = setTimeout(() => {
      const next = searchInput.trim();
      setAppliedSearch((prev) => {
        if (prev === next) return prev;
        setPage(1);
        return next;
      });
    }, 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const load = useCallback(() => {
    setLoading(true);
    const perPage = resolveGlPerPage(perPageChoice, meta?.total);
    const params = {
      from: period.from,
      to: period.to,
      page,
      per_page: perPage,
    };
    if (accountId) params.account_id = accountId;
    if (appliedSearch) params.search = appliedSearch;

    reportsApi
      .generalLedger(params)
      .then((res) => {
        setRows(res.data?.data || []);
        setMeta(res.data?.meta || null);
      })
      .catch((err) =>
        toast.error(err?.response?.data?.message || "Failed to load report"),
      )
      .finally(() => setLoading(false));
  }, [period, accountId, page, perPageChoice, appliedSearch, meta?.total]);

  useEffect(() => {
    load();
  }, [load]);

  const currency = meta?.base_currency || "USD";
  const company = meta?.company || {};
  const companyName = company.name || "Company";
  const companyLogoUrl =
    company.logo_url ||
    company.logo ||
    company.logoUrl ||
    company.image_url ||
    null;
  const printedAt = format(new Date(), "dd/MM/yyyy 'at' hh:mm a");
  const generatedBy = user?.name || user?.full_name || null;
  const fiscalYear = resolveFiscalYear(period.to, company);
  const accounts = useMemo(
    () => sortRowsByAccountCode(meta?.accounts || []),
    [meta?.accounts],
  );
  const customFieldColumns = useMemo(
    () => meta?.custom_field_columns || [],
    [meta?.custom_field_columns],
  );
  const totals = meta?.totals || { total_debit: 0, total_credit: 0 };

  const availableColumns = useMemo(
    () =>
      sortGlReportColumns(
        mergeGlReportColumns(GL_STANDARD_COLUMNS, customFieldColumns),
      ),
    [customFieldColumns],
  );

  const {
    allColumns,
    visibleColumns,
    toggleColumn,
    reorderColumns,
    isColumnVisible,
  } = usePersistedReportColumns(
    workspaceId,
    "general-ledger",
    availableColumns,
    {
      normalizeColumnOrder: normalizeGlColumnOrder,
      customFieldInsertAfterId: "journal",
      initialVisibleColumnIds: ["account"],
      defaultHiddenColumnIds: ["aging"],
      // Wait for report meta so custom-field columns exist before defaults/prune.
      columnsReady: meta != null,
    },
  );

  const { columnWidths, resizeColumn, resetColumnWidths } = useReportColumnWidths(
    "general_ledger",
    visibleColumns,
  );

  const term = appliedSearch.trim().toLowerCase();
  const filteredRows = rows;

  const applyFilters = () => {
    setPeriod({ ...draft });
    setAccountId(draftAccountId);
    setPage(1);
    setSearchInput("");
    setAppliedSearch("");
  };

  const resetFilters = () => {
    const initial = defaultReportPeriod();
    setDraft(initial);
    setPeriod(initial);
    setDraftAccountId("");
    setAccountId("");
    setSearchInput("");
    setAppliedSearch("");
    setPage(1);
  };

  const handlePerPageChange = (value) => {
    setPerPageChoice(value);
    setPage(1);
  };

  const totalRecords = meta?.total ?? null;

  const showLedger = Boolean(meta);
  const recordCount = meta?.total ?? filteredRows.length;

  const selectedAccount = accountId
    ? accounts.find((a) => String(a.id) === String(accountId))
    : null;

  const scopeLabel = selectedAccount
    ? `Account: ${selectedAccount.code} — ${selectedAccount.name}`
    : "All accounts with activity in this period";

  const pageLabel =
    meta && meta.last_page > 1
      ? `Ledger page ${meta.current_page} of ${meta.last_page}`
      : null;

  const reportFilename = useMemo(
    () => buildReportFilename("general-ledger", companyName, period.to),
    [companyName, period.to],
  );

  const runReportPrint = useCallback(
    async (mode) => {
      const node = sheetRef.current;
      if (!node) return;
      try {
        await (mode === "pdf" ? downloadReportPdf : printReportSheet)(node, {
          title: reportFilename,
          rootClass: "general-ledger-report-root",
        });
        if (mode === "pdf") {
          toast.success("Save as PDF", {
            description:
              'In the print dialog, set Destination to "Save as PDF".',
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
    if (!showLedger || !filteredRows.length) {
      toast.error("No ledger lines to export on this page");
      return;
    }
    const safeName = String(companyName)
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .toLowerCase();
    downloadGeneralLedgerCsv({
      filename: `general-ledger-${safeName || "report"}-${period.to || "export"}.csv`,
      companyName,
      periodFrom: period.from,
      periodTo: period.to,
      currency,
      rows: filteredRows,
      visibleColumns,
    });
    toast.success("Export downloaded");
  }, [
    showLedger,
    filteredRows,
    companyName,
    period.from,
    period.to,
    currency,
    visibleColumns,
  ]);

  return (
    <ReportPageShell
      workspaceId={workspaceId}
      title="General Ledger"
      compact
      hideTitle
      standardReportKey="general_ledger"
      actions={
        <ReportActionBar
          leading={
            <>
              <ReportTableToolbar
                columns={allColumns}
                isColumnVisible={isColumnVisible}
                onToggle={toggleColumn}
                onResetColumnWidths={resetColumnWidths}
              />
              <SaveReportButton
                standardReportKey="general_ledger"
                defaultName="General Ledger"
                params={{
                  from: period.from,
                  to: period.to,
                  account_id: accountId || null,
                }}
              />
            </>
          }
          onExport={handleExport}
          exportDisabled={!showLedger || loading || !filteredRows.length}
          onPdf={() => runReportPrint("pdf")}
          pdfDisabled={!showLedger || loading}
          onPrint={() => runReportPrint("print")}
          printDisabled={!showLedger || loading}
        />
      }
      contentClassName="w-full max-w-none space-y-2 general-ledger-report-root"
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
        >
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
            <div className="w-[13.5rem] shrink-0 sm:w-[15rem]">
              <Label className="sr-only">Filter by account</Label>
              <SearchableCombobox
                value={draftAccountId}
                onValueChange={(v) => setDraftAccountId(v || "")}
                options={accounts.map((a) => ({
                  value: String(a.id),
                  label: `${a.code} — ${a.name}`,
                  keywords: [a.code, a.name],
                }))}
                allowNone
                noneLabel="All accounts"
                placeholder="All accounts"
                searchPlaceholder="Search account…"
                emptyText="No matching account."
                triggerClassName="h-8 w-full bg-background text-xs"
              />
            </div>
            {showLedger ? (
              <>
                <div className="relative w-full min-w-[12rem] max-w-xs flex-1 sm:w-[16rem] sm:flex-none">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search reference, amount…"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="h-8 border-border/80 bg-background pl-8 pr-8 text-xs shadow-none"
                  />
                  {searchInput ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 size-8 hover:bg-transparent"
                      onClick={() => {
                        setSearchInput("");
                        setAppliedSearch("");
                        setPage(1);
                      }}
                    >
                      <X className="size-3.5 text-muted-foreground/70 hover:text-foreground" />
                    </Button>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Label
                    htmlFor="gl-per-page"
                    className="shrink-0 text-xs text-muted-foreground"
                  >
                    Rows
                  </Label>
                  <Select
                    value={perPageChoice}
                    onValueChange={handlePerPageChange}
                  >
                    <SelectTrigger
                      id="gl-per-page"
                      className="h-8 w-[6.5rem] bg-background text-xs"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GL_PER_PAGE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <ReportFilterTotalsSummary
                  recordCount={recordCount}
                  totals={totals}
                  currency={currency}
                />
              </>
            ) : null}
          </div>
        </ReportDateFilter>
      </div>

      {loading && !meta ? (
        <Skeleton className="h-[640px] w-full rounded-xl" />
      ) : showLedger ? (
        <div
          ref={sheetRef}
          className="report-print-sheet general-ledger-print w-full min-w-0 max-w-full rounded-lg border border-slate-200 bg-white print:rounded-none print:border-0"
        >
          <GeneralLedgerStatement
            companyName={companyName}
            logoUrl={companyLogoUrl}
            periodFrom={period.from}
            periodTo={period.to}
            currency={currency}
            fiscalYear={fiscalYear}
            generatedBy={generatedBy}
            printedAt={printedAt}
            scopeLabel={scopeLabel}
            pageLabel={pageLabel}
            rows={filteredRows}
            loading={loading && !filteredRows.length}
            workspaceId={workspaceId}
            period={period}
            visibleColumns={visibleColumns}
            reorderColumns={reorderColumns}
            columnWidths={columnWidths}
            onColumnResize={resizeColumn}
            reportKey="general_ledger"
            totals={totals}
            recordCount={recordCount}
            totalRecords={totalRecords}
          />
        </div>
      ) : null}

      {showLedger && meta && meta.last_page > 1 ? (
        <div className="no-print flex flex-wrap items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="mr-1 size-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {meta.current_page} of {meta.last_page}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            disabled={page >= meta.last_page || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
            <ChevronRight className="ml-1 size-4" />
          </Button>
        </div>
      ) : null}

      {!loading && showLedger && filteredRows.length === 0 ? (
        <div className="no-print rounded-lg border border-dashed border-slate-200 bg-slate-50/50 py-12 text-center text-sm text-slate-500">
          {term
            ? "No ledger entries match your search."
            : "No posted journal lines found within this period."}
        </div>
      ) : null}
    </ReportPageShell>
  );
}
