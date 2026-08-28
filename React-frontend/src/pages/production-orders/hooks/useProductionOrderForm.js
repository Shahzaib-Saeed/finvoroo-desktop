import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { productionOrdersApi } from '../api/production-orders.api';
import { productsApi } from '@/components/workspace/product/api/products.api';
import { defaultEnteredUnitForProduct } from '@/lib/units';
import { warehousesApi } from '@/pages/accounting/inventory/api/warehouses.api';
import { employeesApi } from '@/pages/employee/api/employees.api';
import {
  EMPTY_PO_FORM,
  EMPTY_MATERIAL_LINE,
  FINISHED_TYPES,
  RAW_TYPES,
  applyProductionFormFromSalesOrderPreview,
  buildProductionOrderPayload,
  formFromOrder,
  scaleBomLines,
} from '../constants';

function validateForm(form) {
  const errors = {};
  if (!form.product_id) errors.product_id = 'Finished product is required';
  if (!form.production_date) errors.production_date = 'Production date is required';
  const qty = parseInt(form.quantity, 10);
  if (!Number.isFinite(qty) || qty < 1) errors.quantity = 'Quantity must be at least 1';
  const mats = (form.materials || []).filter((m) => m.name?.trim() || m.product_id);
  if (!mats.length) errors.materials = 'At least one material line is required';
  mats.forEach((m, i) => {
    if (!m.name?.trim() && !m.product_id) {
      errors[`materials.${i}.name`] = 'Material name or product is required';
    }
  });
  return errors;
}

async function fetchAllProducts(type) {
  let page = 1;
  let items = [];
  let lastPage = 1;
  do {
    // selectable_only returns sellable child SKUs + standalone products
    // (excludes variant templates) — same scope as invoice/SO pickers.
    const res = await productsApi.list({
      per_page: 100,
      page,
      type,
      selectable_only: true,
    });
    const chunk = res.data?.data ?? [];
    const meta = res.data?.meta ?? {};
    if (Array.isArray(chunk)) items = items.concat(chunk);
    lastPage = meta.last_page ?? 1;
    page += 1;
  } while (page <= lastPage);
  return items;
}

