import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import { format, parseISO } from "date-fns";
import { Users } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { reportsApi } from "./api/reports.api";
import { formatCurrency } from "./constants";
import {
  downloadAgingReportCsv,
  filterActiveParties,
  lineOpenBalance,
  sumBucketTotals,
} from "./aging-report.lib";
import { InvoiceDrillLink } from "@/components/workspace/invoice/components/InvoiceDrillLink";
import { CustomerDrillLink } from "./components/CustomerDrillLink";
import { ReportPageShell } from "./components/ReportPageShell";
import { ReportDateFilter } from "./components/ReportDateFilter";
import { AgingUnifiedDetailTable } from "./components/AgingReportSheet";
import {
  LedgerStatementPrintFooter,
  LedgerStatementPrintHeader,
} from "./components/GeneralLedgerStatement";
import { formatPartyShortLabel } from "./components/PartyLedgerReport";
import { formatPeachtreeAmount } from "./components/GeneralLedgerTable";
import { ReportTableToolbar } from "./components/ReportTableToolbar";
import { ReportActionBar } from "./components/ReportActionBar";
import { usePersistedReportColumns } from "./hooks/usePersistedReportColumns";
import { useReportColumnWidths } from "./hooks/useReportColumnWidths";
import {
  normalizeCustomerAgingColumnOrder,
  sortCustomerAgingReportColumns,
} from "./constants/report-columns";
import {
  isReportCustomFieldColumn,
  ReportCustomFieldHeader,
  ReportCustomFieldCell,
} from "./components/ReportCustomFieldDisplay";
import {
  buildReportFilename,
  downloadReportPdf,
  printReportSheet,
} from "./report-print.lib";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";

const EXCLUDE_COLUMN_IDS = ["aging_label", "paid_marker", "customer", "available_credit"];

const DEFAULT_HIDDEN_COLUMN_IDS = ["ship_via", "sales_rep", "po_number"];

const FALLBACK_COLUMNS = [
  { id: "date", label: "Invoice Date", can_hide: true },
  { id: "invoice_number", label: "Invoice #", can_hide: false },
  { id: "due_date", label: "Due Date", can_hide: true },
  { id: "po_number", label: "P.O. No", can_hide: true },
  { id: "ship_via", label: "Ship Via", can_hide: true },
  { id: "sales_rep", label: "Sales Rep", can_hide: true },
  { id: "amount_due", label: "Amount Due", can_hide: false },
  { id: "age", label: "Days", can_hide: true },
];

function formatEntryDate(value) {
  if (!value) return "—";
  try {
    return format(parseISO(String(value).slice(0, 10)), "dd-MM-yy");
  } catch {
    return value;
  }
}

function formatAmount(value, currency) {
  const n = Number(value);
  if (Number.isNaN(n)) return "—";
  return formatCurrency(n, currency);
}

function formatAge(inv) {
  if (inv?.age_days !== null && inv?.age_days !== undefined) {
    return String(inv.age_days);
  }
  if (inv?.days_late !== null && inv?.days_late !== undefined) {
    return String(Math.max(0, Number(inv.days_late)));
  }
  return "—";
}

function columnHeaderLabel(col) {
  if (isReportCustomFieldColumn(col)) {
    return <ReportCustomFieldHeader col={col} compact truncate />;
  }
  return col.label;
}

function renderInvoiceCell(col, inv, workspaceId, currency) {
  if (isReportCustomFieldColumn(col)) {
    return <ReportCustomFieldCell col={col} row={inv} />;
  }

  switch (col.id) {
    case "date":
      return formatEntryDate(inv.invoice_date || inv.date);
    case "invoice_number":
      return (
        <InvoiceDrillLink
          invoiceId={inv.invoice_id}
          workspaceId={workspaceId}
          navigateToPage
          className="font-medium text-primary hover:underline"
        >
          {inv.invoice_number || inv.reference || "—"}
        </InvoiceDrillLink>
      );
    case "due_date":
      return formatEntryDate(inv.due_date);
    case "po_number":
      return inv.po_number || inv.po_no || "—";
    case "ship_via":
      return inv.ship_via || "—";
    case "sales_rep":
      return inv.sales_rep || "—";
    case "amount_due": {
      const text = formatPeachtreeAmount(lineOpenBalance(inv));
      return (
        <span className="tabular-nums">
          {text === "\u00a0" ? "—" : text}
        </span>
      );
    }
    case "age": {
      const days = formatAge(inv);
      if (days === "—") return days;
      return <span className="tabular-nums text-slate-600">{days}</span>;
    }
    default:
      return "—";
  }
}

function isRightAligned() {
  return false;
}

function isCenterAligned(col) {
  return col.id !== "party" && col.id !== "customer";
}

