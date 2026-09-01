import { Link } from "react-router-dom";
import {
  AlertCircle,
  BarChart3,
  Building2,
  CheckCircle2,
  FileText,
  Landmark,
  Package,
  Receipt,
  TrendingDown,
  TrendingUp,
  Users,
  ArrowRight,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardAssetAccounts } from "./dashboard-asset-accounts";
import { DashboardFinancialSnapshot } from "./dashboard-financial-snapshot";
import { DashboardQuickActions } from "./dashboard-quick-actions";
import { DashboardRevenueChart } from "./dashboard-revenue-chart";
import { DashboardSectionHeader } from "./dashboard-section-header";
import { HomeActiveSessions } from "./home-active-sessions";
import { HomeInvoiceHighlights } from "./home-invoice-highlights";
import { HomePlanDetails } from "./home-plan-details";
import { RecentInvoicesTable } from "./recent-invoices-table";
import { WorkspaceGettingStarted } from "./workspace-getting-started";
import {
  DashboardPanel,
  DashboardStatPill,
  EmptyState,
  RankBarRow,
  dashboardRoutes,
  fmtCurrency,
  statusBadge,
  transactionPath,
} from "./dashboard-ui";
import { useAuthStore } from "@/store/authStore";

export function UnifiedDashboard({
  companyId,
  overview,
  overviewLoading,
  dash,
  dashLoading,
}) {
  const kpi = overview?.kpi;
  const chart = overview?.chart ?? dash?.chart;
  const currency =
    overview?.company?.currency || dash?.company?.currency || "USD";
  const base = `/workspace/${companyId}`;
  const activeCompany = useAuthStore((s) => s.activeCompany);
  const routes = dashboardRoutes(base, activeCompany);
  const loading = overviewLoading || dashLoading;
  const stats = dash?.stats;
  const topVendors = overview?.top_vendors?.length
    ? overview.top_vendors
    : (dash?.top_vendors ?? []);
  const unpaidBills =
    overview?.unpaid_bills?.length > 0
      ? overview.unpaid_bills
      : (dash?.recent_bills ?? []).filter((b) =>
          ["open", "partial"].includes(b.status),
        );

  return (
    <div className="grid gap-5">
      <WorkspaceGettingStarted
        companyId={companyId}
        overview={overview}
        dash={dash}
        loading={loading}
      />

      <DashboardFinancialSnapshot
        kpi={kpi}
        stats={stats}
        currency={currency}
        loading={loading}
        routes={routes}
      />

      <DashboardQuickActions companyId={companyId} />

      <section className="grid items-start gap-4 lg:grid-cols-2">
        <DashboardRevenueChart
          chart={chart ?? { labels: [], revenue: [], expenses: [] }}
          currency={currency}
          loading={loading}
          reportTo={routes.profitLoss}
        />
        <DashboardAssetAccounts
          companyId={companyId}
          accounts={overview?.asset_accounts ?? []}
          currency={currency}
          loading={overviewLoading}
        />
      </section>

      {/* Operating metrics */}
      {/* <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <DashboardStatPill
          icon={Users}
          label="Customers"
          value={String(kpi?.customer_count ?? stats?.customer_count ?? 0)}
          loading={loading}
          to={routes.customers}
        />

        <DashboardStatPill
          icon={Building2}
          label="Vendors"
          value={String(kpi?.vendor_count ?? stats?.vendor_count ?? 0)}
          loading={loading}
          to={routes.vendors}
        />

        <DashboardStatPill
          icon={FileText}
          label="Invoices"
          value={String(kpi?.invoice_count ?? stats?.open_invoice_count ?? 0)}
          sub="Total issued"
          loading={loading}
          to={routes.invoices}
        />

        <DashboardStatPill
          icon={Package}
          label="Products"
          value={String(kpi?.product_count ?? stats?.product_count ?? 0)}
          loading={loading}
          to={routes.products}
        />
      </div> */}


      {/* Receivables & payables detail */}
      {/* <section className="grid gap-4 lg:gap-5">
        <DashboardSectionHeader
          title="Receivables & payables"
          description="Outstanding customer balances and vendor obligations"
        />
        <div className="grid gap-5 lg:grid-cols-2 lg:gap-7.5">
          <DashboardPanel
            title="Accounts receivable"
            description="Open and overdue customer invoices"
            actionTo={routes.invoices}
            icon={TrendingUp}
            theme="emerald"
          >
            {loading ? (
              <Skeleton className="h-36 w-full rounded-lg" />
            ) : (
              <>
                <div className="mb-4 grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/[0.05] p-3">
                    <p className="text-xs text-muted-foreground">
                      Total outstanding
                    </p>
                    <p className="mt-1 text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                      {fmtCurrency(
                        kpi?.balance_due ?? stats?.balance_due,
                        currency,
                      )}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">
                      Overdue count
                    </p>
                    <p className="mt-1 text-lg font-bold tabular-nums">
                      {overview?.overdue_invoices?.length ??
                        stats?.overdue_count ??
                        0}
                    </p>
                  </div>
                </div>
                {(overview?.overdue_invoices?.length ?? 0) === 0 ? (
                  <EmptyState
                    message="No overdue receivables — collections are on track."
                    icon={CheckCircle2}
                  />
                ) : (
                  <div className="flex flex-col gap-2">
                    {(overview?.overdue_invoices || [])
                      .slice(0, 5)
                      .map((inv) => (
                        <AccentListRow
                          key={inv.id}
                          title={inv.invoice_number || '—'}
                          subtitle={`${inv.customer_name || "—"} · Due ${inv.due_date || "—"}`}
                          trailing={fmtCurrency(inv.balance_due, currency)}
                          trailingClassName="text-destructive"
                          to={routes.invoice(inv.id)}
                          theme="emerald"
                        />
                      ))}
                  </div>
                )}
              </>
            )}
          </DashboardPanel>

          <DashboardPanel
            title="Accounts payable"
            description="Open bills and amounts owed to vendors"
            actionTo={routes.bills}
            icon={TrendingDown}
            theme="orange"
          >
            {loading ? (
              <Skeleton className="h-36 w-full rounded-lg" />
            ) : (
              <>
                <div className="mb-4 grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-orange-500/15 bg-orange-500/[0.05] p-3">
                    <p className="text-xs text-muted-foreground">
                      Total outstanding
                    </p>
                    <p className="mt-1 text-lg font-bold tabular-nums text-orange-700 dark:text-orange-300">
                      {fmtCurrency(
                        kpi?.bills_balance_due ?? stats?.bills_balance_due,
                        currency,
                      )}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">
                      Unpaid bills
                    </p>
                    <p className="mt-1 text-lg font-bold tabular-nums">
                      {kpi?.unpaid_bill_count ??
                        stats?.bill_count ??
                        unpaidBills.length}
                    </p>
                  </div>
                </div>
                {unpaidBills.length === 0 ? (
                  <EmptyState
                    message="No unpaid payables at the moment."
                    icon={Receipt}
                  />
                ) : (
                  <div className="flex flex-col gap-2">
                    {unpaidBills.slice(0, 5).map((bill) => (
                      <AccentListRow
                        key={bill.id}
                        title={
                          bill.bill_number || bill.reference || '—'
                        }
                        subtitle={`${bill.vendor_name || "—"} · Due ${bill.due_date || bill.bill_date || "—"}`}
                        trailing={fmtCurrency(
                          bill.balance_due ?? bill.total,
                          currency,
                        )}
                        trailingClassName="text-orange-700 dark:text-orange-400"
                        to={routes.bill(bill.id)}
                        theme="orange"
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </DashboardPanel>
        </div>
      </section> */}

      {/* Activity */}
      <section className="grid gap-4 lg:gap-5">
        <DashboardSectionHeader
          title="Recent activity"
          description="Latest invoices and collection summary"
        />
        <div className="grid items-stretch gap-5 lg:grid-cols-3 lg:gap-7.5">
          <div className="lg:col-span-2">
            <RecentInvoicesTable
              companyId={companyId}
              invoices={(dash?.recent_invoices || []).slice(0, 5)}
              loading={dashLoading}
              actionTo={routes.invoices}
            />
          </div>
          <div className="flex flex-col gap-5 lg:col-span-1 lg:gap-7.5">
            <HomeInvoiceHighlights
              companyId={companyId}
              stats={stats}
              currency={currency}
              loading={dashLoading}
            />
          </div>
        </div>
      </section>

      {/* Partners */}
      {/* <section className="grid gap-4 lg:gap-5">
        <DashboardSectionHeader
          title="Top partners"
          description="Highest revenue customers and spend by vendor"
        />
        <div className="grid gap-5 lg:grid-cols-2 lg:gap-7.5">
          <DashboardPanel
            title="Top customers"
            actionTo={routes.customers}
            icon={Users}
            theme="violet"
          >
            {overviewLoading ? (
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
                      theme="violet"
                    />
                  );
                })}
              </div>
            )}
          </DashboardPanel>

          <DashboardPanel
            title="Top vendors"
            actionTo={routes.vendors}
            icon={Building2}
            theme="amber"
          >
            {loading ? (
              <Skeleton className="h-40 w-full rounded-lg" />
            ) : topVendors.length === 0 ? (
              <EmptyState
                message="No vendor spend recorded yet."
                icon={Building2}
              />
            ) : (
              <div className="flex flex-col gap-4">
                {topVendors.slice(0, 5).map((v, i) => {
                  const max = topVendors[0]?.total ?? 1;
                  const pct = Math.round(((v.total ?? 0) / max) * 100);
                  return (
                    <RankBarRow
                      key={v.id ?? i}
                      name={v.name}
                      amount={fmtCurrency(v.total, currency)}
                      pct={pct}
                      to={v.id ? routes.vendor(v.id) : routes.vendors}
                      theme="amber"
                    />
                  );
                })}
              </div>
            )}
          </DashboardPanel>
        </div>
      </section> */}

      {/* Treasury */}
      {/* <section className="grid gap-4 lg:gap-5">
        <DashboardSectionHeader
          title="Treasury & transactions"
          description="Cash positions and latest ledger activity"
        />
        <div className="grid gap-5 lg:grid-cols-2 lg:gap-7.5">
          <DashboardPanel title="Cash & bank accounts" actionTo={routes.bankAccounts} icon={Wallet} theme="blue">
            {overviewLoading ? (
              <Skeleton className="h-24 w-full rounded-lg" />
            ) : (overview?.account_balances?.length ?? 0) === 0 ? (
              <EmptyState message="No posted balances." icon={Landmark} />
            ) : (
              <div className="flex flex-col gap-2">
                {(overview?.account_balances || []).slice(0, 6).map((acc) => (
                  <AccentListRow
                    key={acc.id}
                    title={acc.name}
                    trailing={fmtCurrency(acc.balance, currency)}
                    trailingClassName={acc.balance >= 0 ? 'text-foreground' : 'text-destructive'}
                    to={routes.chartOfAccounts}
                    theme="blue"
                  />
                ))}
              </div>
            )}
          </DashboardPanel>

          <DashboardPanel
            title="Recent transactions"
            description="Latest invoices, bills, payments, and expenses"
            icon={BarChart3}
            theme="cyan"
          >
            {overviewLoading ? (
              <Skeleton className="h-48 w-full rounded-lg" />
            ) : (overview?.recent_transactions?.length ?? 0) === 0 ? (
              <EmptyState message="No recent transactions." icon={AlertCircle} />
            ) : (
              <div className="flex flex-col gap-2">
                {(overview?.recent_transactions || []).slice(0, 6).map((txn, i) => (
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
      </section> */}

      {/* <HomeActiveSessions /> */}
    </div>
  );
}
