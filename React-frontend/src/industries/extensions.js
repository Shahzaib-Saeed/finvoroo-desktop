/**
 * Frontend extension slot registry.
 * Core screens ask this registry; industry packs register contributions.
 * Phase 1: slots exist empty — pharmacy deep features register later.
 */

export const SLOTS = {
  PRODUCT_FORM_FIELDS: 'product.form.fields',
  INVOICE_LINE_COLUMNS: 'invoice.line.columns',
  POS_CHECKOUT_HOOKS: 'pos.checkout.hooks',
  REPORTS_CATALOG: 'reports.catalog',
  PURCHASES_IMPORT: 'purchases.import',
  NAV_SECTIONS: 'nav.sections',
  DASHBOARD_WIDGETS: 'dashboard.widgets',
};

const registry = new Map();

export function registerExtension(slot, contribution) {
  if (!registry.has(slot)) registry.set(slot, []);
  registry.get(slot).push(contribution);
}

export function getExtensions(slot) {
  return registry.get(slot) ?? [];
}

export function clearExtensions() {
  registry.clear();
}
