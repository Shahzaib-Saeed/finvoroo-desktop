/** Route-based accent: pharmacy operations = emerald, universal ERP = blue. */

export const INDUSTRY_ACCENT = {
  UNIVERSAL: 'universal',
  PHARMACY: 'pharmacy',
};

const PHARMACY_PATH = /^\/workspace\/[^/]+\/pharmacy(\/|$)/;

/** True when pathname is inside pharmacy operations (dispense, receive, medicines, etc.). */
export function isPharmacyRoute(pathname) {
  return PHARMACY_PATH.test(String(pathname || ''));
}

/** @returns {'pharmacy' | 'universal'} */
export function resolveIndustryAccent(pathname) {
  return isPharmacyRoute(pathname) ? INDUSTRY_ACCENT.PHARMACY : INDUSTRY_ACCENT.UNIVERSAL;
}

/** True for nav links / menu paths that belong to the pharmacy zone. */
export function isPharmacyNavPath(path) {
  return /\/pharmacy(\/|$)/.test(String(path || ''));
}
