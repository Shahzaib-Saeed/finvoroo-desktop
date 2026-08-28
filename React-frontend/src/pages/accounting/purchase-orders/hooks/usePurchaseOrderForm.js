import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { toast } from 'sonner';
import {
  appendCustomFieldSelectOption,
  customFieldApiErrorMessage,
  mergeDefinitionInList,
  mergeDefinitionOptionsFromApi,
} from '@/components/accounting/custom-fields-lib';
import { applyPoConversionPreview } from '@/components/accounting/invoice-conversion';
import { defaultEnteredUnitForProduct } from '@/lib/units';
import { isOnline } from '@/offline/connectivity';
import {
  cacheOnlineFormLookups,
  toastOfflineConversionBlocked,
  toastOfflineLookups,
  tryHydrateOfflineLookups,
} from '@/offline/form-lookups';
import { DEFAULT_LINE_COLUMNS } from '../../invoices/invoice-template-constants';
import { documentConversionsApi } from '../../api/document-conversions.api';
import { purchaseOrdersApi } from '../api/purchase-orders.api';
import {
  EMPTY_PO_FORM,
  EMPTY_PO_LINE,
  applyDiscountFixed,
  applyDiscountPercent,
  applyNetTotal,
  buildPoPayload,
  calcPoTotals,
  mapPoToForm,
  refreshLineComputedFields,
} from '../constants';

