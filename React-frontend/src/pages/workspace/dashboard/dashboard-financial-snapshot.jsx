import { Link } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  DollarSign,
  Receipt,
  Wallet,
  Scale,
  TrendingUp,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { fmtMoneyParts } from "./dashboard-ui";

function Amount({ value, currency, loading, size = "lg" }) {
  const parts = fmtMoneyParts(value, currency);

  if (loading) {
    return <Skeleton className={size === "lg" ? "mt-3 h-8 w-36" : "h-5 w-24"} />;
  }

  return (
    <p
      className={cn(
        "flex min-w-0 flex-wrap items-baseline gap-1.5",
        size === "lg" ? "mt-4" : "mt-1",
      )}
      title={`${parts.code} ${parts.signed}`}
    >
      <span className="text-xs font-medium text-muted-foreground">{parts.code}</span>
      <span
        className={cn(
          "font-semibold tracking-tight tabular-nums",
          size === "lg" ? "text-2xl leading-none" : "text-base leading-none",
          parts.negative ? "text-destructive" : "text-foreground",
        )}
      >
        {parts.signed}
      </span>
    </p>
  );
}

function PrimaryTile({ label, value, currency, hint, loading, to, icon: Icon, tone }) {
  const tones = {
    receivable: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
    payable: "bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400",
    cash: "bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400",
    profit: "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400",
  };

  const inner = (
    <div className="flex h-full min-h-[148px] flex-col rounded-xl border border-border/70 bg-card p-5 shadow-xs transition-colors hover:border-border hover:bg-muted/20">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
        {Icon ? (
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg",
              tones[tone],
            )}
          >
            <Icon className="size-4" strokeWidth={2} />
          </span>
        ) : null}
      </div>
      <Amount value={value} currency={currency} loading={loading} />
      <p className="mt-auto pt-3 text-xs text-muted-foreground">{loading ? "\u00A0" : hint}</p>
    </div>
  );

  if (!to) return inner;
  return (
    <Link to={to} className="block h-full min-w-0 text-inherit no-underline">
      {inner}
    </Link>
  );
}

function SecondaryTile({ label, value, currency, hint, loading, to, icon: Icon }) {
  const inner = (
    <div className="flex h-full items-center gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3 transition-colors hover:bg-muted/40">
      {Icon ? (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-background text-muted-foreground shadow-xs">
          <Icon className="size-3.5" />
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        <Amount value={value} currency={currency} loading={loading} size="sm" />
        {hint ? (
          <p className="mt-1 truncate text-[11px] text-muted-foreground">{hint}</p>
        ) : null}
      </div>
    </div>
  );

  if (!to) return inner;
  return (
    <Link to={to} className="block h-full min-w-0 text-inherit no-underline">
      {inner}
    </Link>
  );
}

export function DashboardFinancialSnapshot({
  kpi,
  stats,
  currency,
  loading,
  routes,
}) {
  const receivable = kpi?.balance_due ?? stats?.balance_due ?? 0;
  const payable = kpi?.bills_balance_due ?? stats?.bills_balance_due ?? 0;
  const cash = kpi?.cash_bank_balance ?? 0;
  const netProfit = kpi?.net_profit_month ?? 0;
  const openInvoices =
    kpi?.open_invoice_count ?? stats?.open_invoice_count ?? 0;
  const unpaidBills = kpi?.unpaid_bill_count ?? stats?.bill_count ?? 0;
  const overdueCount = stats?.overdue_count ?? 0;
  const netWorkingCapital = receivable - payable;
  const nwc = fmtMoneyParts(netWorkingCapital, currency);
  const profitPositive = netProfit >= 0;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Overview</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Cash, receivables, payables, and this month’s result
          </p>
        </div>
        <Link
          to={routes.balanceSheet || routes.financialSummary}
          className={cn(
            "inline-flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm",
            nwc.negative
              ? "border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/40"
              : "border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/40",
          )}
        >
          <span className="text-xs text-muted-foreground">Working capital</span>
          <span
            className={cn(
              "font-semibold tabular-nums",
              nwc.negative ? "text-destructive" : "text-emerald-700 dark:text-emerald-400",
            )}
          >
            {nwc.code} {nwc.signed}
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
              nwc.negative
                ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
            )}
          >
            {nwc.negative ? "Deficit" : "Healthy"}
          </span>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PrimaryTile
          label="Accounts receivable"
          value={receivable}
          currency={currency}
          hint={
            overdueCount > 0
              ? `${openInvoices} open · ${overdueCount} overdue`
              : `${openInvoices} open invoice${openInvoices === 1 ? "" : "s"}`
          }
          loading={loading}
          to={routes.accountsReceivable || routes.agedReceivables || routes.invoices}
          icon={ArrowDownLeft}
          tone="receivable"
        />
        <PrimaryTile
          label="Accounts payable"
          value={payable}
          currency={currency}
          hint={`${unpaidBills} unpaid bill${unpaidBills === 1 ? "" : "s"}`}
          loading={loading}
          to={routes.accountsPayable || routes.agedPayables || routes.bills}
          icon={ArrowUpRight}
          tone="payable"
        />
        <PrimaryTile
          label="Cash & bank"
          value={cash}
          currency={currency}
          hint="Posted cash and bank balances"
          loading={loading}
          to={routes.bankAccounts}
          icon={Landmark}
          tone="cash"
        />
        <PrimaryTile
          label="Net profit (MTD)"
          value={netProfit}
          currency={currency}
          hint={profitPositive ? "Profit this month" : "Loss this month"}
          loading={loading}
          to={routes.profitLoss || routes.reports}
          icon={TrendingUp}
          tone="profit"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SecondaryTile
          label="Revenue (MTD)"
          value={kpi?.revenue_this_month}
          currency={currency}
          loading={loading}
          to={routes.incomeStatement || routes.profitLoss}
          icon={DollarSign}
        />
        <SecondaryTile
          label="Expenses (MTD)"
          value={kpi?.expenses_this_month}
          currency={currency}
          loading={loading}
          to={routes.profitLoss || routes.expenses}
          icon={Receipt}
        />
        <SecondaryTile
          label="Collected"
          value={stats?.payment_total}
          currency={currency}
          loading={loading}
          to={routes.payments}
          icon={Wallet}
        />
        <SecondaryTile
          label="Liquidity (cash + AR − AP)"
          value={cash + receivable - payable}
          currency={currency}
          loading={loading}
          to={routes.cashFlow || routes.financialSummary}
          icon={Scale}
        />
      </div>
    </section>
  );
}
