import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import { format, parseISO } from "date-fns";
import { Wallet } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { reportsApi } from "./api/reports.api";
import {
  defaultAsOfDate,
  glPeriodThroughAsOf,
} from "./account-balances.lib";
import { ReportPageShell } from "./components/ReportPageShell";
import { ReportDateFilter } from "./components/ReportDateFilter";
import { ReportTableToolbar } from "./components/ReportTableToolbar";
import { ReportActionBar } from "./components/ReportActionBar";
import { ReportFilterTotalsSummary } from "./components/ReportFilterTotalsSummary";
import { AccountBalancesStatement } from "./components/AccountBalancesStatement";
import {
  loadPersistedAccountSelection,
  persistAccountSelection,
  ReportAccountMultiPicker,
} from "./components/ReportAccountMultiPicker";
import { usePersistedReportColumns } from "./hooks/usePersistedReportColumns";
import { Label } from "@/components/ui/label";
import {
  buildReportFilename,
  downloadReportPdf,
  printReportSheet,
} from "./report-print.lib";
import { Skeleton } from "@/components/ui/skeleton";
import { sortRowsByAccountCode } from "./report-account-sort";

const COLUMN_DEFS = [
  { id: "code", label: "Account Code", can_hide: false },
  { id: "name", label: "Account Name", can_hide: false },
  { id: "account_type", label: "Account Type", can_hide: true },
  { id: "normal_balance", label: "Normal Balance", can_hide: true },
  { id: "current_balance", label: "Current Balance", can_hide: false },
  { id: "debit_total", label: "Debit Total", can_hide: true },
  { id: "credit_total", label: "Credit Total", can_hide: true },
];

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

