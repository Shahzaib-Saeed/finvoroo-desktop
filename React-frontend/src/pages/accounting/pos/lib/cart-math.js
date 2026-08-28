export function money(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

export function formatMoney(value, currency = 'USD') {
  const n = money(value);
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${currency || ''} ${n.toFixed(2)}`.trim();
  }
}

export function lineDiscountAmount(line) {
  const qty = Number(line.quantity) || 0;
  const price = Number(line.unit_price) || 0;
  const gross = qty * price;
  const raw = Number(line.discount) || 0;
  if (raw <= 0) return 0;
  if (line.discount_type === 'percent') {
    return money(gross * (Math.min(raw, 100) / 100));
  }
  return money(Math.min(raw, gross));
}

export function lineNet(line) {
  const qty = Number(line.quantity) || 0;
  const price = Number(line.unit_price) || 0;
  return money(qty * price - lineDiscountAmount(line));
}

export function lineTax(line, taxRatesById = {}) {
  const net = lineNet(line);
  const rateId = line.tax_rate_id;
  if (!rateId) return 0;
  const rate = taxRatesById[String(rateId)];
  const pct = Number(rate?.rate ?? line.tax_rate ?? 0) || 0;
  return money(net * (pct / 100));
}

export function lineTotal(line, taxRatesById = {}) {
  return money(lineNet(line) + lineTax(line, taxRatesById));
}

/** Match InvoiceWriteService / DocumentLinePricing document-discount tax base. */
function taxableNetAfterDocumentDiscount(lineNetAmount, subtotal, documentDiscount) {
  if (subtotal <= 0) return 0;
  const share = money((lineNetAmount / subtotal) * Math.min(documentDiscount, subtotal));
  return money(Math.max(0, lineNetAmount - share));
}

export function computeCartTotals(lines, invoiceDiscount = 0, taxRatesById = {}) {
  const safeLines = Array.isArray(lines) ? lines : [];
  const nets = safeLines.map((line) => lineNet(line));
  const subtotal = money(nets.reduce((s, n) => s + n, 0));
  const discount = money(Math.min(Number(invoiceDiscount) || 0, subtotal));
  let taxTotal = 0;
  for (let i = 0; i < safeLines.length; i += 1) {
    const line = safeLines[i];
    const taxable = taxableNetAfterDocumentDiscount(nets[i], subtotal, discount);
    const rateId = line.tax_rate_id;
    if (!rateId) {
      taxTotal += 0;
      continue;
    }
    const rate = taxRatesById[String(rateId)];
    const pct = Number(rate?.rate ?? line.tax_rate ?? 0) || 0;
    taxTotal += money(taxable * (pct / 100));
  }
  taxTotal = money(taxTotal);
  const total = money(Math.max(0, subtotal - discount + taxTotal));
  return { subtotal, taxTotal, discount, total, itemCount: safeLines.length };
}

export function createCartLine(product, qty = 1) {
  const unitPrice = Number(product.unit_price ?? product.selling_price ?? 0) || 0;
  return {
    key: `${product.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    product_id: product.id,
    name: product.name,
    sku: product.sku || product.code || '',
    barcode: product.barcode || '',
    image_url: product.image_url || product.image || null,
    quantity: qty,
    unit_price: unitPrice,
    original_price: unitPrice,
    cost_price: Number(product.purchase_price ?? product.cost_price ?? 0) || 0,
    discount: 0,
    discount_type: 'percent',
    tax_rate_id: product.tax_rate_id || product.tax_id || null,
    tax_rate: product.tax_rate?.rate ?? product.tax_rate ?? null,
    entered_unit: product.unit || product.unit_label || 'pcs',
    unit_label: product.unit_label || product.unit || 'pcs',
    stock: Number(product.current_stock ?? product.quantity_on_hand ?? 0) || 0,
    track_inventory: product.track_inventory ?? product.type !== 'service',
    qty_conversion: product.qty_conversion || null,
    product,
    notes: '',
  };
}

export function toCheckoutLines(lines) {
  return lines.map((line) => ({
    product_id: line.product_id || null,
    description: line.name || line.sku || 'Item',
    quantity: Number(line.quantity) || 1,
    unit_price: Number(line.unit_price) || 0,
    discount: Number(line.discount) || 0,
    discount_type: line.discount_type === 'fixed' ? 'fixed' : 'percent',
    tax_rate_id: line.tax_rate_id || null,
    entered_unit: line.entered_unit || undefined,
  }));
}
