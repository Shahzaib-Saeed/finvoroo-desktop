import {
  computeCartTotals,
  createCartLine,
  formatMoney,
  lineDiscountAmount,
  lineNet,
  lineTotal,
  money,
} from '@/pages/accounting/pos/lib/cart-math';
import { getMedicinePricing, productWithUnitPricing, formatUnitPriceInput } from './pharmacy-pricing';
import { pickFefoBatch } from './fefo';
import { getCachedBatchesForProduct } from './pharmacy-batch-store';

export { computeCartTotals, formatMoney, money };

/** Whole-number fields (qty, bonus) — strips letters/symbols while typing. */
export function sanitizeIntegerInput(value) {
  return String(value ?? '').replace(/\D/g, '');
}

/** Money / rate fields — digits and one decimal point only. */
export function sanitizeDecimalInput(value, { maxDecimals = 4 } = {}) {
  let s = String(value ?? '').replace(/[^\d.]/g, '');
  const dot = s.indexOf('.');
  if (dot !== -1) {
    s = `${s.slice(0, dot + 1)}${s.slice(dot + 1).replace(/\./g, '')}`;
  }
  if (maxDecimals != null && dot !== -1) {
    const [whole, frac = ''] = s.split('.');
    s = `${whole}.${frac.slice(0, maxDecimals)}`;
  }
  return s;
}

/** Show POS rate with max 2 decimal places (fixes pack÷unit leftovers). */
export function formatRateForDisplay(value) {
  if (value === '' || value == null) return '';
  const raw = String(value);
  const frac = raw.includes('.') ? raw.split('.')[1] : '';
  if (frac.length <= 2) return raw;
  return formatUnitPriceInput(value);
}

/** Always sell in product base unit (pcs / tablets) — no pack picker on counter. */
export function baseUnitForProduct(product) {
  const conv = product?.qty_conversion;
  return {
    unitKey: conv?.storage_unit_key || product?.unit || 'pcs',
    unitLabel: conv?.storage_label || product?.unit_label || product?.unit || 'pcs',
  };
}

/** Normalize dosage form / unit objects from API into display text. */
export function labelFromDosageForm(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object') {
    return String(value.name || value.label || value.code || '').trim();
  }
  return String(value).trim();
}

function packLabel(product, pharmacy, unitLabel) {
  const pack =
    pharmacy.pack_size ||
    pharmacy.pack_qty ||
    product.pack_size ||
    product.qty_conversion?.factor_to_base ||
    null;
  const form =
    labelFromDosageForm(pharmacy.dosage_form) ||
    labelFromDosageForm(pharmacy.form) ||
    labelFromDosageForm(product.dosage_form) ||
    labelFromDosageForm(product.form) ||
    unitLabel ||
    'pcs';
  if (pack) {
    const packText = String(pack).match(/s$/i) ? String(pack) : `${pack}s`;
    return `${form} (${packText})`;
  }
  return form;
}

export function formatLineUnitDisplay(line, fallbackUnit = 'pcs') {
  const raw = line?.form_pack || line?.unit_label || fallbackUnit;
  if (typeof raw === 'string') return raw;
  return labelFromDosageForm(raw) || fallbackUnit;
}

