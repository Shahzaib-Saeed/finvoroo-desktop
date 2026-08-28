import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { toast } from 'sonner';
import { productsApi } from '../api/products.api';
import {
  EMPTY_PRODUCT_FORM,
  PRODUCT_NAME_MAX_LENGTH,
  buildProductRequestBody,
  mapProductToForm,
  productTracksStock,
} from '../constants';
import { VARIANT_HARD_LIMIT } from '../lib/variant-matrix';
import { useProductLookups } from './useProductLookups';

function accountListKeyForField(fieldKey) {
  if (fieldKey === 'income_account_id') return 'revenue_accounts';
  if (fieldKey === 'inventory_asset_account_id') return 'asset_accounts';
  return 'expense_accounts';
}

function normalizeAccountOption(account) {
  if (!account?.id && account?.id !== 0) return null;
  return {
    id: account.id,
    code: account.account_number ?? account.code ?? '',
    name: account.name ?? '',
  };
}

function normalizeCategory(c) {
  if (!c?.id && c?.id !== 0) return null;
  return { id: c.id, name: c.name ?? '', code: c.code ?? null };
}

function normalizeBrand(b) {
  if (!b?.id && b?.id !== 0) return null;
  return { id: b.id, name: b.name ?? '' };
}

function normalizeUnitOption(u) {
  if (!u) return null;
  const value = u.value ?? (u.id != null ? `u:${u.id}` : null);
  if (!value) return null;
  return {
    value: String(value),
    label: u.label || u.name || String(value),
  };
}

function cloneConversionRows(rows) {
  return (rows || []).map((r) => ({ ...r }));
}

