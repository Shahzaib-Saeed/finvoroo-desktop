import { PHARMACY_COPY } from './pharmacy/copy';

export const DEFAULT_UI_PACK = 'universal';

/** Industry keys that have a distinct UI pack today. */
const UI_PACK_BY_INDUSTRY = {
  pharmacy: 'pharmacy',
};

/**
 * Resolve industry_key / ui_pack from activeCompany to a UI pack id.
 * Unknown keys fall back to universal. Does not import the full pack registry
 * (avoids circular deps with route modules).
 */
export function resolveUiPack(companyOrKey) {
  if (!companyOrKey) return DEFAULT_UI_PACK;

  if (typeof companyOrKey === 'string') {
    return UI_PACK_BY_INDUSTRY[companyOrKey] || DEFAULT_UI_PACK;
  }

  if (companyOrKey.ui_pack === 'pharmacy') return 'pharmacy';
  if (companyOrKey.industry_key === 'pharmacy') return 'pharmacy';
  if (companyOrKey.ui_pack && companyOrKey.ui_pack !== 'universal') {
    return UI_PACK_BY_INDUSTRY[companyOrKey.industry_key] || DEFAULT_UI_PACK;
  }

  return DEFAULT_UI_PACK;
}

export function resolveIndustryPack(companyOrKey) {
  const uiPack = resolveUiPack(companyOrKey);

  if (uiPack === 'pharmacy') {
    return {
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
    };
  }

  return {
    key: typeof companyOrKey === 'string' ? companyOrKey : companyOrKey?.industry_key || 'universal',
    label:
      (typeof companyOrKey === 'object' && companyOrKey?.industry_label) || 'Universal',
    uiPack: DEFAULT_UI_PACK,
    features: {},
    copy: {},
  };
}

/** Feature map for menu filtering — company API payload is authoritative. */
export function resolveIndustryFeatures(company) {
  const fromApi = company?.features && typeof company.features === 'object' ? company.features : {};
  const pack = resolveIndustryPack(company);
  const fromPack = pack.features || {};
  const modules = Array.isArray(company?.modules) ? company.modules : [];

  const merged = {
    ...fromPack,
    ...fromApi,
  };

  // Module list from API can enable shell features even if features map is sparse.
  if (modules.includes('pharmacy_shell')) merged.pharmacy_shell = true;
  if (modules.includes('pharmacy_clinical')) {
    merged.pharmacy_clinical = true;
    merged.rx_controls = true;
  }
  if (modules.includes('barcode')) merged.barcode = true;
  if (modules.includes('batch_expiry')) merged.batch_expiry = true;
  if (modules.includes('pos_core')) merged.pos_menu = true;

  merged.pos_menu =
    company?.show_pos_menu !== undefined
      ? !!company.show_pos_menu
      : !!merged.pos_menu;

  return merged;
}