export function createPharmacyCartLine(product, qty = 1) {
  const pricing = getMedicinePricing(product);
  const line = createCartLine(productWithUnitPricing(product), qty);
  const pharmacy = product.pharmacy || {};
  const { unitKey, unitLabel } = baseUnitForProduct(product);
  const unitPrice = formatUnitPriceInput(pricing.unitPrice);
  const unitCost =
    pricing.unitPurchase != null ? formatUnitPriceInput(pricing.unitPurchase) : '0.00';
  const manufacturer =
    pharmacy.manufacturer?.name ||
    pharmacy.manufacturer_name ||
    product.manufacturer?.name ||
    product.manufacturer_name ||
    '';
  const batches = Array.isArray(product.batches)
    ? product.batches
    : Array.isArray(pharmacy.batches)
      ? pharmacy.batches
      : getCachedBatchesForProduct(product.id);
  // Deterministic client-side FEFO pick (mirrors
  // BatchInventoryService::allocateFefo's ordering exactly) rather than
  // trusting whatever order `batches` arrived in — works the same whether
  // that data came from a live request or, once cached, offline.
  const fefo = pickFefoBatch(batches, qty);

  return {
    ...line,
    entered_unit: unitKey,
    quantity_basis: 'base',
    unit_label: unitLabel,
    unit_price: unitPrice,
    original_price: unitPrice,
    cost_price: unitCost,
    mrp: pricing.unitMrp != null ? formatUnitPriceInput(pricing.unitMrp) : line.mrp ?? null,
    pack_price: pricing.packPrice,
    pack_size: pricing.packCount,
    image_url: product.image_url || product.image || null,
    generic_name: pharmacy.generic_name || '',
    strength_text: pharmacy.strength_text || '',
    manufacturer_name: manufacturer,
    form_pack: packLabel(product, pharmacy, unitLabel),
    dosage_form:
      labelFromDosageForm(pharmacy.dosage_form) ||
      labelFromDosageForm(pharmacy.form) ||
      labelFromDosageForm(product.dosage_form) ||
      '',
    prescription_required: !!pharmacy.prescription_required,
    controlled_drug: !!pharmacy.controlled_drug,
    pharmacy_warnings: Array.isArray(product.pharmacy_warnings)
      ? product.pharmacy_warnings
      : [],
    batches,
    selected_batch_id: fefo?.batch_id ?? fefo?.id ?? null,
    fefo_batch_number: fefo?.batch_number || product.batch_number || '',
    fefo_expiry: fefo?.expiry_date || product.expiry_date || '',
    batch_manual: false,
    price_overridden: false,
    default_unit_price: unitPrice,
  };
}

export function isPriceOverridden(line) {
  const current = money(line.unit_price);
  const original = money(line.default_unit_price ?? line.original_price ?? line.unit_price);
  return Math.abs(current - original) > 0.009;
}

export function isBelowMrp(line) {
  const mrp = Number(line.mrp);
  if (!Number.isFinite(mrp) || mrp <= 0) return false;
  return money(line.unit_price) + 0.009 < mrp;
}

export function isBelowCost(line) {
  const cost = Number(line.cost_price ?? line.product?.purchase_price ?? 0);
  if (cost <= 0) return false;
  return money(line.unit_price) + 0.009 < cost;
}

export function getLineWarnings(line) {
  const warnings = [];
  const qty = Number(line.quantity) || 0;
  const stock = Number(line.stock) || 0;
  const product = line.product;

  if (line.track_inventory !== false && qty > stock) {
    warnings.push({ key: 'low_stock', label: 'Low stock', tone: 'destructive' });
  } else {
    const reorder = product?.reorder_level ?? product?.min_stock;
    if (reorder != null && stock <= Number(reorder)) {
      warnings.push({ key: 'reorder', label: 'Low stock', tone: 'warn' });
    }
  }
  if (line.prescription_required) {
    warnings.push({ key: 'rx', label: 'Rx', tone: 'info' });
  }
  if (line.controlled_drug) {
    warnings.push({ key: 'controlled', label: 'Controlled', tone: 'destructive' });
  }
  if (isPriceOverridden(line)) {
    if (isBelowCost(line)) warnings.push({ key: 'below_cost', label: 'Below cost', tone: 'destructive' });
    else if (isBelowMrp(line)) warnings.push({ key: 'below_mrp', label: 'Below MRP', tone: 'warn' });
  }

  return warnings;
}

export function computePharmacyTotals(lines, invoiceDiscount = 0, taxRatesById = {}) {
  const base = computeCartTotals(lines, invoiceDiscount, taxRatesById);
  let lineDiscountTotal = 0;
  let totalBaseQty = 0;

  for (const line of lines) {
    lineDiscountTotal += lineDiscountAmount(line);
    totalBaseQty += Number(line.quantity) || 0;
  }

  return {
    ...base,
    lineDiscountTotal: money(lineDiscountTotal),
    totalBaseQty: money(totalBaseQty),
  };
}

export function toCheckoutLines(lines) {
  return lines.map((line) => {
    const { unitKey } = baseUnitForProduct(line.product || line);
    return {
      product_id: line.product_id || null,
      description: line.name || 'Item',
      quantity: Number(line.quantity) || 1,
      unit_price: Number(line.unit_price) || 0,
      discount: Number(line.discount) || 0,
      discount_type: line.discount_type === 'fixed' ? 'fixed' : 'percent',
      tax_rate_id: line.tax_rate_id || null,
      entered_unit: unitKey,
      quantity_basis: 'base',
    };
  });
}

export { lineDiscountAmount, lineNet, lineTotal };