function partyDisplayName(customer) {
  return (
    customer.customer_name || customer.customer_code || customer.customer_id
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

function renderCustomerPartyName(customer) {
  const label = formatPartyShortLabel(
    customer.customer_name,
    customer.customer_code,
  );

  return (
    <CustomerDrillLink
      customerId={customer.customer_id}
      className="block min-w-0 truncate text-sm font-semibold text-slate-900 no-underline hover:text-primary hover:underline"
      title={label}
    >
      {label}
    </CustomerDrillLink>
  );
}

function AgingReportBody({
  rows,
  loading,
  workspaceId,
  currency,
  visibleColumns,
  columnWidths,
  onColumnResize,
}) {
  const activeRows = filterActiveParties(rows, "invoices");
  const { total: grandTotal } = sumBucketTotals(activeRows);

  if (loading) {
    return (
      <div className="space-y-3 px-3 py-3 sm:px-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (activeRows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <Users className="mb-3 size-10 text-slate-300" strokeWidth={1.5} />
        <p className="text-sm font-medium text-slate-700">
          No outstanding receivables
        </p>
        <p className="mt-1 max-w-sm text-xs text-slate-500">
          All customer invoices are paid for the selected date, or no invoices
          match your filters.
        </p>
      </div>
    );
  }

  return (
    <AgingUnifiedDetailTable
      parties={activeRows}
      lineKey="invoices"
      partyColumnLabel="Customer"
      partyColumnKey="party"
      partyLabelSingular="customer"
      renderPartyCell={renderCustomerPartyName}
      visibleColumns={visibleColumns}
      renderColumnHeader={columnHeaderLabel}
      renderCell={renderInvoiceCell}
      isRightAligned={isRightAligned}
      isCenterAligned={isCenterAligned}
      workspaceId={workspaceId}
      currency={currency}
      variant="ledger"
      detailTotal={grandTotal}
      formatAmount={formatAmount}
      columnWidths={columnWidths}
      onColumnResize={onColumnResize}
      reportKey="customer_aging"
    />
  );
}

export function CustomerAgingReportPage() {
  const { id: workspaceId } = useParams();
  const user = useAuthStore((state) => state.user);
  const today = format(new Date(), "yyyy-MM-dd");
  const sheetRef = useRef(null);

  const [asOf, setAsOf] = useState(today);
  const [draftAsOf, setDraftAsOf] = useState(today);
  const [customerId, setCustomerId] = useState("");
  const [draftCustomerId, setDraftCustomerId] = useState("");
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState(null);

  const availableColumns = useMemo(() => {
    const exclude = new Set(EXCLUDE_COLUMN_IDS);
    const source = payload?.available_columns?.length
      ? payload.available_columns
      : FALLBACK_COLUMNS;
    return sortCustomerAgingReportColumns(
      source.filter((col) => !exclude.has(col.id)),
    );
  }, [payload?.available_columns]);

  const {
    allColumns,
    visibleColumns,
    toggleColumn,
    isColumnVisible,
  } = usePersistedReportColumns(
    workspaceId,
    "customer-aging",
    availableColumns,
    {
      excludeColumnIds: EXCLUDE_COLUMN_IDS,
      defaultHiddenColumnIds: DEFAULT_HIDDEN_COLUMN_IDS,
      normalizeColumnOrder: normalizeCustomerAgingColumnOrder,
      customFieldInsertBeforeId: "amount_due",
      columnsReady: payload != null,
    },
  );

  const agingTableColumns = useMemo(
    () => [{ id: "party" }, ...visibleColumns],
    [visibleColumns],
  );

  const { columnWidths, resizeColumn, resetColumnWidths } = useReportColumnWidths(
    "customer_aging",
    agingTableColumns,
  );

  const load = useCallback(() => {
    setLoading(true);
    const params = { as_of_date: asOf };
    if (customerId) params.customer_id = customerId;

    reportsApi
      .customerAging(params)
      .then((res) => setPayload(res.data?.data || null))
      .catch((err) =>
        toast.error(
          err?.response?.data?.message || "Failed to load aged receivables",
        ),
      )
      .finally(() => setLoading(false));
  }, [asOf, customerId]);

  useEffect(() => {
    load();
  }, [load]);

  const currency = payload?.currency || "USD";
  const company = payload?.company || {};
  const rows = payload?.rows || [];
  const customers = payload?.customers || [];
  const printedAt = format(new Date(), "dd/MM/yyyy 'at' hh:mm:ss a");
  const fiscalYear = resolveFiscalYear(asOf, company);
  const generatedBy = user?.name || user?.full_name || null;
  const companyLogoUrl =
    company.logo_url ||
    company.logo ||
    company.logoUrl ||
    company.image_url ||
    null;

  const activeRows = useMemo(
    () => filterActiveParties(rows, "invoices"),
    [rows],
  );
  const invoiceCount = useMemo(
    () => activeRows.reduce((sum, row) => sum + (row.invoices?.length || 0), 0),
    [activeRows],
  );

  const applyFilters = () => {
    setAsOf(draftAsOf);
    setCustomerId(draftCustomerId);
  };

  const resetFilters = () => {
    setDraftAsOf(today);
    setDraftCustomerId("");
    setAsOf(today);
    setCustomerId("");
  };

  const reportFilename = useMemo(
    () => buildReportFilename("aged-receivables", company.name, asOf),
    [company.name, asOf],
  );

  const runReportPrint = useCallback(
    async (printMode) => {
      if (!payload) return;
      const node = sheetRef.current;
      if (!node) return;
      try {
        await (printMode === "pdf" ? downloadReportPdf : printReportSheet)(node, {
          title: reportFilename,
          rootClass: "aged-receivables-report-root",
        });
        if (printMode === "pdf") {
          toast.success("Save as PDF", {
            description: 'In the print dialog, set Destination to "Save as PDF".',
            duration: 5000,
          });
        }
      } catch (err) {
        toast.error(err?.message || "Could not open print preview");
      }
    },
    [payload, reportFilename],
  );

  const handleExport = () => {
    if (!payload?.rows?.length) return;
    try {
      downloadAgingReportCsv({
        filename: `aged-receivables-${asOf}.csv`,
        reportTitle: "Aged Receivables",
        companyName: company.name,
        asOf,
        currency,
        parties: payload.rows,
        lineKey: "invoices",
        getPartyName: partyDisplayName,
        getPartyCode: (c) => c.customer_code || "",
        getDocumentNumber: (line) => line.invoice_number || "",
        getDocumentDate: (line) => line.invoice_date || line.date,
        getDueDate: (line) => line.due_date,
        getReference: (line) => line.po_number || line.po_no || "",
      });
      toast.success("Export downloaded");
    } catch {
      toast.error("Failed to export report");
    }
  };

  const showReport = Boolean(payload);
  const scopeLabel = customerId
    ? `Filtered customer · As of ${formatEntryDate(asOf)}`
    : `All customers · As of ${formatEntryDate(asOf)}`;

  return (
    <ReportPageShell
      workspaceId={workspaceId}
      title="Aged Receivables"
      compact
      hideTitle
      standardReportKey="customer_aging"
      actions={
        <ReportActionBar
          leading={
            <ReportTableToolbar
              columns={allColumns}
              isColumnVisible={isColumnVisible}
              onToggle={toggleColumn}
              onResetColumnWidths={resetColumnWidths}
            />
          }
          onExport={handleExport}
          exportDisabled={!showReport || loading || !rows.length}
          onPdf={() => runReportPrint("pdf")}
          pdfDisabled={!showReport || loading}
          onPrint={() => runReportPrint("print")}
          printDisabled={!showReport || loading}
        />
      }
      contentClassName="w-full max-w-none space-y-2 aged-receivables-report-root"
    >
      <div className="no-print">
        <ReportDateFilter
          compact
          mode="asOf"
          asOf={draftAsOf}
          onAsOfChange={setDraftAsOf}
          onApply={applyFilters}
          onReset={resetFilters}
          loading={loading}
          currency={currency}
        >
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
            <div className="w-[13.5rem] shrink-0 sm:w-[15rem]">
              <Label className="sr-only">Customer</Label>
              <SearchableCombobox
                value={draftCustomerId}
                onValueChange={(v) => setDraftCustomerId(v || "")}
                options={customers.map((c) => ({
                  value: String(c.id),
                  label: `${c.customer_code ? `${c.customer_code} — ` : ""}${c.name}`,
                  keywords: [c.customer_code, c.name],
                }))}
                allowNone
                noneLabel="All customers"
                placeholder="All customers"
                searchPlaceholder="Search customer…"
                emptyText="No matching customer."
                triggerClassName="h-8 w-full bg-background text-xs"
              />
            </div>
          </div>
        </ReportDateFilter>
      </div>

      {loading && !payload ? (
        <Skeleton className="h-[640px] w-full rounded-lg" />
      ) : showReport ? (
        <div
          ref={sheetRef}
          className="report-print-sheet general-ledger-print aged-receivables-print aged-aging-print w-full min-w-0 max-w-full rounded-lg border border-slate-200 bg-white print:rounded-none print:border-0"
        >
          <div className="general-ledger-statement bg-white">
            <LedgerStatementPrintHeader
              companyName={company.name}
              logoUrl={companyLogoUrl}
              periodFrom={asOf}
              periodTo={asOf}
              currency={currency}
              fiscalYear={fiscalYear}
              generatedBy={generatedBy}
              printedAt={printedAt}
              reportTitle="Aged Receivables"
              scopeLabel={scopeLabel}
              activityLabel={`${invoiceCount} open invoice${invoiceCount === 1 ? "" : "s"}`}
            />

            <AgingReportBody
              rows={rows}
              loading={loading && !rows.length}
              workspaceId={workspaceId}
              currency={currency}
              visibleColumns={visibleColumns}
              columnWidths={columnWidths}
              onColumnResize={resizeColumn}
            />

            {rows.length > 0 ? <LedgerStatementPrintFooter /> : null}
          </div>
        </div>
      ) : null}
    </ReportPageShell>
  );
}
