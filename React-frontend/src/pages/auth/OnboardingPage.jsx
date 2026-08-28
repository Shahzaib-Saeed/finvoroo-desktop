import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { FirstCompanySetup } from '@/pages/auth/FirstCompanySetup';
import { toAbsoluteUrl } from '@/lib/helpers';

function getDisplayName(user) {
  return user?.name || user?.email || 'there';
}

export function OnboardingPage() {
  const { user, companies } = useAuthStore();
  const isOwner = (user?.role ?? '') === 'company_owner';
  const hasCompanies = (companies || []).length > 0;

  if (!isOwner) {
    return <Navigate to="/select-company" replace />;
  }

  if (hasCompanies) {
    return <Navigate to="/select-company" replace />;
  }

  return (
    <div className="min-h-screen bg-[#f3f5f7]">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-10">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <img src={toAbsoluteUrl('/media/app/mini-logo.svg')} alt="" className="h-7" />
          <span className="text-sm font-semibold tracking-[0.18em] text-slate-800">FINVOROO</span>
        </div>
        <FirstCompanySetup displayName={getDisplayName(user)} />
      </div>
    </div>
  );
}
