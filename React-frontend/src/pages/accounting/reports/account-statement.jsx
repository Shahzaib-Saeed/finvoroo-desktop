import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import { format, parseISO } from "date-fns";
import { FileText, Search, X } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { reportsApi } from "./api/reports.api";
import { defaultReportPeriod } from "./constants";
import { ReportPageShell } from "./components/ReportPageShell";
import { ReportDateFilter } from "./components/ReportDateFilter";
import { AccountStatementStatement } from "./components/AccountStatementStatement";
import { useReportSearchParams } from "./hooks/useReportSearchParams";
import { usePersistedReportColumns } from "./hooks/usePersistedReportColumns";
import { useReportColumnWidths } from "./hooks/useReportColumnWidths";
import { ReportTableToolbar } from "./components/ReportTableToolbar";
import { ReportActionBar } from "./components/ReportActionBar";
import { ReportFilterTotalsSummary } from "./components/ReportFilterTotalsSummary";
import { STATEMENT_COLUMNS } from "./constants/report-columns";
import {
  buildReportFilename,
  downloadReportPdf,
  printReportSheet,
} from "./report-print.lib";
import { sortRowsByAccountCode } from "./report-account-sort";
import { getReportDisplayReference } from "./report-reference";
import { formatStatementNarrative } from "./lib/statement-narrative";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
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

