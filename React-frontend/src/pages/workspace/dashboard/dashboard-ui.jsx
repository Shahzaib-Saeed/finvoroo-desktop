import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { resolveUiPack } from "@/industries";

export function fmtCurrency(n, currency = "USD") {
  if (typeof n !== "number" || Number.isNaN(n)) return n ?? "—";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/** Split currency code from the number so KPI tiles never ellipsize amounts. */
export function fmtMoneyParts(n, currency = "USD") {
  const value = typeof n === "number" && Number.isFinite(n) ? n : 0;
  const negative = value < 0;
  const amount = Math.abs(value).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  });
  return {
    code: currency || "USD",
    amount,
    negative,
    signed: `${negative ? "-" : ""}${amount}`,
  };
}

const STATUS_VARIANT = {
  paid: "success",
  partial: "warning",
  sent: "info",
  overdue: "destructive",
  open: "info",
  draft: "secondary",
  received: "success",
  posted: "info",
  invoice: "info",
  payment: "success",
  bill: "warning",
  expense: "destructive",
  cancelled: "secondary",
};

export function statusBadge(status) {
  const variant = STATUS_VARIANT[status] ?? "secondary";
  return (
    <Badge variant={variant} appearance="light" size="sm">
      {status}
    </Badge>
  );
}

export function dashboardRoutes(base, company) {
  const isPharmacy = resolveUiPack(company) === "pharmacy";
  const reports = `${base}/accounting/reports`;
  return {
    invoices: `${base}/accounting/invoices`,
    invoice: (id) => `${base}/accounting/invoices/${id}`,
    bills: `${base}/accounting/bills`,
    bill: (id) => `${base}/accounting/bills/${id}`,
    payments: `${base}/accounting/payments`,
    payment: (id) => `${base}/accounting/payments/${id}`,
    billPayments: `${base}/accounting/bill-payments`,
    billPayment: (id) => `${base}/accounting/bill-payments/${id}`,
    expenses: isPharmacy ? `${base}/pharmacy/expenses` : `${base}/accounting/expenses`,
    expense: (id) =>
      isPharmacy ? `${base}/pharmacy/expenses?edit=${id}` : `${base}/accounting/expenses/${id}`,
    customers: `${base}/accounting/customers`,
    customer: (id) => `${base}/accounting/customers/${id}/edit`,
    vendors: `${base}/accounting/vendors`,
    vendor: (id) => `${base}/accounting/vendors/${id}/edit`,
    products: `${base}/accounting/products`,
    bankAccounts: `${base}/accounting/bank-accounts`,
    journal: `${base}/accounting/journal`,
    journalEntry: (id) => `${base}/accounting/journal/${id}`,
    creditNotes: `${base}/accounting/credit-notes`,
    creditNote: (id) => `${base}/accounting/credit-notes/${id}`,
    vendorCredits: `${base}/accounting/vendor-credits`,
    vendorCredit: (id) => `${base}/accounting/vendor-credits/${id}`,
    chartOfAccounts: `${base}/accounting/chart-of-accounts`,
    reports,
    financialSummary: `${reports}/financial-summary`,
    profitLoss: `${reports}/profit-loss`,
    incomeStatement: `${reports}/income-statement`,
    balanceSheet: `${reports}/balance-sheet`,
    cashFlow: `${reports}/cash-flow`,
    generalLedger: `${reports}/general-ledger`,
    accountBalances: `${reports}/account-balances`,
    accountStatement: `${reports}/account-statement`,
    accountsReceivable: `${reports}/accounts-receivable`,
    accountsPayable: `${reports}/accounts-payable`,
    agedReceivables: `${reports}/aged-receivables`,
    agedPayables: `${reports}/aged-payables`,
    customerLedger: `${reports}/customer-ledger`,
    vendorLedger: `${reports}/vendor-ledger`,
  };
}

export function transactionPath(base, txn, company) {
  if (!txn?.txn_id && !txn?.id) return null;
  const id = txn.txn_id ?? txn.id;
  const routes = dashboardRoutes(base, company);
  const type = String(txn.txn_type || txn.type || txn.entry_type || "")
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  switch (type) {
    case "invoice":
      return routes.invoice(id);
    case "bill":
      return routes.bill(id);
    case "payment":
    case "payment_received":
    case "customer_payment":
    case "receipt":
      return routes.payment(id);
    case "bill_payment":
    case "vendor_payment":
      return routes.billPayment(id);
    case "expense":
      return routes.expense(id);
    case "credit_note":
      return routes.creditNote(id);
    case "vendor_credit":
      return routes.vendorCredit(id);
    case "journal":
    case "journal_entry":
      return routes.journalEntry(id);
    default:
      return null;
  }
}

