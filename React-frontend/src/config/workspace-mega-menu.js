/**
 * Workspace topbar mega-menu helpers.
 * Column definitions live in @/industries/nav — use getWorkspaceNav() for
 * industry-aware menus. This file keeps path helpers + permission filters.
 */

import { getBaseMegaMenuColumns } from '@/industries/nav/base-mega-menu';
import { resolveMegaPath as resolveIndustryMegaPath } from '@/industries/nav/paths';

export function resolveMegaPath(path, companyId) {
  return resolveIndustryMegaPath(path, companyId);
}

/** @param {string|number} companyId */
export function getWorkspaceMegaMenuColumns(companyId) {
  return getBaseMegaMenuColumns(companyId);
}

/**
 * Prunes mega-menu columns down to links the current user can see.
 */
export function filterMegaMenuColumns(columns, canFn, features = {}) {
  return (columns ?? [])
    .map((column) => {
      const sections = (column.sections ?? [])
        .map((section) => ({
          ...section,
          links: (section.links ?? []).filter((link) => {
            if (link.feature && !features[link.feature]) return false;
            return !link.permission || canFn(link.permission);
          }),
        }))
        .filter((section) => section.links.length > 0);

      return { ...column, sections };
    })
    .filter((column) => column.sections.length > 0);
}

export function isMegaLinkActive(pathname, linkPath, search = '') {
  if (!linkPath) return false;

  const [basePath, linkQuery = ''] = linkPath.split('?');
  const pathMatches = basePath.match(/\/workspace\/\d+$/)
    ? pathname === basePath
    : pathname === basePath || pathname.startsWith(`${basePath}/`);

  if (!pathMatches) return false;

  if (!linkQuery) return true;

  const expected = new URLSearchParams(linkQuery);
  const current = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  for (const [key, value] of expected.entries()) {
    if (current.get(key) !== value) return false;
  }
  return true;
}

/** True when any link inside these sections matches the current path. */
export function isMegaSectionGroupActive(pathname, sections) {
  if (!sections?.length) return false;
  return sections.some((section) =>
    section.links?.some((link) => isMegaLinkActive(pathname, link.path)),
  );
}

/**
 * Top-level workspace nav items for the horizontal mega menu (demo1-style).
 */
export function getWorkspaceMegaMenuNav(companyId) {
  const columns = getWorkspaceMegaMenuColumns(companyId);
  const allSections = columns.flatMap((col) => col.sections);
  const items = [];

  const main = allSections.find((s) => s.id === 'core' || s.title === 'Main' || s.title === 'Core & system');
  const dashboard = main?.links?.find((l) => l.title === 'Dashboard');
  if (dashboard?.path) {
    items.push({
      key: 'dashboard',
      title: 'Dashboard',
      path: dashboard.path,
    });
  }

  for (const section of allSections) {
    if (section.id === 'core' || section.title === 'Main' || section.title === 'Core & system') continue;
    items.push({
      key: section.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      title: section.title,
      sections: [section],
    });
  }

  return items;
}
