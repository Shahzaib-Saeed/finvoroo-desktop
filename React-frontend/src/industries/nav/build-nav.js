import { resolveUiPack } from '../resolve';
import {
  getUniversalMegaMenuColumns,
  getUniversalSectionNav,
  getUniversalSidebarMenu,
} from '../universal/menu';
import {
  getPharmacyMegaMenuColumns,
  getPharmacySectionNav,
  getPharmacySidebarMenu,
} from '../pharmacy/menu';

/**
 * Single nav builder for sidebar + mega-menu + section-nav.
 * @param {string|object} companyOrKey activeCompany or industry/ui pack key
 */
export function getWorkspaceNav(companyOrKey) {
  const uiPack = resolveUiPack(companyOrKey);

  if (uiPack === 'pharmacy') {
    return {
      uiPack,
      sidebar: getPharmacySidebarMenu(),
      getMegaMenuColumns: getPharmacyMegaMenuColumns,
      sectionNav: getPharmacySectionNav(),
    };
  }

  return {
    uiPack: 'universal',
    sidebar: getUniversalSidebarMenu(),
    getMegaMenuColumns: getUniversalMegaMenuColumns,
    sectionNav: getUniversalSectionNav(),
  };
}
