import { Navigate, useParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { resolveIndustryFeatures } from './resolve';

/**
 * Soft-gate industry shell pages. If the company pack does not enable the
 * feature, redirect to the workspace dashboard.
 */
export function IndustryModuleGate({ feature, children }) {
  const { id: companyId } = useParams();
  const company = useAuthStore((s) => s.activeCompany);
  const features = resolveIndustryFeatures(company);

  if (feature && !features[feature]) {
    return <Navigate to={`/workspace/${companyId}`} replace />;
  }

  return children;
}
