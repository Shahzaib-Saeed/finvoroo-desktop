import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { authCookies } from '@/auth/auth-cookies';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function SuperAdminWorkspaceBanner() {
  const navigate = useNavigate();
  const { getSuperAdminBrowsingOwnerId, clearSuperAdminBrowsing } = useAuthStore();
  const browsingOwnerId = getSuperAdminBrowsingOwnerId();

  if (!browsingOwnerId) {
    return null;
  }

  function handleReturn() {
    authCookies.clearCompanyId();
    clearSuperAdminBrowsing();
    navigate('/superadmin/dashboard');
  }

  return (
    <Alert className="mb-4 border-amber-500/40 bg-amber-500/10">
      <ShieldAlert className="size-4 text-amber-600" />
      <AlertTitle>Support mode</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
        <span>You are browsing a customer workspace as super admin.</span>
        <Button variant="outline" size="sm" onClick={handleReturn}>
          Return to Super Admin
        </Button>
      </AlertDescription>
    </Alert>
  );
}
