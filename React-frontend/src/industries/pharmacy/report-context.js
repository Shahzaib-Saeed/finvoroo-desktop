/** Accounting routes opened from the pharmacy reports hub (sidebar-only navigation). */
export const PHARMACY_LINKED_REPORT_PATHS = [
  '/accounting/reports/category-trading',
  '/accounting/bills',
  '/accounting/reports',
];

export function getPharmacyReportsHub(companyId) {
  return `/workspace/${companyId}/pharmacy/reports`;
}

export function relativeWorkspacePath(pathname, companyId) {
  const prefix = `/workspace/${companyId}`;
  if (!pathname.startsWith(prefix)) return '';
  return pathname.slice(prefix.length) || '/';
}

export function isPharmacyLinkedReportPath(relativePath) {
  return PHARMACY_LINKED_REPORT_PATHS.some(
    (segment) => relativePath === segment || relativePath.startsWith(`${segment}/`),
  );
}

export function isPharmacyReportSurface(pathname, companyId, features) {
  if (!features?.pharmacy_shell || !companyId) return false;
  const rel = relativeWorkspacePath(pathname, companyId);
  return /^\/pharmacy(\/|$)/.test(rel) || isPharmacyLinkedReportPath(rel);
}

/** Hide the sticky workspace section bar on native pharmacy routes only. */
export function shouldHidePharmacySectionNav(pathname, companyId, features) {
  if (!features?.pharmacy_shell || !companyId) return false;
  const rel = relativeWorkspacePath(pathname, companyId);
  if (/^\/pharmacy(\/|$)/.test(rel)) return true;
  return false;
}
