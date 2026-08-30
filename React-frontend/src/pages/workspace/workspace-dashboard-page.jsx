import { useEffect, useMemo } from 'react';
import { Link, Navigate, useOutletContext, useParams } from 'react-router-dom';
import { Briefcase, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { resolveIndustryFeatures, resolveIndustryPack } from '@/industries';
import { UnifiedDashboard } from './dashboard/unified-dashboard';
import { useDashboardData } from './dashboard/useDashboardData';
import { useDashboardRefresh } from './dashboard/DashboardRefreshContext';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatToday() {
  return new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatLastUpdated(date) {
  if (!date) return null;
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export function WorkspaceDashboardPage() {
  const { id: companyId } = useParams();
  const activeCompany = useAuthStore((s) => s.activeCompany);
  const isPharmacyWorkspace = useMemo(
    () => !!resolveIndustryFeatures(activeCompany).pharmacy_shell,
    [activeCompany],
  );

  if (isPharmacyWorkspace) {
    return <Navigate to={`/workspace/${companyId}/pharmacy`} replace />;
  }

  return <UniversalWorkspaceDashboard companyId={companyId} />;
}

function UniversalWorkspaceDashboard({ companyId }) {
  const context = useOutletContext();
  const companyName = context?.companyName || `Company #${companyId}`;
  const activeCompany = useAuthStore((s) => s.activeCompany);
  const industryPack = useMemo(
    () => resolveIndustryPack(activeCompany),
    [activeCompany],
  );

  const {
    dash,
    overview,
    loading,
    refreshing,
    lastUpdated,
    refresh,
    silentRefresh,
  } = useDashboardData(companyId);

  // Register this page's silentRefresh into the layout-level context ref
  // so other pages (invoices, bills, payments) can trigger a dashboard refresh.
  const { registerDashRefresh } = useDashboardRefresh();
  useEffect(() => {
    registerDashRefresh(silentRefresh);
    return () => registerDashRefresh(null);
  }, [registerDashRefresh, silentRefresh]);

  const isRefreshing = refreshing || loading;
  const jobsPath = `/workspace/${companyId}/accounting/job-orders`;
  const showJobOrders = industryPack?.key !== 'pharmacy';

  return (
      <div className="grid gap-6 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {greeting()}, {companyName}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {formatToday()}
              {lastUpdated && !loading ? ` · Updated ${formatLastUpdated(lastUpdated)}` : ''}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {showJobOrders ? (
              <Button variant="outline" size="sm" asChild>
                <Link to={jobsPath}>
                  <Briefcase className="size-3.5 mr-1.5" />
                  Job orders
                </Link>
              </Button>
            ) : null}
            <Button variant="outline" size="sm" onClick={refresh} disabled={isRefreshing}>
              <RefreshCw className={cn('size-3.5 mr-1.5', isRefreshing && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </div>

        <UnifiedDashboard
          companyId={companyId}
          overview={overview}
          overviewLoading={loading}
          dash={dash}
          dashLoading={loading}
        />
      </div>
  );
}