export function useProductForm({
  mode = 'create',
  productId,
  product,
  initialType,
  onSuccess,
} = {}) {
  const isEdit = mode === 'edit';
  const {
    lookups,
    loadingLookups,
    patchLookups,
    refreshCategories,
    refreshBrands,
    refreshUnits,
    refreshAccounts,
  } = useProductLookups();

  const [form, setForm] = useState(() => ({
    ...EMPTY_PRODUCT_FORM,
    type: initialType || EMPTY_PRODUCT_FORM.type,
  }));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const [selectRevision, setSelectRevision] = useState(0);
  /** Pack-size rows keyed by base UOM — restored when user switches back to that base. */
  const conversionsByBaseRef = useRef({});

  useEffect(() => {
    conversionsByBaseRef.current = {};
    if (product) {
      const mapped = mapProductToForm(product);
      // Prefill on create should still honor the picked inventory type.
      if (!isEdit && initialType) {
        mapped.type = initialType;
      }
      // Never treat a prefill stub as an existing product id in create mode.
      if (!isEdit) {
        delete mapped.id;
      }
      setForm(mapped);
      setImagePreview(mapped.image_url || '');
    } else if (initialType && !isEdit) {
      setForm((f) => ({ ...EMPTY_PRODUCT_FORM, ...f, type: initialType }));
      setImagePreview('');
    } else if (!isEdit && !product) {
      setForm({ ...EMPTY_PRODUCT_FORM, type: initialType || EMPTY_PRODUCT_FORM.type });
      setImagePreview('');
    }
  }, [product, initialType, isEdit]);

  // The product's alternate units (Pair, Dozen, Box, Carton, ...) aren't part of
  // ProductResource — fetched separately and merged in once we know the product id.
  useEffect(() => {
    if (!isEdit || !productId) return;
    let cancelled = false;
    productsApi
      .getUnitConversions(productId)
      .then((res) => {
        if (cancelled) return;
        const rows = (res?.data?.data?.rows || []).map((r) => ({
          unit_key: r.unit_key,
          parent_unit_key: r.parent_unit_key || null,
          factor_to_parent: r.factor_to_parent,
          is_active: r.is_active !== false,
          is_whole_number_only: !!r.is_whole_number_only,
        }));
        setForm((f) => {
          const base = f.unit || 'pcs';
          conversionsByBaseRef.current[base] = cloneConversionRows(rows);
          return { ...f, product_unit_conversions: rows };
        });
      })
      .catch(() => {
        // Non-fatal — the panel just starts empty; the user can still add units fresh.
      });
    return () => {
      cancelled = true;
    };
  }, [isEdit, productId]);

  const setUnitConversions = useCallback((rows) => {
    setForm((f) => {
      const base = f.unit || 'pcs';
      conversionsByBaseRef.current[base] = cloneConversionRows(rows);
      return { ...f, product_unit_conversions: rows };
    });
  }, []);

  const handleBaseUnitChange = useCallback((nextUnit) => {
    if (!nextUnit) return;

    setForm((f) => {
      const prevUnit = f.unit || 'pcs';
      if (prevUnit === nextUnit) return f;

      const currentRows = f.product_unit_conversions || [];
      if (currentRows.length > 0) {
        conversionsByBaseRef.current[prevUnit] = cloneConversionRows(currentRows);
      }

      const cached = conversionsByBaseRef.current[nextUnit];
      const restored = cached ? cloneConversionRows(cached) : [];

      if (restored.length > 0) {
        toast.message('Pack sizes restored', {
          description: 'Additional units for this base UOM were brought back.',
        });
      } else if (currentRows.length > 0) {
        toast.message('Additional units cleared', {
          description: 'Conversion factors always relate to the base inventory UOM.',
        });
      }

      return {
        ...f,
        unit: nextUnit,
        product_unit_conversions: restored,
      };
    });
  }, []);

  const bumpSelectRevision = useCallback(() => {
    setSelectRevision((n) => n + 1);
  }, []);

  const applySelection = useCallback(
    (fieldKey, fieldValue, patchLookupsFn) => {
      flushSync(() => {
        patchLookups(patchLookupsFn);
        setForm((f) => ({ ...f, [fieldKey]: fieldValue }));
        setSelectRevision((n) => n + 1);
      });
    },
    [patchLookups]
  );

  const setField = useCallback((key, value) => {
    setForm((f) => {
      const resolved = typeof value === 'function' ? value(f[key], f) : value;
      const nextValue =
        key === 'name' && typeof resolved === 'string' && !isEdit
          ? resolved.slice(0, PRODUCT_NAME_MAX_LENGTH)
          : resolved;
      return { ...f, [key]: nextValue };
    });
    setErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  }, [isEdit]);

  const setMetadataField = useCallback((fieldId, value) => {
    setForm((f) => ({
      ...f,
      product_metadata_custom_fields: {
        ...f.product_metadata_custom_fields,
        [fieldId]: value,
      },
    }));
  }, []);

  const setImageFile = useCallback((file) => {
    if (!file) return;
    if (imagePreview?.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setForm((f) => ({
      ...f,
      image_file: file,
      remove_image: false,
    }));
    setImagePreview(URL.createObjectURL(file));
  }, [imagePreview]);

  const clearImage = useCallback(() => {
    if (imagePreview?.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setForm((f) => ({
      ...f,
      image_file: null,
      remove_image: !!f.image_url,
      image_url: '',
    }));
    setImagePreview('');
  }, [imagePreview]);

  const refreshCategory = useCallback(
    async (created) => {
      const entry = normalizeCategory(created);
      if (!entry) return;
      const id = String(entry.id);

      applySelection('category_id', id, (prev) => {
        const list = (prev.categories || []).map(normalizeCategory).filter(Boolean);
        const next = list.filter((c) => String(c.id) !== id);
        next.push(entry);
        return { categories: next };
      });

      try {
        await refreshCategories();
      } finally {
        applySelection('category_id', id, (prev) => {
          const list = (prev.categories || []).map(normalizeCategory).filter(Boolean);
          if (list.some((c) => String(c.id) === id)) return prev;
          return { categories: [...list, entry] };
        });
      }
    },
    [applySelection, refreshCategories]
  );

  const refreshBrand = useCallback(
    async (created) => {
      const entry = normalizeBrand(created);
      if (!entry) return;
      const id = String(entry.id);

      applySelection('brand_id', id, (prev) => {
        const list = (prev.brands || []).map(normalizeBrand).filter(Boolean);
        const next = list.filter((b) => String(b.id) !== id);
        next.push(entry);
        return { brands: next };
      });

      try {
        await refreshBrands();
      } finally {
        applySelection('brand_id', id, (prev) => {
          const list = (prev.brands || []).map(normalizeBrand).filter(Boolean);
          if (list.some((b) => String(b.id) === id)) return prev;
          return { brands: [...list, entry] };
        });
      }
    },
    [applySelection, refreshBrands]
  );

  const refreshUnit = useCallback(
    async (created) => {
      const entry = normalizeUnitOption(created);
      if (!entry) return;
      const val = entry.value;

      applySelection('unit', val, (prev) => {
        const list = (prev.unit_options || []).map(normalizeUnitOption).filter(Boolean);
        const next = list.filter((u) => u.value !== val);
        next.push(entry);
        return { unit_options: next };
      });

      try {
        await refreshUnits();
      } finally {
        applySelection('unit', val, (prev) => {
          const list = (prev.unit_options || []).map(normalizeUnitOption).filter(Boolean);
          if (list.some((u) => u.value === val)) return prev;
          return { unit_options: [...list, entry] };
        });
      }
    },
    [applySelection, refreshUnits]
  );

  const refreshAccountList = useCallback(
    async (created, fieldKey) => {
      const account = normalizeAccountOption(created?.id != null ? created : created?.data ?? created);
      if (!account?.id || !fieldKey) return;
      const id = String(account.id);
      const listKey = accountListKeyForField(fieldKey);

      applySelection(fieldKey, id, (prev) => {
        const list = prev[listKey] || [];
        const next = list.filter((a) => String(a.id) !== id);
        next.push(account);
        return { [listKey]: next };
      });

      try {
        await refreshAccounts();
      } finally {
        applySelection(fieldKey, id, (prev) => {
          const list = prev[listKey] || [];
          if (list.some((a) => String(a.id) === id)) return prev;
          return { [listKey]: [...list, account] };
        });
      }
    },
    [applySelection, refreshAccounts]
  );

  const refreshTax = useCallback(
    async (created) => {
      if (!created?.id) return;
      const id = String(created.id);
      const entry = {
        id: created.id,
        name: created.name ?? `Tax #${id}`,
        rate: created.rate ?? created.percentage ?? null,
      };
      applySelection('tax_rate_id', id, (prev) => {
        const list = [...(prev.tax_rates || [])];
        const next = list.filter((t) => String(t.id) !== id);
        next.push(entry);
        return { tax_rates: next };
      });
    },
    [applySelection]
  );

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!form.name.trim()) {
      setErrors({ name: 'Product name is required' });
      toast.error('Product name is required');
      return;
    }
    if (!isEdit && form.name.length > PRODUCT_NAME_MAX_LENGTH) {
      setErrors({
        name: `Product name cannot exceed ${PRODUCT_NAME_MAX_LENGTH} characters`,
      });
      toast.error(`Product name cannot exceed ${PRODUCT_NAME_MAX_LENGTH} characters`);
      return;
    }
    if (form.unit_price === '' || Number(form.unit_price) < 0) {
      toast.error('Selling price is required');
      return;
    }
    const conversionRows = form.product_unit_conversions || [];
    const incompleteUnit = conversionRows.find(
      (r) => r.unit_key && !(Number(r.factor_to_parent) > 0)
    );
    if (incompleteUnit) {
      toast.error(
        `Enter a conversion factor for "${incompleteUnit.unit_key}" (how many ${form.unit || 'base units'} it contains), or remove that unit`
      );
      return;
    }
    const unitKeys = conversionRows.map((r) => r.unit_key).filter(Boolean);
    if (new Set(unitKeys).size !== unitKeys.length) {
      toast.error('Duplicate additional units are not allowed on the same product');
      return;
    }
    if (unitKeys.includes(form.unit || 'pcs')) {
      toast.error('The Base UOM cannot also be listed as an additional unit');
      return;
    }
    if (form.has_variants) {
      if (!productTracksStock(form.type)) {
        toast.error('Variants are only supported for stock-tracked product types');
        return;
      }
      const attrs = form.variant_matrix_attributes || [];
      if (!attrs.length || attrs.every((a) => !(a.values || []).length)) {
        toast.error('Select at least one attribute with values for variants');
        return;
      }
      const rows = form.variants || [];
      if (!rows.length) {
        toast.error('No variant combinations to save');
        return;
      }
      if (rows.length > VARIANT_HARD_LIMIT) {
        toast.error(`Too many variants (${rows.length}). Maximum is ${VARIANT_HARD_LIMIT}.`);
        return;
      }
    }

    setSaving(true);
    try {
      const body = buildProductRequestBody(form);
      const res =
        isEdit && productId
          ? await productsApi.update(productId, body)
          : await productsApi.create(body);

      toast.success(res?.data?.message || `Product ${isEdit ? 'updated' : 'created'} successfully`);
      onSuccess?.(res?.data?.data);
    } catch (err) {
      const apiErrors = err?.response?.data?.errors;
      if (apiErrors && typeof apiErrors === 'object') {
        const flat = {};
        Object.entries(apiErrors).forEach(([k, v]) => {
          flat[k] = Array.isArray(v) ? v[0] : String(v);
        });
        setErrors(flat);
      }
      toast.error(err?.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} product`);
    } finally {
      setSaving(false);
    }
  };

  return {
    form,
    errors,
    saving,
    loadingLookups,
    lookups,
    isEdit,
    imagePreview,
    selectRevision,
    setField,
    setMetadataField,
    setUnitConversions,
    handleBaseUnitChange,
    setImageFile,
    clearImage,
    handleSubmit,
    refreshCategory,
    refreshBrand,
    refreshUnit,
    refreshAccountList,
    refreshTax,
  };
}
