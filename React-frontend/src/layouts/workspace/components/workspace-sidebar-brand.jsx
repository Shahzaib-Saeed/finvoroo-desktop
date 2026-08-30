import { Link, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { toAbsoluteUrl } from '@/lib/helpers';
import { getWorkspaceHomePath, resolveUiPack } from '@/industries';
import { useAuthStore } from '@/store/authStore';
import {
  PHARMACY_BRAND_LOGO,
  PHARMACY_BRAND_TITLE,
} from '@/industries/pharmacy/branding';

export function WorkspaceSidebarBrand({
  collapsed,
  companyName,
  compact = false,
  linkless = false,
}) {
  const { id: companyId } = useParams();
  const activeCompany = useAuthStore((s) => s.activeCompany);
  const isPharmacy = resolveUiPack(activeCompany) === 'pharmacy';
  const homePath = getWorkspaceHomePath(activeCompany || { id: companyId });

  const labelClass = cn(
    'font-bold leading-tight whitespace-nowrap transition-all duration-300 overflow-hidden',
    compact ? 'text-sm' : 'text-base',
    collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100',
  );

  const content = isPharmacy ? (
    <>
      <img
        src={toAbsoluteUrl(PHARMACY_BRAND_LOGO)}
        className={cn(
          'shrink-0 object-contain',
          compact ? 'size-7' : 'size-10',
        )}
        alt=""
      />
      <span className={labelClass}>
        Finvoroo <span className="text-emerald-700">Pharmacy</span>
      </span>
    </>
  ) : (
    <>
      <img
        src={toAbsoluteUrl('/media/app/finvoroo.svg')}
        className={cn(
          'max-w-none shrink-0',
          compact ? 'size-7' : 'h-10',
        )}
        alt="Finvoroo"
      />
      <span className={cn(labelClass, 'text-primary')}>
        {companyName || 'Workspace'}
      </span>
    </>
  );

  const className = 'flex min-w-0 items-center gap-2 overflow-hidden';

  if (linkless) {
    return (
      <span className={className} aria-label={isPharmacy ? PHARMACY_BRAND_TITLE : companyName}>
        {content}
      </span>
    );
  }

  return (
    <Link
      to={isPharmacy ? homePath : '/'}
      className={className}
      aria-label={isPharmacy ? PHARMACY_BRAND_TITLE : companyName || 'Workspace'}
    >
      {content}
    </Link>
  );
}
