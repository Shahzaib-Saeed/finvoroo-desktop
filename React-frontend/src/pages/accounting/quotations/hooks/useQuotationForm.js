import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { toast } from 'sonner';
import {
  appendCustomFieldSelectOption,
  customFieldApiErrorMessage,
  mergeDefinitionInList,
  mergeDefinitionOptionsFromApi,
} from '@/components/accounting/custom-fields-lib';
import { mergeCustomerIntoLookups } from '@/lib/merge-customer-into-lookups';
import { defaultEnteredUnitForProduct } from '@/lib/units';
import { applyQuotationConversionPreview } from '@/components/accounting/invoice-conversion';
import { isOnline } from '@/offline/connectivity';
import {
  cacheOnlineFormLookups,
  offlineCustomerContextFromCache,
  toastOfflineConversionBlocked,
  toastOfflineLookups,
  tryHydrateOfflineLookups,
} from '@/offline/form-lookups';
import { DEFAULT_LINE_COLUMNS } from '../../invoices/invoice-template-constants';
import { documentConversionsApi } from '../../api/document-conversions.api';
import { quotationsApi } from '../api/quotations.api';
import {
  EMPTY_QUOTATION_FORM,
  EMPTY_QUOTATION_LINE,
  applyDiscountFixed,
  applyDiscountPercent,
  applyNetTotal,
  buildAddressDisplay,
  buildQuotationPayload,
  calcQuotationTotals,
  refreshLineComputedFields,
  splitAddressDisplay,
  mapQuotationToForm,
} from '../constants';
export function useQuotationForm({ mode = 'create', quotation, fromSource, onSuccess }) {
  const sourceType = fromSource?.sourceType || '';
  const sourceId = fromSource?.sourceId || '';
  const isEdit = mode === 'edit';
  const { id: companyId } = useParams();
  const [form, setForm] = useState(EMPTY_QUOTATION_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [loadingConversion, setLoadingConversion] = useState(false);
  const [conversionSource, setConversionSource] = useState(null);
  const [conversionWarnings, setConversionWarnings] = useState([]);
  const [lookups, setLookups] = useState(null);
  const [customerContext, setCustomerContext] = useState(null);
  const [addressUnlocked, setAddressUnlocked] = useState(false);
  const customerRefreshRef = useRef(null);
  const conversionLoadedRef = useRef(false);

  const products = lookups?.products || [];
  const taxRates = lookups?.tax_rates || [];
  const customers = lookups?.customers || [];
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

  const totals = useMemo(
    () => calcQuotationTotals(form, taxRatesById),
    [form, taxRatesById]
  );

  useEffect(() => {
    let cancelled = false;
    setLoadingLookups(true);
    quotationsApi
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
        if (!isEdit && !quotation) {
          setForm((f) => ({
            ...f,
            currency: data.base_currency || 'USD',
          }));
        }
      })
      .catch(async (err) => {
        if (cancelled) return;
        try {
          const cached = await tryHydrateOfflineLookups(companyId, { requireParty: 'customer' });
          if (cached) {
            setLookups((prev) => ({ ...(prev || {}), ...cached }));
            if (!isEdit && !quotation) {
              setForm((f) => ({
                ...f,
                currency: cached.base_currency || f.currency || 'USD',
                lines: f.lines?.length ? f.lines : [{ ...EMPTY_QUOTATION_LINE }],
              }));
            }
            toastOfflineLookups('Working offline — using cached customers & products');
            return;
          }
        } catch {
          /* fall through */
        }
        toast.error(err?.response?.data?.message || 'Failed to load quotation form');
      })
      .finally(() => {
        if (!cancelled) setLoadingLookups(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isEdit, quotation, companyId]);

  useEffect(() => {
    if (quotation) setForm(mapQuotationToForm(quotation));
  }, [quotation]);

  const loadCustomerContext = useCallback(
    async (customerId) => {
      if (!customerId) {
        setCustomerContext(null);
        return;
      }
      try {
        const res = await quotationsApi.customerContext(customerId);
        const ctx = res.data?.data;
        setCustomerContext(ctx);
        setForm((f) => {
          const bill = ctx?.billing_address_display || ctx?.billing_address || '';
          const ship = ctx?.shipping_address || bill;
          return {
            ...f,
            customer_id: String(customerId),
            billing_address: bill,
            shipping_address: ship,
            address_display: buildAddressDisplay(bill, ship),
            currency: ctx?.currency || f.currency || baseCurrency,
          };
        });
        setAddressUnlocked(false);
      } catch {
        if (!isOnline()) {
          const cached = (customers || []).find((c) => String(c.id) === String(customerId));
          const ctx = offlineCustomerContextFromCache(cached);
          if (ctx) {
            setCustomerContext(ctx);
            setForm((f) => {
              const bill = ctx.billing_address_display || ctx.billing_address || '';
              const ship = ctx.shipping_address || bill;
              return {
                ...f,
                customer_id: String(customerId),
                billing_address: bill,
                shipping_address: ship,
                address_display: buildAddressDisplay(bill, ship),
                currency: ctx.currency || f.currency || baseCurrency,
              };
            });
            setAddressUnlocked(false);
            return;
          }
        }
        toast.error('Failed to load customer details');
      }
    },
    [baseCurrency, customers]
  );

  const scheduleCustomerRefresh = useCallback(
    (customerId) => {
      clearTimeout(customerRefreshRef.current);
      customerRefreshRef.current = setTimeout(() => loadCustomerContext(customerId), 30);
    },
    [loadCustomerContext]
  );

  useEffect(() => {
    if (quotation?.customer_id && !customerContext) {
      loadCustomerContext(String(quotation.customer_id));
    }
  }, [quotation?.customer_id, customerContext, loadCustomerContext]);

  useEffect(() => {
    if (!sourceType || !sourceId || isEdit || quotation || loadingLookups || conversionLoadedRef.current) {
      return;
    }
    let cancelled = false;
    conversionLoadedRef.current = true;
    setLoadingConversion(true);
    documentConversionsApi
      .preview({
        sourceType,
        sourceId,
        target: 'quotation',
      })
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.data || {};
        const patch = applyQuotationConversionPreview(data, EMPTY_QUOTATION_LINE);
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
      })
      .catch((err) => {
        if (!cancelled) {
          if (!isOnline()) toastOfflineConversionBlocked('quotation');
          else toast.error(err?.response?.data?.message || 'Could not load invoice for quotation');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingConversion(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sourceType, sourceId, isEdit, quotation, loadingLookups, taxRatesById]);

  const setField = useCallback((key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  }, []);

  const setMetadataField = useCallback((defId, value) => {
    setForm((f) => ({
      ...f,
      quotation_metadata_custom_fields: {
        ...(f.quotation_metadata_custom_fields || {}),
        [String(defId)]: value,
      },
    }));
    setErrors((e) => ({ ...e, [`quotation_metadata_custom_fields.${defId}`]: undefined }));
  }, []);

  const addMetadataSelectOption = useCallback(
    async (defId, optionLabel) => {
      const def = customFieldDefinitions.find((d) => String(d.id) === String(defId));
      if (!def) return false;
      try {
        const updated = await appendCustomFieldSelectOption(def, optionLabel);
        if (!updated) return false;
        const res = await quotationsApi.formOptions();
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

  const setCustomer = useCallback(
    (customerId, createdCustomer) => {
      if (!customerId) {
        setForm((f) => ({
          ...EMPTY_QUOTATION_FORM,
          quote_date: f.quote_date,
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
          lines = [...lines, { ...EMPTY_QUOTATION_LINE }];
        }
        return { ...f, lines };
      });
    },
    [form.lines, productsById]
  );

  const addLine = useCallback(() => {
    setForm((f) => ({ ...f, lines: [...f.lines, { ...EMPTY_QUOTATION_LINE }] }));
  }, []);

  const removeLine = useCallback((index) => {
    setForm((f) => {
      const lines = f.lines.filter((_, i) => i !== index);
      return { ...f, lines: lines.length ? lines : [{ ...EMPTY_QUOTATION_LINE }] };
    });
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e?.preventDefault?.();
      const nextErrors = {};
      if (!form.customer_id) nextErrors.customer_id = 'Customer is required';
      if (!form.quote_date) nextErrors.quote_date = 'Quote date is required';
      customFieldDefinitions.forEach((def) => {
        if (!def.is_required) return;
        const val = form.quotation_metadata_custom_fields?.[String(def.id)] ?? '';
        if (def.type === 'checkbox') {
          if (val !== '1' && val !== 1) {
            nextErrors[`quotation_metadata_custom_fields.${def.id}`] = `${def.label} is required`;
          }
          return;
        }
        if (!String(val).trim()) {
          nextErrors[`quotation_metadata_custom_fields.${def.id}`] = `${def.label} is required`;
        }
      });
      if (Object.keys(nextErrors).length) {
        setErrors(nextErrors);
        toast.error('Please fix the highlighted fields');
        return;
      }

      setSaving(true);
      try {
        const payload = buildQuotationPayload(form);
        const { saveDocumentDraft } = await import('@/offline/documents-repository');
        const { getMeta } = await import('@/offline/db');
        const offlineSyncEnabled = companyId
          ? Boolean(
              lookups?.company?.offline_sync_enabled ||
                (await getMeta(companyId, 'offline_sync_enabled', false)),
            )
          : false;
        const customer = (customers || []).find(
          (c) => String(c.id) === String(payload.customer_id),
        );

        const result = await saveDocumentDraft({
          companyId,
          entity: 'quotation',
          op: isEdit ? 'update' : 'create',
          payload: {
            ...payload,
            uuid: form.uuid || quotation?.uuid,
            customer_name: customer?.name || null,
            customer_email: customer?.email || null,
          },
          uuid: form.uuid || quotation?.uuid,
          baseVersion: quotation?.lock_version ?? null,
          offlineSyncEnabled,
          onlineSave: async (stamped) => {
            const res = isEdit
              ? await quotationsApi.update(quotation.id, stamped)
              : await quotationsApi.create(stamped);
            return { data: res.data?.data, response: res };
          },
        });

        if (result.offline) {
          toast.success('Saved offline — will sync when you reconnect');
          onSuccess?.(result.data);
          return;
        }

        const saved = result.data;
        toast.success(
          result.response?.data?.message || (isEdit ? 'Quotation updated' : 'Quotation created'),
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
        toast.error(data?.message || err?.message || 'Failed to save quotation');
      } finally {
        setSaving(false);
      }
    },
    [form, isEdit, quotation, onSuccess, customFieldDefinitions, lookups?.company?.offline_sync_enabled]
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
    customFieldDefinitions,
    setMetadataField,
    addMetadataSelectOption,
  };
}
