import { HomeActiveSessions } from './home-active-sessions';
import { HomeInvoiceHighlights } from './home-invoice-highlights';
import { HomePlanDetails } from './home-plan-details';
import { HomeQuickSetup } from './home-quick-setup';
import { RecentInvoicesTable } from './recent-invoices-table';

export function HomeTab({ companyId, dash, loading }) {
  const stats = dash?.stats;
  const currency = dash?.company?.currency || 'USD';
  const base = `/workspace/${companyId}`;

  return (
    <div className="grid gap-5 lg:gap-7.5">
      <div className="grid lg:grid-cols-3 gap-5 lg:gap-7.5 items-stretch">
        <div className="lg:col-span-2">
          <HomeQuickSetup companyId={companyId} />
        </div>
        <div className="lg:col-span-1">
          <HomeInvoiceHighlights
            companyId={companyId}
            stats={stats}
            currency={currency}
            loading={loading}
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5 lg:gap-7.5 items-stretch">
        <div className="lg:col-span-2">
          <RecentInvoicesTable
            companyId={companyId}
            invoices={(dash?.recent_invoices || []).slice(0, 5)}
            loading={loading}
            actionTo={`${base}/accounting/invoices`}
          />
        </div>
        <div className="lg:col-span-1 flex flex-col gap-5 lg:gap-7.5">
          <HomePlanDetails subscription={dash?.subscription} loading={loading} />
          <HomeActiveSessions />
        </div>
      </div>
    </div>
  );
}
