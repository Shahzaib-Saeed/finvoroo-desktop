import { registerExtension, SLOTS } from '../extensions';

/**
 * Pharmacy contributions to core extension slots.
 * Imported once when the pharmacy UI pack is active.
 */
export function registerPharmacyExtensions() {
  registerExtension(SLOTS.PRODUCT_FORM_FIELDS, {
    id: 'pharmacy.product.fields',
    feature: 'pharmacy_shell',
  });

  registerExtension(SLOTS.REPORTS_CATALOG, {
    id: 'pharmacy.expiry-report',
    title: 'Batch & Expiry',
    path: '/workspace/:id/pharmacy/batch-expiry',
    feature: 'batch_expiry',
  });

  registerExtension(SLOTS.POS_CHECKOUT_HOOKS, {
    id: 'pharmacy.pos.warnings',
    feature: 'pharmacy_clinical',
  });
}
