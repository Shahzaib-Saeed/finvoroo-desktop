import { format, parseISO } from "date-fns";
import { ReportAccountDrillLink } from "./ReportAccountDrillLink";
import { ReportDraggableTableHead } from "./ReportDraggableTableHead";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function formatReportDate(value) {
  if (!value) return "—";
  try {
    return format(parseISO(String(value).slice(0, 10)), "dd/MM/yyyy");
  } catch {
    return value;
  }
}

/** Bare tabular amount — the sheet carries a single "All amounts in X" note. */
function formatAmount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0.00";
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(n));
  return n < 0 ? `-${formatted}` : formatted;
}

function fmtPct(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0.00";
  return n.toFixed(2);
}

function isNeg(value) {
  return Number(value) < 0;
}

function columnWidthStyle(col) {
  if (col.id === "name") return undefined;
  if (col.id === "current_pct" || col.id === "ytd_pct")
    return { width: "80px" };
  return { width: "132px" };
}

/** Tinted full-width section bar — same language as the Financial Summary. */
function SectionHeadingRow({ title, colCount }) {
  return (
    <tr>
      <td colSpan={colCount} className="pt-4 pb-1">
        <div className="flex items-center rounded-lg bg-slate-100/80 px-3.5 py-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
            {title}
          </span>
        </div>
      </td>
    </tr>
  );
}

function AccountRow({ row, workspaceId, period, visibleColumns }) {
  const neg = isNeg(row.amount);
  const negYtd = isNeg(row.ytd_amount ?? row.amount);

  return (
    <tr className="transition-colors hover:bg-slate-50/70">
      {visibleColumns.map((col) => {
        switch (col.id) {
          case "name":
            return (
              <td key={col.id} className="py-1.5 pl-3.5 pr-2">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="size-1 shrink-0 rounded-full bg-slate-300"
                    aria-hidden
                  />
                  <span className="min-w-0 truncate text-[13px] font-medium text-slate-600">
                    <ReportAccountDrillLink
                      workspaceId={workspaceId}
                      accountId={row.account_id}
                      name={row.name}
                      from={period?.from}
                      to={period?.to}
                      showIcon={false}
                      className="font-medium text-slate-600 hover:underline"
                    />
                  </span>
                </span>
              </td>
            );
          case "current_amount":
            return (
              <td
                key={col.id}
                className={cn(
                  "py-1.5 text-right text-[13px] font-semibold tabular-nums",
                  neg ? "text-red-600" : "text-slate-800",
                )}
              >
                {formatAmount(row.amount)}
              </td>
            );
          case "current_pct":
            return (
              <td
                key={col.id}
                className="py-1.5 text-right text-[13px] tabular-nums text-slate-400"
              >
                {fmtPct(row.pct ?? 0)}
              </td>
            );
          case "ytd_amount":
            return (
              <td
                key={col.id}
                className={cn(
                  "py-1.5 text-right text-[13px] font-semibold tabular-nums",
                  negYtd ? "text-red-600" : "text-slate-800",
                )}
              >
                {formatAmount(row.ytd_amount ?? row.amount)}
              </td>
            );
          case "ytd_pct":
            return (
              <td
                key={col.id}
                className="py-1.5 text-right text-[13px] tabular-nums text-slate-400"
              >
                {fmtPct(row.ytd_pct ?? 0)}
              </td>
            );
          default:
            return <td key={col.id} className="py-1.5" />;
        }
      })}
    </tr>
  );
}

function TotalRow({
  label,
  amount,
  pct,
  ytdAmount,
  ytdPct,
  underline = "single",
  visibleColumns,
}) {
  const neg = isNeg(amount);
  const negYtd = isNeg(ytdAmount);
  const grand = underline === "double";

  // 2px double renders solid; 4px bottom shows the true double rule.
  const rowCls = grand
    ? "border-t-2 border-b-4 border-double border-slate-800"
    : "border-t border-slate-200";

  const labelCls = grand
    ? "py-2.5 pl-1 text-[13px] font-bold uppercase tracking-wide text-slate-900"
    : "py-2 pl-1 text-[13px] font-bold text-slate-900";

  const amountCls = (isNegative) =>
    cn(
      grand
        ? "py-2.5 text-right text-sm font-extrabold tabular-nums"
        : "py-2 text-right text-[13px] font-bold tabular-nums",
      isNegative ? "text-red-600" : "text-slate-900",
    );

  const pctCls = grand
    ? "py-2.5 text-right text-sm font-bold tabular-nums text-slate-900"
    : "py-2 text-right text-[13px] font-semibold tabular-nums text-slate-500";

  return (
    <tr className={rowCls}>
      {visibleColumns.map((col) => {
        switch (col.id) {
          case "name":
            return (
              <td key={col.id} className={labelCls}>
                {label}
              </td>
            );
          case "current_amount":
            return (
              <td key={col.id} className={amountCls(neg)}>
                {formatAmount(amount)}
              </td>
            );
          case "current_pct":
            return (
              <td key={col.id} className={pctCls}>
                {fmtPct(pct ?? 0)}
              </td>
            );
          case "ytd_amount":
            return (
              <td key={col.id} className={amountCls(negYtd)}>
                {formatAmount(ytdAmount)}
              </td>
            );
          case "ytd_pct":
            return (
              <td key={col.id} className={pctCls}>
                {fmtPct(ytdPct ?? 0)}
              </td>
            );
          default:
            return <td key={col.id} className="py-2" />;
        }
      })}
    </tr>
  );
}

