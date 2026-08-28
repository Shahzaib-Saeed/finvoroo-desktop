import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { resolveIndustryAccent } from '@/lib/industry-accent';

/**
 * Syncs html[data-industry-accent] with the current route so --primary follows
 * pharmacy (emerald) vs universal (blue) zones.
 */
export function IndustryAccentSync() {
  const { pathname } = useLocation();

  useEffect(() => {
    const accent = resolveIndustryAccent(pathname);
    document.documentElement.dataset.industryAccent = accent;
  }, [pathname]);

  return null;
}