function SeeAllLink({ to, label = "See All" }) {
  if (!to) return null;
  return (
    <Button mode="link" underline="solid" asChild>
      <Link to={to}>{label}</Link>
    </Button>
  );
}

function LinkWrap({ to, className, children }) {
  if (!to) return children;
  return (
    <Link
      to={to}
      className={cn("block no-underline text-inherit h-full", className)}
    >
      {children}
    </Link>
  );
}

const CARD_THEMES = {
  emerald: {
    card: "border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.07] via-card to-card",
    stripe: "bg-emerald-500",
    icon: "bg-emerald-500/15 text-emerald-600 ring-emerald-500/20",
    title: "text-emerald-800 dark:text-emerald-300",
    value: "text-emerald-700 dark:text-emerald-300",
    bar: "bg-emerald-500",
    row: "bg-emerald-500/10 border border-emerald-500/10",
  },
  orange: {
    card: "border-orange-500/25 bg-gradient-to-br from-orange-500/[0.07] via-card to-card",
    stripe: "bg-orange-500",
    icon: "bg-orange-500/15 text-orange-600 ring-orange-500/20",
    title: "text-orange-800 dark:text-orange-300",
    value: "text-orange-700 dark:text-orange-300",
    bar: "bg-orange-500",
    row: "bg-orange-500/10 border border-orange-500/10",
  },
  violet: {
    card: "border-violet-500/25 bg-gradient-to-br from-violet-500/[0.07] via-card to-card",
    stripe: "bg-violet-500",
    icon: "bg-violet-500/15 text-violet-600 ring-violet-500/20",
    title: "text-violet-800 dark:text-violet-300",
    value: "text-violet-700 dark:text-violet-300",
    bar: "bg-violet-500",
    row: "bg-violet-500/10 border border-violet-500/10",
  },
  blue: {
    card: "border-blue-500/25 bg-gradient-to-br from-blue-500/[0.07] via-card to-card",
    stripe: "bg-blue-500",
    icon: "bg-blue-500/15 text-blue-600 ring-blue-500/20",
    title: "text-blue-800 dark:text-blue-300",
    value: "text-blue-700 dark:text-blue-300",
    bar: "bg-blue-500",
    row: "bg-blue-500/10 border border-blue-500/10",
  },
  rose: {
    card: "border-rose-500/25 bg-gradient-to-br from-rose-500/[0.07] via-card to-card",
    stripe: "bg-rose-500",
    icon: "bg-rose-500/15 text-rose-600 ring-rose-500/20",
    title: "text-rose-800 dark:text-rose-300",
    value: "text-rose-700 dark:text-rose-300",
    bar: "bg-rose-500",
    row: "bg-rose-500/10 border border-rose-500/10",
  },
  amber: {
    card: "border-amber-500/25 bg-gradient-to-br from-amber-500/[0.07] via-card to-card",
    stripe: "bg-amber-500",
    icon: "bg-amber-500/15 text-amber-600 ring-amber-500/20",
    title: "text-amber-800 dark:text-amber-300",
    value: "text-amber-700 dark:text-amber-300",
    bar: "bg-amber-500",
    row: "bg-amber-500/10 border border-amber-500/10",
  },
  teal: {
    card: "border-teal-500/25 bg-gradient-to-br from-teal-500/[0.07] via-card to-card",
    stripe: "bg-teal-500",
    icon: "bg-teal-500/15 text-teal-600 ring-teal-500/20",
    title: "text-teal-800 dark:text-teal-300",
    value: "text-teal-700 dark:text-teal-300",
    bar: "bg-teal-500",
    row: "bg-teal-500/10 border border-teal-500/10",
  },
  cyan: {
    card: "border-cyan-500/25 bg-gradient-to-br from-cyan-500/[0.07] via-card to-card",
    stripe: "bg-cyan-500",
    icon: "bg-cyan-500/15 text-cyan-600 ring-cyan-500/20",
    title: "text-cyan-800 dark:text-cyan-300",
    value: "text-cyan-700 dark:text-cyan-300",
    bar: "bg-cyan-500",
    row: "bg-cyan-500/10 border border-cyan-500/10",
  },
};

const KPI_ACCENTS = {
  default: "bg-primary/10 text-primary",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  danger: "bg-red-500/10 text-red-600 dark:text-red-400",
  info: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
};