export function useProductionOrderForm({ mode, orderId, salesOrderId, salesOrderLineId, onSuccess }) {
  const isEdit = mode === 'edit';
  const [form, setForm] = useState({ ...EMPTY_PO_FORM });
  const [errors, setErrors] = useState({});
  const [finishedProducts, setFinishedProducts] = useState([]);
  const [rawProducts, setRawProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [unitOptions, setUnitOptions] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingSource, setLoadingSource] = useState(false);
  const [conversionSource, setConversionSource] = useState(null);
  const [manufacturableLines, setManufacturableLines] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loadingBom, setLoadingBom] = useState(false);

  const setField = useCallback((key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingOptions(true);
    Promise.all([
      productsApi.formOptions(),
      warehousesApi.formOptions().catch(() => ({ data: { data: {} } })),
      employeesApi.list({ per_page: 100 }),
      ...FINISHED_TYPES.map((t) => fetchAllProducts(t)),
      ...RAW_TYPES.map((t) => fetchAllProducts(t)),
    ])
      .then(([prodOpts, whRes, empRes, ...productChunks]) => {
        if (cancelled) return;
        const units = prodOpts.data?.data?.unit_options ?? [];
        setUnitOptions(Array.isArray(units) ? units : []);
        const wh = whRes.data?.data?.warehouses ?? whRes.data?.data ?? [];
        setWarehouses(Array.isArray(wh) ? wh : []);
        const emps = empRes.data?.data ?? [];
        setEmployees(Array.isArray(emps) ? emps : []);

        const finished = [];
        const raw = [];
        const typeGroups = [
          ...FINISHED_TYPES.map((t) => ({ t, bucket: 'finished' })),
          ...RAW_TYPES.map((t) => ({ t, bucket: 'raw' })),
        ];
        productChunks.forEach((items, idx) => {
          const { bucket } = typeGroups[idx];
          if (bucket === 'finished') finished.push(...items);
          else raw.push(...items);
        });
        setFinishedProducts(finished);
        setRawProducts(raw);
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load form options');
      })
      .finally(() => {
        if (!cancelled) setLoadingOptions(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isEdit || !orderId) return;
    let cancelled = false;
    setLoading(true);
    productionOrdersApi
      .show(orderId)
      .then((res) => {
        if (cancelled) return;
        const order = res.data?.data;
        if (order) setForm(formFromOrder(order));
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err?.response?.data?.message || 'Failed to load production order');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isEdit, orderId]);

  useEffect(() => {
    if (!salesOrderId || isEdit) return;
    let cancelled = false;
    setLoadingSource(true);
    const params = salesOrderLineId ? { sales_order_line_id: salesOrderLineId } : undefined;
    productionOrdersApi
      .fromSalesOrder(salesOrderId, params)
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.data || {};
        const mapped = applyProductionFormFromSalesOrderPreview(data);
        setForm((f) => ({ ...f, ...mapped }));
        setConversionSource(mapped._conversionSource || data.source || null);
        setManufacturableLines(mapped._manufacturableLines || []);
        if (mapped.product_id) {
          productionOrdersApi
            .getBom(mapped.product_id)
            .then((bomRes) => {
              if (cancelled) return;
              const lines = bomRes.data?.data ?? [];
              if (lines.length) {
                setForm((f) => ({
                  ...f,
                  materials: scaleBomLines(lines, f.quantity),
                }));
              }
            })
            .catch(() => {});
        }
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err?.response?.data?.message || 'Could not load sales order for production');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSource(false);
      });
    return () => {
      cancelled = true;
    };
  }, [salesOrderId, salesOrderLineId, isEdit]);

  const loadBom = useCallback(async () => {
    if (!form.product_id) {
      toast.error('Select a finished product first');
      return;
    }
    setLoadingBom(true);
    try {
      const res = await productionOrdersApi.getBom(form.product_id);
      const lines = res.data?.data ?? [];
      if (!lines.length) {
        toast.message('No saved BOM for this product');
        return;
      }
      setForm((f) => ({
        ...f,
        materials: scaleBomLines(lines, f.quantity),
      }));
      toast.success('BOM loaded');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load BOM');
    } finally {
      setLoadingBom(false);
    }
  }, [form.product_id, form.quantity]);

  const saveBomTemplate = useCallback(async () => {
    if (!form.product_id) {
      toast.error('Select a finished product first');
      return;
    }
    const mats = (form.materials || []).filter((m) => m.product_id);
    if (!mats.length) {
      toast.error('Link at least one material to a product to save BOM');
      return;
    }
    try {
      const orderQty = Math.max(1, parseInt(form.quantity, 10) || 1);
      await productionOrdersApi.saveBom({
        product_id: parseInt(form.product_id, 10),
        order_quantity: orderQty,
        materials: mats.map((m) => ({
          product_id: parseInt(m.product_id, 10),
          quantity: parseInt(m.quantity, 10) || 1,
        })),
      });
      toast.success('BOM template saved');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save BOM');
    }
  }, [form]);

  const addMaterialRow = useCallback(() => {
    setForm((f) => ({
      ...f,
      materials: [...(f.materials || []), { ...EMPTY_MATERIAL_LINE }],
    }));
  }, []);

  const applyMaterialProduct = useCallback((index, productId, meta) => {
    setForm((f) => {
      const materials = [...(f.materials || [])];
      const row = { ...materials[index] };
      if (!productId) {
        row.product_id = '';
        row.stock = 0;
      } else {
        row.product_id = String(productId);
        row.name = meta?.name ?? row.name;
        row.stock = Number(meta?.stock ?? 0);
        const cost = Number(meta?.unit_cost);
        row.unit_cost =
          Number.isFinite(cost) && cost > 0 ? String(cost) : '';
        if (meta?.entered_unit !== undefined) {
          row.entered_unit = meta.entered_unit || '';
        }
      }
      materials[index] = row;
      return { ...f, materials };
    });
  }, []);

  const selectMaterialProduct = useCallback(
    async (index, productId) => {
      if (!productId) {
        applyMaterialProduct(index, '', null);
        return;
      }

      const prod = rawProducts.find((p) => String(p.id) === String(productId));
      applyMaterialProduct(index, productId, {
        name: prod?.name,
        stock:
          prod?.available_stock ??
          prod?.current_stock ??
          prod?.quantity_on_hand ??
          0,
        unit_cost: prod?.purchase_price ?? prod?.cost_price ?? prod?.unit_price,
        entered_unit: defaultEnteredUnitForProduct(prod) || '',
      });

      try {
        const res = await productionOrdersApi.getMaterialUnitCost(productId);
        const data = res.data?.data;
        if (data) {
          applyMaterialProduct(index, productId, {
            name: data.name,
            stock: data.stock,
            unit_cost: data.unit_cost,
          });
          if (!(Number(data.unit_cost) > 0)) {
            toast.message(
              'No purchase or inventory cost on file for this material. Set purchase price on the product or enter unit cost manually.',
            );
          }
        }
      } catch {
        toast.error('Could not load default unit cost for this material');
      }
    },
    [applyMaterialProduct, rawProducts],
  );

  const updateMaterial = useCallback((index, key, value) => {
    if (key === 'product_id') {
      selectMaterialProduct(index, value);
      return;
    }
    setForm((f) => {
      const materials = [...(f.materials || [])];
      materials[index] = { ...materials[index], [key]: value };
      return { ...f, materials };
    });
  }, [selectMaterialProduct]);

  const removeMaterial = useCallback((index) => {
    setForm((f) => {
      const materials = [...(f.materials || [])];
      materials.splice(index, 1);
      return { ...f, materials: materials.length ? materials : [{ ...EMPTY_MATERIAL_LINE }] };
    });
  }, []);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    const nextErrors = validateForm(form);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    setSaving(true);
    try {
      const payload = buildProductionOrderPayload(form);
      const res = isEdit
        ? await productionOrdersApi.update(orderId, payload)
        : await productionOrdersApi.create(payload);
      toast.success(res.data?.message || (isEdit ? 'Order updated' : 'Order created'));
      onSuccess?.(res.data?.data);
    } catch (err) {
      const data = err?.response?.data;
      if (data?.errors) {
        const mapped = {};
        Object.entries(data.errors).forEach(([k, v]) => {
          mapped[k] = Array.isArray(v) ? v[0] : v;
        });
        setErrors(mapped);
      }
      toast.error(data?.message || 'Could not save production order');
    } finally {
      setSaving(false);
    }
  };

  const selectedProduct = useMemo(
    () => finishedProducts.find((p) => String(p.id) === String(form.product_id)),
    [finishedProducts, form.product_id]
  );

  useEffect(() => {
    if (selectedProduct?.unit && !isEdit) {
      setForm((f) => ({ ...f, uom: selectedProduct.unit || f.uom }));
    }
  }, [selectedProduct?.id, isEdit]);

  return {
    form,
    setField,
    errors,
    finishedProducts,
    rawProducts,
    warehouses,
    employees,
    unitOptions,
    loading,
    loadingOptions,
    loadingSource,
    conversionSource,
    manufacturableLines,
    saving,
    loadingBom,
    isEdit,
    loadBom,
    saveBomTemplate,
    addMaterialRow,
    updateMaterial,
    selectMaterialProduct,
    removeMaterial,
    handleSubmit,
  };
}