/** Emerald milestone bar — mirrors the Gross Profit section of the summary. */
function GrossProfitRow({ amount, pct, ytdAmount, ytdPct, visibleColumns }) {
  const neg = isNeg(amount);
  const negYtd = isNeg(ytdAmount);
  const last = visibleColumns.length - 1;

  const cellCls = (idx) =>
    cn(
      "bg-emerald-50/70 py-2",
      idx === 0 && "rounded-l-lg",
      idx === last && "rounded-r-lg",
    );

  return (
    <tr>
      {visibleColumns.map((col, idx) => {
        switch (col.id) {
          case "name":
            return (
              <td key={col.id} className={cn(cellCls(idx), "pl-3.5")}>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  Gross Profit
                </span>
              </td>
            );
          case "current_amount":
            return (
              <td
                key={col.id}
                className={cn(
                  cellCls(idx),
                  "text-right text-[13px] font-bold tabular-nums",
                  neg ? "text-red-600" : "text-emerald-700",
                )}
              >
                {formatAmount(amount)}
              </td>
            );
          case "current_pct":
            return (
              <td
                key={col.id}
                className={cn(
                  cellCls(idx),
                  "text-right text-[13px] font-semibold tabular-nums text-emerald-600/80",
                )}
              >
                {fmtPct(pct ?? 0)}
              </td>
            );
          case "ytd_amount":
            return (
              <td
                key={col.id}
                className={cn(
                  cellCls(idx),
                  "text-right text-[13px] font-bold tabular-nums",
                  negYtd ? "text-red-600" : "text-emerald-700",
                )}
              >
                {formatAmount(ytdAmount)}
              </td>
            );
          case "ytd_pct":
            return (
              <td
                key={col.id}
                className={cn(
                  cellCls(idx),
                  "text-right text-[13px] font-semibold tabular-nums text-emerald-600/80",
                )}
              >
                {fmtPct(ytdPct ?? 0)}
              </td>
            );
          default:
            return <td key={col.id} className={cellCls(idx)} />;
        }
      })}
    </tr>
  );
}

function SpacerRow({ colCount }) {
  return (
    <tr>
      <td colSpan={colCount} className="h-3" />
    </tr>
  );
}

function EmptySectionRow({ message, colCount }) {
  return (
    <tr>
      <td
        colSpan={colCount}
        className="py-1.5 pl-6 text-[13px] italic text-slate-400"
      >
        {message}
      </td>
    </tr>
  );
}

