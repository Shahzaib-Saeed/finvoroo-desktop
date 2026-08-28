import { addDays, format } from 'date-fns';
import {
  applyDiscountPercent,
  calcInvoiceTotals,
  computeLineNet,
  formatCurrency,
  parseLockedNetTotal,
  refreshLineComputedFields,
  syncDiscountDisplays,
} from '../invoices/constants';

export {
  applyDiscountFixed,
  applyDiscountPercent,
  applyNetTotal,
  calcLineTotals,
  formatCurrency,
  refreshLineComputedFields,
} from '../invoices/constants';

export const PO_STATUSES = [
  { value: 'all', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'received', label: 'Received' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const APPROVAL_STATUSES = [
  { value: 'all', label: 'All approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'pending', label: 'Pending' },
  { value: 'rejected', label: 'Rejected' },
];

export const STATUS_COLORS = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  sent: 'bg-blue-100 text-blue-700 border-blue-200',
  received: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
  approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  partial: 'bg-amber-100 text-amber-700 border-amber-200',
};

export const APPROVAL_COLORS = {
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
};

export const EMPTY_PO_LINE = {
  product_id: '',
  description: '',
  quantity: '',
  quantity_basis: 'sales',
  entered_unit: '',
  unit_price: '',
  discount: '',
  discount_type: 'percent',
  discount_fixed: '',
  discount_percent: '',
  net_total: '',
  tax_rate_id: '',
};

export const EMPTY_PO_FORM = {
  vendor_id: '',
  order_date: format(new Date(), 'yyyy-MM-dd'),
  expected_delivery: format(addDays(new Date(), 14), 'yyyy-MM-dd'),
  notes: '',
  discount_amount: '',
  other_charges: '',
  source_invoice_id: '',
  purchase_order_metadata_custom_fields: {},
  lines: [{ ...EMPTY_PO_LINE }],
};

export function calcPoTotals(form, taxRatesById = {}) {
  const withDiscount = { ...form, invoice_discount: form.discount_amount };
  const base = calcInvoiceTotals(withDiscount, taxRatesById);
  const other = Number(form.other_charges) || 0;
  return { ...base, other_charges: other, total: Math.max(0, base.total + other) };
}

export function mapPoToForm(order) {
  if (!order) return { ...EMPTY_PO_FORM, lines: [{ ...EMPTY_PO_LINE }] };

  const lines =
    order.lines?.length > 0
      ? order.lines.map((line) => {
          const pct = Number(line.discount_percent) || 0;
          const base = {
            product_id: line.product_id ? String(line.product_id) : '',
            description: line.description || '',
            quantity:
              line.quantity != null && line.quantity !== ''
                ? String(line.quantity)
                : '',
            quantity_basis: line.quantity_basis === 'base' ? 'base' : 'sales',
            entered_unit: line.entered_unit || '',
            unit_price: line.unit_price ?? '',
            discount: pct,
            discount_type: 'percent',
            tax_rate_id: line.tax_rate_id ? String(line.tax_rate_id) : '',
            net_total: '',
          };
          const synced = syncDiscountDisplays(base);
          return { ...synced, net_total: String(computeLineNet(synced)) };
        })
      : [{ ...EMPTY_PO_LINE }];

  return {
    ...EMPTY_PO_FORM,
    vendor_id: order.vendor_id ? String(order.vendor_id) : '',
    order_date: order.order_date || EMPTY_PO_FORM.order_date,
    expected_delivery: order.expected_delivery || '',
    notes: order.notes || '',
    discount_amount:
      order.discount_amount != null ? String(order.discount_amount) : '',
    other_charges: order.other_charges != null ? String(order.other_charges) : '',
    purchase_order_metadata_custom_fields: order.purchase_order_metadata_custom_fields || {},
    lines,
  };
}

export function buildPoPayload(form) {
  const lines = form.lines
    .filter((line) => {
      const hasProduct = line.product_id && line.product_id !== '';
      const hasDesc = String(line.description || '').trim() !== '';
      return hasProduct || hasDesc;
    })
    .map((line) => {
      const pct =
        line.discount_type === 'percent'
          ? Number(line.discount) || Number(line.discount_percent) || 0
          : 0;
      const lockedNet = parseLockedNetTotal(line);
      const lineOut = {
        product_id: line.product_id ? Number(line.product_id) : null,
        description: line.description?.trim() || 'Item',
        quantity: Number(line.quantity) || 1,
        quantity_basis: line.quantity_basis === 'base' ? 'base' : 'sales',
        entered_unit: line.entered_unit || null,
        unit_price: Number(line.unit_price) || 0,
        discount_percent: Math.min(100, Math.max(0, pct)),
        tax_rate_id: line.tax_rate_id ? Number(line.tax_rate_id) : null,
      };
      if (lockedNet != null) {
        // Send the locked net as-is. Remultiplying qty×rate can lose 0.01
        // (e.g. 10615 × 24.465 → 259699.99 vs locked 259700.00).
        lineOut.line_net = lockedNet;
      }
      return lineOut;
    });

  const payload = {
    vendor_id: Number(form.vendor_id),
    order_date: form.order_date,
    expected_delivery: form.expected_delivery || null,
    notes: form.notes || null,
    discount_amount: form.discount_amount === '' ? 0 : Number(form.discount_amount) || 0,
    other_charges: form.other_charges === '' ? 0 : Number(form.other_charges) || 0,
    lines,
    ...(form.source_invoice_id ? { source_invoice_id: Number(form.source_invoice_id) } : {}),
  };

  if (
    form.purchase_order_metadata_custom_fields &&
    Object.keys(form.purchase_order_metadata_custom_fields).length > 0
  ) {
    payload.purchase_order_metadata_custom_fields = form.purchase_order_metadata_custom_fields;
  }

  return payload;
}