export function AccountBalancesReportPage() {
  const { id: workspaceId } = useParams();
  const user = useAuthStore((s) => s.user);
  const sheetRef = useRef(null);

  const [asOf, setAsOf] = useState(defaultAsOfDate());
  const [draftAsOf, setDraftAsOf] = useState(defaultAsOfDate());
  const [selectedAccountIds, setSelectedAccountIds] = useState(() =>
    loadPersistedAccountSelection(workspaceId),
  );
  const [draftAccountIds, setDraftAccountIds] = useState(() =>
    loadPersistedAccountSelection(workspaceId),
  );
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingPicker, setLoadingPicker] = useState(true);
  const [data, setData] = useState(null);
  const [exporting, setExporting] = useState(false);

  const glPeriod = useMemo(() => glPeriodThroughAsOf(asOf), [asOf]);
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
  const fiscalYear = resolveFiscalYear(asOf, company);

  const rows = useMemo(
    () => sortRowsByAccountCode(data?.rows || []),
    [data?.rows],
  );
  const summary = data?.summary || {};

  const {
    allColumns,
    visibleColumns,
    toggleColumn,
    isColumnVisible,
  } = usePersistedReportColumns(
    workspaceId,
    "account-balances",
    COLUMN_DEFS,
  );

  const loadPicker = useCallback(() => {
    setLoadingPicker(true);
    return reportsApi
      .accountBalances({ as_of: draftAsOf, account_ids: [] })
      .then((res) => {
        const payload = res.data?.data || {};
        setAccounts(payload.accounts || []);
      })
      .catch((err) => {
        toast.error(err?.response?.data?.message || "Failed to load accounts");
        setAccounts([]);
      })
      .finally(() => setLoadingPicker(false));
  }, [draftAsOf]);

  useEffect(() => {
    loadPicker();
  }, [loadPicker]);

  const runReport = useCallback((nextAsOf, nextAccountIds) => {
    if (!nextAccountIds?.length) {
      setData(null);
      return Promise.resolve();
    }

    setLoading(true);
    return reportsApi
      .accountBalances({
        as_of: nextAsOf,
        account_ids: nextAccountIds,
      })
      .then((res) => {
        const payload = res.data?.data || null;
        setData(payload);
        if (payload?.accounts?.length) {
          setAccounts(payload.accounts);
        }
      })
      .catch((err) => {
        toast.error(
          err?.response?.data?.message || "Failed to load account balances",
        );
        setData(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedAccountIds.length > 0) {
      runReport(asOf, selectedAccountIds);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- initial restore only

  const applyFilters = () => {
    setAsOf(draftAsOf);
    setSelectedAccountIds(draftAccountIds);
    persistAccountSelection(workspaceId, draftAccountIds);
    if (!draftAccountIds.length) {
      toast.message("Select at least one account to run the report");
      setData(null);
      return;
    }
    runReport(draftAsOf, draftAccountIds);
  };

  const resetFilters = () => {
    const nextDate = defaultAsOfDate();
    setDraftAsOf(nextDate);
    setDraftAccountIds([]);
  };

  const showReport = Boolean(selectedAccountIds.length && data);

  const reportFilename = useMemo(
    () => buildReportFilename("account-balances", companyName, asOf),
    [companyName, asOf],
  );

  const runReportPrint = useCallback(
    async (mode) => {
      const node = sheetRef.current;
      if (!node) return;
      try {
        await (mode === "pdf" ? downloadReportPdf : printReportSheet)(node, {
          title: reportFilename,
          rootClass: "account-balances-report-root",
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

  const handleExport = useCallback(async () => {
    if (!selectedAccountIds.length || !data) {
      toast.error("Run the report before exporting");
      return;
    }
    setExporting(true);
    try {
      const res = await reportsApi.accountBalancesExport({
        as_of: asOf,
        account_ids: selectedAccountIds,
        format: "excel",
      });
      const blob = new Blob([res.data], {
        type: "application/vnd.ms-excel",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `account-balances-${asOf}.xls`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Export failed");
    } finally {
      setExporting(false);
    }
  }, [asOf, data, selectedAccountIds]);

  return (
    <ReportPageShell
      workspaceId={workspaceId}
      title="Account Balances"
      subtitle="Monitor posted balances for selected chart of accounts as of a specific date."
      compact
      hideTitle
      contentClassName="w-full max-w-none space-y-2 account-balances-report-root general-ledger-report-root"
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
          exportDisabled={exporting || loading || !showReport}
          onPdf={() => runReportPrint("pdf")}
          pdfDisabled={loading || !showReport}
          onPrint={() => runReportPrint("print")}
          printDisabled={loading || !showReport}
        />
      }
    >
      <div className="no-print">
        <ReportDateFilter
          compact
          mode="asOf"
          asOf={draftAsOf}
          onAsOfChange={(v) => setDraftAsOf(v)}
          onApply={applyFilters}
          onReset={resetFilters}
          loading={loading || loadingPicker}
          currency={currency}
        >
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
            <div className="w-[13.5rem] shrink-0 sm:w-[15rem]">
              <Label className="sr-only">Accounts</Label>
              <ReportAccountMultiPicker
                accounts={accounts}
                selectedIds={draftAccountIds}
                onChange={setDraftAccountIds}
                disabled={loadingPicker}
                inline
              />
            </div>
            {showReport ? (
              <ReportFilterTotalsSummary
                recordCount={summary.account_count ?? rows.length}
                totals={{
                  total_debit: summary.total_debit ?? 0,
                  total_credit: summary.total_credit ?? 0,
                }}
                currency={currency}
              />
            ) : null}
          </div>
        </ReportDateFilter>
      </div>

      {loading && !data ? (
        <Skeleton className="h-[640px] w-full rounded-lg" />
      ) : !selectedAccountIds.length ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-6 py-16 text-center">
          <Wallet className="mx-auto size-10 text-slate-400" />
          <h3 className="mt-4 text-base font-semibold text-slate-900">
            Select accounts to review
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            Choose one or more accounts, set an as-of date, then apply filters.
          </p>
        </div>
      ) : showReport ? (
        <div
          ref={sheetRef}
          className="report-print-sheet general-ledger-print account-balances-print w-full min-w-0 max-w-full rounded-lg border border-slate-200 bg-white print:rounded-none print:border-0"
        >
          <AccountBalancesStatement
            companyName={companyName}
            logoUrl={companyLogoUrl}
            asOf={asOf}
            currency={currency}
            fiscalYear={fiscalYear}
            generatedBy={generatedBy}
            printedAt={printedAt}
            rows={rows}
            visibleColumns={visibleColumns}
            workspaceId={workspaceId}
            glPeriod={glPeriod}
            summary={summary}
            loading={loading}
          />
        </div>
      ) : null}
    </ReportPageShell>
  );
}
