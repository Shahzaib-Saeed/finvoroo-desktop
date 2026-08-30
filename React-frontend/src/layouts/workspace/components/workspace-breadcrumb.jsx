import { useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { PageBreadcrumb } from '@/components/ui/page-breadcrumb';
import { getWorkspaceBreadcrumb } from '@/lib/workspace-breadcrumb';
export function WorkspaceBreadcrumb({ className }) {
  const { id: companyId } = useParams();
  const { pathname } = useLocation();

  const items = useMemo(
    () => getWorkspaceBreadcrumb(pathname, companyId),
    [pathname, companyId],
  );

  if (!items.length) return null;

  return <PageBreadcrumb items={items} className={className} />;
}
