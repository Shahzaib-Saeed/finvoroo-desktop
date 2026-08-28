import {
  LedgerStatementPrintFooter,
  LedgerStatementPrintHeader,
} from "./GeneralLedgerStatement";
import { ReportGeneralLedgerDrillLink } from "./ReportGeneralLedgerDrillLink";
import { formatBsDate } from "./BalanceSheetStatement";
import { formatPeachtreeAmount } from "./GeneralLedgerTable";
import { STATEMENT_AMOUNT_COL, reportType } from "./report-typography";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function columnLabel(col) {
  switch (col.id) {
    case "code":
      return "Code";
    case "name":
      return "Account Name";
    case "account_type":
      return "Type";
    case "normal_balance":
      return "Normal";
    case "current_balance":
      return "Balance";
    case "debit_total":
      return "Debit";
    case "credit_total":
      return "Credit";
    default:
      return col.label || col.id;
  }
}

function isAmountColumn(colId) {
  return ["current_balance", "debit_total", "credit_total"].includes(colId);
}

function isCenterColumn(colId) {
  return ["account_type", "normal_balance"].includes(colId);
}

function amountTdClass(emphasize = false) {
  return cn(
    "px-2 py-1 text-right align-middle whitespace-nowrap",
    STATEMENT_AMOUNT_COL,
    emphasize && "font-semibold",
  );
}

function AmountText({ value, emphasize = false }) {
  const text = formatPeachtreeAmount(value);
  return (
    <span className={cn("block w-full text-right tabular-nums", emphasize && "font-semibold")}>
      {text === "\u00a0" ? "—" : text}
    </span>
  );
}

function bodyTdClass(extra) {
  return cn("px-2 py-1 align-middle leading-snug", reportType.statementBody, extra);
}

function thClass(col) {
  return cn(
    "border-b border-slate-900 px-2 py-2 align-middle text-xs font-bold uppercase tracking-[0.08em] text-slate-900 whitespace-nowrap",
    isAmountColumn(col.id) && "text-right",
    isCenterColumn(col.id) && "text-center",
  );
}

function columnWeight(colId) {
  switch (colId) {
    case "code":
      return 8;
    case "name":
      return 28;
    case "account_type":
      return 10;
    case "normal_balance":
      return 8;
    case "current_balance":
      return 12;
    case "debit_total":
      return 12;
    case "credit_total":
      return 12;
    default:
      return 8;
  }
}

