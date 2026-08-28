import { format } from 'date-fns';
import {
  applyDiscountFixed,
  applyDiscountPercent,
  applyNetTotal,
  buildAddressDisplay,
  calcInvoiceTotals as calcQuotationTotals,
  calcLineTotals,
  computeLineNet,
  formatCurrency,
  parseLockedNetTotal,
  refreshLineComputedFields,
  splitAddressDisplay,
  syncDiscountDisplays,
} from '../invoices/constants';

export {
  LINE_CELL_INPUT,
  LINE_CELL_INPUT_NUMBER,
} from '../invoices/constants';

export {
  applyDiscountFixed,
  applyDiscountPercent,
  applyNetTotal,
  buildAddressDisplay,
  calcQuotationTotals,
  calcLineTotals,
  formatCurrency,
  refreshLineComputedFields,
  splitAddressDisplay,
};

export const QUOTATION_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'declined', label: 'Declined' },
  { value: 'expired', label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'converted', label: 'Converted' },
];

/** Format line qty for tables (trim trailing zeros). */
export function formatLineQty(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  if (Math.abs(n - Math.round(n)) < 0.0001) return String(Math.round(n));
  return n.toFixed(2).replace(/\.?0+$/, '');
}

export const STATUS_COLORS = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  sent: 'bg-blue-100 text-blue-700 border-blue-200',
  accepted: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  declined: 'bg-red-100 text-red-700 border-red-200',
  expired: 'bg-amber-100 text-amber-700 border-amber-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
  converted: 'bg-violet-100 text-violet-700 border-violet-200',
};

export const EMPTY_QUOTATION_LINE = {
  product_id: '',
  description: '',
  quantity: '',
  quantity_basis: 'sales',
  entered_unit: '',
  unit_price: '',
  discount: '',
  discount_type: 'fixed',
  discount_fixed: '',
  discount_percent: '',
  net_total: '',
  tax_rate_id: '',
  sale_tax_amount: '',
};

export const EMPTY_QUOTATION_FORM = {
  customer_id: '',
  quote_date: format(new Date(), 'yyyy-MM-dd'),
  expiry_date: '',
  status: 'draft',
  currency: 'USD',
  notes: '',
  billing_address: '',
  shipping_address: '',
  address_display: '',
  invoice_discount: '',
  quotation_metadata_custom_fields: {},
  lines: [{ ...EMPTY_QUOTATION_LINE }],
};

export function mapQuotationToForm(quotation) {
  if (!quotation) {
    return { ...EMPTY_QUOTATION_FORM, lines: [{ ...EMPTY_QUOTATION_LINE }] };
  }

  const lines =
    quotation.lines?.length > 0
      ? quotation.lines.map((line) => {
          const base = {
            product_id: line.product_id ? String(line.product_id) : '',
            description: line.description || '',
            quantity:
              line.quantity != null && line.quantity !== ''
                ? String(line.quantity)
                : '',
            quantity_basis: 'sales',
            entered_unit: line.entered_unit || '',
            unit_price: line.unit_price ?? '',
            discount: line.discount ?? '',
            discount_type: line.discount_type || 'fixed',
            tax_rate_id: line.tax_rate_id ? String(line.tax_rate_id) : '',
            sale_tax_amount: line.sale_tax_amount ?? '',
            net_total: '',
          };
          const synced = syncDiscountDisplays(base);
          return { ...synced, net_total: String(computeLineNet(synced)) };
        })
      : [{ ...EMPTY_QUOTATION_LINE }];

  return {
    ...EMPTY_QUOTATION_FORM,
    customer_id: quotation.customer_id ? String(quotation.customer_id) : '',
    quote_date: quotation.quote_date || EMPTY_QUOTATION_FORM.quote_date,
    expiry_date: quotation.expiry_date || '',
    status: quotation.status || 'draft',
    currency: quotation.currency || 'USD',
    notes: quotation.notes || '',
    invoice_discount:
      quotation.invoice_discount != null ? String(quotation.invoice_discount) : '',
    billing_address: quotation.billing_address || '',
    shipping_address: quotation.shipping_address || '',
    address_display: buildAddressDisplay(
      quotation.billing_address,
      quotation.shipping_address
    ),
    quotation_metadata_custom_fields: quotation.quotation_metadata_custom_fields || {},
    lines,
  };
}

export function buildQuotationPayload(form) {
  const lines = form.lines
    .filter((line) => String(line.description || '').trim() !== '')
    .map((line) => {
      const lockedNet = parseLockedNetTotal(line);
      const lineOut = {
        product_id: line.product_id ? Number(line.product_id) : null,
        description: line.description?.trim() || 'Item',
        quantity: Number(line.quantity) || 1,
        entered_unit: line.entered_unit || null,
        unit_price: Number(line.unit_price) || 0,
        discount: line.discount === '' ? 0 : Number(line.discount) || 0,
        discount_type: line.discount_type || 'fixed',
        tax_rate_id: line.tax_rate_id ? Number(line.tax_rate_id) : null,
        sale_tax_amount:
          line.sale_tax_amount === '' ? 0 : Number(line.sale_tax_amount) || 0,
      };
      if (lockedNet != null) {
        // Send the locked net as-is. Remultiplying qty×rate can lose 0.01
        // (e.g. 10615 × 24.465 → 259699.99 vs locked 259700.00).
        lineOut.line_net = lockedNet;
      }
      return lineOut;
    });

  const payload = {
    customer_id: Number(form.customer_id),
    quote_date: form.quote_date,
    expiry_date: form.expiry_date || null,
    status: form.status || 'draft',
    currency: form.currency || null,
    invoice_discount: form.invoice_discount === '' ? 0 : Number(form.invoice_discount) || 0,
    notes: form.notes || null,
    billing_address: form.billing_address || null,
    shipping_address: form.shipping_address || null,
    lines,
  };

  if (
    form.quotation_metadata_custom_fields &&
    Object.keys(form.quotation_metadata_custom_fields).length > 0
  ) {
    payload.quotation_metadata_custom_fields = form.quotation_metadata_custom_fields;
  }

  return payload;
}
