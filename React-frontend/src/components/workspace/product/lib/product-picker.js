/**
 * Shared helpers for document line product pickers (invoice / SO / quote / etc.).
 * Variant children are grouped under the generic parent name in the picker UI.
 */

export function productPickerLabel(product) {
  if (!product) return '';
  return product.name || '';
}

/** Generic catalog name for a variant child (e.g. "Coils" from "Coils — 27 KGS"). */
export function productParentDisplayName(product) {
  if (!product) return '';
  const fromApi = String(product.picker_parent_name || '').trim();
  if (fromApi) return fromApi;

  const label = String(product.variant_label || '').trim();
  const name = String(product.name || '').trim();
  if (label && name) {
    const suffixes = [` — ${label}`, ` - ${label}`, ` – ${label}`, `— ${label}`];
    for (const suffix of suffixes) {
      if (name.endsWith(suffix)) {
        return name.slice(0, -suffix.length).trim() || name;
      }
    }
  }
  return name;
}

export function productVariantDisplayLabel(product) {
  if (!product) return '';
  return (
    String(product.variant_label || '').trim() ||
    String(product.name || '').trim() ||
    'Variant'
  );
}

/** Keywords for SearchableCombobox — includes parent name for default variants. */
export function productPickerKeywords(product) {
  const parts = [
    product?.name,
    product?.sku,
    product?.barcode,
    product?.variant_label,
    product?.picker_parent_name,
    product?.picker_parent_sku,
    productParentDisplayName(product),
    ...(product?.search_aliases || []),
  ];
  return parts.filter(Boolean).join(' ');
}

/**
 * Sort options so default variants of a family appear first when searching parent name.
 */
export function sortProductsForPicker(products) {
  return [...(products || [])].sort((a, b) => {
    const aDef = a.is_default_variant ? 0 : 1;
    const bDef = b.is_default_variant ? 0 : 1;
    if (aDef !== bDef) return aDef - bDef;
    return String(a.name || '').localeCompare(String(b.name || ''));
  });
}

export function buildProductComboboxOptions(products) {
  return sortProductsForPicker(products).map((p) => ({
    value: String(p.id),
    label: productPickerLabel(p),
    keywords: productPickerKeywords(p),
    product: p,
  }));
}

/**
 * Group sellable SKUs into standalone products + variant families for the
 * document line picker. Selecting a family never returns a parent id — only
 * a child/standalone SKU id is selectable.
 */
export function buildGroupedProductPickerOptions(products) {
  const list = sortProductsForPicker(products);
  const families = new Map();
  const standalones = [];

  for (const product of list) {
    const parentId = product?.variant_parent_id;
    if (parentId != null && parentId !== '') {
      const key = String(parentId);
      if (!families.has(key)) {
        families.set(key, {
          kind: 'family',
          value: `family:${key}`,
          parentId: key,
          label: productParentDisplayName(product),
          variants: [],
        });
      }
      const family = families.get(key);
      family.variants.push(product);
      if (!family.label) family.label = productParentDisplayName(product);
      // Prefer API parent name / default child's parent name when available.
      if (product.picker_parent_name) {
        family.label = String(product.picker_parent_name).trim();
      }
      if (product.is_default_variant) {
        family.defaultVariantId = String(product.id);
      }
    } else {
      standalones.push({
        kind: 'standalone',
        value: String(product.id),
        label: productPickerLabel(product),
        keywords: productPickerKeywords(product),
        product,
      });
    }
  }

  const familyOptions = [...families.values()]
    .map((family) => {
      const variants = sortProductsForPicker(family.variants);
      const defaultVariant =
        variants.find((v) => v.is_default_variant) || variants[0] || null;
      const keywords = [
        family.label,
        ...variants.flatMap((v) => [
          v.name,
          v.sku,
          v.barcode,
          v.variant_label,
          ...(v.search_aliases || []),
        ]),
      ]
        .filter(Boolean)
        .join(' ');

      return {
        ...family,
        label: family.label || productParentDisplayName(variants[0]),
        variants,
        defaultVariantId: defaultVariant ? String(defaultVariant.id) : null,
        keywords,
        variantCount: variants.length,
      };
    })
    .sort((a, b) => String(a.label).localeCompare(String(b.label)));

  return [...familyOptions, ...standalones].sort((a, b) =>
    String(a.label).localeCompare(String(b.label)),
  );
}

/** Compact selected-line label: "Coils · 27 KGS" for variants, else product name. */
export function productSelectedLineLabel(product) {
  if (!product) return '';
  if (product.variant_parent_id && product.variant_label) {
    const parent = productParentDisplayName(product);
    const variant = productVariantDisplayLabel(product);
    if (parent && variant && parent !== variant) {
      return `${parent} · ${variant}`;
    }
  }
  return productPickerLabel(product);
}

/** Word / SKU prefix match — avoids fuzzy hits like "port" inside "Export". */
export function strictProductPickerFilter(value, search, keywords) {
  const q = String(search || '').trim().toLowerCase();
  if (!q) return 1;

  const terms = (keywords || []).map((t) => String(t).toLowerCase());
  const label = terms[0] || String(value || '').toLowerCase();
  const nameWords = label.split(/[\s/(),\-–—_]+/).filter(Boolean);

  if (nameWords.some((w) => w.startsWith(q))) return 100;
  if (label.startsWith(q)) return 95;
  if (label.includes(q) && q.length >= 2) return 80;

  for (const term of terms) {
    if (!term) continue;
    if (term === q) return 92;
    if (term.startsWith(q) && q.length >= 2) return 88;
    for (const part of term.split(/[\s/(),\-–—_]+/).filter(Boolean)) {
      if (part === q) return 90;
      if (part.startsWith(q) && q.length >= 1) return 85;
      if (part.includes(q) && q.length >= 2) return 70;
    }
  }

  return 0;
}

/** Split label text into highlighted segments for the active search query. */
export function splitHighlightedSearchText(text, query) {
  const source = String(text ?? '');
  const q = String(query || '').trim();
  if (!q) return [{ text: source, match: false }];

  const lowerQ = q.toLowerCase();
  const tokens = source.split(/(\s+)/);
  const parts = [];

  for (const token of tokens) {
    if (/^\s+$/.test(token)) {
      parts.push({ text: token, match: false });
      continue;
    }

    const chunks = token.split(/([\s/(),\-–—]+)/).filter((c) => c !== '');
    for (const chunk of chunks) {
      if (/^[\s/(),\-–—]+$/.test(chunk)) {
        parts.push({ text: chunk, match: false });
        continue;
      }
      const lowerChunk = chunk.toLowerCase();
      if (lowerChunk.startsWith(lowerQ)) {
        parts.push({ text: chunk.slice(0, q.length), match: true });
        if (chunk.length > q.length) {
          parts.push({ text: chunk.slice(q.length), match: false });
        }
      } else {
        parts.push({ text: chunk, match: false });
      }
    }
  }

  return parts.length ? parts : [{ text: source, match: false }];
}
