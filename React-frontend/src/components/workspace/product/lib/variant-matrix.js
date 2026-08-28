/** Soft / hard combination limits (mirror backend config/products.php). */
export const VARIANT_SOFT_LIMIT = 100;
export const VARIANT_HARD_LIMIT = 500;

/**
 * @param {Array<{ attribute_id?: number|string, name?: string, value_ids?: Array<number|string>, values?: Array<{id?: number, name: string}> }>} attributes
 * @returns {Array<{ value_ids: number[], label: string, sku_codes: string[] }>}
 */
export function generateVariantCombinations(attributes) {
  const sets = (attributes || [])
    .map((attr) => {
      const values = [];
      const seen = new Set();
      (attr.values || []).forEach((v) => {
        const id = v.id != null ? Number(v.id) : null;
        const name = String(v.name || '').trim();
        if (!name) return;
        const key = id != null ? `id:${id}` : `name:${name.toLowerCase()}`;
        if (seen.has(key)) return;
        seen.add(key);
        values.push({
          id,
          name,
          code: String(v.code || name)
            .toUpperCase()
            .replace(/[^A-Z0-9]+/g, '_')
            .replace(/^_|_$/g, '')
            .slice(0, 24) || 'VAL',
          attribute_id: attr.attribute_id != null ? Number(attr.attribute_id) : null,
        });
      });
      return values;
    })
    .filter((s) => s.length > 0);

  if (!sets.length) return [];

  let combos = [[]];
  for (const set of sets) {
    const next = [];
    for (const prefix of combos) {
      for (const item of set) {
        next.push([...prefix, item]);
      }
    }
    combos = next;
    if (combos.length > VARIANT_HARD_LIMIT) break;
  }

  return combos.map((combo) => {
    const sorted = [...combo].sort((a, b) => (a.attribute_id || 0) - (b.attribute_id || 0));
    return {
      value_ids: sorted.map((v) => v.id).filter((id) => id != null),
      label: sorted.map((v) => v.name).join(' / '),
      sku_codes: sorted.map((v) => v.code),
      values: sorted,
    };
  });
}

export function suggestVariantSku(parentSku, codes) {
  const base = String(parentSku || '')
    .trim()
    .replace(/\s+/g, '');
  const suffix = (codes || []).join('-');
  const sku = base ? `${base}-${suffix}` : suffix;
  return sku.slice(0, 50);
}

export function combinationKey(combo) {
  if (combo.value_ids?.length) {
    return [...combo.value_ids].map(Number).sort((a, b) => a - b).join('-');
  }
  return (combo.label || '').toLowerCase();
}

/**
 * Merge generated combinations with existing variant rows (preserve edits).
 */
export function mergeVariantRows(combinations, existingRows, parentSku) {
  const byKey = new Map();
  (existingRows || []).forEach((row) => {
    const key = row._key || combinationKey(row);
    byKey.set(key, row);
  });

  return combinations.map((combo) => {
    const key = combinationKey(combo);
    const prev = byKey.get(key);
    if (prev) {
      return {
        ...prev,
        _key: key,
        value_ids: combo.value_ids,
        variant_label: combo.label,
        values: combo.values,
        lifecycle_status: prev.lifecycle_status || (prev.is_active === false ? 'archived' : 'active'),
        images: prev.images || [],
        image_files: prev.image_files || [],
      };
    }
    return {
      _key: key,
      value_ids: combo.value_ids,
      variant_label: combo.label,
      values: combo.values,
      sku: suggestVariantSku(parentSku, combo.sku_codes),
      barcode: '',
      unit_price: '',
      purchase_price: '',
      reorder_level: '',
      tax_rate_id: '',
      weight_kg: '',
      dimensions: '',
      is_active: true,
      lifecycle_status: 'active',
      is_default_variant: false,
      image_url: '',
      image_file: null,
      images: [],
      image_files: [],
    };
  });
}

/** Commercial fields copied when duplicating a variant. */
export function commercialFieldsFromVariant(row) {
  return {
    unit_price: row.unit_price ?? '',
    purchase_price: row.purchase_price ?? '',
    tax_rate_id: row.tax_rate_id || '',
    reorder_level: row.reorder_level ?? '',
    weight_kg: row.weight_kg ?? '',
    dimensions: row.dimensions || '',
    barcode: row.barcode || '',
    lifecycle_status: row.lifecycle_status || 'active',
    is_active: (row.lifecycle_status || 'active') === 'active',
    images: (row.images || []).map((img) => ({ ...img })),
    image_url: row.image_url || '',
    image_file: null,
    image_files: [],
  };
}

export function suggestCopiedSku(sourceSku, label) {
  const base = String(sourceSku || '').trim();
  if (!base) return suggestVariantSku('', [String(label || 'COPY').replace(/\s+/g, '-')]);
  const suffix = String(label || 'COPY')
    .replace(/\s*\/\s*/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 20);
  const cut = base.replace(/-[^-]+$/, '');
  return `${cut || base}-${suffix}`.slice(0, 50);
}
