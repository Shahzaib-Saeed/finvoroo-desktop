import { format } from 'date-fns';
import { formatCurrency } from '../invoices/constants';

export { formatCurrency };

export const WAREHOUSE_STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export const WAREHOUSE_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export const STOCK_TRANSFER_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'in_transit', label: 'In transit' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const TRANSFER_STATUS_COLORS = {
  completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  draft: 'bg-secondary text-secondary-foreground',
  in_transit: 'bg-amber-100 text-amber-700 border-amber-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
};

export const EMPTY_WAREHOUSE_FORM = {
  name: '',
  code: '',
  address: '',
  location: '',
  phone: '',
  status: 'active',
  inventory_account_id: '',
  is_default: false,
  notes: '',
};

export const EMPTY_ADJUSTMENT_LINE = {
  product_id: '',
  quantity_after: '',
  entered_unit: '',
};

export const EMPTY_ADJUSTMENT_FORM = {
  warehouse_id: '',
  adjustment_date: format(new Date(), 'yyyy-MM-dd'),
  reason: 'count_variance',
  notes: '',
  inventory_account_id: '',
  adjustment_expense_account_id: '',
  adjustment_income_account_id: '',
  lines: [{ ...EMPTY_ADJUSTMENT_LINE }],
};

export const EMPTY_TRANSFER_LINE = {
  product_id: '',
  quantity: '',
  entered_unit: '',
};

export const EMPTY_TRANSFER_FORM = {
  from_warehouse_id: '',
  to_warehouse_id: '',
  transfer_date: format(new Date(), 'yyyy-MM-dd'),
  notes: '',
  lines: [{ ...EMPTY_TRANSFER_LINE }],
};

export function mapWarehouseToForm(wh) {
  if (!wh) return { ...EMPTY_WAREHOUSE_FORM };
  return {
    name: wh.name || '',
    code: wh.code || '',
    address: wh.address || '',
    location: wh.location || '',
    phone: wh.phone || '',
    status: wh.is_active === false ? 'inactive' : wh.status || 'active',
    inventory_account_id: wh.inventory_account_id ? String(wh.inventory_account_id) : '',
    is_default: !!wh.is_default,
    notes: wh.notes || '',
  };
}

export function buildWarehousePayload(form) {
  return {
    name: form.name.trim(),
    code: form.code?.trim() || undefined,
    address: form.address?.trim() || undefined,
    location: form.location?.trim() || undefined,
    phone: form.phone?.trim() || undefined,
    status: form.status || 'active',
    inventory_account_id: form.inventory_account_id
      ? Number(form.inventory_account_id)
      : undefined,
    is_default: !!form.is_default,
    notes: form.notes?.trim() || undefined,
  };
}

export function getProductStockInWarehouse(stockByProduct, productId, warehouseId) {
  const entry = stockByProduct?.[productId] ?? stockByProduct?.[String(productId)];
  if (!entry) return 0;
  if (warehouseId != null && entry[warehouseId] != null) return Number(entry[warehouseId]) || 0;
  if (warehouseId != null && entry[String(warehouseId)] != null) {
    return Number(entry[String(warehouseId)]) || 0;
  }
  return Number(entry.total) || 0;
}

export function formFromAdjustment(adj) {
  return {
    warehouse_id: adj.warehouse_id ? String(adj.warehouse_id) : '',
    adjustment_date: adj.adjustment_date || format(new Date(), 'yyyy-MM-dd'),
    reason: adj.reason || 'count_variance',
    notes: adj.notes || '',
    inventory_account_id: '',
    adjustment_expense_account_id: '',
    adjustment_income_account_id: '',
    lines: (adj.lines || []).length
      ? adj.lines.map((l) => ({
          product_id: l.product_id ? String(l.product_id) : '',
          quantity_after: l.quantity_after != null ? String(l.quantity_after) : '',
          entered_unit: l.entered_unit || '',
        }))
      : [{ ...EMPTY_ADJUSTMENT_LINE }],
  };
}

export function buildAdjustmentPayload(form) {
  return {
    warehouse_id: Number(form.warehouse_id),
    adjustment_date: form.adjustment_date,
    reason: form.reason,
    notes: form.notes?.trim() || undefined,
    inventory_account_id: Number(form.inventory_account_id),
    adjustment_expense_account_id: Number(form.adjustment_expense_account_id),
    adjustment_income_account_id: Number(form.adjustment_income_account_id),
    lines: form.lines
      .filter((l) => l.product_id && l.quantity_after !== '')
      .map((l) => ({
        product_id: Number(l.product_id),
        quantity_after: Number(l.quantity_after),
        entered_unit: l.entered_unit || null,
      })),
  };
}

export function formFromTransfer(transfer) {
  return {
    from_warehouse_id: transfer.from_warehouse_id ? String(transfer.from_warehouse_id) : '',
    to_warehouse_id: transfer.to_warehouse_id ? String(transfer.to_warehouse_id) : '',
    transfer_date: transfer.transfer_date || format(new Date(), 'yyyy-MM-dd'),
    notes: transfer.notes || '',
    lines: (transfer.lines || []).length
      ? transfer.lines.map((l) => ({
          product_id: l.product_id ? String(l.product_id) : '',
          quantity: l.quantity != null ? String(l.quantity) : '',
          entered_unit: l.entered_unit || '',
        }))
      : [{ ...EMPTY_TRANSFER_LINE }],
  };
}

export function buildStockTransferPayload(form) {
  return {
    from_warehouse_id: Number(form.from_warehouse_id),
    to_warehouse_id: Number(form.to_warehouse_id),
    transfer_date: form.transfer_date,
    notes: form.notes?.trim() || undefined,
    lines: form.lines
      .filter((l) => l.product_id && Number(l.quantity) > 0)
      .map((l) => ({
        product_id: Number(l.product_id),
        quantity: Number(l.quantity),
        entered_unit: l.entered_unit || null,
      })),
  };
}
