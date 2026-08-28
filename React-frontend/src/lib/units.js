/**
 * Client-side unit conversion (mirrors backend ProductUnitCatalog for UI hints and stock caps).
 */

const SCALE = 1000000000000; // 12dp

function factorMapFromMeta(qtyConversion) {
  if (!qtyConversion?.family_units?.length) return null;
  const map = new Map();
  for (const u of qtyConversion.family_units) {
    map.set(String(u.unit_key), Number(u.factor_to_family_base) || 0);
  }
  return {
    map,
    storageKey: qtyConversion.storage_unit_key,
    storageLabel: qtyConversion.storage_label,
  };
}

function toScaledBigInt(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return 0;
  const neg = raw.startsWith('-');
  const clean = neg ? raw.slice(1) : raw;
  const [wholeRaw, fracRaw = ''] = clean.split('.');
  const whole = Number(wholeRaw || '0');
  const frac = Number((fracRaw.replace(/\D/g, '') + '0'.repeat(12)).slice(0, 12) || '0') / Math.pow(10, (fracRaw.replace(/\D/g, '') + '0'.repeat(12)).slice(0, 12).length);
  const out = whole * SCALE + frac * SCALE;
  return neg ? -out : out;
}

function fromScaledBigInt(value) {
  const neg = value < 0;
  const abs = neg ? -value : value;
  const whole = Math.floor(abs / SCALE);
  const frac = (abs % SCALE) / SCALE;
  const out = frac > 0 ? `${whole}.${frac.toString().slice(2).replace(/0+$/, '')}` : `${whole}`;
  return neg ? `-${out}` : out;
}

export function resolveEnteredUnit(line, product) {
  const entered = String(line?.entered_unit ?? '').trim();
  if (entered) return entered;

  const conv = product?.qty_conversion;
  if (!conv) return '';

  if (line?.quantity_basis === 'base' && conv.base_unit_key) {
    return conv.base_unit_key;
  }

  return conv.default_entered_unit || conv.storage_unit_key || '';
}

export function convertQuantity(qty, fromUnitKey, toUnitKey, qtyConversion) {
  const parsed = Number(qty);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  if (!fromUnitKey || !toUnitKey || fromUnitKey === toUnitKey) return parsed;

  const meta = factorMapFromMeta(qtyConversion);
  if (!meta) return parsed;

  const fromFactor = meta.map.get(fromUnitKey);
  const toFactor = meta.map.get(toUnitKey);
  if (fromFactor == null || !toFactor || toFactor <= 0) return parsed;

  const qtyInt = toScaledBigInt(parsed);
  const fromInt = toScaledBigInt(fromFactor);
  const toInt = toScaledBigInt(toFactor);
  if (toInt === 0) return parsed;

  // qty * from / to in fixed-point math (12dp)
  const scaled = (qtyInt * fromInt) / toInt;
  return Number(fromScaledBigInt(scaled));
}

function formatQty(n) {
  const v = Number(n) || 0;
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(6).replace(/\.?0+$/, '') || '0';
}

export function getStorageUnitLabel(product) {
  const conv = product?.qty_conversion;
  return (
    conv?.storage_label ||
    conv?.storage_unit_key ||
    product?.unit_label ||
    product?.unit ||
    ''
  );
}

/**
 * Read-only base-unit conversion string for tooltips / diagnostics.
 * Never written back into line.quantity; backend remains the authority at save.
 */
export function baseUnitConversionPreview(line, product) {
  const conv = product?.qty_conversion;
  if (!conv?.storage_unit_key) return '';

  const enteredUnit = resolveEnteredUnit(line, product);
  if (!enteredUnit || enteredUnit === conv.storage_unit_key) return '';

  const qty = Number(line?.quantity);
  if (!Number.isFinite(qty) || qty <= 0) return '';

  const converted = convertQuantity(qty, enteredUnit, conv.storage_unit_key, conv);
  if (!Number.isFinite(converted) || converted <= 0) return '';

  const label = conv.storage_label || conv.storage_unit_key;
  return `≈ ${formatQty(converted)} ${label} (base)`;
}

/**
 * Unit dropdown option label with conversion beside the name, e.g.
 * "Pair (1 Pair = 2 Piece)". Base/storage unit stays plain ("Piece").
 */
