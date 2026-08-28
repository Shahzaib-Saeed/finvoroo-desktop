import { format, parseISO } from "date-fns";
import { CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { reportStickySheetHeaderClass } from "./report-sticky";
import { ReportDrillableStatementRow } from "./ReportDrillableStatementRow";
import { STATEMENT_AMOUNT_COL } from "./report-typography";

/** Fixed numeric column — keeps decimals aligned across all rows. */
const AMOUNT_COL = STATEMENT_AMOUNT_COL;

const NEGATIVE_BALANCE_HINTS = {
  asset: "Account is overdrawn or has a net credit balance.",
  liability: "Net debit balance / excess repayment.",
  equity: "Net debit balance / contra-equity.",
};

function NegativeBalanceHint({ accountSide }) {
  const message = NEGATIVE_BALANCE_HINTS[accountSide];
  if (!message) return null;

  return (
    <span className="balance-sheet-negative-hint group/hint relative inline-flex shrink-0">
      <Info
        className="size-3 cursor-help text-amber-600/80"
        aria-label={message}
      />
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full right-0 z-20 mb-1.5 hidden w-max max-w-[14rem] rounded-md bg-slate-800 px-2.5 py-1.5 text-left text-[11px] font-normal leading-snug text-white shadow-lg group-hover/hint:block"
      >
        {message}
      </span>
    </span>
  );
}

function StatementAmount({ amount, accountSide, className, emphasize = false }) {
  const formatted = formatBsAmount(amount);
  const isNegative = Number(amount) < -0.004;

  return (
    <span
      className={cn(
        AMOUNT_COL,
        "inline-flex items-start justify-end gap-1 self-start leading-snug",
        !formatted && "text-slate-300",
        emphasize && "font-semibold",
        className,
      )}
    >
      {isNegative && accountSide ? (
        <NegativeBalanceHint accountSide={accountSide} />
      ) : null}
      <span className="tabular-nums">{formatted || "—"}</span>
    </span>
  );
}

export function formatBsDate(value) {
  if (!value) return "";
  try {
    return format(parseISO(String(value).slice(0, 10)), "dd MMMM yyyy");
  } catch {
    return value;
  }
}

export function formatBsAmount(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || Math.abs(n) < 0.005) return "";

  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(n));

  return n < 0 ? `(${formatted})` : formatted;
}

function sumRows(rows) {
  return rows.reduce((s, r) => s + Number(r.balance || 0), 0);
}

function toSubtotalLabel(title) {
  if (!title) return "Total";
  return `Total ${title.charAt(0).toLowerCase()}${title.slice(1)}`;
}

