import { format } from 'date-fns';

export const DELIVERY_NOTE_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const STATUS_COLORS = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  confirmed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
};

export const EMPTY_DELIVERY_LINE = {
  sales_order_line_id: '',
  product_id: '',
  description: '',
  product_name: '',
  product_sku: '',
  order_quantity: '',
  quantity_remaining: '',
  quantity_delivered: '',
  quantity_basis: 'sales',
};

export const EMPTY_DELIVERY_FORM = {
  customer_id: '',
  sales_order_id: '',
  warehouse_id: '',
  delivery_date: format(new Date(), 'yyyy-MM-dd'),
  shipping_address: '',
  notes: '',
  lines: [{ ...EMPTY_DELIVERY_LINE }],
};

export function mapDeliveryNoteToForm(note) {
  if (!note) return { ...EMPTY_DELIVERY_FORM, lines: [{ ...EMPTY_DELIVERY_LINE }] };

  return {
    customer_id: note.customer_id ? String(note.customer_id) : '',
    sales_order_id: note.sales_order_id ? String(note.sales_order_id) : '',
    warehouse_id: note.warehouse_id ? String(note.warehouse_id) : '',
    delivery_date: note.delivery_date || format(new Date(), 'yyyy-MM-dd'),
    shipping_address: note.shipping_address || '',
    notes: note.notes || '',
    lines:
      (note.lines || []).length > 0
        ? note.lines.map((line) => ({
            sales_order_line_id: line.sales_order_line_id ? String(line.sales_order_line_id) : '',
            product_id: line.product_id ? String(line.product_id) : '',
            description: line.description || '',
            product_name: line.product_name || '',
            product_sku: line.product_sku || '',
            order_quantity:
              line.order_quantity != null ? String(line.order_quantity) : '',
            quantity_remaining:
              line.quantity_remaining != null ? String(line.quantity_remaining) : '',
            quantity_delivered:
              line.quantity_delivered != null ? String(line.quantity_delivered) : '',
            quantity_basis: line.quantity_basis === 'base' ? 'base' : 'sales',
          }))
        : [{ ...EMPTY_DELIVERY_LINE }],
  };
}

export function buildDeliveryNotePayload(form) {
  return {
    customer_id: form.customer_id ? Number(form.customer_id) : null,
    sales_order_id: form.sales_order_id ? Number(form.sales_order_id) : null,
    warehouse_id: form.warehouse_id ? Number(form.warehouse_id) : null,
    delivery_date: form.delivery_date,
    shipping_address: form.shipping_address || null,
    notes: form.notes || null,
    lines: (form.lines || [])
      .filter((line) => Number(line.quantity_delivered) > 0)
      .map((line) => ({
        sales_order_line_id: line.sales_order_line_id ? Number(line.sales_order_line_id) : null,
        product_id: line.product_id ? Number(line.product_id) : null,
        description: line.description || 'Item',
        quantity_delivered: Number(line.quantity_delivered),
        quantity_basis: line.quantity_basis === 'base' ? 'base' : 'sales',
      })),
  };
}

export function applyDeliveryNoteFromSalesOrderPreview(preview) {
  const form = preview?.form || {};
  const lines = (form.lines || []).map((line) => ({
    sales_order_line_id: line.sales_order_line_id ? String(line.sales_order_line_id) : '',
    product_id: line.product_id ? String(line.product_id) : '',
    description: line.description || '',
    product_name: line.product_name || '',
    product_sku: line.product_sku || '',
    order_quantity: line.order_quantity != null ? String(line.order_quantity) : '',
    quantity_remaining:
      line.quantity_remaining != null
        ? String(line.quantity_remaining)
        : line.order_quantity != null
          ? String(line.order_quantity)
          : '',
    quantity_delivered:
      line.quantity_delivered != null ? String(line.quantity_delivered) : '',
    quantity_basis: line.quantity_basis === 'base' ? 'base' : 'sales',
  }));

  return {
    customer_id: form.customer_id ? String(form.customer_id) : '',
    sales_order_id: form.sales_order_id ? String(form.sales_order_id) : '',
    warehouse_id: '',
    delivery_date: form.delivery_date || format(new Date(), 'yyyy-MM-dd'),
    shipping_address: form.shipping_address || '',
    notes: form.notes || '',
    lines: lines.length > 0 ? lines : [{ ...EMPTY_DELIVERY_LINE }],
    _conversionSource: preview?.source || null,
  };
}

/** Format line qty for tables (trim trailing zeros). */
export function formatLineQty(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  if (Math.abs(n - Math.round(n)) < 0.0001) return String(Math.round(n));
  return n.toFixed(2).replace(/\.?0+$/, '');
}

export function deliveryLineTotals(lines) {
  const rows = lines || [];
  const lineCount = rows.filter((l) => Number(l.quantity_delivered) > 0).length;
  const totalQty = rows.reduce((sum, l) => sum + (Number(l.quantity_delivered) || 0), 0);
  return { lineCount, totalQty, rowCount: rows.length };
}

/** Stats for delivery note show: shipment totals and order coverage. */
export function computeDeliveryNoteStats(lines = [], status = 'draft') {
  const rows = lines || [];
  let totalOrdered = 0;
  let totalOnNote = 0;
  let linesWithOrder = 0;
  let fullyShippedLines = 0;

  rows.forEach((line) => {
    const ordered = Number(line.order_quantity);
    const onNote = Number(line.quantity_delivered) || 0;
    const remaining = Number(line.order_line_remaining);
    totalOnNote += onNote;

    if (Number.isFinite(ordered) && ordered > 0) {
      linesWithOrder += 1;
      totalOrdered += ordered;
      if (status === 'confirmed' && Number.isFinite(remaining) && remaining <= 0.00001) {
        fullyShippedLines += 1;
      } else if (
        status === 'confirmed' &&
        Number.isFinite(line.order_line_delivered) &&
        line.order_line_delivered >= ordered - 0.00001
      ) {
        fullyShippedLines += 1;
      }
    }
  });

  const coveragePercent =
    totalOrdered > 0 ? Math.min(100, (totalOnNote / totalOrdered) * 100) : 0;

  return {
    lineCount: rows.filter((l) => Number(l.quantity_delivered) > 0).length,
    totalOnNote,
    totalOrdered,
    linesWithOrder,
    fullyShippedLines,
    coveragePercent,
    rowCount: rows.length,
  };
}
