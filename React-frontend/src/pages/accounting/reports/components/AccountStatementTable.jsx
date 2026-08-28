import { cn } from "@/lib/utils";
import { getReportColumnLayout } from "../lib/report-column-layout";
import { ReportJournalSourceDrillLink } from "./ReportJournalSourceDrillLink";
import { getReportDisplayReference } from "../report-reference";
import { formatStatementNarrative } from "../lib/statement-narrative";
import { formatLegacyShortDate } from "./PartyLedgerReport";
import { formatPeachtreeAmount } from "./GeneralLedgerTable";
import { ReportColumnResizeHandle } from "./ReportColumnResizeHandle";
import { Skeleton } from "@/components/ui/skeleton";
import { reportType } from "./report-typography";

const STATEMENT_COLUMN_MIN_PERCENT = {
  date: 5,
  reference: 10,
  description: 14,
  debit: 7,
  credit: 7,
  balance: 7.5,
};

function isMoneyCol(col) {
  return ["debit", "credit", "balance"].includes(col.id);
}

function computeStatementColumnPercents(visibleColumns, widthById) {
  const entries = visibleColumns.map((col) => {
    const weight = Number(widthById[col.id]) || 1;
    const floor = STATEMENT_COLUMN_MIN_PERCENT[col.id] ?? 3;
    return { id: col.id, weight, floor };
  });

  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0) || 1;
  let percents = entries.map((entry) => ({
    id: entry.id,
    pct: Math.max((entry.weight / totalWeight) * 100, entry.floor),
  }));

  let total = percents.reduce((sum, entry) => sum + entry.pct, 0);
  if (total > 100) {
    percents = percents.map((entry) => ({
      ...entry,
      pct: (entry.pct / totalWeight) * 100,
    }));
    total = 100;
  }

  const slack = 100 - total;
  if (slack > 0.01) {
    const description = percents.find((entry) => entry.id === "description");
    if (description) description.pct += slack;
  }

  return Object.fromEntries(
    percents.map((entry) => [entry.id, `${entry.pct.toFixed(4)}%`]),
  );
}

function formatAmount(
  value,
  { bold = false, workspaceId, row } = {},
) {
  const text = formatPeachtreeAmount(value);
  const className = cn(
    "tabular-nums text-slate-900 font-normal hover:underline underline-offset-2",
    bold && "font-semibold",
  );
  if (text === "\u00a0" || !workspaceId || !row) {
    return (
      <span className={cn("tabular-nums text-slate-900", bold && "font-semibold")}>
        {text}
      </span>
    );
  }
  return (
    <ReportJournalSourceDrillLink
      workspaceId={workspaceId}
      row={row}
      label={text}
      className={className}
    />
  );
}

function renderCell(col, entry, workspaceId, account) {
  switch (col.id) {
    case "date":
      return (
        <span className="tabular-nums text-slate-700">
          {formatLegacyShortDate(entry.entry_date)}
        </span>
      );
    case "reference":
      return (
        <ReportJournalSourceDrillLink
          workspaceId={workspaceId}
          row={entry}
          label={getReportDisplayReference(entry)}
          className="account-statement-ref whitespace-nowrap text-slate-700 hover:underline"
        />
      );
    case "description":
      return (
        <div className="min-w-0 break-words whitespace-normal text-slate-700">
          {formatStatementNarrative(entry, account)}
        </div>
      );
    case "debit":
      return formatAmount(entry.debit, {
        workspaceId,
        row: entry,
      });
    case "credit":
      return formatAmount(entry.credit, {
        workspaceId,
        row: entry,
      });
    case "balance":
      return formatAmount(entry.running_balance ?? entry.balance, {
        bold: true,
        workspaceId,
        row: entry,
      });
    default:
      return "\u00a0";
  }
}

function statementThClass(col, resizable) {
  return cn(
    resizable && "group/th relative",
    "h-8 border-b border-slate-200 bg-slate-50 px-2 py-1.5 align-middle text-xs font-bold uppercase tracking-[0.08em] text-slate-900 whitespace-nowrap print:static",
    isMoneyCol(col) && "text-right",
    col.id === "description" && "text-left",
  );
}

function statementTdClass(col, extra) {
  return cn(
    cn("px-2 py-1 align-top leading-snug", reportType.statementBody),
    isMoneyCol(col) && "text-right tabular-nums whitespace-nowrap",
    col.id === "date" && "whitespace-nowrap tabular-nums",
    col.id === "description" && "max-w-0",
    col.id === "balance" && "pr-3",
    extra,
  );
}

