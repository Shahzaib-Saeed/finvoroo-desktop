import { format } from 'date-fns';
import {
  applyDiscountFixed,
  applyDiscountPercent,
  applyNetTotal,
  buildAddressDisplay,
  calcInvoiceTotals as calcSalesOrderTotals,
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
  calcSalesOrderTotals,
  calcLineTotals,
  formatCurrency,
  refreshLineComputedFields,
  splitAddressDisplay,
};

export const SALES_ORDER_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'open', label: 'Open' },
  { value: 'partial', label: 'Partial' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const STATUS_COLORS = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  open: 'bg-blue-100 text-blue-700 border-blue-200',
  partial: 'bg-amber-100 text-amber-700 border-amber-200',
  completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
};

const DN_STATUS_COLORS = {
  draft: 'bg-slate-100 text-slate-600 border-slate-200',
  confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
};

export { DN_STATUS_COLORS };

/** Format line qty for tables (trim trailing zeros). */
export function formatLineQty(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  if (Math.abs(n - Math.round(n)) < 0.0001) return String(Math.round(n));
  return n.toFixed(2).replace(/\.?0+$/, '');
}

/**
 * Build fulfilment stats from SO lines (fallback when API omits fulfilment block).
 */
export function computeSalesOrderFulfilment(lines = [], apiFulfilment = null) {
  if (apiFulfilment && typeof apiFulfilment === 'object') {
    return {
      ...apiFulfilment,
      lines: (lines || []).map((line) => {
        const qty = Number(line.quantity) || 0;
        const delivered = Number(line.quantity_delivered) || 0;
        const invoiced = Number(line.quantity_invoiced) || 0;
        return {
          id: line.id,
          description: line.description,
          product_name: line.product_name || line.product?.name,
          qty,
          delivered,
          invoiced,
          remainingDelivery:
            line.quantity_remaining ?? Math.max(0, qty - delivered),
          remainingInvoice:
            line.quantity_remaining_to_invoice ?? Math.max(0, qty - invoiced),
          deliveryPercent: qty > 0 ? Math.min(100, (delivered / qty) * 100) : 0,
          invoicePercent: qty > 0 ? Math.min(100, (invoiced / qty) * 100) : 0,
        };
      }),
    };
  }

  let totalOrdered = 0;
  let totalDelivered = 0;
  let totalInvoiced = 0;
  const lineDetails = (lines || []).map((line) => {
    const qty = Number(line.quantity) || 0;
    const delivered = Number(line.quantity_delivered) || 0;
    const invoiced = Number(line.quantity_invoiced) || 0;
    totalOrdered += qty;
    totalDelivered += delivered;
    totalInvoiced += invoiced;
    return {
      id: line.id,
      description: line.description,
      product_name: line.product_name || line.product?.name,
      qty,
      delivered,
      invoiced,
      remainingDelivery: Math.max(0, qty - delivered),
      remainingInvoice: Math.max(0, qty - invoiced),
      deliveryPercent: qty > 0 ? Math.min(100, (delivered / qty) * 100) : 0,
      invoicePercent: qty > 0 ? Math.min(100, (invoiced / qty) * 100) : 0,
    };
  });

  const remainingDelivery = Math.max(0, totalOrdered - totalDelivered);
  const remainingInvoice = Math.max(0, totalOrdered - totalInvoiced);

  return {
    total_ordered: totalOrdered,
    total_delivered: totalDelivered,
    total_remaining_delivery: remainingDelivery,
    total_invoiced: totalInvoiced,
    total_remaining_invoice: remainingInvoice,
    delivery_percent:
      totalOrdered > 0 ? Math.min(100, (totalDelivered / totalOrdered) * 100) : 0,
    invoice_percent:
      totalOrdered > 0 ? Math.min(100, (totalInvoiced / totalOrdered) * 100) : 0,
    is_partial_delivery: totalDelivered > 0.00001 && remainingDelivery > 0.00001,
    is_fully_delivered: totalOrdered > 0.00001 && remainingDelivery <= 0.00001,
    is_partial_invoice: totalInvoiced > 0.00001 && remainingInvoice > 0.00001,
    is_fully_invoiced: totalOrdered > 0.00001 && remainingInvoice <= 0.00001,
    lines: lineDetails,
  };
}

export const EMPTY_SALES_ORDER_LINE = {
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

export const EMPTY_SALES_ORDER_FORM = {
  customer_id: '',
  quotation_id: '',
  order_date: format(new Date(), 'yyyy-MM-dd'),
  ship_date: '',
  status: 'draft',
  currency: 'USD',
  notes: '',
  billing_address: '',
  shipping_address: '',
  address_display: '',
  invoice_discount: '',
  sales_order_metadata_custom_fields: {},
  lines: [{ ...EMPTY_SALES_ORDER_LINE }],
};

export function mapSalesOrderToForm(order) {
  if (!order) {
    return { ...EMPTY_SALES_ORDER_FORM, lines: [{ ...EMPTY_SALES_ORDER_LINE }] };
  }

  const lines =
    order.lines?.length > 0
      ? order.lines.map((line) => {
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
            discount: line.discount ?? '',
            discount_type: line.discount_type || 'fixed',
            tax_rate_id: line.tax_rate_id ? String(line.tax_rate_id) : '',
            sale_tax_amount: line.sale_tax_amount ?? '',
            net_total: '',
          };
          const synced = syncDiscountDisplays(base);
          return { ...synced, net_total: String(computeLineNet(synced)) };
        })
      : [{ ...EMPTY_SALES_ORDER_LINE }];

  return {
    ...EMPTY_SALES_ORDER_FORM,
    customer_id: order.customer_id ? String(order.customer_id) : '',
    order_date: order.order_date || EMPTY_SALES_ORDER_FORM.order_date,
    ship_date: order.ship_date || '',
    status: order.status || 'draft',
    currency: order.currency || 'USD',
    notes: order.notes || '',
    invoice_discount:
      order.invoice_discount != null ? String(order.invoice_discount) : '',
    billing_address: order.billing_address || '',
    shipping_address: order.shipping_address || '',
    address_display: buildAddressDisplay(order.billing_address, order.shipping_address),
    sales_order_metadata_custom_fields: order.sales_order_metadata_custom_fields || {},
    lines,
  };
}

export function buildSalesOrderPayload(form) {
  const lines = form.lines
    .filter((line) => {
      const hasProduct = line.product_id && line.product_id !== '';
      const hasDesc = String(line.description || '').trim() !== '';
      return hasProduct || hasDesc;
    })
    .map((line) => {
      const lockedNet = parseLockedNetTotal(line);
      const lineOut = {
        product_id: line.product_id ? Number(line.product_id) : null,
        description: line.description?.trim() || 'Item',
        quantity: Number(line.quantity) || 1,
        quantity_basis: line.quantity_basis === 'base' ? 'base' : 'sales',
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
    quotation_id: form.quotation_id ? Number(form.quotation_id) : null,
    order_date: form.order_date,
    ship_date: form.ship_date || null,
    status: form.status || 'draft',
    currency: form.currency || null,
    invoice_discount: form.invoice_discount === '' ? 0 : Number(form.invoice_discount) || 0,
    notes: form.notes || null,
    billing_address: form.billing_address || null,
    shipping_address: form.shipping_address || null,
    lines,
  };

  if (
    form.sales_order_metadata_custom_fields &&
    Object.keys(form.sales_order_metadata_custom_fields).length > 0
  ) {
    payload.sales_order_metadata_custom_fields = form.sales_order_metadata_custom_fields;
  }

  return payload;
}