const LINKABLE = "transition-shadow hover:shadow-md";

/** KPI stat card — used by superadmin dashboard and business review. */
export function DashboardKpi({
  icon: Icon,
  label,
  value,
  sub,
  loading,
  accent = "default",
  trend,
  to,
}) {
  const card = (
    <Card className={cn("h-full", to && LINKABLE)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            {loading ? (
              <Skeleton className="mt-2.5 h-8 w-28" />
            ) : (
              <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">
                {value}
              </p>
            )}
            {sub && !loading ? (
              <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
            ) : null}
            {trend !== undefined && !loading ? (
              <p
                className={cn(
                  "mt-1.5 text-xs font-medium",
                  trend >= 0 ? "text-emerald-600" : "text-red-500",
                )}
              >
                {trend >= 0 ? "+" : ""}
                {trend}% vs last month
              </p>
            ) : null}
          </div>
          {Icon ? (
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-lg",
                KPI_ACCENTS[accent] || KPI_ACCENTS.default,
              )}
            >
              <Icon className="size-4" />
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );

  return <LinkWrap to={to}>{card}</LinkWrap>;
}

/** Compact stat pill — used by superadmin dashboard. */
export function DashboardStatPill({
  icon: Icon,
  label,
  value,
  sub,
  loading,
  to,
}) {
  const pill = (
    <div
      className={cn(
        "rounded-xl border bg-muted/20 px-4 py-3.5 transition-colors hover:bg-muted/35",
        "h-full min-h-[92px]",
        to && LINKABLE,
      )}
    >
      <div className="mb-1.5 flex items-center gap-2">
        {Icon ? <Icon className="size-3.5 text-muted-foreground" /> : null}
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>

      {loading ? (
        <Skeleton className="h-6 w-20" />
      ) : (
        <>
          <p className="text-lg font-bold tabular-nums leading-none text-foreground">
            {value}
          </p>

          {/* Always reserve subtitle space */}
          <p className="mt-1 h-4 text-[11px] text-muted-foreground">
            {sub || "\u00A0"}
          </p>
        </>
      )}
    </div>
  );

  return <LinkWrap to={to}>{pill}</LinkWrap>;
}

/** Standard dashboard card — matches store-inventory CardHeader pattern. */
export function DashboardPanel({
  title,
  description,
  actionTo,
  actionLabel,
  children,
  className,
  contentClassName,
  theme,
  icon: Icon,
}) {
  const t = theme ? CARD_THEMES[theme] : null;

  return (
    <Card className={cn("relative h-full overflow-hidden", t?.card, className)}>
      {t ? (
        <div className={cn("absolute inset-y-0 left-0 w-1", t.stripe)} />
      ) : null}
      <CardHeader className={cn("lg:px-7.5", t && "pl-6")}>
        <div className="flex items-center gap-2.5 min-w-0">
          {Icon ? (
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
                t ? t.icon : "bg-muted/60 text-muted-foreground ring-border",
              )}
            >
              <Icon className="size-4" />
            </span>
          ) : null}
          <CardTitle className={cn(t?.title)}>{title}</CardTitle>
        </div>
        <SeeAllLink to={actionTo} label={actionLabel} />
      </CardHeader>
      <CardContent
        className={cn(
          "p-5 lg:px-7.5 lg:pb-7.5 pt-4",
          t && "pl-6",
          contentClassName,
        )}
      >
        {description ? (
          <p className="text-sm text-muted-foreground mb-4">{description}</p>
        ) : null}
        {children}
      </CardContent>
    </Card>
  );
}

