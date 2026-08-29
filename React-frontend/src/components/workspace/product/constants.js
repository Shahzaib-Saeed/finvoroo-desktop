export const PRODUCT_TYPES = {
  finished_good: 'Finished Good (Manufactured)',
  manufactured: 'Manufactured Product',
  raw_material: 'Raw Material',
  inventory: 'Inventory Product',
  non_inventory: 'Non-Inventory Product',
  service: 'Service',
};

export const PRODUCT_TYPE_SHORT = {
  finished_good: 'Finished good',
  manufactured: 'Manufactured',
  raw_material: 'Raw material',
  inventory: 'Inventory',
  non_inventory: 'Non-inventory',
  service: 'Service',
};

export const PRODUCT_TYPE_HINTS = {
  finished_good: 'Sellable output',
  manufactured: 'Built with BOM & routing',
  raw_material: 'Comp for manufacturing',
  inventory: 'Stocked, COGS',
  non_inventory: 'Sold without stock tracking',
  service: 'Labor, time, or fees only',
};

export const INVENTORY_TYPES = new Set([
  'finished_good',
  'manufactured',
  'raw_material',
  'inventory',
]);

export function productTracksStock(type) {
  return INVENTORY_TYPES.has(type);
}

export const PRODUCT_NAME_MAX_LENGTH = 150;

export const EMPTY_PRODUCT_FORM = {
  name: '',
  sku: '',
  barcode: '',
  type: 'inventory',
  is_active: true,
  unit: 'pcs',
  category_id: '',
  brand_id: '',
  description: '',
  internal_notes: '',
  manufacturer: '',
  mpn: '',
  weight_kg: '',
  dimensions: '',
  unit_price: '',
  mrp: '',
  wholesale_price: '',
  purchase_price: '',
  tax_rate_id: '',
  reorder_level: '',
  min_stock: '',
  max_stock: '',
  default_warehouse_id: '',
  costing_method: '',
  income_account_id: '',
  expense_account_id: '',
  cogs_account_id: '',
  inventory_asset_account_id: '',
  product_metadata_custom_fields: {},
  product_unit_conversions: [],
  has_variants: false,
  variant_matrix_attributes: [],
  variants: [],
  image_url: '',
  image_file: null,
  remove_image: false,
  pharmacy: {
    generic_name: '',
    strength_text: '',
    strength_value: '',
    strength_unit: '',
    dosage_form_id: '',
    manufacturer_id: '',
    prescription_required: false,
    controlled_drug: false,
    controlled_schedule: '',
    storage_condition: '',
    bin_location: '',
    hsn_sac: '',
    pack_size: '',
    units_per_pack: '',
    allow_fractional_qty: false,
    sale_blocked_when_expired: true,
  },
  barcodes: [],
};

