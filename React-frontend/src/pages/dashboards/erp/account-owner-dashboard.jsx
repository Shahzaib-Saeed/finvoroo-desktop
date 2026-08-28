import { Fragment, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { accountApi } from '@/pages/companies/api/account.api';
import { notificationsApi } from '@/api/notifications.api';
import { isCompanyActive } from '@/pages/companies/components/companies-ui';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AccountOwnerDashboardContent } from './components/account-owner-dashboard-content';

/** Full-bleed content shell (no max-width box). */
function FluidShell({ children, className }) {
  return (
    <div className={cn('w-full px-4 sm:px-6 lg:px-8', className)}>
      {children}
    </div>
  );
}

export function AccountOwnerDashboard() {
  const navigate = useNavigate();
  const { setActiveCompany } = useAuthStore();
  const [data, setData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const [overviewRes, notifRes] = await Promise.all([
        accountApi.overview(),
        notificationsApi('account')
          .list({ per_page: 5 })
          .catch(() => ({ data: { data: [] } })),
      ]);
      setData(overviewRes.data?.data || null);
      const notifPayload = notifRes.data?.data;
      setNotifications(Array.isArray(notifPayload) ? notifPayload : notifPayload?.items ?? []);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load account dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const usage = data?.usage;

  function openWorkspace(company) {
    if (!isCompanyActive(company)) {
      toast.error('Activate this company before opening its workspace.');
      return;
    }
    setActiveCompany(company);
    navigate(`/workspace/${company.id}`);
  }

  return (
    <Fragment>
      <FluidShell>
        <Toolbar>
          <ToolbarHeading
            title="Dashboard"
            description="Central hub for your account, companies, and workspaces"
          />
          <ToolbarActions>
            <Button variant="outline" size="sm" onClick={() => load(true)} disabled={refreshing}>
              <RefreshCw className={cn('size-4', refreshing && 'animate-spin')} />
              Refresh
            </Button>
            <Button size="sm" asChild disabled={usage && !usage.can_create_company}>
              <Link to="/companies/create">
                <Plus className="size-4" />
                New company
              </Link>
            </Button>
          </ToolbarActions>
        </Toolbar>
      </FluidShell>

      <FluidShell>
        <AccountOwnerDashboardContent
          data={data}
          notifications={notifications}
          loading={loading}
          onOpenCompany={openWorkspace}
        />
      </FluidShell>
    </Fragment>
  );
}
