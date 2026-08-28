import { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { resolvePageTitle } from '@/lib/page-title';

/**
 * Sets document.title on every route change (workspace + account routes).
 */
export function PageTitleManager() {
  const { pathname } = useLocation();
  const title = useMemo(() => resolvePageTitle(pathname), [pathname]);

  return (
    <Helmet>
      <title>{title}</title>
    </Helmet>
  );
}