export function AccountStatementReportPage() {
  const { id: workspaceId } = useParams();
  const user = useAuthStore((s) => s.user);
  const [period, setPeriod] = useState(defaultReportPeriod());
  const [draft, setDraft] = useState(defaultReportPeriod());
  const [accountId, setAccountId] = useState("");
  const [draftAccountId, setDraftAccountId] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [data, setData] = useState(null);
  const [accountsMeta, setAccountsMeta] = useState(null);
  const requestSeq = useRef(0);
  const sheetRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setAccountsLoading(true);
    reportsApi
      .accountStatement({ from: period.from, to: period.to })
      .then((res) => {
        if (cancelled) return;
        const payload = res.data?.data;
        setAccountsMeta(payload || null);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load accounts");
      })
      .finally(() => {
        if (!cancelled) setAccountsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period.from, period.to]);

  const applyUrlParams = useCallback(({ accountId: urlAccountId, period: urlPeriod }) => {
    setPeriod(urlPeriod);
    setDraft(urlPeriod);
    if (urlAccountId) {
      setAccountId(urlAccountId);
      setDraftAccountId(urlAccountId);
    }
  }, []);

  useReportSearchParams({ onApply: applyUrlParams });

  const loadStatement = useCallback(() => {
    if (!accountId) {
      setData(null);
      setLoading(false);
      return;
    }

    const seq = ++requestSeq.current;
    const requestedAccountId = accountId;
    setLoading(true);

    reportsApi
      .accountStatement({
        from: period.from,
        to: period.to,
        account_id: requestedAccountId,
      })
      .then((res) => {
        if (seq !== requestSeq.current) return;
        if (String(accountId) !== String(requestedAccountId)) return;
        setData(res.data?.data || null);
      })
      .catch((err) => {
        if (seq !== requestSeq.current) return;
        toast.error(err?.response?.data?.message || "Failed to load account statement");
      })
      .finally(() => {
        if (seq === requestSeq.current) setLoading(false);
      });
  }, [period, accountId]);

  useEffect(() => {
    loadStatement();
  }, [loadStatement]);

  const currency =
    data?.base_currency || accountsMeta?.base_currency || "USD";
  const company = data?.company || accountsMeta?.company || {};
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
    () => sortRowsByAccountCode(accountsMeta?.accounts || data?.accounts || []),
    [accountsMeta?.accounts, data?.accounts],
  );

  const {
    allColumns,
    visibleColumns,
    toggleColumn,
    isColumnVisible,
  } = usePersistedReportColumns(
    workspaceId,
    "account-statement",
    STATEMENT_COLUMNS,
  );

  const { columnWidths, resizeColumn, resetColumnWidths } = useReportColumnWidths(
    "account_statement",
    visibleColumns,
  );

  const statementReady =
    Boolean(accountId) &&
    data?.account != null &&
    String(data.account.id) === String(accountId);

  const selectedAccount = useMemo(() => {
    if (statementReady) return data.account;
    return accounts.find((a) => String(a.id) === String(accountId)) || null;
  }, [statementReady, data?.account, accounts, accountId]);

  const lines = useMemo(() => {
    if (!statementReady) return [];
    return (data?.lines || []).filter(
      (row) =>
        row.account_id == null || String(row.account_id) === String(accountId),
    );
  }, [statementReady, data?.lines, accountId]);

  const searchTerm = searchInput.trim().toLowerCase();
  const filteredLines = useMemo(() => {
    if (!searchTerm) return lines;
    return lines.filter((row) => {
      const haystack = [
        getReportDisplayReference(row),
        formatStatementNarrative(row, selectedAccount),
        row.party_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(searchTerm);
    });
  }, [lines, searchTerm, selectedAccount]);

  const openingBalance = statementReady ? Number(data?.opening_balance) || 0 : 0;
  const closingBalance =
    statementReady && data?.closing_balance != null
      ? Number(data.closing_balance)
      : openingBalance;

  const totals = useMemo(
    () =>
      filteredLines.reduce(
        (acc, row) => ({
          totalDebit: acc.totalDebit + (Number(row.debit) || 0),
          totalCredit: acc.totalCredit + (Number(row.credit) || 0),
        }),
        { totalDebit: 0, totalCredit: 0 },
      ),
    [filteredLines],
  );

  const statementTotals = useMemo(
    () => ({
      total_debit: totals.totalDebit,
      total_credit: totals.totalCredit,
    }),
    [totals.totalDebit, totals.totalCredit],
  );

  const reportFilename = useMemo(
    () =>
      buildReportFilename(
        selectedAccount
          ? `account-statement-${selectedAccount.code}`
          : "account-statement",
        companyName,
        period.to,
      ),
    [selectedAccount, companyName, period.to],
  );

  const applyFilters = () => {
    if (!draftAccountId) {
      toast.error("Select an account to view its statement");
      return;
    }
    setPeriod({ ...draft });
    setAccountId(draftAccountId);
    setSearchInput("");
  };

  const resetFilters = () => {
    const initial = defaultReportPeriod();
    setDraft(initial);
    setPeriod(initial);
    setDraftAccountId("");
    setAccountId("");
    setSearchInput("");
    setData(null);
  };

  const runReportPrint = useCallback(
    async (mode) => {
      const node = sheetRef.current;
      if (!node) return;
      try {
        await (mode === "pdf" ? downloadReportPdf : printReportSheet)(node, {
          title: reportFilename,
          rootClass: "account-statement-report-root",
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

  const showStatement = Boolean(accountId && statementReady);

  return (
    <ReportPageShell
      workspaceId={workspaceId}
      title="Account Statement"
      subtitle="Opening balance, period activity, and closing balance for one GL account."
      compact
      hideTitle
      standardReportKey="account_statement"
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
          onPdf={() => runReportPrint("pdf")}
          pdfDisabled={!showStatement || loading}
          onPrint={() => runReportPrint("print")}
          printDisabled={!showStatement || loading}
        />
      }
      contentClassName="w-full max-w-none space-y-2 account-statement-report-root general-ledger-report-root"
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
          loading={loading || accountsLoading}
          currency={currency}
        >
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
            <div className="w-[13.5rem] shrink-0 sm:w-[15rem]">
              <Label className="sr-only">Account</Label>
              <SearchableCombobox
                value={draftAccountId}
                onValueChange={(v) => setDraftAccountId(v || "")}
                options={accounts.map((a) => ({
                  value: String(a.id),
                  label: `${a.code} — ${a.name}`,
                  keywords: [a.code, a.name],
                }))}
                allowNone={false}
                placeholder="Select account…"
                searchPlaceholder="Search account…"
                emptyText="No matching account."
                triggerClassName="h-8 w-full bg-background text-xs"
              />
            </div>
            {showStatement ? (
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
                      onClick={() => setSearchInput("")}
                    >
                      <X className="size-3.5 text-muted-foreground/70 hover:text-foreground" />
                    </Button>
                  ) : null}
                </div>
                <ReportFilterTotalsSummary
                  recordCount={filteredLines.length}
                  totals={statementTotals}
                  currency={currency}
                />
              </>
            ) : null}
          </div>
        </ReportDateFilter>
      </div>

      {accountsLoading && !accounts.length ? (
        <Skeleton className="h-[640px] w-full rounded-lg" />
      ) : !accountId ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-6 py-16 text-center">
          <FileText className="mx-auto size-10 text-slate-400" />
          <h3 className="mt-4 text-base font-semibold text-slate-900">
            Choose one account
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            Account Statement shows one account at a time — like a bank statement
            for Cash, a bank account, or any GL account. To review every account
            together, open General Ledger.
          </p>
        </div>
      ) : loading && !statementReady ? (
        <Skeleton className="h-[640px] w-full rounded-lg" />
      ) : showStatement ? (
        <div
          ref={sheetRef}
          className="report-print-sheet general-ledger-print account-statement-print w-full min-w-0 max-w-full rounded-lg border border-slate-200 bg-white print:rounded-none print:border-0"
        >
          <AccountStatementStatement
            companyName={companyName}
            logoUrl={companyLogoUrl}
            periodFrom={period.from}
            periodTo={period.to}
            currency={currency}
            fiscalYear={fiscalYear}
            generatedBy={generatedBy}
            printedAt={printedAt}
            account={selectedAccount}
            rows={filteredLines}
            loading={loading}
            workspaceId={workspaceId}
            period={period}
            visibleColumns={visibleColumns}
            openingBalance={openingBalance}
            closingBalance={closingBalance}
            totalDebit={totals.totalDebit}
            totalCredit={totals.totalCredit}
            lineCount={filteredLines.length}
            columnWidths={columnWidths}
            onColumnResize={resizeColumn}
            reportKey="account_statement"
          />
        </div>
      ) : null}
    </ReportPageShell>
  );
}