export function formatUnitFamilyOptionLabel(unit, qtyConversion) {
  if (!unit) return '';
  const label = String(unit.label || unit.unit_key || '');
  const storageKey = qtyConversion?.storage_unit_key;
  const storageLabel = qtyConversion?.storage_label || storageKey || '';
  if (!storageKey || !unit.unit_key || String(unit.unit_key) === String(storageKey)) {
    return label;
  }
  const factor = convertQuantity(1, String(unit.unit_key), storageKey, qtyConversion);
  if (!Number.isFinite(factor) || factor <= 0) return label;
  return `${label} (1 ${label} = ${formatQty(factor)} ${storageLabel})`;
}

/**
 * Closed unit trigger: "Pair" or optionally "Pair • Stock: 15".
 */
export function formatUnitTriggerLabel(unitLabel, stockInUnit, { showStock = false } = {}) {
  const label = String(unitLabel || '').trim();
  if (!label) return '';
  if (!showStock || stockInUnit == null) return label;
  const n = Number(stockInUnit);
  if (!Number.isFinite(n)) return label;
  return `${label} • Stock: ${formatQty(n)}`;
}

function buildConversionRatioLines(conv) {
  if (!conv?.storage_unit_key || !conv?.family_units?.length) return [];

  const storageKey = conv.storage_unit_key;
  const storageLabel = conv.storage_label || storageKey;
  const lines = [];

  for (const unit of conv.family_units) {
    if (!unit?.unit_key || unit.unit_key === storageKey) continue;
    const factor = convertQuantity(1, String(unit.unit_key), storageKey, conv);
    if (!Number.isFinite(factor) || factor <= 0) continue;
    lines.push(`1 ${unit.label || unit.unit_key} = ${formatQty(factor)} ${storageLabel}`);
  }

  return lines;
}

function bestDisplayUnit(stockQty, conv) {
  const units = Array.isArray(conv?.family_units) ? conv.family_units : [];
  if (!units.length) return null;
  const storageKey = conv.storage_unit_key;
  const candidates = units
    .filter((u) => u?.unit_key && u.unit_key !== storageKey)
    .map((u) => ({
      key: String(u.unit_key),
      label: String(u.label || u.unit_key),
      qty: convertQuantity(stockQty, storageKey, String(u.unit_key), conv),
    }))
    .filter((u) => Number.isFinite(u.qty) && u.qty >= 1);
  if (!candidates.length) return null;
  // Prefer the largest practical unit (smallest converted qty >= 1).
  candidates.sort((a, b) => a.qty - b.qty);
  return candidates[0];
}

export function conversionHint(qty, line, product) {
  const conv = product?.qty_conversion;
  if (!conv?.storage_unit_key) return '';

  const enteredUnit = resolveEnteredUnit(line, product);
  if (!enteredUnit || enteredUnit === conv.storage_unit_key) return '';

  const stockQty = convertQuantity(qty, enteredUnit, conv.storage_unit_key, conv);
  if (Math.abs(stockQty - Number(qty)) < 0.0000001) return '';

  const label = conv.storage_label || conv.storage_unit_key;
  const friendly = bestDisplayUnit(stockQty, conv);
  if (friendly) {
    return `≈ ${formatQty(friendly.qty)} ${friendly.label} (${formatQty(stockQty)} ${label} stock)`;
  }
  return `≈ ${formatQty(stockQty)} ${label} stock`;
}

/** Formatted quantity only (no unit suffix) — use when unit is shown in another column. */
export function formatStockQtyOnly(stockQty) {
  return formatQty(Number(stockQty) || 0);
}

/** Same as formatStockQtyOnly — for reports and activity grids. */
export function formatInventoryQty(value) {
  return formatStockQtyOnly(value);
}

export function movementDocumentVerb(row) {
  const kind = row?.document_kind;
  const type = row?.type;
  if (type === "purchase" || kind === "bill" || kind === "bill_cancel") {
    return "Purchased as";
  }
  if (type === "sale" || kind === "invoice" || kind === "invoice_cancel") {
    return "Sold as";
  }
  if (kind === "credit_note") {
    return "Returned as";
  }
  return "Document:";
}

