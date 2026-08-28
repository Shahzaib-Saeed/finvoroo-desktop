import { getWorkspaceNav } from './nav/build-nav';
import { PharmacyIndustryRoutes } from './pharmacy/routes';
import { PHARMACY_COPY } from './pharmacy/copy';
import { registerPharmacyExtensions } from './pharmacy/register-extensions';
import { DEFAULT_UI_PACK } from './resolve';

export { DEFAULT_UI_PACK };

registerPharmacyExtensions();

/**
 * Frontend industry packs. Module enablement still comes from the API
 * (activeCompany.modules / features); this registry drives UI composition.
 */
export const INDUSTRY_PACKS = {
  universal: {
    key: 'universal',
    label: 'Universal',
    uiPack: 'universal',
    features: {},
    copy: {},
    getNav: () => getWorkspaceNav('universal'),
    Routes: null,
  },
  pharmacy: {
    key: 'pharmacy',
    label: 'Pharmacy',
    uiPack: 'pharmacy',
    features: {
      pharmacy_shell: true,
      pharmacy_clinical: true,
      rx_controls: true,
      barcode: true,
      batch_expiry: true,
      pos_menu: true,
    },
    copy: PHARMACY_COPY,
    getNav: () => getWorkspaceNav('pharmacy'),
    Routes: PharmacyIndustryRoutes,
  },
  // Stub industries use Universal UI until their packs are built.
  retail: {
    key: 'retail',
    label: 'Retail',
    uiPack: 'universal',
    features: {},
    copy: {},
    getNav: () => getWorkspaceNav('universal'),
    Routes: null,
  },
  wholesale: {
    key: 'wholesale',
    label: 'Wholesale',
    uiPack: 'universal',
    features: {},
    copy: {},
    getNav: () => getWorkspaceNav('universal'),
    Routes: null,
  },
  manufacturing: {
    key: 'manufacturing',
    label: 'Manufacturing',
    uiPack: 'universal',
    features: {},
    copy: {},
    getNav: () => getWorkspaceNav('universal'),
    Routes: null,
  },
  restaurant: {
    key: 'restaurant',
    label: 'Restaurant',
    uiPack: 'universal',
    features: {},
    copy: {},
    getNav: () => getWorkspaceNav('universal'),
    Routes: null,
  },
  services: {
    key: 'services',
    label: 'Services',
    uiPack: 'universal',
    features: {},
    copy: {},
    getNav: () => getWorkspaceNav('universal'),
    Routes: null,
  },
  distribution: {
    key: 'distribution',
    label: 'Distribution',
    uiPack: 'universal',
    features: {},
    copy: {},
    getNav: () => getWorkspaceNav('universal'),
    Routes: null,
  },
};

/** Packs that contribute extra React Router routes. */
export function getIndustryRouteComponents() {
  return Object.values(INDUSTRY_PACKS)
    .filter((pack) => typeof pack.Routes === 'function')
    .map((pack) => pack.Routes);
}
