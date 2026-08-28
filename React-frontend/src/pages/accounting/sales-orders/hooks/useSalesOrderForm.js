import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  appendCustomFieldSelectOption,
  customFieldApiErrorMessage,
  mergeDefinitionInList,
  mergeDefinitionOptionsFromApi,
} from '@/components/accounting/custom-fields-lib';
import { mergeCustomerIntoLookups } from '@/lib/merge-customer-into-lookups';
import { defaultEnteredUnitForProduct } from '@/lib/units';
import { applySalesOrderConversionPreview } from '@/components/accounting/invoice-conversion';
import { documentConversionsApi } from '../../api/document-conversions.api';
import { salesOrdersApi } from '../api/sales-orders.api';
import { quotationsApi } from '../../quotations/api/quotations.api';
import {
  EMPTY_SALES_ORDER_FORM,
  EMPTY_SALES_ORDER_LINE,
  applyDiscountFixed,
  applyDiscountPercent,
  applyNetTotal,
  buildAddressDisplay,
  buildSalesOrderPayload,
  calcSalesOrderTotals,
  refreshLineComputedFields,
  splitAddressDisplay,
  mapSalesOrderToForm,
} from '../constants';

export function useSalesOrderForm({ mode = 'create', salesOrder, fromSource, onSuccess }) {
  const sourceType = fromSource?.sourceType || '';
  const sourceId = fromSource?.sourceId || '';
  const isEdit = mode === 'edit';
  const [form, setForm] = useState(EMPTY_SALES_ORDER_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [loadingConversion, setLoadingConversion] = useState(false);
  const [conversionSource, setConversionSource] = useState(null);
  const [conversionWarnings, setConversionWarnings] = useState([]);
  const [lookups, setLookups] = useState(null);
  const [customerContext, setCustomerContext] = useState(null);
  const [addressUnlocked, setAddressUnlocked] = useState(false);
  const [quotations, setQuotations] = useState([]);
  const [loadingQuotations, setLoadingQuotations] = useState(false);
  const [showQuotationPicker, setShowQuotationPicker] = useState(false);
  const [importingQuotation, setImportingQuotation] = useState(false);
  const customerRefreshRef = useRef(null);
  const conversionLoadedRef = useRef(false);

  const products = lookups?.products || [];
  const taxRates = lookups?.tax_rates || [];
  const customers = lookups?.customers || [];
  const lineColumns = lookups?.line_columns || [];
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

  const totals = useMemo(
    () => calcSalesOrderTotals(form, taxRatesById),
    [form, taxRatesById]
  );

  useEffect(() => {
    let cancelled = false;
    setLoadingLookups(true);
    salesOrdersApi
      .formOptions()
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.data || {};
        setLookups((prev) => ({
          ...data,
          custom_field_definitions: mergeDefinitionOptionsFromApi(
            data.custom_field_definitions || [],
            prev?.custom_field_definitions,
          ),
        }));
        if (!isEdit && !salesOrder) {
          setForm((f) => ({
            ...f,
            currency: data.base_currency || 'USD',
          }));
        }
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err?.response?.data?.message || 'Failed to load sales order form');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingLookups(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isEdit, salesOrder]);

  useEffect(() => {
    if (salesOrder) setForm(mapSalesOrderToForm(salesOrder));
  }, [salesOrder]);

  const loadCustomerContext = useCallback(
    async (customerId) => {
      if (!customerId) {
        setCustomerContext(null);
        setQuotations([]);
        setShowQuotationPicker(false);
        return;
      }
      try {
        const res = await salesOrdersApi.customerContext(customerId);
        const ctx = res.data?.data;
        setCustomerContext(ctx);
        setForm((f) => {
          const bill = ctx?.billing_address_display || ctx?.billing_address || '';
          const ship = ctx?.shipping_address || bill;
          return {
            ...f,
            customer_id: String(customerId),
            quotation_id: '',
            billing_address: bill,
            shipping_address: ship,
            address_display: buildAddressDisplay(bill, ship),
            currency: ctx?.currency || f.currency || baseCurrency,
          };
        });
        setAddressUnlocked(false);
      } catch {
        toast.error('Failed to load customer details');
      }
    },
    [baseCurrency]
  );

  const loadCustomerQuotations = useCallback(async (customerId) => {
    if (!customerId) {
      setQuotations([]);
      return;
    }
    setLoadingQuotations(true);
    try {
      const res = await quotationsApi.listForCustomer(customerId);
      const list = res.data?.data || [];
      const open = list.filter((q) => {
        const status = String(q.status || '').toLowerCase();
        if (status === 'cancelled' || status === 'declined' || status === 'converted') {
          return false;
        }
        if (q.sales_order_id) return false;
        return true;
      });
      setQuotations(open);
      if (open.length > 0) setShowQuotationPicker(true);
    } catch {
      setQuotations([]);
    } finally {
      setLoadingQuotations(false);
    }
  }, []);

  useEffect(() => {
    if (isEdit || (sourceType && sourceId)) return;
    if (form.customer_id) loadCustomerQuotations(form.customer_id);
    else setQuotations([]);
  }, [form.customer_id, loadCustomerQuotations, isEdit, sourceType, sourceId]);

  useEffect(() => {
    if (!sourceType || !sourceId || isEdit || salesOrder || loadingLookups || conversionLoadedRef.current) {
      return;
    }
    let cancelled = false;
    conversionLoadedRef.current = true;
    setLoadingConversion(true);
    documentConversionsApi
      .preview({
        sourceType,
        sourceId,
        target: 'sales_order',
      })
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.data || {};
        const patch = applySalesOrderConversionPreview(data, EMPTY_SALES_ORDER_LINE);
        setConversionSource(patch._conversionSource || data.source || null);
        setConversionWarnings(patch._conversionWarnings || data.warnings || []);
        const { _conversionSource, _conversionWarnings, ...formPatch } = patch;
        setForm((f) => {
          let lines = formPatch.lines || f.lines;
          if (Object.keys(taxRatesById).length > 0) {
            lines = lines.map((line) => refreshLineComputedFields(line, taxRatesById));
          }
          return {
            ...f,
            ...formPatch,
            lines,
            currency: formPatch.currency || f.currency,
          };
        });
        setShowQuotationPicker(false);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err?.response?.data?.message || 'Could not load invoice for sales order');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingConversion(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sourceType, sourceId, isEdit, salesOrder, loadingLookups, taxRatesById]);

  const importFromQuotation = useCallback(
    async (quotationId) => {
      if (!quotationId || importingQuotation) return;
      setImportingQuotation(true);
      try {
        const res = await quotationsApi.show(quotationId);
        const q = res.data?.data;
        if (!q) throw new Error('Quotation not found');
        const lines = (q.lines || []).map((line) => {
          const base = {
            ...EMPTY_SALES_ORDER_LINE,
            product_id: line.product_id ? String(line.product_id) : '',
            description: line.description || '',
            quantity: line.quantity ?? 1,
            quantity_basis: line.quantity_basis === 'base' ? 'base' : 'sales',
            entered_unit: line.entered_unit || '',
            unit_price: line.unit_price ?? '',
            discount: line.discount ?? '',
            discount_type: line.discount_type || 'fixed',
            tax_rate_id: line.tax_rate_id ? String(line.tax_rate_id) : '',
            sale_tax_amount: line.sale_tax_amount ?? '',
          };
          return refreshLineComputedFields(base);
        });
        setForm((f) => ({
          ...f,
          quotation_id: String(q.id),
          notes: f.notes || q.notes || '',
          currency: q.currency || f.currency,
          lines: lines.length ? [...lines, { ...EMPTY_SALES_ORDER_LINE }] : f.lines,
        }));
        toast.success(
          `Imported ${lines.length} line${lines.length === 1 ? '' : 's'} from ${q.quote_number || 'quotation'}`
        );
        setShowQuotationPicker(false);
      } catch (err) {
        toast.error(err?.response?.data?.message || 'Failed to import quotation');
      } finally {
        setImportingQuotation(false);
      }
    },
    [importingQuotation]
  );

  const scheduleCustomerRefresh = useCallback(
    (customerId) => {
      clearTimeout(customerRefreshRef.current);
      customerRefreshRef.current = setTimeout(() => loadCustomerContext(customerId), 30);
    },
    [loadCustomerContext]
  );

  useEffect(() => {
    if (salesOrder?.customer_id && !customerContext) {
      loadCustomerContext(String(salesOrder.customer_id));
    }
  }, [salesOrder?.customer_id, customerContext, loadCustomerContext]);

  const setField = useCallback((key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  }, []);

  const setCustomer = useCallback(
    (customerId, createdCustomer) => {
      if (!customerId) {
        setForm((f) => ({
          ...EMPTY_SALES_ORDER_FORM,
          order_date: f.order_date,
          currency: f.currency,
        }));
        setCustomerContext(null);
        return;
      }
      mergeCustomerIntoLookups(setLookups, createdCustomer);
      scheduleCustomerRefresh(customerId);
    },
    [scheduleCustomerRefresh]
  );

  const setAddressDisplay = useCallback((display) => {
    const { billing, shipping } = splitAddressDisplay(display);
    setForm((f) => ({
      ...f,
      address_display: display,
      billing_address: billing,
      shipping_address: shipping,
    }));
  }, []);

  const setMetadataField = useCallback((defId, value) => {
    setForm((f) => ({
      ...f,
      sales_order_metadata_custom_fields: {
        ...(f.sales_order_metadata_custom_fields || {}),
        [String(defId)]: value,
      },
    }));
    setErrors((e) => ({ ...e, [`sales_order_metadata_custom_fields.${defId}`]: undefined }));
  }, []);

  const addMetadataSelectOption = useCallback(
    async (defId, optionLabel) => {
      const def = customFieldDefinitions.find((d) => String(d.id) === String(defId));
      if (!def) return false;
      try {
        const updated = await appendCustomFieldSelectOption(def, optionLabel);
        if (!updated) return false;
        const res = await salesOrdersApi.formOptions();
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
        if (
          index === lines.length - 1 &&
          productId &&
          lines[lines.length - 1].product_id
        ) {
          lines = [...lines, { ...EMPTY_SALES_ORDER_LINE }];
        }
        return { ...f, lines };
      });
    },
    [form.lines, productsById]
  );

  const addLine = useCallback(() => {
    setForm((f) => ({ ...f, lines: [...f.lines, { ...EMPTY_SALES_ORDER_LINE }] }));
  }, []);

  const removeLine = useCallback((index) => {
    setForm((f) => {
      const lines = f.lines.filter((_, i) => i !== index);
      return { ...f, lines: lines.length ? lines : [{ ...EMPTY_SALES_ORDER_LINE }] };
    });
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e?.preventDefault?.();
      const nextErrors = {};
      if (!form.customer_id) nextErrors.customer_id = 'Customer is required';
      if (!form.order_date) nextErrors.order_date = 'Order date is required';
      customFieldDefinitions.forEach((def) => {
        if (!def.is_required) return;
        const val = form.sales_order_metadata_custom_fields?.[String(def.id)] ?? '';
        if (def.type === 'checkbox') {
          if (val !== '1' && val !== 1) {
            nextErrors[`sales_order_metadata_custom_fields.${def.id}`] = `${def.label} is required`;
          }
          return;
        }
        if (!String(val).trim()) {
          nextErrors[`sales_order_metadata_custom_fields.${def.id}`] = `${def.label} is required`;
        }
      });
      if (Object.keys(nextErrors).length) {
        setErrors(nextErrors);
        toast.error('Please fix the highlighted fields');
        return;
      }

      setSaving(true);
      try {
        const payload = buildSalesOrderPayload(form);
        const res = isEdit
          ? await salesOrdersApi.update(salesOrder.id, payload)
          : await salesOrdersApi.create(payload);
        const saved = res.data?.data;
        toast.success(
          res.data?.message || (isEdit ? 'Sales order updated' : 'Sales order created')
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
        toast.error(data?.message || 'Failed to save sales order');
      } finally {
        setSaving(false);
      }
    },
    [form, isEdit, salesOrder, onSuccess, customFieldDefinitions]
  );

  return {
    form,
    errors,
    saving,
    loadingLookups,
    loadingConversion,
    conversionSource,
    conversionWarnings,
    customers,
    products,
    taxRates,
    taxRatesById,
    productsById,
    lineColumns,
    totals,
    currencySymbols,
    baseCurrency,
    customerContext,
    addressUnlocked,
    setAddressUnlocked,
    isEdit,
    canCreateProduct: lookups?.can_create_product,
    canCreateCustomer: lookups?.can_create_customer,
    onFieldChange: setField,
    onCustomerChange: setCustomer,
    onAddressDisplayChange: setAddressDisplay,
    onUpdateLine: updateLine,
    onUpdateLineDiscountFixed: updateLineDiscountFixed,
    onUpdateLineDiscountPercent: updateLineDiscountPercent,
    onUpdateLineNetTotal: updateLineNetTotal,
    onSelectProduct: selectProduct,
    onAddLine: addLine,
    onRemoveLine: removeLine,
    handleSubmit,
    quotations,
    loadingQuotations,
    showQuotationPicker,
    setShowQuotationPicker,
    importingQuotation,
    importFromQuotation,
    customFieldDefinitions,
    setMetadataField,
    addMetadataSelectOption,
  };
}
