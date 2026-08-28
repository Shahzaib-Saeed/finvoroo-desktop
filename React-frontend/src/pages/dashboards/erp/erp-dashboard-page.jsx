import { useEffect, useState } from 'react';
import { Fragment } from 'react';
import { Navigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { Container } from '@/components/common/container';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import { authCookies } from '@/auth/auth-cookies';
import { authService } from '@/auth/services/auth-service';
import { AccountOwnerDashboard } from './account-owner-dashboard';
import { HomeTab } from '@/pages/workspace/dashboard/home-tab';

export function ErpDashboardPage() {
  const user = authService.getUser();
  const isOwner = (user?.role ?? '') === 'company_owner';

  // Account owners always see the account-level dashboard on / and /dashboard,
  // even if a workspace company id is still in cookies from a prior visit.
  if (isOwner) {
    return <AccountOwnerDashboard />;
  }

  const hasCompanyContext = !!authCookies.getCompanyId();
  if (!hasCompanyContext) {
    return <Navigate to="/select-company" replace />;
  }

  return <WorkspaceCompanyDashboard />;
}

function WorkspaceCompanyDashboard() {
  const companyId = authCookies.getCompanyId();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/workspace/dashboard');
      setData(res.data.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [companyId]);

  return (
    <Fragment>
      <Container className="pb-8">
        {error ? (
          <Alert variant="destructive" className="mb-5">
            <AlertCircle className="size-4" />
            <AlertTitle>{error}</AlertTitle>
          </Alert>
        ) : null}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {data?.company?.name || 'Dashboard'}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Company workspace overview
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <HomeTab companyId={companyId} dash={data} loading={loading} />
      </Container>
    </Fragment>
  );
}
