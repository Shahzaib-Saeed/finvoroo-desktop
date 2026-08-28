import { expiryDisplayMask } from './expiry-mask';
import { money } from '@/pages/accounting/pos/lib/cart-math';
import {
  getMedicinePricing,
  roundUnitPrice,
} from './pharmacy-pricing';
import {
  lineHasEffectiveBatch,
  lineHasEffectiveExpiry,
  resolvePurchaseLineBatch,
  resolvePurchaseLineExpiryIso,
} from './pharmacy-purchase-defaults';

export function isWalkInCustomer(customer, walkIn) {
  if (!customer?.id) return true;
  if (walkIn?.id && String(customer.id) === String(walkIn.id)) return true;
  if (customer.is_walk_in) return true;
  if (String(customer.customer_code || '').toUpperCase() === 'WALK-IN') return true;
  return false;
}

export function emptyOpenReturnLine() {
  return {
    product_id: '',
    name: '',
    image_url: null,
    sub: '',
    quantity: '1',
    unit_price: '',
    pack_count: 1,
    batch_number: '',
    expiry_date: '',
  };
}

/** Per-tablet / per-piece refund rate — not pack price (matches counter sale). */
export function resolveOpenReturnUnitPrice(product) {
  if (!product) return '';
  const pricing = getMedicinePricing(product);
  let unitPrice = pricing.unitPrice;
  const packPrice = Number(pricing.packPrice);
  if (
    pricing.packCount > 1 &&
    Number.isFinite(packPrice) &&
    Number.isFinite(unitPrice) &&
    Math.abs(unitPrice - packPrice) < 0.01
  ) {
    unitPrice = packPrice / pricing.packCount;
  }
  if (!Number.isFinite(unitPrice)) return '';
  return roundUnitPrice(unitPrice).toFixed(2);
}

export function openReturnQtyHint(productOrLine) {
  const pricing = getMedicinePricing(productOrLine || {});
  if (pricing.packCount > 1) {
    return `tabs/pcs (pack ${pricing.packCount})`;
  }
  return 'units';
}

export function purchaseSettingsFromContext(defaults, settings = {}) {
  return {
    ...settings,
    default_batch_when_missing:
      settings.default_batch_when_missing ?? defaults?.batch ?? '',
    default_expiry_when_missing:
      settings.default_expiry_when_missing ?? defaults?.expiry_mask ?? '',
  };
}

export function validateOpenReturnLines(lines, purchaseSettings) {
  const active = (lines || []).filter((l) => l.product_id);
  if (!active.length) {
    return { error: 'Add at least one medicine.' };
  }
  for (const line of active) {
    const qty = Number(line.quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      return { error: 'Enter quantity for every medicine.' };
    }
    const price = Number(line.unit_price);
    if (!Number.isFinite(price) || price < 0) {
      return { error: 'Enter the refund amount for every medicine.' };
    }
    if (!lineHasEffectiveBatch(line, purchaseSettings)) {
      return { error: 'Batch is required (or set a default in Pharmacy settings).' };
    }
    if (!lineHasEffectiveExpiry(line, purchaseSettings)) {
      return { error: 'Expiry is required (or set a default in Pharmacy settings).' };
    }
  }
  return { active };
}

export function openReturnLineGross(line) {
  if (!line?.product_id) return 0;
  const qty = Number(line.quantity) || 0;
  const rate = Number(line.unit_price) || 0;
  if (qty <= 0 || rate < 0) return 0;
  return money(qty * rate);
}

/** Header discount on the whole return (all lines). */
export function computeOpenReturnHeaderDiscount(
  subtotal,
  discountType,
  discountPercent,
  discountAmount,
) {
  const gross = money(subtotal);
  if (gross <= 0) return 0;
  if (discountType === 'percent') {
    const pct = Math.min(Math.max(Number(discountPercent) || 0, 0), 100);
    return money(Math.min(gross, (gross * pct) / 100));
  }
  return money(Math.min(gross, Math.max(Number(discountAmount) || 0, 0)));
}

export function computeOpenReturnTotals(
  lines,
  { discountType = 'fixed', discountPercent = '', discountAmount = '' } = {},
) {
  const activeLines = (lines || []).filter((l) => l.product_id);
  let gross = 0;
  let items = 0;
  for (const line of activeLines) {
    const lineGross = openReturnLineGross(line);
    if (lineGross > 0) {
      gross += lineGross;
      items += 1;
    }
  }
  gross = money(gross);
  const discount = computeOpenReturnHeaderDiscount(
    gross,
    discountType,
    discountPercent,
    discountAmount,
  );
  const amount = money(Math.max(0, gross - discount));
  return { gross, discount, amount, items, activeLines };
}

/** Split header discount across lines proportionally for credit-note line_net. */
export function openReturnLineRefundNet(line, subtotal, headerDiscount) {
  const gross = openReturnLineGross(line);
  if (gross <= 0) return 0;
  if (subtotal <= 0 || headerDiscount <= 0) return gross;
  const share = money((gross / subtotal) * headerDiscount);
  return money(Math.max(0, gross - share));
}

export function buildOpenReturnPayload({
  lines,
  customerId,
  notes,
  refundCash,
  purchaseSettings,
  discountType = 'fixed',
  discountPercent = '',
  discountAmount = '',
}) {
  const { activeLines, gross, discount } = computeOpenReturnTotals(lines, {
    discountType,
    discountPercent,
    discountAmount,
  });
  return {
    customer_id: customerId || null,
    notes: notes?.trim() || null,
    refund_cash: refundCash,
    return_discount_type: discountType === 'percent' ? 'percent' : 'fixed',
    return_discount_percent:
      discountType === 'percent' ? Number(discountPercent) || 0 : null,
    return_discount_amount:
      discountType === 'fixed' ? Number(discountAmount) || 0 : null,
    return_discount: discount,
    lines: activeLines.map((l) => ({
      product_id: Number(l.product_id),
      quantity: Number(l.quantity),
      unit_price: Number(l.unit_price),
      line_net: openReturnLineRefundNet(l, gross, discount),
      batch_number: resolvePurchaseLineBatch(l, purchaseSettings),
      expiry_date: resolvePurchaseLineExpiryIso(l, purchaseSettings),
    })),
  };
}

export function formatOpenReturnMoney(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '0.00';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function defaultBatchPlaceholder(purchaseSettings) {
  return String(purchaseSettings.default_batch_when_missing || '').trim();
}

export function defaultExpiryPlaceholder(purchaseSettings) {
  const raw = String(purchaseSettings.default_expiry_when_missing || '').trim();
  return raw ? expiryDisplayMask(raw) : '';
}