export function mapProductToForm(product) {
  if (!product) return { ...EMPTY_PRODUCT_FORM };

  return {
    ...EMPTY_PRODUCT_FORM,
    name: product.name || '',
    sku: product.sku || product.code || '',
    barcode: product.barcode || '',
    type: product.type || 'inventory',
    is_active: product.is_active !== false,
    unit: product.unit || 'pcs',
    category_id: product.category_id ? String(product.category_id) : '',
    brand_id: product.brand_id ? String(product.brand_id) : '',
    description: product.description || '',
    internal_notes: product.internal_notes || '',
    manufacturer: product.manufacturer || '',
    mpn: product.mpn || '',
    weight_kg: product.weight_kg ?? '',
    dimensions: product.dimensions || '',
    unit_price: product.unit_price ?? product.selling_price ?? '',
    mrp: product.mrp ?? '',
    wholesale_price: product.wholesale_price ?? '',
    purchase_price: product.purchase_price ?? product.cost_price ?? '',
    tax_rate_id: product.tax_rate_id ? String(product.tax_rate_id) : '',
    reorder_level: product.reorder_level ?? '',
    min_stock: product.min_stock ?? '',
    max_stock: product.max_stock ?? '',
    default_warehouse_id: product.default_warehouse_id
      ? String(product.default_warehouse_id)
      : '',
    costing_method: product.costing_method || '',
    income_account_id: product.income_account_id
      ? String(product.income_account_id)
      : '',
    expense_account_id: product.expense_account_id
      ? String(product.expense_account_id)
      : '',
    cogs_account_id: product.cogs_account_id ? String(product.cogs_account_id) : '',
    inventory_asset_account_id: product.inventory_asset_account_id
      ? String(product.inventory_asset_account_id)
      : '',
    product_metadata_custom_fields: product.product_metadata_custom_fields || {},
    has_variants: !!product.has_variants,
    variant_matrix_attributes: (product.variant_matrix?.attributes || []).map((a) => ({
      attribute_id: a.attribute_id,
      name: a.name,
      code: a.code,
      value_ids: a.value_ids || [],
      values: a.values || [],
    })),
    variants: (product.variants || []).map((v) => ({
      _key: (v.value_ids || []).slice().sort((a, b) => a - b).join('-') || v.variant_label,
      id: v.id,
      value_ids: v.value_ids || [],
      variant_key: v.variant_key,
      variant_label: v.variant_label,
      sku: v.sku || '',
      barcode: v.barcode || '',
      unit_price: v.unit_price ?? '',
      purchase_price: v.purchase_price ?? '',
      reorder_level: v.reorder_level ?? '',
      tax_rate_id: v.tax_rate_id ? String(v.tax_rate_id) : '',
      weight_kg: v.weight_kg ?? '',
      dimensions: v.dimensions || '',
      is_active: v.is_active !== false,
      lifecycle_status: v.lifecycle_status || (v.is_active === false ? 'archived' : 'active'),
      is_default_variant: !!v.is_default_variant,
      image_url: v.image_url || '',
      image_file: null,
      images: (v.images || []).filter((img) => !img.inherited).map((img) => ({
        id: img.id,
        path: img.path,
        url: img.url,
        is_primary: !!img.is_primary,
      })),
      image_files: [],
    })),
    image_url: product.image_url || '',
    image_file: null,
    remove_image: false,
    images: (product.images || []).filter((img) => !img.inherited).map((img) => ({
      id: img.id,
      path: img.path,
      url: img.url,
      is_primary: !!img.is_primary,
    })),
    pharmacy: {
      ...EMPTY_PRODUCT_FORM.pharmacy,
      ...(product.pharmacy || {}),
      dosage_form_id: product.pharmacy?.dosage_form_id
        ? String(product.pharmacy.dosage_form_id)
        : '',
      manufacturer_id: product.pharmacy?.manufacturer_id
        ? String(product.pharmacy.manufacturer_id)
        : '',
      strength_value: product.pharmacy?.strength_value ?? '',
      pack_size: product.pharmacy?.pack_size ?? '',
      units_per_pack: product.pharmacy?.units_per_pack ?? '',
    },
    barcodes: Array.isArray(product.barcodes)
      ? product.barcodes.map((b) => ({
          code: b.code || '',
          source: b.source || 'internal',
          pack_level: b.pack_level || 'unit',
          is_primary: !!b.is_primary,
          vendor_id: b.vendor_id || '',
        }))
      : [],
  };
}

export function buildProductPayload(form) {
  const tracks = productTracksStock(form.type);

  return {
    name: form.name.trim(),
    sku: form.sku?.trim() || null,
    barcode: form.barcode?.trim() || null,
    type: form.type,
    is_active: !!form.is_active,
    unit: form.unit || 'pcs',
    category_id: form.category_id ? Number(form.category_id) : null,
    brand_id: form.brand_id ? Number(form.brand_id) : null,
    description: form.description || null,
    internal_notes: form.internal_notes || null,
    manufacturer: form.manufacturer || null,
    mpn: form.mpn || null,
    weight_kg: form.weight_kg === '' ? null : Number(form.weight_kg),
    dimensions: form.dimensions || null,
    unit_price: Number(form.unit_price) || 0,
    mrp: form.mrp === '' || form.mrp == null ? null : Number(form.mrp),
    wholesale_price:
      form.wholesale_price === '' || form.wholesale_price == null
        ? null
        : Number(form.wholesale_price),
    purchase_price: form.purchase_price === '' ? 0 : Number(form.purchase_price) || 0,
    tax_rate_id: form.tax_rate_id ? Number(form.tax_rate_id) : null,
    reorder_level: tracks && form.reorder_level !== '' ? Number(form.reorder_level) : null,
    min_stock: tracks && form.min_stock !== '' ? Number(form.min_stock) : null,
    max_stock: tracks && form.max_stock !== '' ? Number(form.max_stock) : null,
    default_warehouse_id:
      tracks && form.default_warehouse_id ? Number(form.default_warehouse_id) : null,
    costing_method: tracks && form.costing_method ? form.costing_method : null,
    income_account_id: form.income_account_id ? Number(form.income_account_id) : null,
    expense_account_id: form.expense_account_id ? Number(form.expense_account_id) : null,
    cogs_account_id: tracks && form.cogs_account_id ? Number(form.cogs_account_id) : null,
    inventory_asset_account_id:
      tracks && form.inventory_asset_account_id
        ? Number(form.inventory_asset_account_id)
        : null,
    product_metadata_custom_fields: form.product_metadata_custom_fields || {},
    product_unit_conversions: buildUnitConversionsPayload(form.product_unit_conversions),
    ...buildVariantsPayload(form),
    ...buildPharmacyPayload(form),
  };
}

