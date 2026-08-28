const today = () => new Date().toISOString().slice(0, 10);

export const PO_STATUSES = [
  { value: 'all', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'planned', label: 'Planned' },
  { value: 'in_production', label: 'In production' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const PO_STATUS_COLORS = {
  draft: 'text-muted-foreground border-border bg-muted/50',
  planned: 'text-sky-700 border-sky-200 bg-sky-50',
  in_production: 'text-primary border-primary/20 bg-primary/5',
  completed: 'text-emerald-700 border-emerald-200 bg-emerald-50',
  cancelled: 'text-destructive border-destructive/20 bg-destructive/5',
};

export const CREATE_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'planned', label: 'Planned' },
  { value: 'in_production', label: 'In production' },
];

export const FINISHED_TYPES = ['finished_good', 'manufactured'];
export const RAW_TYPES = ['raw_material', 'inventory'];

export const EMPTY_MATERIAL_LINE = {
  product_id: '',
  name: '',
  quantity: '',
  unit_cost: '',
  uom: '',
  factor_to_base: '',
  entered_unit: '',
  stock: 0,
};

export function isMaterialRowMeaningful(row) {
  return Boolean(row?.product_id) || String(row?.name || '').trim() !== '';
}

export function materialQtyForCalc(row) {
  const s = String(row?.quantity ?? '').trim();
  if (s === '') return 0;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export const EMPTY_PO_FORM = {
  production_date: today(),
  expected_completion_date: '',
  status: 'draft',
  product_id: '',
  warehouse_id: '',
  quantity: '1',
  uom: 'pcs',
  entered_unit: '',
  production_overhead: '0',
  assigned_to: '',
  machine_line: '',
  notes: '',
  sales_order_id: '',
  sales_order_line_id: '',
  materials: [{ ...EMPTY_MATERIAL_LINE }],
};

export function formatCurrency(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatStatus(status) {
  if (!status) return '—';
  return String(status)
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Display name for finished goods — prefers full product name (already includes variant). */
export function formatProductionProductName(product) {
  if (!product) return '—';
  const name = String(product.name || '').trim();
  if (name) return name;
  if (product.variant_label) {
    return String(product.variant_label);
  }
  return product.sku || '—';
}

/**
 * Secondary line for product pickers. Name already includes "Parent — Variant",
 * so never repeat variant_label; only show SKU when it isn't echoed in the name.
 */
export function productPickerSubtitle(product) {
  if (!product) return '';
  const name = String(product.name || '').toLowerCase();
  const sku = String(product.sku || '').trim();
  if (!sku) return '';
  const skuLower = sku.toLowerCase();
  // Skip SKU when it's already part of the display name or is just the variant code.
  if (name.includes(skuLower)) return '';
  const variant = String(product.variant_label || '').trim().toLowerCase();
  if (variant && (skuLower === variant || skuLower.replace(/[\s_-]/g, '') === variant.replace(/[\s_-]/g, ''))) {
    return '';
  }
  return sku;
}

export function materialsCost(materials) {
  return (materials || []).reduce((sum, m) => {
    if (!isMaterialRowMeaningful(m)) return sum;
    const q = materialQtyForCalc(m);
    const uc = parseFloat(m.unit_cost) || 0;
    return sum + q * uc;
  }, 0);
}

export function computeClientShortages(materials) {
  const shortages = [];
  for (const m of materials || []) {
    const pid = m.product_id ? parseInt(m.product_id, 10) : 0;
    if (!pid) continue;
    const req = materialQtyForCalc(m);
    if (req < 1) continue;
    const avail = Math.floor(Number(m.stock) || 0);
    if (avail < req) {
      shortages.push({
        product_id: pid,
        name: m.name || '',
        required: req,
        available: avail,
        short: req - avail,
      });
    }
  }
  return shortages;
}

export function scaleBomLines(lines, orderQty) {
  const qty = Math.max(1, parseInt(orderQty, 10) || 1);
  return (lines || []).map((line) => ({
    product_id: line.product_id ? String(line.product_id) : '',
    name: line.name || '',
    quantity: String(Math.max(1, Math.round((Number(line.quantity) || 1) * qty))),
    unit_cost: String(line.unit_cost ?? 0),
    uom: line.unit || line.uom || '',
    factor_to_base: '',
    entered_unit: line.entered_unit || '',
    stock: line.stock ?? 0,
  }));
}

export function buildProductionOrderPayload(form) {
  const payload = {
    production_date: form.production_date,
    expected_completion_date: form.expected_completion_date || null,
    status: form.status || 'draft',
    product_id: parseInt(form.product_id, 10),
    warehouse_id: form.warehouse_id ? parseInt(form.warehouse_id, 10) : null,
    quantity: parseInt(form.quantity, 10),
    uom: form.uom || 'pcs',
    entered_unit: form.entered_unit || null,
    production_overhead: parseFloat(form.production_overhead) || 0,
    assigned_to: form.assigned_to ? parseInt(form.assigned_to, 10) : null,
    machine_line: form.machine_line?.trim() || null,
    notes: form.notes?.trim() || null,
    materials: (form.materials || [])
      .filter((m) => m.name?.trim() || m.product_id)
      .map((m) => ({
        product_id: m.product_id ? parseInt(m.product_id, 10) : null,
        name: (m.name || '').trim() || 'Material',
        quantity: materialQtyForCalc(m) > 0 ? materialQtyForCalc(m) : 1,
        unit_cost: parseFloat(m.unit_cost) || 0,
        uom: m.uom || null,
        factor_to_base:
          m.factor_to_base !== '' && m.factor_to_base != null
            ? parseFloat(m.factor_to_base)
            : null,
        entered_unit: m.entered_unit || null,
      })),
  };

  if (form.sales_order_id) {
    payload.sales_order_id = parseInt(form.sales_order_id, 10);
  }
  if (form.sales_order_line_id) {
    payload.sales_order_line_id = parseInt(form.sales_order_line_id, 10);
  }

  return payload;
}

export function applyProductionFormFromSalesOrderPreview(data) {
  const form = data?.form || data || {};
  const source = data?.source || form.source || null;

  return {
    product_id: form.product_id ? String(form.product_id) : '',
    quantity: form.quantity != null ? String(form.quantity) : '1',
    production_date: form.production_date || today(),
    expected_completion_date: form.expected_completion_date || '',
    notes: form.notes || '',
    sales_order_id: form.sales_order_id ? String(form.sales_order_id) : '',
    sales_order_line_id: form.sales_order_line_id ? String(form.sales_order_line_id) : '',
    _conversionSource: source,
    _manufacturableLines: form.manufacturable_lines || [],
  };
}

export function formFromOrder(order) {
  return {
    production_date: order.production_date || today(),
    expected_completion_date: order.expected_completion_date || '',
    status: order.status || 'draft',
    product_id: order.product_id ? String(order.product_id) : '',
    warehouse_id: order.warehouse_id ? String(order.warehouse_id) : '',
    quantity: order.quantity != null ? String(order.quantity) : '1',
    uom: order.uom || 'pcs',
    entered_unit: order.entered_unit || '',
    production_overhead:
      order.production_overhead != null ? String(order.production_overhead) : '0',
    assigned_to: order.assigned_to ? String(order.assigned_to) : '',
    machine_line: order.machine_line || '',
    notes: order.notes || '',
    sales_order_id: order.sales_order_id ? String(order.sales_order_id) : '',
    sales_order_line_id: '',
    materials: (order.materials || []).length
      ? order.materials.map((m) => ({
          product_id: m.product_id ? String(m.product_id) : '',
          name: m.name || '',
          quantity: m.quantity != null ? String(Math.round(m.quantity)) : '1',
          unit_cost: m.unit_cost != null ? String(m.unit_cost) : '0',
          uom: m.uom || '',
          factor_to_base: '',
          entered_unit: m.entered_unit || '',
          stock: 0,
        }))
      : [{ ...EMPTY_MATERIAL_LINE }],
  };
}
