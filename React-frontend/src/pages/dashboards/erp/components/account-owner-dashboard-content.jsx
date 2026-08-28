import { useMemo } from 'react';
import { Building2, Bell, CheckCircle2, TrendingUp } from 'lucide-react';
import { AccountStatCards } from './account-stat-cards';
import { AccountCompaniesTable } from './account-companies-table';
import { AccountPlanPanel, AccountQuickStatsFooter } from './account-plan-panel';
import { AccountPortfolioChart } from './account-portfolio-chart';
import { PlanLimitBanner } from '@/pages/companies/components/companies-ui';

function fmtMoney(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

export function AccountOwnerDashboardContent({
  data,
  notifications,
  loading,
  onOpenCompany,
}) {
  const account = data?.account;
  const usage = data?.usage;
  const companies = data?.companies ?? [];

  const totals = useMemo(() => {
    return (companies ?? []).reduce(
      (acc, c) => {
        acc.arOutstanding += Number(c.stats?.ar_outstanding ?? 0);
        acc.collected += Number(c.stats?.collected ?? 0);
        acc.openInvoices += Number(c.stats?.open_invoices ?? 0);
        return acc;
      },
      { arOutstanding: 0, collected: 0, openInvoices: 0 },
    );
  }, [companies]);

  const collectedFull = fmtMoney(totals.collected);

  const statItems = [
    {
      icon: Building2,
      label: 'Total companies',
      value: loading ? '—' : String(usage?.companies ?? 0),
      hint: `${usage?.slots_remaining ?? 0} slots remaining`,
      tone: 'companies',
    },
    {
      icon: CheckCircle2,
      label: 'Active workspaces',
      value: loading ? '—' : String(usage?.active_companies ?? 0),
      hint: 'Ready to open',
      tone: 'active',
    },
    {
      icon: TrendingUp,
      label: 'Collected revenue',
      value: loading ? '—' : collectedFull,
      title: collectedFull,
      hint: `${fmtMoney(totals.arOutstanding)} receivables open`,
      tone: 'revenue',
    },
    {
      icon: Bell,
      label: 'Unread alerts',
      value: loading ? '—' : String(data?.unread_notifications ?? 0),
      hint: totals.openInvoices ? `${totals.openInvoices} open invoices` : 'No open invoices',
      tone: 'alerts',
    },
  ];

  return (
    <div className="grid gap-6 pb-8 lg:gap-8">
      {!loading && usage && !usage.can_create_company ? (
        <PlanLimitBanner usage={usage} account={account} showCreateAction={false} />
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 lg:gap-5">
        <AccountStatCards items={statItems} loading={loading} />
      </div>

      <AccountCompaniesTable
        companies={companies}
        loading={loading}
        onOpen={onOpenCompany}
      />

      <div className="grid items-stretch gap-5 lg:grid-cols-3 lg:gap-6">
        <div className="lg:col-span-1">
          <AccountPlanPanel
            account={account}
            usage={usage}
            unreadNotifications={data?.unread_notifications ?? 0}
            notifications={notifications}
            loading={loading}
          />
        </div>
        <div className="lg:col-span-2">
          <AccountPortfolioChart companies={companies} loading={loading} />
        </div>
      </div>

      <AccountQuickStatsFooter account={account} loading={loading} />
    </div>
  );
}