function buildPharmacyPayload(form) {
  const p = form.pharmacy || {};
  const hasPharmacySignal =
    p.generic_name ||
    p.strength_text ||
    p.dosage_form_id ||
    p.manufacturer_id ||
    p.prescription_required ||
    p.controlled_drug ||
    p.pack_size ||
    p.units_per_pack ||
    (Array.isArray(form.barcodes) && form.barcodes.length > 0) ||
    form.mrp !== '' ||
    form.wholesale_price !== '';

  if (!hasPharmacySignal && !form.pharmacy) {
    return {};
  }

  return {
    pharmacy: {
      generic_name: p.generic_name?.trim() || null,
      strength_text: p.strength_text?.trim() || null,
      strength_value:
        p.strength_value === '' || p.strength_value == null
          ? null
          : Number(p.strength_value),
      strength_unit: p.strength_unit?.trim() || null,
      dosage_form_id: p.dosage_form_id ? Number(p.dosage_form_id) : null,
      manufacturer_id: p.manufacturer_id ? Number(p.manufacturer_id) : null,
      prescription_required: !!p.prescription_required,
      controlled_drug: !!p.controlled_drug,
      controlled_schedule: p.controlled_schedule?.trim() || null,
      storage_condition: p.storage_condition?.trim() || null,
      bin_location: p.bin_location?.trim() || null,
      hsn_sac: p.hsn_sac?.trim() || null,
      pack_size: p.pack_size === '' || p.pack_size == null ? null : Number(p.pack_size),
      units_per_pack:
        p.units_per_pack === '' || p.units_per_pack == null
          ? null
          : Number(p.units_per_pack),
      allow_fractional_qty: !!p.allow_fractional_qty,
      sale_blocked_when_expired: p.sale_blocked_when_expired !== false,
    },
    barcodes: (form.barcodes || [])
      .filter((b) => (b.code || '').trim())
      .map((b) => ({
        code: b.code.trim(),
        source: b.source || 'internal',
        pack_level: b.pack_level || 'unit',
        is_primary: !!b.is_primary,
        vendor_id: b.vendor_id ? Number(b.vendor_id) : null,
      })),
  };
}

function buildVariantsPayload(form) {
  if (!form.has_variants) {
    return { has_variants: false };
  }

  const attributes = (form.variant_matrix_attributes || [])
    .filter((a) => (a.values || []).length > 0)
    .map((a) => ({
      attribute_id: a.attribute_id ? Number(a.attribute_id) : undefined,
      name: a.name || undefined,
      value_ids: (a.value_ids || a.values || [])
        .map((v) => (typeof v === 'object' ? v.id : v))
        .filter((id) => id != null)
        .map(Number),
    }));

  const variants = (form.variants || []).map((v) => {
    const lifecycle =
      v.lifecycle_status || (v.is_active === false ? 'archived' : 'active');
    return {
      value_ids: (v.value_ids || []).map(Number),
      variant_key: v.variant_key || undefined,
      sku: v.sku?.trim() || null,
      barcode: v.barcode?.trim() || null,
      unit_price: v.unit_price === '' || v.unit_price == null ? Number(form.unit_price) || 0 : Number(v.unit_price),
      purchase_price:
        v.purchase_price === '' || v.purchase_price == null
          ? Number(form.purchase_price) || 0
          : Number(v.purchase_price),
      reorder_level: v.reorder_level === '' || v.reorder_level == null ? null : Number(v.reorder_level),
      tax_rate_id: v.tax_rate_id ? Number(v.tax_rate_id) : null,
      weight_kg: v.weight_kg === '' || v.weight_kg == null ? null : Number(v.weight_kg),
      dimensions: v.dimensions || null,
      lifecycle_status: lifecycle,
      is_active: lifecycle === 'active',
      is_default_variant: !!v.is_default_variant && lifecycle === 'active',
      images: (v.images || []).map((img) => (typeof img === 'string' ? img : img.path)).filter(Boolean),
      // files appended separately in buildProductRequestBody
      _image_file: v.image_file || null,
      _image_files: Array.isArray(v.image_files) ? v.image_files : [],
    };
  });

  return {
    has_variants: true,
    variant_matrix: { attributes },
    variants,
  };
}

/** Only complete rows (a unit picked + a positive factor) are sent to the backend. */
function buildUnitConversionsPayload(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((r) => r.unit_key && Number(r.factor_to_parent) > 0)
    .map((r) => ({
      unit_key: r.unit_key,
      parent_unit_key: r.parent_unit_key || null,
      factor_to_parent: Number(r.factor_to_parent),
      is_active: r.is_active !== false,
      is_whole_number_only: !!r.is_whole_number_only,
    }));
}