function AccountBalancesTable({
  rows,
  visibleColumns,
  workspaceId,
  glPeriod,
  summary,
  loading,
}) {
  const colCount = visibleColumns.length;
  const totalWeight = visibleColumns.reduce(
    (sum, col) => sum + columnWeight(col.id),
    0,
  );

  return (
    <div className="w-full min-w-0 overflow-x-auto bg-white px-6 py-4 print:overflow-visible sm:px-8 sm:py-5">
      <table
        className="account-balances-table w-full table-fixed border-collapse text-sm leading-snug text-slate-700"
        data-print-table
      >
        <colgroup>
          {visibleColumns.map((col) => (
            <col
              key={col.id}
              style={{
                width: `${((columnWeight(col.id) / totalWeight) * 100).toFixed(2)}%`,
              }}
            />
          ))}
        </colgroup>
        <thead>
          <tr>
            {visibleColumns.map((col) => (
              <th key={col.id} className={thClass(col)}>
                <span
                  className={cn(
                    "block truncate pr-1",
                    isCenterColumn(col.id) && "text-center",
                    isAmountColumn(col.id) && "text-right",
                  )}
                >
                  {columnLabel(col)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}>
                <td colSpan={colCount} className="px-2 py-2">
                  <Skeleton className="h-4 w-full" />
                </td>
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td
                colSpan={colCount}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                No accounts selected or no data for this date.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.account_id}
                className="border-b border-slate-100 transition-colors hover:bg-slate-50/70 print:hover:bg-transparent"
              >
                {visibleColumns.map((col) => {
                  switch (col.id) {
                    case "code":
                      return (
                        <td key={col.id} className={bodyTdClass("whitespace-nowrap")}>
                          <ReportGeneralLedgerDrillLink
                            workspaceId={workspaceId}
                            accountId={row.account_id}
                            name={row.code || "—"}
                            from={glPeriod.from}
                            to={glPeriod.to}
                            showIcon={false}
                            className={cn(reportType.accountCode, "hover:text-slate-700 hover:underline")}
                          />
                        </td>
                      );
                    case "name":
                      return (
                        <td key={col.id} className={bodyTdClass("max-w-0")}>
                          <ReportGeneralLedgerDrillLink
                            workspaceId={workspaceId}
                            accountId={row.account_id}
                            name={row.name || "—"}
                            from={glPeriod.from}
                            to={glPeriod.to}
                            showIcon={false}
                            className="block truncate hover:text-slate-900 hover:underline"
                          />
                        </td>
                      );
                    case "account_type":
                      return (
                        <td key={col.id} className={bodyTdClass("text-center text-slate-600")}>
                          {row.account_type || "—"}
                        </td>
                      );
                    case "normal_balance":
                      return (
                        <td
                          key={col.id}
                          className={bodyTdClass("text-center capitalize text-slate-600")}
                        >
                          {row.normal_balance || "—"}
                        </td>
                      );
                    case "current_balance":
                      return (
                        <td key={col.id} className={amountTdClass(true)}>
                          <AmountText value={row.current_balance} emphasize />
                        </td>
                      );
                    case "debit_total":
                      return (
                        <td key={col.id} className={amountTdClass()}>
                          <AmountText value={row.debit_total} />
                        </td>
                      );
                    case "credit_total":
                      return (
                        <td key={col.id} className={amountTdClass()}>
                          <AmountText value={row.credit_total} />
                        </td>
                      );
                    default:
                      return (
                        <td key={col.id} className="px-2 py-0.5">
                          —
                        </td>
                      );
                  }
                })}
              </tr>
            ))
          )}
        </tbody>
        {!loading && rows.length > 0 && summary ? (
          <tfoot>
            <tr className="border-t-[3px] border-double border-slate-900 font-semibold text-slate-900">
              {visibleColumns.reduce((cells, col) => {
                if (!isAmountColumn(col.id)) {
                  if (cells.some((cell) => cell.key === "totals-label")) {
                    return cells;
                  }
                  const labelSpan = visibleColumns.filter(
                    (c) => !isAmountColumn(c.id),
                  ).length;
                  cells.push(
                    <td
                      key="totals-label"
                      colSpan={Math.max(labelSpan, 1)}
                      className={cn(bodyTdClass("font-semibold"), "text-slate-900")}
                    >
                      Report totals
                    </td>,
                  );
                  return cells;
                }
                if (col.id === "current_balance") {
                  cells.push(
                    <td key={col.id} className={amountTdClass(true)}>
                      <AmountText value={summary.net_balance} emphasize />
                    </td>,
                  );
                } else if (col.id === "debit_total") {
                  cells.push(
                    <td key={col.id} className={amountTdClass(true)}>
                      <AmountText value={summary.total_debit} emphasize />
                    </td>,
                  );
                } else if (col.id === "credit_total") {
                  cells.push(
                    <td key={col.id} className={amountTdClass(true)}>
                      <AmountText value={summary.total_credit} emphasize />
                    </td>,
                  );
                }
                return cells;
              }, [])}
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}

export function AccountBalancesStatement({
  companyName,
  logoUrl,
  asOf,
  currency,
  fiscalYear,
  generatedBy,
  printedAt,
  rows,
  visibleColumns,
  workspaceId,
  glPeriod,
  summary,
  loading,
}) {
  const accountCount = summary?.account_count ?? rows.length;
  const scopeLabel = `As of ${formatBsDate(asOf)} · ${accountCount} ${
    accountCount === 1 ? "account" : "accounts"
  }`;

  return (
    <div className="account-balances-statement general-ledger-statement bg-white font-sans">
      <LedgerStatementPrintHeader
        companyName={companyName}
        logoUrl={logoUrl}
        periodFrom={asOf}
        periodTo={asOf}
        currency={currency}
        fiscalYear={fiscalYear}
        generatedBy={generatedBy}
        printedAt={printedAt}
        reportTitle="Account Balances"
        scopeLabel={scopeLabel}
      />

      <AccountBalancesTable
        rows={rows}
        visibleColumns={visibleColumns}
        workspaceId={workspaceId}
        glPeriod={glPeriod}
        summary={summary}
        loading={loading}
      />

      <div className="hidden print:block">
        <LedgerStatementPrintFooter />
      </div>
    </div>
  );
}
