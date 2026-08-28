import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

import { reportsApi } from "./api/reports.api";
import { defaultReportPeriod, formatCurrency } from "./constants";
import { TRIAL_BALANCE_COLUMNS } from "./constants/report-columns";

import { ReportPageShell } from "./components/ReportPageShell";
import { ReportDateFilter } from "./components/ReportDateFilter";
import { ReportAccountDrillLink } from "./components/ReportAccountDrillLink";
import { ReportTableToolbar } from "./components/ReportTableToolbar";
import { ReportActionBar } from "./components/ReportActionBar";
import { useReportDataGridTable } from "./hooks/useReportDataGridTable";
import { Button } from "@/components/ui/button";

import { DataGrid, DataGridContainer } from "@/components/ui/data-grid";
import { DataGridTableDnd } from "@/components/ui/data-grid-table-dnd";

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { sortRowsByAccountCode } from "./report-account-sort";

export function TrialBalanceReportPage() {
  const { id: workspaceId } = useParams();

  const [period, setPeriod] = useState(defaultReportPeriod());
  const [draft, setDraft] = useState(defaultReportPeriod());
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    reportsApi
      .trialBalance({ from: period.from, to: period.to })
      .then((res) => setData(res.data?.data || null))
      .catch((err) =>
        toast.error(err?.response?.data?.message || "Failed to load report"),
      )
      .finally(() => setLoading(false));
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  const currency = data?.base_currency || "USD";
  const rows = useMemo(
    () => sortRowsByAccountCode(data?.rows || []),
    [data?.rows],
  );

  const buildAllColumns = useCallback(
    () => [
      {
        id: "code",
        accessorKey: "code",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
            Account Code
          </span>
        ),
        cell: ({ row }) => (
          <ReportAccountDrillLink
            workspaceId={workspaceId}
            accountId={row.original.account_id}
            name={row.original.code || "—"}
            from={period.from}
            to={period.to}
            showIcon={false}
            className="font-mono text-xs hover:underline"
          />
        ),
        size: 110,
      },
      {
        id: "name",
        accessorKey: "name",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
            Account Description
          </span>
        ),
        cell: ({ row }) => (
          <div className="min-w-[260px] text-sm text-muted-foreground hover:text-foreground transition-colors truncate">
            <ReportAccountDrillLink
              workspaceId={workspaceId}
              accountId={row.original.account_id}
              name={row.original.name}
              from={period.from}
              to={period.to}
              showIcon={false}
              className="hover:underline decoration-muted-foreground/40 underline-offset-4"
            />
          </div>
        ),
      },
      {
        id: "balance_debit",
        accessorKey: "balance_debit",
        header: () => (
          <span className="block text-right text-xs font-semibold uppercase tracking-wider text-foreground">
            Debit
          </span>
        ),
        cell: ({ row }) => {
          const value = row.original.balance_debit;
          return (
            <span className="block text-right tabular-nums text-sm font-medium text-foreground">
              {value != null && Number(value) !== 0
                ? formatCurrency(value, currency)
                : "—"}
            </span>
          );
        },
        size: 160,
      },
      {
        id: "balance_credit",
        accessorKey: "balance_credit",
        header: () => (
          <span className="block text-right text-xs font-semibold uppercase tracking-wider text-foreground">
            Credit
          </span>
        ),
        cell: ({ row }) => {
          const value = row.original.balance_credit;
          return (
            <span className="block text-right tabular-nums text-sm font-medium text-foreground">
              {value != null && Number(value) !== 0
                ? formatCurrency(value, currency)
                : "—"}
            </span>
          );
        },
        size: 160,
      },
    ],
    [currency, workspaceId, period.from, period.to],
  );

  const {
    table,
    allColumns,
    toggleColumn,
    isColumnVisible,
    handleDragEnd,
  } = useReportDataGridTable(
    workspaceId,
    "trial-balance",
    TRIAL_BALANCE_COLUMNS,
    buildAllColumns,
    rows,
  );

  const balanced = data?.totals?.is_balanced ?? false;
  const variance = Math.abs(
    (data?.totals?.debit || 0) - (data?.totals?.credit || 0),
  );

  // Safe layout-date calculation block
  const endingDateLabel = useMemo(() => {
    const targetDate = data?.period?.to || period.to;
    if (!targetDate) return "—";
    try {
      return format(parseISO(targetDate), "dd/MM/yyyy");
    } catch {
      return targetDate;
    }
  }, [data?.period?.to, period.to]);

  return (
    <ReportPageShell
      workspaceId={workspaceId}
      title="Trial Balance"
      subtitle="Working ledger summary verifying mathematical equilibrium across matching entries."
      actions={
        <ReportActionBar
          leading={
            <ReportTableToolbar
              columns={allColumns}
              isColumnVisible={isColumnVisible}
              onToggle={toggleColumn}
            />
          }
          onPrint={() => window.print()}
        />
      }
      contentClassName="max-w-4xl mx-auto space-y-3"
    >
      <div className="no-print">
        <ReportDateFilter
          compact
          from={draft.from}
          to={draft.to}
          onFromChange={(v) => setDraft((p) => ({ ...p, from: v }))}
          onToChange={(v) => setDraft((p) => ({ ...p, to: v }))}
          onApply={() => setPeriod({ ...draft })}
          loading={loading}
          currency={currency}
        />
      </div>

      {/* LEDGER SHEET VIEW */}
      <div className="report-print-sheet bg-background border border-border p-8 md:p-12 rounded-xl shadow-sm relative overflow-hidden min-h-[450px]">
        {/* Strict Traditional Statement Header Block */}
        <div className="border-b border-border pb-6 mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Trial Balance Ledger
            </h2>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              As of period ending{" "}
              <span className="underline decoration-dotted">
                {endingDateLabel}
              </span>
            </p>
          </div>
          <div className="text-xs font-mono bg-muted/60 text-muted-foreground px-2.5 py-1 rounded border tracking-wider">
            Reporting Currency: {currency}
          </div>
        </div>

        {/* LOADING & DATA DISPLAY */}
        {loading && !data ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            <DataGrid
              table={table}
              recordCount={rows.length}
              isLoading={loading}
              tableLayout={{
                cellBorder: false,
              }}
            >
              <DataGridContainer>
                <ScrollArea className="border border-border/70 rounded-lg bg-background [&&_thead]:bg-muted/30">
                  <DataGridTableDnd handleDragEnd={handleDragEnd} />
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </DataGridContainer>
            </DataGrid>

            {/* INTEGRATED EXECUTIVE CLOSING TOTALS FOOTER */}
            {data?.totals && (
              <div className="mt-4 border-t border-border/80 pt-1">
                <div className="grid grid-cols-[110px_1fr_160px_160px] gap-4 px-4 py-3 bg-muted/5 font-bold text-sm items-center">
                  <span className="col-span-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    Total Adjusted Balance
                  </span>

                  <div className="text-right">
                    <span className="inline-block pb-1 border-b-4 border-double border-foreground text-foreground tabular-nums">
                      {formatCurrency(data.totals.debit, currency)}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="inline-block pb-1 border-b-4 border-double border-foreground text-foreground tabular-nums">
                      {formatCurrency(data.totals.credit, currency)}
                    </span>
                  </div>
                </div>

                {/* EXECUTIVE SYSTEM INTEGRITY CHECK */}
                <div
                  className={`mt-6 border rounded-lg p-4 bg-background transition-all ${
                    balanced
                      ? "border-emerald-500/20 shadow-[inset_3px_0_0_0_#10b981]"
                      : "border-destructive/30 shadow-[inset_3px_0_0_0_#ef4444]"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                        Double-Entry Integrity Check
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1 font-mono">
                        Net Trial Balance Variance should equal zero.
                      </p>
                    </div>
                    <div className="text-left sm:text-right w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0">
                      <div className="inline-flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${balanced ? "bg-emerald-500 animate-pulse" : "bg-destructive animate-ping"}`}
                        />
                        <span
                          className={`text-xs font-semibold uppercase tracking-wider ${balanced ? "text-emerald-600" : "text-destructive"}`}
                        >
                          {balanced
                            ? "System in Equilibrium"
                            : "Out of Balance / Unreconciled"}
                        </span>
                      </div>
                      {!balanced && (
                        <p className="text-xs text-destructive font-semibold font-mono mt-0.5">
                          Discrepancy: {formatCurrency(variance, currency)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ReportPageShell>
  );
}
