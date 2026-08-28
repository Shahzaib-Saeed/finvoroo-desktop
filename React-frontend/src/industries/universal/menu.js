import { BASE_SIDEBAR_MENU, cloneMenu } from '../nav/base-sidebar';
import { getBaseMegaMenuColumns } from '../nav/base-mega-menu';
import { BASE_SECTION_NAV, cloneSections } from '../nav/base-section-nav';

export function getUniversalSidebarMenu() {
  return cloneMenu(BASE_SIDEBAR_MENU);
}

export function getUniversalMegaMenuColumns(companyId) {
  return getBaseMegaMenuColumns(companyId);
}

export function getUniversalSectionNav() {
  return cloneSections(BASE_SECTION_NAV);
}
