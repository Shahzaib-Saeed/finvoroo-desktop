export const BILLING_MODE_OPTIONS = [
  {
    value: 'invoice_anytime',
    title: 'Invoice anytime',
    description: 'Allow invoicing before, during, or after delivery.',
  },
  {
    value: 'invoice_up_to_delivered',
    title: 'Invoice up to delivered qty',
    description: 'Block invoicing above delivered and not-yet-invoiced quantity.',
  },
  {
    value: 'invoice_on_delivery_only',
    title: 'Delivery-linked invoicing only',
    description: 'Require invoice lines linked to delivered sales-order lines.',
  },
];

export const INVOICE_SETTINGS_TABS = [
  { id: 'footer', label: 'Footer', icon: 'footer' },
  { id: 'posting', label: 'Posting', icon: 'posting' },
  { id: 'billing', label: 'Billing', icon: 'billing' },
  { id: 'print', label: 'Print', icon: 'print' },
];