function CompanyLogo({ logoUrl, companyName }) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        className="mb-3 h-12 w-auto max-w-[160px] object-contain print:mb-1 print:h-8 print:max-w-[120px]"
      />
    );
  }

  const words = String(companyName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const initials =
    words.length >= 2
      ? `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase()
      : (words[0] ?? "C").slice(0, 2).toUpperCase();

  return (
    <div
      aria-hidden
      className="mb-3 flex size-10 items-center justify-center border border-slate-300 text-xs font-semibold tracking-wide text-slate-600"
    >
      {initials}
    </div>
  );
}

function StatementHeader({
  companyName,
  logoUrl,
  asOf,
  plFrom,
  plTo,
  currency,
  fiscalYear,
  generatedBy,
  printedAt,
}) {
  return (
    <header className={cn(
      "balance-sheet-header border-b border-slate-200 px-6 py-6 print:py-3 sm:px-8 print:px-4",
      reportStickySheetHeaderClass,
    )}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <div className="flex flex-col items-center sm:items-start">
            <CompanyLogo logoUrl={logoUrl} companyName={companyName} />
          </div>
          <h1 className="text-lg font-semibold leading-tight tracking-tight text-slate-900 sm:text-xl">
            {companyName || "Company"}
          </h1>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
            Balance Sheet
          </p>
          <p className="mt-1.5 text-sm text-slate-800">
            As of {formatBsDate(asOf)}
          </p>
          {plFrom && plTo ? (
            <p className="mt-1 text-xs text-slate-500">
              Current-year profit / loss for period {formatBsDate(plFrom)} –{" "}
              {formatBsDate(plTo)}
            </p>
          ) : null}
        </div>

        <div className="shrink-0 text-center text-xs leading-relaxed text-slate-500 sm:text-right">
          <p className="font-semibold uppercase tracking-wide text-slate-600">
            Currency: {currency}
          </p>
          {fiscalYear ? <p className="mt-1">Fiscal year: {fiscalYear}</p> : null}
          {generatedBy ? (
            <p className="mt-1">Generated by {generatedBy}</p>
          ) : null}
          {printedAt ? <p className="mt-1">{printedAt}</p> : null}
        </div>
      </div>
    </header>
  );
}

function StatementRow({
  label,
  amount,
  indent = false,
  computed = false,
  accountSide = null,
}) {
  return (
    <div
      className={cn(
        "balance-sheet-row balance-sheet-account-row balance-sheet-account-row--no-code py-1 leading-snug",
        indent && "pl-3",
      )}
    >
      <div className="balance-sheet-label min-w-0 text-sm text-slate-700">
        {label}
        {computed ? (
          <span className="ml-1 text-xs text-slate-400">(Computed)</span>
        ) : null}
      </div>
      <StatementAmount amount={amount} accountSide={accountSide} />
    </div>
  );
}

function AccountRow({ row, workspaceId, period, showCodes, accountSide }) {
  const hasCode = showCodes && row.code;

  return (
    <ReportDrillableStatementRow
      workspaceId={workspaceId}
      accountId={row.account_id}
      from={period?.from}
      to={period?.to}
      className={cn(
        "balance-sheet-row balance-sheet-account-row py-1 pl-3 leading-snug print:py-0",
        hasCode
          ? "balance-sheet-account-row--with-code"
          : "balance-sheet-account-row--no-code",
      )}
    >
      {showCodes ? (
        <span
          className={cn(
            "balance-sheet-code font-mono text-xs tabular-nums text-slate-400",
            !row.code && "invisible",
          )}
          aria-hidden={!row.code}
        >
          {row.code || "00000"}
        </span>
      ) : null}
      <span className="balance-sheet-label min-w-0 text-sm text-slate-700 underline-offset-2 group-hover/drill:text-slate-900 group-hover/drill:underline">
        {row.name || "—"}
      </span>
      <StatementAmount amount={row.balance} accountSide={accountSide} />
    </ReportDrillableStatementRow>
  );
}

function SubtotalRow({ label, amount }) {
  return (
    <div className="balance-sheet-subtotal balance-sheet-row mt-2 flex items-baseline gap-2 border-t border-slate-300 pt-2">
      <span className="min-w-0 flex-1 text-sm font-semibold text-slate-700">
        {label}
      </span>
      <span className={cn(AMOUNT_COL, "font-semibold")}>
        {formatBsAmount(amount) || "—"}
      </span>
    </div>
  );
}

function SubsectionBlock({ title, children, subtotal, subtotalLabel }) {
  if (!children && subtotal == null) return null;

  return (
    <div className="balance-sheet-subsection">
      {title ? (
        <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-slate-600">
          {title}
        </h4>
      ) : null}
      <div>{children}</div>
      {subtotal != null ? (
        <SubtotalRow label={subtotalLabel || toSubtotalLabel(title)} amount={subtotal} />
      ) : null}
    </div>
  );
}

function ColumnHeading({ title }) {
  return (
    <h3 className="mb-4 border-b border-slate-900 pb-1.5 text-xs font-bold uppercase tracking-[0.1em] text-slate-900 print:mb-2 print:pb-1">
      {title}
    </h3>
  );
}

function AssetsBody({ groups, workspaceId, period, showCodes }) {
  const activeGroups = groups.filter((g) => g.rows.length > 0);

  if (!activeGroups.length) {
    return <p className="pl-3 text-sm text-slate-400">—</p>;
  }

  return (
    <div className="flex flex-col gap-5 print:gap-2">
      {activeGroups.map((group) => (
        <SubsectionBlock
          key={group.key}
          title={group.label}
          subtotal={sumRows(group.rows)}
          subtotalLabel={toSubtotalLabel(group.label)}
        >
          {group.rows.map((row) => (
            <AccountRow
              key={row.account_id}
              row={row}
              workspaceId={workspaceId}
              period={period}
              showCodes={showCodes}
              accountSide="asset"
            />
          ))}
        </SubsectionBlock>
      ))}
    </div>
  );
}

function LiabilitiesEquityBody({
  liabilityGroups,
  equityGroups,
  retainedEarnings,
  priorPeriodEarnings,
  workspaceId,
  period,
  showCodes,
}) {
  const activeLiabGroups = liabilityGroups.filter((g) => g.rows.length > 0);
  const capitalGroup = equityGroups.find((g) => g.key === "capital");
  const drawingsGroup = equityGroups.find((g) => g.key === "drawings");
  const retainedGroup = equityGroups.find((g) => g.key === "retained");
  const showPrior = Math.abs(Number(priorPeriodEarnings) || 0) >= 0.005;

  const equityAccountRows = [
    ...(capitalGroup?.rows || []),
    ...(drawingsGroup?.rows || []),
    ...(retainedGroup?.rows || []),
  ];

  const totalLiabilities = activeLiabGroups.reduce(
    (s, g) => s + sumRows(g.rows),
    0,
  );
  const totalEquity =
    sumRows(equityAccountRows) +
    (showPrior ? Number(priorPeriodEarnings) : 0) +
    Number(retainedEarnings || 0);

  const hasLiabilities = activeLiabGroups.length > 0;
  const hasEquity =
    equityAccountRows.length > 0 ||
    showPrior ||
    Math.abs(Number(retainedEarnings) || 0) >= 0.005;

  if (!hasLiabilities && !hasEquity) {
    return <p className="pl-3 text-sm text-slate-400">—</p>;
  }

  return (
    <div className="flex flex-col gap-5 print:gap-2">
      {hasLiabilities
        ? activeLiabGroups.map((group) => (
            <SubsectionBlock
              key={group.key}
              title={group.label}
              subtotal={sumRows(group.rows)}
              subtotalLabel={toSubtotalLabel(group.label)}
            >
              {group.rows.map((row) => (
                <AccountRow
                  key={row.account_id}
                  row={row}
                  workspaceId={workspaceId}
                  period={period}
                  showCodes={showCodes}
                  accountSide="liability"
                />
              ))}
            </SubsectionBlock>
          ))
        : null}

      {hasLiabilities ? (
        <SubtotalRow label="Total liabilities" amount={totalLiabilities} />
      ) : null}

      {hasEquity ? (
        <div className="balance-sheet-subsection">
          <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-slate-600">
            Equity
          </h4>
          <div>
            {equityAccountRows.map((row) => (
              <AccountRow
                key={row.account_id}
                row={row}
                workspaceId={workspaceId}
                period={period}
                showCodes={showCodes}
                accountSide="equity"
              />
            ))}
            {showPrior ? (
              <StatementRow
                indent
                computed
                label="Prior period profit / loss (unclosed)"
                amount={priorPeriodEarnings}
                accountSide="equity"
              />
            ) : null}
            <StatementRow
              indent
              computed
              label="Current year profit / loss"
              amount={retainedEarnings}
              accountSide="equity"
            />
          </div>
          <SubtotalRow label="Total equity" amount={totalEquity} />
        </div>
      ) : null}
    </div>
  );
}

function SharedGrandTotals({ totalAssets, liabilitiesPlusEquity }) {
  return (
    <div className="balance-sheet-grand-totals grid grid-cols-1 border-t-[3px] border-double border-slate-900 lg:grid-cols-2 print:py-0">
      <div className="balance-sheet-col balance-sheet-row flex items-baseline gap-2 px-6 py-3 print:px-4 print:py-2 sm:px-8 lg:border-r lg:border-slate-300">
        <span className="min-w-0 flex-1 text-sm font-semibold text-slate-900">
          Total assets
        </span>
        <span className={cn(AMOUNT_COL, "text-[15px] font-bold")}>
          {formatBsAmount(totalAssets) || "—"}
        </span>
      </div>
      <div className="balance-sheet-col balance-sheet-row flex items-baseline gap-2 px-6 py-3 print:px-4 print:py-2 sm:px-8">
        <span className="min-w-0 flex-1 text-sm font-semibold text-slate-900">
          Total liabilities &amp; equity
        </span>
        <span className={cn(AMOUNT_COL, "text-[15px] font-bold")}>
          {formatBsAmount(liabilitiesPlusEquity) || "—"}
        </span>
      </div>
    </div>
  );
}

const FINVOROO_LOGO = "/media/app/finvoroo.svg";

function StatementFooter() {
  return (
    <footer className="balance-sheet-footer border-t border-slate-200 px-6 py-3 print:px-4 print:py-2 sm:px-8">
      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <img
            src={FINVOROO_LOGO}
            alt=""
            className="size-6 shrink-0 object-contain"
          />
          <span className="text-xs font-semibold tracking-tight text-slate-800">
            Finvoroo ERP
          </span>
        </div>
        <p className="text-center text-xs leading-relaxed text-slate-500 sm:text-right">
          Unaudited — For management purposes only
        </p>
      </div>
    </footer>
  );
}

function BalanceBalancedNotice({ isBalanced }) {
  if (!isBalanced) return null;

  return (
    <div className="balance-sheet-balanced mx-6 border border-emerald-200 bg-emerald-50/60 px-4 py-2.5 print:mx-0 print:px-4 print:py-1.5 sm:mx-8">
      <p className="flex items-center justify-center gap-2 text-sm font-semibold text-emerald-800">
        <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" aria-hidden />
        Report balances — total assets equal total liabilities and equity.
      </p>
    </div>
  );
}

function BalanceValidation({
  isBalanced,
  balanceDifference,
  currency,
  unbalancedJournalCount,
}) {
  if (isBalanced) return null;

  return (
    <div className="balance-sheet-status no-print mx-6 border border-slate-400 bg-slate-50 px-4 py-3 sm:mx-8">
      <p className="text-sm font-semibold text-slate-900">
        Report out of balance
      </p>
      <p className="mt-1 text-sm leading-relaxed text-slate-700">
        Assets and liabilities + equity differ by{" "}
        <span className="font-semibold tabular-nums text-red-800">
          {formatBsAmount(balanceDifference)} {currency}
        </span>
        .
        {unbalancedJournalCount > 0
          ? ` ${unbalancedJournalCount} journal entr${unbalancedJournalCount === 1 ? "y has" : "ies have"} debit ≠ credit through this date.`
          : " Review inactive accounts with balances and source-document rounding."}
      </p>
    </div>
  );
}

export function BalanceSheetStatement({
  companyName,
  logoUrl,
  asOf,
  plFrom,
  plTo,
  currency,
  fiscalYear,
  generatedBy,
  printedAt,
  assetGroups,
  liabilityGroups,
  equityGroups,
  retainedEarnings,
  priorPeriodEarnings,
  totalAssets,
  liabilitiesPlusEquity,
  isBalanced,
  balanceDifference,
  unbalancedJournalCount,
  workspaceId,
  period,
  showCodes = true,
}) {
  return (
    <div className="balance-sheet-statement bg-white">
      <StatementHeader
        companyName={companyName}
        logoUrl={logoUrl}
        asOf={asOf}
        plFrom={plFrom}
        plTo={plTo}
        currency={currency}
        fiscalYear={fiscalYear}
        generatedBy={generatedBy}
        printedAt={printedAt}
      />

      <div className="balance-sheet-columns grid grid-cols-1 lg:grid-cols-2 lg:divide-x lg:divide-slate-300">
        <div className="balance-sheet-col flex min-w-0 flex-col px-6 py-5 print:px-4 print:py-2 sm:px-8 sm:py-6">
          <ColumnHeading title="Assets" />
          <AssetsBody
            groups={assetGroups}
            workspaceId={workspaceId}
            period={period}
            showCodes={showCodes}
          />
        </div>

        <div className="balance-sheet-col flex min-w-0 flex-col px-6 py-5 print:px-4 print:py-2 sm:px-8 sm:py-6">
          <ColumnHeading title="Liabilities & Equity" />
          <LiabilitiesEquityBody
            liabilityGroups={liabilityGroups}
            equityGroups={equityGroups}
            retainedEarnings={retainedEarnings}
            priorPeriodEarnings={priorPeriodEarnings}
            workspaceId={workspaceId}
            period={period}
            showCodes={showCodes}
          />
        </div>
      </div>

      <div className="balance-sheet-closing">
        <SharedGrandTotals
          totalAssets={totalAssets}
          liabilitiesPlusEquity={liabilitiesPlusEquity}
        />

        <BalanceBalancedNotice isBalanced={isBalanced} />

        <BalanceValidation
          isBalanced={isBalanced}
          balanceDifference={balanceDifference}
          currency={currency}
          unbalancedJournalCount={unbalancedJournalCount}
        />

        <StatementFooter />
      </div>
    </div>
  );
}