export function IncomeStatementTable({
  data,
  loading,
  workspaceId,
  period,
  visibleColumns,
  reorderColumns,
}) {
  const colCount = visibleColumns.length;
  const sections = data?.sections || {};
  const summary = data?.summary || {};

  const revenue = summary.total_revenue ?? 0;
  const cogs = summary.total_cogs ?? 0;
  const grossProfit = summary.gross_profit ?? revenue - cogs;
  const operating = summary.total_operating_expenses ?? 0;
  const otherExp = summary.total_other_expenses ?? 0;
  const netIncome = summary.net_income ?? revenue - (cogs + operating + otherExp);
  const totalExp = operating + otherExp;

  const ytdRevenue = summary.ytd_total_revenue ?? revenue;
  const ytdCogs = summary.ytd_total_cogs ?? cogs;
  const ytdGrossProfit = summary.ytd_gross_profit ?? grossProfit;
  const ytdOperating = summary.ytd_total_operating_expenses ?? operating;
  const ytdOtherExp = summary.ytd_total_other_expenses ?? otherExp;
  const ytdNetIncome = summary.ytd_net_income ?? netIncome;
  const ytdTotalExp = ytdOperating + ytdOtherExp;

  const pct = (n, base) => (base ? (n / base) * 100 : 0);
  const revPct = (n) => pct(n, revenue);
  const ytdRevPct = (n) => pct(n, ytdRevenue);

  const revenueRows = sections.revenue?.rows || [];
  const otherIncomeRows = sections.other_income?.rows || [];
  const cogsRows = sections.cogs?.rows || [];
  const opexRows = sections.operating_expenses?.rows || [];
  const otherExpenseRows = sections.other_expenses?.rows || [];
  const allExpRows = [...opexRows, ...otherExpenseRows];

  const periodEnd = formatReportDate(data?.period?.to ?? period?.to);

  return (
    <div className="overflow-x-auto bg-white px-8 py-4">
      <table className="w-full table-fixed border-collapse font-sans text-sm text-slate-900">
        <colgroup>
          {visibleColumns.map((col) => (
            <col key={col.id} style={columnWidthStyle(col)} />
          ))}
        </colgroup>
        <thead>
          <ReportDraggableTableHead
            columns={visibleColumns}
            onReorder={reorderColumns}
            renderLabel={(col) => (
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {col.label}
              </span>
            )}
            isRightAligned={(col) => col.id !== "name"}
            getExtraClassName={() =>
              "border-b border-slate-100 bg-slate-50/80 px-2 py-2.5 align-middle"
            }
          />
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 10 }).map((_, i) => (
              <tr key={i}>
                <td colSpan={colCount} className="py-2">
                  <Skeleton className="h-4 w-full" />
                </td>
              </tr>
            ))
          ) : (
            <>
              <SectionHeadingRow title="Revenues" colCount={colCount} />
              {revenueRows.length === 0 ? (
                <EmptySectionRow message="No revenue accounts" colCount={colCount} />
              ) : (
                revenueRows.map((row) => (
                  <AccountRow
                    key={row.account_id}
                    row={row}
                    workspaceId={workspaceId}
                    period={period}
                    visibleColumns={visibleColumns}
                  />
                ))
              )}

              {otherIncomeRows.length > 0 ? (
                <>
                  <SectionHeadingRow title="Other Income" colCount={colCount} />
                  {otherIncomeRows.map((row) => (
                    <AccountRow
                      key={row.account_id}
                      row={row}
                      workspaceId={workspaceId}
                      period={period}
                      visibleColumns={visibleColumns}
                    />
                  ))}
                </>
              ) : null}

              <TotalRow
                label="Total Revenues"
                amount={revenue}
                pct={100}
                ytdAmount={ytdRevenue}
                ytdPct={100}
                visibleColumns={visibleColumns}
              />

              <SpacerRow colCount={colCount} />

              <SectionHeadingRow title="Cost of Sales" colCount={colCount} />
              {cogsRows.length === 0 ? (
                <EmptySectionRow
                  message="No cost of sales accounts"
                  colCount={colCount}
                />
              ) : (
                cogsRows.map((row) => (
                  <AccountRow
                    key={row.account_id}
                    row={row}
                    workspaceId={workspaceId}
                    period={period}
                    visibleColumns={visibleColumns}
                  />
                ))
              )}
              <TotalRow
                label="Total Cost of Sales"
                amount={cogs}
                pct={revPct(cogs)}
                ytdAmount={ytdCogs}
                ytdPct={ytdRevPct(ytdCogs)}
                visibleColumns={visibleColumns}
              />

              <SpacerRow colCount={colCount} />

              <GrossProfitRow
                amount={grossProfit}
                pct={revPct(grossProfit)}
                ytdAmount={ytdGrossProfit}
                ytdPct={ytdRevPct(ytdGrossProfit)}
                visibleColumns={visibleColumns}
              />

              <SpacerRow colCount={colCount} />

              <SectionHeadingRow title="Expenses" colCount={colCount} />
              {allExpRows.length === 0 ? (
                <EmptySectionRow message="No expense accounts" colCount={colCount} />
              ) : (
                allExpRows.map((row) => (
                  <AccountRow
                    key={row.account_id}
                    row={row}
                    workspaceId={workspaceId}
                    period={period}
                    visibleColumns={visibleColumns}
                  />
                ))
              )}
              <TotalRow
                label="Total Expenses"
                amount={totalExp}
                pct={revPct(totalExp)}
                ytdAmount={ytdTotalExp}
                ytdPct={ytdRevPct(ytdTotalExp)}
                visibleColumns={visibleColumns}
              />

              <SpacerRow colCount={colCount} />

              <TotalRow
                label={netIncome >= 0 ? "Net Income" : "Net Loss"}
                amount={netIncome}
                pct={revPct(netIncome)}
                ytdAmount={ytdNetIncome}
                ytdPct={ytdRevPct(ytdNetIncome)}
                underline="double"
                visibleColumns={visibleColumns}
              />
            </>
          )}
        </tbody>
      </table>

      {!loading && data ? (
        <p className="mt-6 text-center font-sans text-xs text-slate-400">
          For the period ending {periodEnd}
        </p>
      ) : null}
    </div>
  );
}
