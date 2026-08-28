import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format, parseISO } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { reportsApi } from "../api/reports.api";
import { reportCenterApi } from "../api/report-center.api";
import { reportBuilderApi } from "../builder/api/report-builder.api";
import { defaultReportPeriod, formatCurrency } from "../constants";
import { ReportPageShell } from "../components/ReportPageShell";
import { ReportActionBar } from "../components/ReportActionBar";
import { ReportFavoriteToggle } from "../components/ReportFavoriteToggle";
import { ReportDateFilter } from "../components/ReportDateFilter";
import { GeneralLedgerStatement } from "../components/GeneralLedgerStatement";
import { filterGlRowsBySearch } from "../lib/gl-row-search";
import { getReportDisplayReference } from "../report-reference";
import { usePersistedReportColumns } from "../hooks/usePersistedReportColumns";
import { useReportColumnWidths } from "../hooks/useReportColumnWidths";
import { ReportTableToolbar } from "../components/ReportTableToolbar";
import { normalizeGlColumnOrder } from "../constants/report-columns";
import {
  buildReportFilename,
  downloadReportPdf,
  printReportSheet,
} from "../report-print.lib";
import { sortRowsByAccountCode } from "../report-account-sort";
import { formatJournalTypeCode } from "../journal-type-codes";
import { hasPrepaidCash, prepaidCashAmount } from "../../shared/prepaid-cash";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  resolveReportDateRange,
  summarizeReportFilters,
} from "../lib/summarize-filters";
import { definitionEditPath } from "../lib/report-definition-links";
import {
  builderResultToGlMeta,
  mapBuilderRowsToGlRows,
  mapSavedDefinitionToGlColumns,
  savedDefinitionGlColumnIds,
} from "./lib/map-builder-to-gl";

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
  reportTitle,
  companyName,
  periodFrom,
  periodTo,
  currency,
  rows,
  visibleColumns,
}) {
  const out = [];
  out.push([reportTitle || "Report"]);
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

function initialPeriodFromDefinition(definition) {
  const resolved = resolveReportDateRange(definition?.definition?.date_range);
  if (resolved?.from && resolved?.to) return resolved;
  return defaultReportPeriod();
}

function filterGlRows(rows, { accountId, searchTerm, currency }) {
  let filtered = rows;
  if (accountId) {
    filtered = filtered.filter(
      (row) => String(row.account_id || "") === String(accountId),
    );
  }
  return filterGlRowsBySearch(filtered, searchTerm, { currency });
}

function slugifyReportName(name) {
  return String(name || "report")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
}

export function ReportViewerGeneralLedger({
  definition,
  definitionId,
  fields = [],
  isFavorited = false,
}) {
  const { id: workspaceId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const activeCompany = useAuthStore((s) => s.activeCompany);

  const [period, setPeriod] = useState(() =>
    initialPeriodFromDefinition(definition),
  );
  const [draft, setDraft] = useState(() =>
    initialPeriodFromDefinition(definition),
  );
  const [accountId, setAccountId] = useState("");
  const [draftAccountId, setDraftAccountId] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [nativeMeta, setNativeMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [perPageChoice, setPerPageChoice] = useState("50");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const sheetRef = useRef(null);

  const reportDef = definition?.definition || {};
  const reportName = definition?.name?.trim() || "Custom Report";
  const filterLines = useMemo(
    () => summarizeReportFilters(reportDef.filters, fields),
    [reportDef.filters, fields],
  );

  useEffect(() => {
    if (!definition) return;
    const initial = initialPeriodFromDefinition(definition);
    setPeriod(initial);
    setDraft(initial);
    setPage(1);
    setResult(null);
    setSearchInput("");
    setAppliedSearch("");
  }, [definition, definition?.id, definition?.updated_at]);

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
    if (!definitionId || !period?.from || !period?.to) return;
    setLoading(true);
    const perPage = resolveGlPerPage(perPageChoice, result?.total);

    reportBuilderApi
      .run(definitionId, page, perPage, {
        from: period.from,
        to: period.to,
      })
      .then(({ data }) => {
        setResult(data?.data || null);
      })
      .catch((err) =>
        toast.error(err?.response?.data?.message || "Failed to load report"),
      )
      .finally(() => setLoading(false));
  }, [definitionId, period, page, perPageChoice, result?.total]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!period?.from || !period?.to) return;
    reportsApi
      .generalLedger({
        from: period.from,
        to: period.to,
        page: 1,
        per_page: 1,
      })
      .then((res) => setNativeMeta(res.data?.meta || null))
      .catch(() => setNativeMeta(null));
  }, [period]);

  const glRows = useMemo(
    () => mapBuilderRowsToGlRows(result?.rows || []),
    [result?.rows],
  );

  const currency =
    nativeMeta?.base_currency ||
    activeCompany?.base_currency ||
    activeCompany?.currency ||
    "USD";

  const filteredRows = useMemo(
    () =>
      filterGlRows(glRows, {
        accountId,
        searchTerm: appliedSearch,
        currency,
      }),
    [glRows, accountId, appliedSearch, currency],
  );

  const savedColumnKeys = useMemo(
    () => reportDef.columns || [],
    [reportDef.columns],
  );

  const builderGlColumnIds = useMemo(
    () => savedDefinitionGlColumnIds(savedColumnKeys),
    [savedColumnKeys],
  );

  const customFieldColumns = useMemo(
    () => result?.columns || [],
    [result?.columns],
  );

  const availableColumns = useMemo(() => {
    const fromDefinition = mapSavedDefinitionToGlColumns(
      savedColumnKeys,
      fields,
      customFieldColumns,
    );
    return fromDefinition;
  }, [savedColumnKeys, fields, customFieldColumns]);

  const columnPrefsKey = useMemo(() => {
    const signature = [...savedColumnKeys].sort().join("|");
    return `custom-gl-${definitionId}-${signature.length}-${signature.slice(0, 48)}`;
  }, [definitionId, savedColumnKeys]);

  const {
    allColumns,
    visibleColumns,
    toggleColumn,
    reorderColumns,
    isColumnVisible,
  } = usePersistedReportColumns(workspaceId, columnPrefsKey, availableColumns, {
    normalizeColumnOrder: normalizeGlColumnOrder,
    customFieldInsertAfterId: "journal",
    initialVisibleColumnIds: [
      "account",
      ...(builderGlColumnIds || []).filter((id) => id !== "account"),
    ],
    columnsReady: result != null,
  });

  const customGlWidthKey = `custom_gl_${definitionId || "preview"}`;
  const { columnWidths, resizeColumn, resetColumnWidths } = useReportColumnWidths(
    customGlWidthKey,
    visibleColumns,
  );

  const company = useMemo(
    () => nativeMeta?.company || activeCompany || {},
    [nativeMeta?.company, activeCompany],
  );
  const companyName = company.name || company.company_name || "Company";
  const companyLogoUrl =
    company.logo_url ||
    company.logo ||
    company.logoUrl ||
    company.image_url ||
    null;

  const accounts = useMemo(
    () => sortRowsByAccountCode(nativeMeta?.accounts || []),
    [nativeMeta?.accounts],
  );

  const perPage = resolveGlPerPage(perPageChoice, result?.total);
  const meta = useMemo(() => {
    if (!result) return null;
    return {
      ...builderResultToGlMeta(result, currency, page, perPage),
      company,
      accounts: nativeMeta?.accounts || [],
      base_currency: currency,
    };
  }, [result, currency, page, perPage, company, nativeMeta?.accounts]);

  const applyFilters = () => {
    setPeriod({ ...draft });
    setAccountId(draftAccountId);
    setPage(1);
    setSearchInput("");
    setAppliedSearch("");
  };

  const resetFilters = () => {
    const initial = initialPeriodFromDefinition(definition);
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
  const term = appliedSearch.trim().toLowerCase();

  const selectedAccount = accountId
    ? accounts.find((a) => String(a.id) === String(accountId))
    : null;

  const scopeLabel = selectedAccount
    ? `Account: ${selectedAccount.code} — ${selectedAccount.name}`
    : filterLines.length
      ? filterLines.join(" · ")
      : "All accounts with activity in this period";

  const pageLabel =
    meta && meta.last_page > 1
      ? `Ledger page ${meta.current_page} of ${meta.last_page}`
      : null;

  const generatedBy = user?.name || user?.full_name || null;
  const printedAt = format(new Date(), "dd/MM/yyyy 'at' hh:mm a");
  const fiscalYear = resolveFiscalYear(period?.to, company);
  const totals = meta?.totals || { total_debit: 0, total_credit: 0 };

  const reportFilename = useMemo(
    () =>
      buildReportFilename(
        slugifyReportName(reportName),
        companyName,
        period.to,
      ),
    [reportName, companyName, period.to],
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
    const safeName = slugifyReportName(reportName);
    downloadGeneralLedgerCsv({
      filename: `${safeName}-${period.to || "export"}.csv`,
      reportTitle: reportName,
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
    reportName,
    companyName,
    period.from,
    period.to,
    currency,
    visibleColumns,
  ]);

  const base = `/workspace/${workspaceId}`;
  const editPath = definitionEditPath(definition, base);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await reportCenterApi.archiveDefinition(definition.id);
      toast.success(`"${reportName}" deleted`);
      setDeleteOpen(false);
      navigate(`${base}/accounting/reports`);
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Could not delete this report.",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <ReportPageShell
        workspaceId={workspaceId}
        title={reportName}
        hideTitle
        compact
        breadcrumbs={[
          { label: "Reports", to: `${base}/accounting/reports` },
          { label: reportName },
        ]}
        actions={
          <ReportActionBar
            leading={
              <>
                <ReportFavoriteToggle
                  favoritableKind="definition"
                  reportDefinitionId={Number(definitionId)}
                  isFavorited={isFavorited}
                  className="size-8 rounded-sm border border-slate-300 bg-white hover:bg-slate-100"
                />
                <ReportTableToolbar
                  columns={allColumns}
                  isColumnVisible={isColumnVisible}
                  onToggle={toggleColumn}
                  onResetColumnWidths={resetColumnWidths}
                />
              </>
            }
            onExport={handleExport}
            exportDisabled={!showLedger || loading || !filteredRows.length}
            onPdf={() => runReportPrint("pdf")}
            pdfDisabled={!showLedger || loading}
            onPrint={() => runReportPrint("print")}
            printDisabled={!showLedger || loading}
            editTo={editPath}
            more={
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="size-3.5" />
                Delete
              </DropdownMenuItem>
            }
          />
        }
        contentClassName="w-full max-w-none space-y-2 general-ledger-report-root"
      >
        <div className="no-print">
          <ReportDateFilter
            compact
            stickyFilters={false}
            from={draft.from}
            to={draft.to}
            onFromChange={(v) => setDraft((p) => ({ ...p, from: v }))}
            onToChange={(v) => setDraft((p) => ({ ...p, to: v }))}
            onApply={applyFilters}
            onReset={resetFilters}
            loading={loading}
          >
            <div className="flex min-w-0 flex-wrap items-center gap-3 sm:gap-4">
              <div className="w-full min-w-[11rem] sm:w-[13rem]">
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
                  <div className="relative min-w-[12rem] flex-1 sm:min-w-[16rem] sm:max-w-md">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search accounts, amounts, references…"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="h-8 border-border/80 bg-background pl-9 pr-9 text-xs shadow-none"
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
                  <div className="flex shrink-0 items-center gap-2.5 pl-0.5">
                    <Label
                      htmlFor="gl-viewer-per-page"
                      className="shrink-0 text-xs text-muted-foreground"
                    >
                      Rows
                    </Label>
                    <Select value={perPageChoice} onValueChange={handlePerPageChange}>
                      <SelectTrigger
                        id="gl-viewer-per-page"
                        className="h-8 w-[6.75rem] bg-background text-xs"
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
                </>
              ) : null}
            </div>
          </ReportDateFilter>
        </div>

        {/* Report Content Output */}
        {loading && !meta ? (
          <Skeleton className="h-[600px] w-full rounded-xl" />
        ) : showLedger ? (
          <div
            ref={sheetRef}
            className="report-print-sheet general-ledger-print w-full min-w-0 max-w-full border border-slate-200 bg-white print:border-0"
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
              reportTitle={reportName}
              reportId={definitionId ? `CR-${definitionId}` : null}
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
              variant="peachtree"
            />
          </div>
        ) : null}

        {showLedger && meta && meta.last_page > 1 ? (
          <div className="no-print flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-sm border-slate-300 text-xs"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="mr-1 size-3.5" />
              Previous
            </Button>
            <span className="text-xs tabular-nums text-slate-500">
              Page {meta.current_page} of {meta.last_page}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-sm border-slate-300 text-xs"
              disabled={page >= meta.last_page || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="ml-1 size-3.5" />
            </Button>
          </div>
        ) : null}

        {/* Empty State */}
        {!loading && showLedger && filteredRows.length === 0 ? (
          <div className="no-print border border-dashed border-slate-300 bg-slate-50/50 py-12 text-center text-xs text-slate-500">
            {term
              ? "No ledger entries match your search."
              : "No posted journal lines found within this period."}
          </div>
        ) : null}
      </ReportPageShell>

      {/* Delete Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete report?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{reportName}&rdquo; will be removed from My Reports. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
            >
              {deleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
