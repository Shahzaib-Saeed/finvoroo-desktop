import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { authCookies } from '@/auth/auth-cookies';

const COMPANY_EXEMPT_PATHS = [
  '/select-company',
  '/onboarding',
  '/companies',
  '/companies/create',
  '/profile',
];
const ACCOUNT_OWNER_SHELL_PATHS = ['/', '/dashboard', '/profile', '/companies', '/help'];

function isAccountOwnerShellRoute(pathname) {
  return ACCOUNT_OWNER_SHELL_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function AuthGuard() {
  const location = useLocation();
  const { token, user, companies, hydrated, hydrating, hydrate, getSuperAdminBrowsingOwnerId } =
    useAuthStore();

  useEffect(() => {
    if (!hydrated && !hydrating) {
      hydrate();
    }
  }, [hydrated, hydrating, hydrate]);

  if (!hydrated || hydrating) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const effectiveToken = token || authCookies.getToken();
  if (!effectiveToken) {
    return <Navigate to="/auth/signin" state={{ from: location }} replace />;
  }

  const isSuperAdmin = (user?.role ?? '') === 'super_admin';
  const isWorkspaceRoute = location.pathname.startsWith('/workspace');
  const isOwner = (user?.role ?? '') === 'company_owner';
  const companyCount = (companies || []).length;
  const onboardingRequired =
    isOwner && companyCount === 0 && location.pathname !== '/onboarding';

  // Force company onboarding before ERP / account shell.
  if (onboardingRequired && !location.pathname.startsWith('/auth/')) {
    return <Navigate to="/onboarding" replace />;
  }

  if (isSuperAdmin) {
    if (isWorkspaceRoute) {
      const companyId = authCookies.getCompanyId();
      const browsingOwnerId = getSuperAdminBrowsingOwnerId();
      if (!companyId || !browsingOwnerId) {
        return <Navigate to="/superadmin/dashboard" replace />;
      }
      return (
        <div className="w-full min-h-screen">
          <Outlet />
        </div>
      );
    }

    if (isAccountOwnerShellRoute(location.pathname)) {
      return <Navigate to="/superadmin/dashboard" replace />;
    }
  }

  const companyId = authCookies.getCompanyId();
  const isExempt =
    COMPANY_EXEMPT_PATHS.some((p) => location.pathname.startsWith(p)) ||
    (isOwner && isAccountOwnerShellRoute(location.pathname) && !onboardingRequired);

  if (!companyId && !isExempt) {
    return <Navigate to="/select-company" replace />;
  }

  return (
    <div className="w-full min-h-screen">
      <Outlet />
    </div>
  );
}