/** Hero metric card — Inventory / Orders style from store-inventory. */
export function MetricHeroCard({
  title,
  label,
  value,
  hint,
  loading,
  actionTo,
  children,
  className,
  theme,
  icon: Icon,
}) {
  const t = theme ? CARD_THEMES[theme] : null;

  return (
    <Card className={cn("relative h-full overflow-hidden", t?.card, className)}>
      {t ? (
        <div className={cn("absolute inset-y-0 left-0 w-1", t.stripe)} />
      ) : null}
      <CardHeader className={cn("lg:px-7.5", t && "pl-6")}>
        <div className="flex items-center gap-2.5 min-w-0">
          {Icon ? (
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
                t ? t.icon : "bg-muted/60 text-muted-foreground ring-border",
              )}
            >
              <Icon className="size-4" />
            </span>
          ) : null}
          <CardTitle className={cn(t?.title)}>{title}</CardTitle>
        </div>
        <SeeAllLink to={actionTo} />
      </CardHeader>
      <CardContent
        className={cn(
          "flex h-full flex-col justify-between gap-5 p-5 pt-4 lg:px-7.5 lg:pb-7.5 lg:pt-5",
          t && "pl-6",
        )}
      >
        <div className="space-y-1">
          {label ? (
            <span className="text-sm font-normal text-muted-foreground">
              {label}
            </span>
          ) : null}
          {loading ? (
            <Skeleton className="mt-2 h-9 w-36" />
          ) : (
            <span
              className={cn(
                "mt-0.5 block text-3xl font-semibold tabular-nums",
                t?.value || "text-foreground",
              )}
            >
              {value}
            </span>
          )}
          {hint && !loading ? (
            <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

/** Accent list row — store-inventory inventory row style. */
export function AccentListRow({
  title,
  subtitle,
  trailing,
  trailingClassName,
  badge,
  to,
  theme,
}) {
  const rowBg =
    theme && CARD_THEMES[theme] ? CARD_THEMES[theme].row : "bg-accent/50";

  const inner = (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-md px-4 py-2.5 text-sm",
        rowBg,
      )}
    >
      <div className="min-w-0 flex-1">
        <span className="block truncate font-normal text-foreground">
          {title}
        </span>
        {subtitle ? (
          <span className="block truncate text-xs text-muted-foreground mt-0.5">
            {subtitle}
          </span>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {badge}
        {trailing != null ? (
          <span
            className={cn(
              "font-medium tabular-nums shrink-0",
              trailingClassName,
            )}
          >
            {trailing}
          </span>
        ) : null}
      </div>
    </div>
  );

  if (!to) return inner;
  return (
    <Link
      to={to}
      className="block no-underline text-inherit hover:opacity-90 transition-opacity"
    >
      {inner}
    </Link>
  );
}

export function RankBarRow({ name, amount, pct, to, theme }) {
  const barColor =
    theme && CARD_THEMES[theme] ? CARD_THEMES[theme].bar : "bg-primary";

  const bar = (
    <div className={cn(to && "rounded-lg transition-opacity hover:opacity-90")}>
      <div className="mb-1.5 flex justify-between gap-2 text-sm">
        <span className="truncate font-medium text-foreground">{name}</span>
        <span className="shrink-0 tabular-nums text-muted-foreground">
          {amount}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            barColor,
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );

  if (!to) return bar;
  return (
    <Link to={to} className="block no-underline text-inherit">
      {bar}
    </Link>
  );
}

export function StatMiniGrid({ items, loading, theme }) {
  const t = theme && CARD_THEMES[theme] ? CARD_THEMES[theme] : null;

  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            "flex flex-col items-start rounded-lg p-3",
            t ? t.row : "bg-muted/20",
          )}
        >
          {loading ? (
            <Skeleton className="h-7 w-16 mb-1" />
          ) : (
            <div
              className={cn(
                "text-xl font-bold tabular-nums",
                t?.value || "text-foreground",
              )}
            >
              {item.value}
            </div>
          )}
          <div className="text-xs text-muted-foreground font-medium mb-0.5">
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Compact colorful KPI tile for business review row. */
export function ColorKpiTile({
  icon: Icon,
  label,
  value,
  sub,
  loading,
  to,
  theme = "blue",
}) {
  const t = CARD_THEMES[theme] || CARD_THEMES.blue;

  const tile = (
    <Card className={cn("relative h-full overflow-hidden", t.card)}>
      <div className={cn("absolute inset-y-0 left-0 w-1", t.stripe)} />
      <CardContent className="p-5 pl-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            {loading ? (
              <Skeleton className="mt-2 h-8 w-28" />
            ) : (
              <p
                className={cn(
                  "mt-2 text-2xl font-bold tabular-nums tracking-tight",
                  t.value,
                )}
              >
                {value}
              </p>
            )}
            {sub && !loading ? (
              <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
            ) : null}
          </div>
          {Icon ? (
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
                t.icon,
              )}
            >
              <Icon className="size-4" />
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );

  return <LinkWrap to={to}>{tile}</LinkWrap>;
}

export function EmptyState({ message, icon: Icon }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      {Icon ? (
        <span className="mb-3 flex size-11 items-center justify-center rounded-full bg-accent/50">
          <Icon className="size-5 text-muted-foreground" />
        </span>
      ) : null}
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export { Separator, SeeAllLink };
