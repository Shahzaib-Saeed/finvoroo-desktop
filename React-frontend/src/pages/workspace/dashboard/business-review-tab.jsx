import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Landmark,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { toAbsoluteUrl } from '@/lib/helpers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardRevenueChart } from './dashboard-revenue-chart';
import {
  AccentListRow,
  DashboardPanel,
  EmptyState,
  RankBarRow,
  dashboardRoutes,
  fmtCurrency,
  statusBadge,
  transactionPath,
} from './dashboard-ui';
import { useAuthStore } from '@/store/authStore';

function ChannelStatCard({ label, value, loading, icon: Icon }) {
  return (
    <Card className="h-full">
      <CardContent className="p-0 flex flex-col justify-between gap-6 h-full bg-cover rtl:bg-[left_top_-1.7rem] bg-[right_top_-1.7rem] bg-no-repeat channel-stats-bg min-h-[120px]">
        <Icon className="size-7 mt-4 ms-5 text-primary" />
        <div className="flex flex-col gap-1 pb-4 px-5">
          {loading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <span className="text-2xl font-semibold text-mono tabular-nums">{value}</span>
          )}
          <span className="text-sm font-normal text-muted-foreground">{label}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function BusinessHighlights({ overview, currency, loading, base, activeCompany }) {
  const kpi = overview?.kpi ?? {};
  const routes = dashboardRoutes(base, activeCompany);
  const profitPositive = (kpi.net_profit_month ?? 0) >= 0;

  const rows = [
    { label: 'Receivables', value: fmtCurrency(kpi.balance_due, currency), to: routes.invoices },
    { label: 'Payables', value: fmtCurrency(kpi.bills_balance_due, currency), to: routes.bills },
    { label: 'Cash & bank', value: fmtCurrency(kpi.cash_bank_balance, currency), to: routes.bankAccounts },
  ];

  return (
    <Card className="h-full">
      <CardContent className="flex flex-col gap-4 p-5 lg:p-7.5 lg:pt-5">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-normal text-secondary-foreground">Net profit this month</span>
          {loading ? (
            <Skeleton className="h-9 w-36" />
          ) : (
            <span
              className={`text-3xl font-semibold text-mono tabular-nums ${profitPositive ? 'text-green-600' : 'text-destructive'}`}
            >
              {fmtCurrency(kpi.net_profit_month, currency)}
            </span>
          )}
        </div>
        <div className="border-b border-input" />
        <div className="grid gap-3">
          {rows.map((row) => (
            <Link
              key={row.label}
              to={row.to}
              className="flex items-center justify-between text-sm hover:opacity-80 transition-opacity"
            >
              <span className="text-muted-foreground">{row.label}</span>
              <span className="font-semibold tabular-nums">{loading ? '—' : row.value}</span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function BusinessSummaryCallout({ companyName, kpi, currency, loading, base }) {
  const routes = dashboardRoutes(base);

  return (
    <Fragment>
      <style>
        {`
          .entry-callout-bg {
            background-image: url('${toAbsoluteUrl('/media/images/2600x1600/2.png')}');
          }
          .dark .entry-callout-bg {
            background-image: url('${toAbsoluteUrl('/media/images/2600x1600/2-dark.png')}');
          }
          .channel-stats-bg {
            background-image: url('${toAbsoluteUrl('/media/images/2600x1600/bg-3.png')}');
          }
          .dark .channel-stats-bg {
            background-image: url('${toAbsoluteUrl('/media/images/2600x1600/bg-3-dark.png')}');
          }
        `}
      </style>
      <Card className="h-full">
        <CardContent className="p-8 lg:p-10 bg-[length:80%] rtl:[background-position:-70%_25%] [background-position:175%_25%] bg-no-repeat entry-callout-bg">
          <div className="flex flex-col justify-center gap-4 max-w-lg">
            <h2 className="text-xl font-semibold text-mono">Business review · {companyName}</h2>
            <p className="text-sm font-normal text-secondary-foreground leading-5.5">
              Track revenue, expenses, and cash position. Use this view for month-end checks and leadership reporting.
            </p>
            {!loading && (
              <div className="grid sm:grid-cols-2 gap-3 pt-1">
                <div className="rounded-lg bg-accent/50 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Revenue this month</p>
                  <p className="text-lg font-semibold tabular-nums">{fmtCurrency(kpi?.revenue_this_month, currency)}</p>
                </div>
                <div className="rounded-lg bg-accent/50 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Expenses this month</p>
                  <p className="text-lg font-semibold tabular-nums">{fmtCurrency(kpi?.expenses_this_month, currency)}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="justify-center">
          <Button mode="link" underlined="dashed" asChild>
            <Link to={routes.reports}>Open financial reports</Link>
          </Button>
        </CardFooter>
      </Card>
    </Fragment>
  );
}

function BusinessActionPanel({ overview, currency, loading, base }) {
  const routes = dashboardRoutes(base);
  const overdueCount = overview?.overdue_invoices?.length ?? 0;
  const unpaidCount = overview?.unpaid_bills?.length ?? 0;

  return (
    <Card className="h-full">
      <CardContent className="grow p-5 lg:p-7.5 lg:pt-6">
        <div className="flex flex-col gap-1 mb-5">
          <span className="text-xl font-semibold text-mono">Needs attention</span>
          <span className="text-sm text-secondary-foreground">Follow up on overdue items</span>
        </div>
        {loading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <div className="flex flex-col gap-3 rounded-lg bg-accent/50 p-5">
            <AccentListRow
              title="Overdue invoices"
              trailing={String(overdueCount)}
              trailingClassName={overdueCount > 0 ? 'text-destructive' : 'text-muted-foreground'}
              to={routes.invoices}
            />
            <AccentListRow
              title="Unpaid bills"
              trailing={String(unpaidCount)}
              trailingClassName={unpaidCount > 0 ? 'text-amber-600' : 'text-muted-foreground'}
              to={routes.bills}
            />
            <AccentListRow
              title="Open invoices"
              trailing={String(overview?.kpi?.open_invoice_count ?? 0)}
              to={routes.invoices}
            />
          </div>
        )}
      </CardContent>
      <CardFooter className="justify-center">
        <Button mode="link" underlined="dashed" asChild>
          <Link to={routes.invoices}>View all invoices</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export function BusinessReviewTab({ companyId, overview, loading, companyName }) {
  const kpi = overview?.kpi;
  const chart = overview?.chart;
  const currency = overview?.company?.currency || 'USD';
  const base = `/workspace/${companyId}`;
  const activeCompany = useAuthStore((s) => s.activeCompany);
  const routes = dashboardRoutes(base, activeCompany);

  return (
    <div className="grid gap-5 lg:gap-7.5">
      <div className="grid lg:grid-cols-3 gap-y-5 lg:gap-7.5 items-stretch">
        <div className="lg:col-span-1">
          <div className="grid grid-cols-2 gap-5 lg:gap-7.5 h-full items-stretch">
            <ChannelStatCard
              label="Revenue this month"
              value={fmtCurrency(kpi?.revenue_this_month, currency)}
              loading={loading}
              icon={TrendingUp}
            />
            <ChannelStatCard
              label="Expenses this month"
              value={fmtCurrency(kpi?.expenses_this_month, currency)}
              loading={loading}
              icon={TrendingDown}
            />
            <ChannelStatCard
              label="Cash & bank"
              value={fmtCurrency(kpi?.cash_bank_balance, currency)}
              loading={loading}
              icon={Landmark}
            />
            <ChannelStatCard
              label="Customers"
              value={loading ? '—' : String(kpi?.customer_count ?? 0)}
              loading={loading}
              icon={Users}
            />
          </div>
        </div>
        <div className="lg:col-span-2">
          <BusinessSummaryCallout
            companyName={companyName}
            kpi={kpi}
            currency={currency}
            loading={loading}
            base={base}
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5 lg:gap-7.5 items-stretch">
        <div className="lg:col-span-1">
          <BusinessHighlights
            overview={overview}
            currency={currency}
            loading={loading}
            base={base}
            activeCompany={activeCompany}
          />
        </div>
        <div className="lg:col-span-2">
          {chart ? (
            <DashboardRevenueChart chart={chart} currency={currency} loading={loading} />
          ) : (
            <DashboardRevenueChart chart={{ labels: [], revenue: [], expenses: [] }} currency={currency} loading={loading} />
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5 lg:gap-7.5 items-stretch">
        <div className="lg:col-span-1">
          <BusinessActionPanel overview={overview} currency={currency} loading={loading} base={base} />
        </div>
        <div className="lg:col-span-2">
          <DashboardPanel title="Top Customers" actionTo={routes.customers} icon={Users}>
            {loading ? (
              <Skeleton className="h-40 w-full rounded-lg" />
            ) : (overview?.top_customers?.length ?? 0) === 0 ? (
              <EmptyState message="No customer revenue yet." icon={Users} />
            ) : (
              <div className="flex flex-col gap-4">
                {(overview?.top_customers || []).slice(0, 5).map((c, i) => {
                  const max = overview.top_customers[0]?.total_amount ?? 1;
                  const pct = Math.round(((c.total_amount ?? 0) / max) * 100);
                  return (
                    <RankBarRow
                      key={c.id ?? i}
                      name={c.name}
                      amount={fmtCurrency(c.total_amount, currency)}
                      pct={pct}
                      to={c.id ? routes.customer(c.id) : routes.customers}
                    />
                  );
                })}
              </div>
            )}
          </DashboardPanel>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5 lg:gap-7.5">
        <DashboardPanel
          title="Overdue Invoices"
          description="Follow up on late customer payments"
          actionTo={routes.invoices}
          icon={AlertCircle}
        >
          {loading ? (
            <Skeleton className="h-32 w-full rounded-lg" />
          ) : (overview?.overdue_invoices?.length ?? 0) === 0 ? (
            <EmptyState message="No overdue invoices — great work." icon={CheckCircle2} />
          ) : (
            <div className="flex flex-col gap-2">
              {(overview?.overdue_invoices || []).slice(0, 5).map((inv) => (
                <AccentListRow
                  key={inv.id}
                  title={inv.invoice_number || '—'}
                  subtitle={`${inv.customer_name || '—'} · Due ${inv.due_date || '—'}`}
                  trailing={fmtCurrency(inv.balance_due, currency)}
                  trailingClassName="text-destructive"
                  to={routes.invoice(inv.id)}
                />
              ))}
            </div>
          )}
        </DashboardPanel>

        <DashboardPanel title="Cash & Bank Accounts" actionTo={routes.bankAccounts} icon={Wallet}>
          {loading ? (
            <Skeleton className="h-24 w-full rounded-lg" />
          ) : (overview?.account_balances?.length ?? 0) === 0 ? (
            <EmptyState message="No posted balances." icon={Landmark} />
          ) : (
            <div className="flex flex-col gap-2">
              {(overview?.account_balances || []).slice(0, 5).map((acc) => (
                <AccentListRow
                  key={acc.id}
                  title={acc.name}
                  trailing={fmtCurrency(acc.balance, currency)}
                  trailingClassName={acc.balance >= 0 ? 'text-foreground' : 'text-destructive'}
                  to={routes.chartOfAccounts}
                />
              ))}
            </div>
          )}
        </DashboardPanel>
      </div>

      <DashboardPanel
        title="Recent Transactions"
        description="Latest invoices, bills, payments, and expenses"
        icon={BarChart3}
      >
        {loading ? (
          <Skeleton className="h-48 w-full rounded-lg" />
        ) : (overview?.recent_transactions?.length ?? 0) === 0 ? (
          <EmptyState message="No recent transactions." />
        ) : (
          <div className="flex flex-col gap-2">
            {(overview?.recent_transactions || []).slice(0, 8).map((txn, i) => (
              <AccentListRow
                key={`${txn.txn_type}-${txn.txn_id ?? i}`}
                title={txn.reference_no || `#${txn.txn_id}`}
                subtitle={`${txn.party_name || '—'} · ${txn.txn_date || '—'}`}
                badge={statusBadge(txn.txn_type)}
                trailing={fmtCurrency(txn.amount, currency)}
                to={transactionPath(base, txn, activeCompany)}
              />
            ))}
          </div>
        )}
      </DashboardPanel>
    </div>
  );
}