export function usePurchaseOrderForm({ mode = 'create', purchaseOrder, fromSource, onSuccess }) {
  const sourceType = fromSource?.sourceType || '';
  const sourceId = fromSource?.sourceId || '';
  const isEdit = mode === 'edit';
  const { id: companyId } = useParams();
  const [form, setForm] = useState(EMPTY_PO_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [loadingConversion, setLoadingConversion] = useState(false);
  const [conversionSource, setConversionSource] = useState(null);
  const [conversionWarnings, setConversionWarnings] = useState([]);
  const [lookups, setLookups] = useState(null);
  const conversionLoadedRef = useRef(false);

  const vendors = lookups?.vendors || [];
  const products = lookups?.products || [];
  const taxRates = lookups?.tax_rates || [];
  const lineColumns = useMemo(() => {
    const cols = lookups?.line_columns;
    return Array.isArray(cols) && cols.length ? cols : DEFAULT_LINE_COLUMNS;
  }, [lookups?.line_columns]);
  const currencySymbols = lookups?.currency_symbols || {};
  const baseCurrency = lookups?.base_currency || 'USD';
  const customFieldDefinitions = lookups?.custom_field_definitions || [];

  const taxRatesById = useMemo(() => {
    const map = {};
    taxRates.forEach((t) => {
      map[String(t.id)] = t;
    });
    return map;
  }, [taxRates]);

  const productsById = useMemo(() => {
    const map = {};
    products.forEach((p) => {
      map[String(p.id)] = p;
    });
    return map;
  }, [products]);

  const totals = useMemo(() => calcPoTotals(form, taxRatesById), [form, taxRatesById]);

  useEffect(() => {
    let cancelled = false;
    setLoadingLookups(true);
    purchaseOrdersApi
      .formOptions()
      .then(async (res) => {
        if (cancelled) return;
        const data = res.data?.data || {};
        setLookups((prev) => ({
          ...data,
          custom_field_definitions: mergeDefinitionOptionsFromApi(
            data.custom_field_definitions || [],
            prev?.custom_field_definitions,
          ),
        }));
        if (companyId) await cacheOnlineFormLookups(companyId, data);
        if (!isEdit && !purchaseOrder) {
          setForm((f) => ({
            ...f,
            currency: data.base_currency || f.currency || 'USD',
          }));
        }
      })
      .catch(async (err) => {
        if (cancelled) return;
        try {
          const cached = await tryHydrateOfflineLookups(companyId, { requireParty: 'vendor' });
          if (cached) {
            setLookups((prev) => ({ ...(prev || {}), ...cached }));
            if (!isEdit && !purchaseOrder) {
              setForm((f) => ({
                ...f,
                currency: cached.base_currency || f.currency || 'USD',
                lines: f.lines?.length ? f.lines : [{ ...EMPTY_PO_LINE }],
              }));
            }
            toastOfflineLookups('Working offline — using cached vendors & products');
            return;
          }
        } catch {
          /* fall through */
        }
        toast.error(err?.response?.data?.message || 'Failed to load purchase order form');
      })
      .finally(() => {
        if (!cancelled) setLoadingLookups(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, isEdit, purchaseOrder]);

  useEffect(() => {
    if (purchaseOrder) setForm(mapPoToForm(purchaseOrder));
  }, [purchaseOrder]);

  useEffect(() => {
    if (!sourceType || !sourceId || isEdit || purchaseOrder || loadingLookups || conversionLoadedRef.current) {
      return;
    }
    let cancelled = false;
    conversionLoadedRef.current = true;
    setLoadingConversion(true);
    documentConversionsApi
      .preview({
        sourceType,
        sourceId,
        target: 'purchase_order',
      })
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.data || {};
        const patch = applyPoConversionPreview(data, EMPTY_PO_LINE);
        setConversionSource(patch._conversionSource || data.source || null);
        setConversionWarnings(patch._conversionWarnings || data.warnings || []);
        const { _conversionSource, _conversionWarnings, ...formPatch } = patch;
        setForm((f) => {
          let lines = formPatch.lines || f.lines;
          if (Object.keys(taxRatesById).length > 0) {
            lines = lines.map((line) => refreshLineComputedFields(line, taxRatesById));
          }
          return { ...f, ...formPatch, lines };
        });
      })
      .catch((err) => {
        if (!cancelled) {
          if (!isOnline()) toastOfflineConversionBlocked('purchase order');
          else toast.error(err?.response?.data?.message || 'Could not load invoice for purchase order');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingConversion(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sourceType, sourceId, isEdit, purchaseOrder, loadingLookups, taxRatesById]);

  const setField = useCallback((key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  }, []);

  const setVendor = useCallback((vendorId) => {
    if (!vendorId) {
      setForm((f) => ({
        ...EMPTY_PO_FORM,
        order_date: f.order_date,
        expected_delivery: f.expected_delivery,
      }));
      return;
    }
    setForm((f) => ({ ...f, vendor_id: vendorId }));
  }, []);

  const setMetadataField = useCallback((defId, value) => {
    setForm((f) => ({
      ...f,
      purchase_order_metadata_custom_fields: {
        ...(f.purchase_order_metadata_custom_fields || {}),
        [String(defId)]: value,
      },
    }));
    setErrors((e) => ({ ...e, [`purchase_order_metadata_custom_fields.${defId}`]: undefined }));
  }, []);

  const addMetadataSelectOption = useCallback(
    async (defId, optionLabel) => {
      const def = customFieldDefinitions.find((d) => String(d.id) === String(defId));
      if (!def) return false;
      try {
        const updated = await appendCustomFieldSelectOption(def, optionLabel);
        if (!updated) return false;
        const res = await purchaseOrdersApi.formOptions();
        const data = res.data?.data || {};
        setLookups((current) => {
          const defs = mergeDefinitionOptionsFromApi(
            data.custom_field_definitions || [],
            mergeDefinitionInList(current?.custom_field_definitions || [], defId, updated),
          );
          return current ? { ...current, custom_field_definitions: defs } : { ...data, custom_field_definitions: defs };
        });
        return true;
      } catch (err) {
        toast.error(customFieldApiErrorMessage(err, 'Could not add option'));
        return false;
      }
    },
    [customFieldDefinitions],
  );

  const updateLine = useCallback((index, key, value) => {
    setForm((f) => ({
      ...f,
      lines: f.lines.map((line, i) => {
        if (i !== index) return line;
        return refreshLineComputedFields({ ...line, [key]: value });
      }),
    }));
  }, []);

  const updateLineDiscountFixed = useCallback((index, value) => {
    setForm((f) => ({
      ...f,
      lines: f.lines.map((line, i) =>
        i === index ? refreshLineComputedFields(applyDiscountFixed(line, value)) : line
      ),
    }));
  }, []);

  const updateLineDiscountPercent = useCallback((index, value) => {
    setForm((f) => ({
      ...f,
      lines: f.lines.map((line, i) =>
        i === index ? refreshLineComputedFields(applyDiscountPercent(line, value)) : line
      ),
    }));
  }, []);

  const updateLineNetTotal = useCallback((index, value) => {
    setForm((f) => ({
      ...f,
      lines: f.lines.map((line, i) =>
        i === index ? refreshLineComputedFields(applyNetTotal(line, value)) : line
      ),
    }));
  }, []);

  const selectProduct = useCallback(
    (index, productId) => {
      const product = productsById[String(productId)];
      const duplicateIdx = form.lines.findIndex(
        (l, i) => i !== index && l.product_id && String(l.product_id) === String(productId)
      );
      if (productId && duplicateIdx >= 0) {
        toast.error('This product is already on another line.');
        return;
      }
      setForm((f) => {
        let lines = f.lines.map((line, i) => {
          if (i !== index) return line;
          const next = {
            ...line,
            product_id: productId,
            description: product?.name || line.description,
            unit_price: product?.unit_price ?? line.unit_price,
            tax_rate_id: product?.tax_rate_id ? String(product.tax_rate_id) : line.tax_rate_id,
            entered_unit: defaultEnteredUnitForProduct(product) || '',
          };
          return refreshLineComputedFields(next);
        });
        if (index === lines.length - 1 && productId && lines[lines.length - 1].product_id) {
          lines = [...lines, { ...EMPTY_PO_LINE }];
        }
        return { ...f, lines };
      });
    },
    [form.lines, productsById]
  );

  const addLine = useCallback(() => {
    setForm((f) => ({ ...f, lines: [...f.lines, { ...EMPTY_PO_LINE }] }));
  }, []);

  const removeLine = useCallback((index) => {
    setForm((f) => {
      const lines = f.lines.filter((_, i) => i !== index);
      return { ...f, lines: lines.length ? lines : [{ ...EMPTY_PO_LINE }] };
    });
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e?.preventDefault?.();
      const nextErrors = {};
      if (!form.vendor_id) nextErrors.vendor_id = 'Vendor is required';
      if (!form.order_date) nextErrors.order_date = 'Order date is required';
      customFieldDefinitions.forEach((def) => {
        if (!def.is_required) return;
        const val = form.purchase_order_metadata_custom_fields?.[String(def.id)] ?? '';
        if (def.type === 'checkbox') {
          if (val !== '1' && val !== 1) {
            nextErrors[`purchase_order_metadata_custom_fields.${def.id}`] = `${def.label} is required`;
          }
          return;
        }
        if (!String(val).trim()) {
          nextErrors[`purchase_order_metadata_custom_fields.${def.id}`] = `${def.label} is required`;
        }
      });
      if (Object.keys(nextErrors).length) {
        setErrors(nextErrors);
        toast.error('Please fix the highlighted fields');
        return;
      }

      setSaving(true);
      try {
        const payload = buildPoPayload(form);
        if (!isEdit && companyId) {
          const { getMeta } = await import('@/offline/db');
          const { saveDocumentDraft } = await import('@/offline/documents-repository');
          const offlineSyncEnabled = Boolean(
            await getMeta(companyId, 'offline_sync_enabled', false),
          );
          if (offlineSyncEnabled && !isOnline()) {
            const vendor = (vendors || []).find(
              (v) => String(v.id) === String(payload.vendor_id),
            );
            const queued = await saveDocumentDraft({
              companyId,
              entity: 'purchase_order',
              op: 'create',
              payload: {
                ...payload,
                vendor_name: vendor?.name || null,
                vendor_email: vendor?.email || null,
              },
              offlineSyncEnabled: true,
              forceOffline: true,
            });
            toast.success('PO saved offline — will sync when you reconnect');
            onSuccess?.(queued.data);
            return;
          }
        }
        const res = isEdit
          ? await purchaseOrdersApi.update(purchaseOrder.id, payload)
          : await purchaseOrdersApi.create(payload);
        const saved = res.data?.data;
        toast.success(
          res.data?.message || (isEdit ? 'Purchase order updated' : 'Purchase order created')
        );
        onSuccess?.(saved);
      } catch (err) {
        const data = err?.response?.data;
        if (data?.errors && typeof data.errors === 'object') {
          const flat = {};
          Object.entries(data.errors).forEach(([k, v]) => {
            flat[k] = Array.isArray(v) ? v[0] : v;
          });
          setErrors(flat);
        }
        toast.error(data?.message || 'Failed to save purchase order');
      } finally {
        setSaving(false);
      }
    },
    [form, isEdit, purchaseOrder, onSuccess, customFieldDefinitions, companyId, vendors]
  );

  return {
    form,
    errors,
    saving,
    loadingLookups,
    loadingConversion,
    conversionSource,
    conversionWarnings,
    lookups,
    vendors,
    products,
    taxRates,
    taxRatesById,
    productsById,
    lineColumns,
    totals,
    currencySymbols,
    baseCurrency,
    isEdit,
    canCreateProduct: lookups?.can_create_product,
    canCreateVendor: lookups?.can_create_vendor,
    onFieldChange: setField,
    onVendorChange: setVendor,
    onUpdateLine: updateLine,
    onUpdateLineDiscountFixed: updateLineDiscountFixed,
    onUpdateLineDiscountPercent: updateLineDiscountPercent,
    onUpdateLineNetTotal: updateLineNetTotal,
    onSelectProduct: selectProduct,
    onAddLine: addLine,
    onRemoveLine: removeLine,
    handleSubmit,
    customFieldDefinitions,
    setMetadataField,
    addMetadataSelectOption,
  };
}