/** Recursively append nested objects/arrays for Laravel FormData validation. */
function appendNestedFormData(fd, prefix, value) {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    value.forEach((item, i) => {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        Object.entries(item).forEach(([k, v]) => {
          appendNestedFormData(fd, `${prefix}[${i}][${k}]`, v);
        });
      } else if (item !== null && item !== undefined) {
        fd.append(
          `${prefix}[${i}]`,
          typeof item === 'boolean' ? (item ? '1' : '0') : String(item),
        );
      }
    });
    return;
  }
  if (typeof value === 'object') {
    Object.entries(value).forEach(([k, v]) => {
      appendNestedFormData(fd, `${prefix}[${k}]`, v);
    });
    return;
  }
  fd.append(prefix, typeof value === 'boolean' ? (value ? '1' : '0') : String(value));
}

/** JSON body or FormData when image upload / remove is involved. */
export function buildProductRequestBody(form) {
  const payload = buildProductPayload(form);
  const hasFile = form.image_file instanceof File;
  const removeImage = !!form.remove_image;
  const hasVariantFiles = (form.variants || []).some(
    (v) =>
      v.image_file instanceof File ||
      (Array.isArray(v.image_files) && v.image_files.some((f) => f instanceof File)),
  );

  // Strip non-serializable file handles from JSON payload.
  if (Array.isArray(payload.variants)) {
    payload.variants = payload.variants.map(({ _image_file, _image_files, ...rest }) => rest);
  }

  if (!hasFile && !removeImage && !hasVariantFiles) {
    return payload;
  }

  const fd = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    if (key === 'product_metadata_custom_fields' && typeof value === 'object') {
      Object.entries(value).forEach(([fieldId, fieldVal]) => {
        fd.append(`product_metadata_custom_fields[${fieldId}]`, fieldVal ?? '');
      });
      return;
    }
    if (key === 'product_unit_conversions' && Array.isArray(value)) {
      value.forEach((row, i) => {
        Object.entries(row).forEach(([rowKey, rowVal]) => {
          if (rowVal === null || rowVal === undefined) return;
          fd.append(
            `product_unit_conversions[${i}][${rowKey}]`,
            typeof rowVal === 'boolean' ? (rowVal ? '1' : '0') : String(rowVal),
          );
        });
      });
      return;
    }
    if (key === 'pharmacy' && value && typeof value === 'object') {
      appendNestedFormData(fd, 'pharmacy', value);
      return;
    }
    if (key === 'barcodes' && Array.isArray(value)) {
      appendNestedFormData(fd, 'barcodes', value);
      return;
    }
    if (key === 'variant_matrix' && value && typeof value === 'object') {
      (value.attributes || []).forEach((attr, i) => {
        if (attr.attribute_id != null) {
          fd.append(`variant_matrix[attributes][${i}][attribute_id]`, String(attr.attribute_id));
        }
        if (attr.name) fd.append(`variant_matrix[attributes][${i}][name]`, String(attr.name));
        (attr.value_ids || []).forEach((vid, j) => {
          fd.append(`variant_matrix[attributes][${i}][value_ids][${j}]`, String(vid));
        });
      });
      return;
    }
    if (key === 'variants' && Array.isArray(value)) {
      value.forEach((row, i) => {
        Object.entries(row).forEach(([rowKey, rowVal]) => {
          if (rowVal === null || rowVal === undefined) return;
          if (
            rowKey === '_image_file' ||
            rowKey === '_image_files' ||
            rowKey === 'image_file' ||
            rowKey === 'image_files'
          ) {
            return;
          }
          if (Array.isArray(rowVal)) {
            rowVal.forEach((item, j) => {
              fd.append(`variants[${i}][${rowKey}][${j}]`, String(item));
            });
            return;
          }
          fd.append(
            `variants[${i}][${rowKey}]`,
            typeof rowVal === 'boolean' ? (rowVal ? '1' : '0') : String(rowVal),
          );
        });
      });
      return;
    }
    if (typeof value === 'boolean') {
      fd.append(key, value ? '1' : '0');
    } else {
      fd.append(key, String(value));
    }
  });

  if (hasFile) fd.append('image', form.image_file);
  if (removeImage) fd.append('remove_image', '1');

  (form.variants || []).forEach((row, i) => {
    const files = [];
    if (Array.isArray(row.image_files)) {
      row.image_files.forEach((f) => {
        if (f instanceof File) files.push(f);
      });
    }
    if (row.image_file instanceof File) files.push(row.image_file);
    files.forEach((file, j) => {
      fd.append(`variants[${i}][images_files][${j}]`, file);
    });
    if (files.length === 1 && !(row.images || []).length) {
      fd.append(`variants[${i}][image]`, files[0]);
    }
  });

  return fd;
}