export function AccountStatementTable({
  account,
  rows,
  loading,
  workspaceId,
  period,
  currency,
  openingBalance,
  closingBalance,
  totalDebit,
  totalCredit,
  visibleColumns,
  emptyMessage = "No transactions in this period.",
  columnWidths = null,
  onColumnResize = null,
  reportKey = "account_statement",
}) {
  const colCount = visibleColumns.length;
  const resizable = typeof onColumnResize === "function";
  const resolvedWidths = visibleColumns.map((col) => {
    const layout = getReportColumnLayout(reportKey, col.id);
    const raw = columnWidths?.[col.id];
    const width = Number.isFinite(Number(raw)) ? Number(raw) : layout.defaultWidth;
    return Math.min(layout.maxWidth, Math.max(layout.minWidth, Math.round(width)));
  });
  const widthById = Object.fromEntries(
    visibleColumns.map((col, index) => [col.id, resolvedWidths[index]]),
  );
  const fitTableToViewport = resizable;
  const totalColumnWidth =
    resolvedWidths.reduce((sum, width) => sum + width, 0) || 1;
  const columnPercentById = fitTableToViewport
    ? computeStatementColumnPercents(visibleColumns, widthById)
    : null;
  const columnPercent = (colId) =>
    columnPercentById?.[colId] ??
    `${((widthById[colId] / totalColumnWidth) * 100).toFixed(4)}%`;

  return (
    <div
      className={cn(
        "bg-white px-3 py-2 print:px-4 print:py-2 sm:px-4",
        resizable && "w-full min-w-0 max-w-full overflow-x-auto print:overflow-visible",
      )}
    >
      <table
        className="general-ledger-table w-full table-fixed border-collapse font-sans text-sm leading-snug text-slate-700"
        data-print-table
      >
        <colgroup>
          {visibleColumns.map((col) => (
            <col
              key={col.id}
              style={
                resizable
                  ? { width: columnPercent(col.id) }
                  : { width: `${((widthById[col.id] / totalColumnWidth) * 100).toFixed(2)}%` }
              }
            />
          ))}
        </colgroup>
        <thead className="bg-slate-50">
          <tr>
            {visibleColumns.map((col) => {
              const layout = getReportColumnLayout(reportKey, col.id);
              return (
                <th
                  key={col.id}
                  className={statementThClass(col, resizable)}
                  title={
                    resizable
                      ? `${col.label || col.id} — drag the right edge to resize`
                      : col.label || undefined
                  }
                >
                  <span className="block truncate pr-1.5">{col.label}</span>
                  {resizable ? (
                    <ReportColumnResizeHandle
                      columnKey={col.id}
                      width={widthById[col.id]}
                      minWidth={layout.minWidth}
                      maxWidth={layout.maxWidth}
                      onDrag={(columnKey, next) =>
                        onColumnResize(columnKey, next, { persist: false })
                      }
                      onDragEnd={(columnKey, next) =>
                        onColumnResize(columnKey, next, { persist: true })
                      }
                    />
                  ) : null}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                <td colSpan={colCount} className="px-2 py-2">
                  <Skeleton className="h-4 w-full" />
                </td>
              </tr>
            ))
          ) : (
            <>
              <tr className="gl-balance-forward-row align-top">
                {visibleColumns.map((col) => {
                  if (col.id === "date") {
                    return (
                      <td
                        key={col.id}
                        className={statementTdClass(col, "whitespace-nowrap pt-0.5 text-sm tabular-nums")}
                      >
                        {formatLegacyShortDate(period.from)}
                      </td>
                    );
                  }
                  if (col.id === "reference") {
                    return (
                      <td
                        key={col.id}
                        className={statementTdClass(col, "whitespace-nowrap font-semibold")}
                      >
                        Balance Brought Forward
                      </td>
                    );
                  }
                  if (col.id === "balance") {
                    return (
                      <td key={col.id} className={statementTdClass(col)}>
                        {formatAmount(openingBalance, { bold: true })}
                      </td>
                    );
                  }
                  return <td key={col.id} className={statementTdClass(col)} />;
                })}
              </tr>

              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={colCount}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                rows.map((entry) => {
                  const rowKey =
                    entry.line_id != null
                      ? `line-${entry.line_id}`
                      : `${entry.journal_entry_id}-${entry.entry_date}-${entry.debit}-${entry.credit}`;
                  return (
                    <tr key={rowKey} className="gl-entry-row align-top hover:bg-sky-50/50">
                      {visibleColumns.map((col) => (
                        <td key={col.id} className={statementTdClass(col)}>
                          {renderCell(col, entry, workspaceId, account)}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}

              <tr className="gl-account-total align-top font-semibold text-slate-900">
                {visibleColumns.map((col) => {
                  if (col.id === "date") {
                    return (
                      <td key={col.id} className={statementTdClass(col, "whitespace-nowrap")}>
                        {formatLegacyShortDate(period.to)}
                      </td>
                    );
                  }
                  if (col.id === "reference") {
                    return (
                      <td
                        key={col.id}
                        className={statementTdClass(col, "whitespace-nowrap font-semibold")}
                      >
                        Ending balance
                      </td>
                    );
                  }
                  if (col.id === "debit") {
                    return (
                      <td key={col.id} className={statementTdClass(col)}>
                        {formatAmount(totalDebit)}
                      </td>
                    );
                  }
                  if (col.id === "credit") {
                    return (
                      <td key={col.id} className={statementTdClass(col)}>
                        {formatAmount(totalCredit)}
                      </td>
                    );
                  }
                  if (col.id === "balance") {
                    return (
                      <td key={col.id} className={statementTdClass(col)}>
                        {formatAmount(closingBalance, { bold: true })}
                      </td>
                    );
                  }
                  return <td key={col.id} className={statementTdClass(col)} />;
                })}
              </tr>
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}
