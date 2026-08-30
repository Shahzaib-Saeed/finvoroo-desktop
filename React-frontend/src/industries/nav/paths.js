import { useAuthStore } from '@/store/authStore';
import { resolveIndustryFeatures } from '../resolve';

export function resolveMegaPath(path, companyId) {
  return path.replace(':id', String(companyId));
}

/**
 * Default landing route after selecting or switching a company workspace.
 * Pharmacy workspaces open the pharmacy operations dashboard; others use the
 * universal accounting dashboard.
 */
export function getWorkspaceHomePath(companyOrId, companies) {
  let company = companyOrId;

  if (company == null) {
    return '/select-company';
  }

  if (typeof company !== 'object') {
    const list = companies ?? useAuthStore.getState().companies ?? [];
    company = list.find((c) => String(c.id) === String(companyOrId)) ?? { id: companyOrId };
  }

  const companyId = company.id ?? companyOrId;
  if (!companyId) return '/select-company';

  if (resolveIndustryFeatures(company).pharmacy_shell) {
    return `/workspace/${companyId}/pharmacy`;
  }

  return `/workspace/${companyId}`;
}
