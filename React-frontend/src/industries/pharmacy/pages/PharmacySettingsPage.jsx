import { Navigate, useParams, useSearchParams } from 'react-router';
import { SETTINGS_TAB_ALIASES } from '@/pages/accounting/settings/constants';

/** Kept so old /pharmacy/settings bookmarks land on the merged Settings page. */
export function PharmacySettingsPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const rawTab = searchParams.get('tab') || '';
  const tab = SETTINGS_TAB_ALIASES[rawTab] || (rawTab === 'print' || rawTab === 'pharmacy' ? rawTab : 'pharmacy');

  if (!id) {
    return <Navigate to="/" replace />;
  }

  return <Navigate to={`/workspace/${id}/accounting/settings?tab=${tab}`} replace />;
}
