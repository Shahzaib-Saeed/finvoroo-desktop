import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { authCookies } from '@/auth/auth-cookies';

export function SuperAdminGuard() {
  const location = useLocation();
  const { token, user, hydrated, hydrating, hydrate } = useAuthStore();

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
    return <Navigate to="/superadmin/login" state={{ from: location }} replace />;
  }

  if ((user?.role ?? '') !== 'super_admin') {
    return <Navigate to="/superadmin/login" replace />;
  }

  return (
    <div className="w-full min-h-screen">
      <Outlet />
    </div>
  );
}