export function getMovementQtyHint(absQty, row) {
  const product = {
    unit: row?.unit_key,
    unit_label: row?.unit_label,
    qty_conversion: row?.qty_conversion,
  };
  const lines = [];
  const storageLabel = getStorageUnitLabel(product);

  if (absQty > 0 && storageLabel) {
    lines.push(`${formatQty(absQty)} ${storageLabel} in inventory`);
  }

  if (row?.entered_quantity != null && row?.entered_unit_label) {
    lines.push(
      `${movementDocumentVerb(row)} ${formatQty(row.entered_quantity)} ${row.entered_unit_label}`,
    );
  }

  const baseHint = getStockConversionHint(absQty, product);
  if (baseHint) {
    for (const line of baseHint.split("\n")) {
      if (line.includes(" = ") || line.startsWith("≈")) {
        lines.push(line);
      }
    }
  } else if (row?.unit_conversion_label) {
    lines.push(row.unit_conversion_label);
  }

  return lines.length ? lines.join("\n") : null;
}

export function movementShowsDocumentQty(row) {
  if (row?.entered_quantity == null || !row?.entered_unit_label) {
    return false;
  }
  const absQty = Math.abs(Number(row?.quantity) || 0);
  if (row.entered_unit_key && row.unit_key && row.entered_unit_key !== row.unit_key) {
    return true;
  }
  return Math.abs(Number(row.entered_quantity) - absQty) > 0.0001;
}

export function formatStockForDisplay(stockQty, product) {
  const stock = Number(stockQty) || 0;
  const label = getStorageUnitLabel(product);
  return label ? `${formatQty(stock)} ${label}` : formatQty(stock);
}

export function getStockConversionHint(stockQty, product) {
  const stock = Number(stockQty) || 0;
  const conv = product?.qty_conversion;
  if (!conv?.storage_unit_key || !conv?.family_units?.length) {
    return null;
  }

  const storageLabel = getStorageUnitLabel(product);
  const lines = [];

  if (stock > 0) {
    lines.push(`${formatQty(stock)} ${storageLabel} on hand`);
    const friendly = bestDisplayUnit(stock, conv);
    if (friendly) {
      lines.push(`≈ ${formatQty(friendly.qty)} ${friendly.label}`);
    }
  }

  const ratios = buildConversionRatioLines(conv);
  if (ratios.length) {
    lines.push(...ratios);
  }

  return lines.length ? lines.join('\n') : null;
}

export function productHasStockConversion(product) {
  const conv = product?.qty_conversion;
  return Boolean(
    conv?.storage_unit_key &&
      Array.isArray(conv.family_units) &&
      conv.family_units.length > 1,
  );
}

export function unitLabelForLine(line, product) {
  const entered = resolveEnteredUnit(line, product);
  if (!entered) return product?.unit_label || '';
  const familyUnits = product?.qty_conversion?.family_units || [];
  const match = familyUnits.find((u) => String(u.unit_key) === String(entered));
  if (match?.label) return match.label;
  if (entered) return entered;
  return product?.unit_label || '';
}

export function maxQtyInEnteredUnit(stockQty, line, product) {
  const conv = product?.qty_conversion;
  const stock = Number(stockQty) || 0;

  if (conv?.family_units?.length > 1) {
    const enteredUnit = resolveEnteredUnit(line, product);
    if (enteredUnit) {
      return convertQuantity(stock, conv.storage_unit_key, enteredUnit, conv);
    }
  }

  const basis = line?.quantity_basis || 'sales';
  if (basis === 'base' && conv?.factor_to_base > 0) {
    return stock / conv.factor_to_base;
  }

  return stock;
}

/**
 * Stock snapshot in base + entered unit for hover/dropdown hints.
 * Never mutates quantity; callers use it for visual guidance only.
 */
export function stockAvailabilitySummary(stockQtyBase, line, product) {
  const conv = product?.qty_conversion;
  const baseQty = Number(stockQtyBase) || 0;
  const baseLabel = getStorageUnitLabel(product);

  const enteredUnit = resolveEnteredUnit(line, product);
  const isAltUnit = Boolean(
    enteredUnit && conv?.storage_unit_key && enteredUnit !== conv.storage_unit_key,
  );

  let unitLabel = '';
  let unitQty = null;
  if (isAltUnit) {
    const familyUnits = conv.family_units || [];
    const match = familyUnits.find((u) => String(u.unit_key) === String(enteredUnit));
    unitLabel = match?.label || enteredUnit;
    unitQty = convertQuantity(baseQty, conv.storage_unit_key, enteredUnit, conv);
  }

  return {
    baseQty,
    baseLabel,
    isAltUnit,
    unitLabel,
    unitQty,
  };
}

export function defaultEnteredUnitForProduct(product) {
  return product?.qty_conversion?.default_entered_unit || '';
}
