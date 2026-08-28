import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { isOnline } from '@/offline/connectivity';
import { getMeta, setMeta } from '@/offline/db';
import { loadCachedLookups } from '@/offline/invoices-repository';
import { prefetchBillLookups } from '@/offline/sync-manager';
import {
    applyBillConversionPreview,
    applyJobOrderBillPreview,
} from '@/components/accounting/invoice-conversion';
import {
    applyJobFieldsToBillForm,
} from '@/components/accounting/job-order-preset.lib';
import { documentConversionsApi } from '../../api/document-conversions.api';
import { jobOrdersApi } from '../../job-orders/api/job-orders.api';
import { invoiceTemplatesApi } from '../../invoice-templates/api/invoice-templates.api';
import { billsApi } from '../api/bills.api';
import { uploadPendingAttachments } from '@/components/accounting/document-attachments.lib';
import {
    EMPTY_BILL_FORM,
    EMPTY_BILL_LINE,
    applyDiscountFixed,
    applyDiscountPercent,
    applyNetTotal,
    buildBillPayload,
    calcBillTotals,
    dueDateFromVendor,
    mapBillToForm,
    mapPoLinesToBillLines,
    parseLockedNetTotal,
    refreshLineComputedFields,
} from '../constants';
import {
    defaultEnteredUnitForProduct,
} from '@/lib/units';
import {
    findTemplateById,
    resolveActiveTemplateId,
} from '@/lib/document-template-selection';
import {
    appendCustomFieldSelectOption,
    customFieldApiErrorMessage,
    parseDefinitionOptions,
} from '@/components/accounting/custom-fields-lib';
import {
    getTemplateFieldValue,
    templateFieldError,
} from '../../invoices/template-field-values';
import {
    DEFAULT_LINE_COLUMNS,
    LINE_COL,
    PHARMACY_BATCH_LINE_COLUMNS,
    resolveFormCustomFieldsForDocument,
} from '../../invoices/invoice-template-constants';
import { useAuthStore } from '@/store/authStore';
import { resolveIndustryFeatures } from '@/industries/resolve';

export function useBillForm({ mode = 'create', bill, fromSource, onSuccess }) {
    const sourceType = fromSource?.sourceType || '';
    const sourceId = fromSource?.sourceId || '';
    const isEdit = mode === 'edit';
    const { id: companyId } = useParams();
    const [searchParams] = useSearchParams();
    const presetJobOrderId = searchParams.get('job_order_id') || '';
    const [form, setForm] = useState({
        ...EMPTY_BILL_FORM,
        job_order_id: !isEdit && presetJobOrderId ? presetJobOrderId : '',
    });
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [loadingLookups, setLoadingLookups] = useState(true);
    const [loadingConversion, setLoadingConversion] = useState(false);
    const [pendingAttachments, setPendingAttachments] = useState([]);
    const [attachments, setAttachments] = useState(bill?.attachments || []);
    const [conversionSource, setConversionSource] = useState(null);
    const [conversionWarnings, setConversionWarnings] = useState([]);
    const [lookups, setLookups] = useState(null);
    const [vendorContext, setVendorContext] = useState(null);
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [addressUnlocked, setAddressUnlocked] = useState(false);
    const vendorRefreshRef = useRef(null);
    const formRef = useRef(form);
    const billInitRef = useRef(null);
    const conversionLoadedRef = useRef(false);
    const jobOrderPreviewLoadedRef = useRef(false);
    const [billNumberPreview, setBillNumberPreview] = useState(null);
    const [loadingBillNumber, setLoadingBillNumber] = useState(false);
    const [checkingBillSequence, setCheckingBillSequence] = useState(false);

    formRef.current = form;

    const customFieldDefinitions = lookups?.custom_field_definitions || [];
    const templates = lookups?.templates || [];
    const vendors = lookups?.vendors || [];
    const customers = lookups?.customers || [];
    const products = lookups?.products || [];
    const taxRates = lookups?.tax_rates || [];
    const warehouses = lookups?.warehouses || [];
    const currencySymbols = lookups?.currency_symbols || {};
    const baseCurrency = lookups?.base_currency || 'USD';

    const activeTemplateId = useMemo(
        () =>
        resolveActiveTemplateId({
            formTemplateId: form.invoice_template_id,
            documentTemplateId: bill?.invoice_template_id,
            defaultTemplateId: lookups?.default_template_id,
            isEdit,
        }), [
            form.invoice_template_id,
            bill?.invoice_template_id,
            lookups?.default_template_id,
            isEdit,
        ],
    );

    const selectedTemplate = useMemo(() => {
        const match = findTemplateById(templates, activeTemplateId);
        return match || templates[0] || null;
    }, [templates, activeTemplateId]);

    const activeCompany = useAuthStore((s) => s.activeCompany);
    const industryFeatures = resolveIndustryFeatures(activeCompany);

    const lineColumns = useMemo(() => {
        const fromTemplate = selectedTemplate?.line_columns;
        let base =
            Array.isArray(fromTemplate) && fromTemplate.length
                ? fromTemplate
                : Array.isArray(lookups?.line_columns) && lookups.line_columns.length
                  ? lookups.line_columns
                  : DEFAULT_LINE_COLUMNS;

        if (!industryFeatures.batch_expiry) return base;

        const keys = new Set(base.map((c) => c.key));
        const extras = PHARMACY_BATCH_LINE_COLUMNS.filter((c) => !keys.has(c.key));
        if (!extras.length) return base;

        // Insert batch cols after unit (or quantity if no unit).
        const insertAfter = base.findIndex(
            (c) => c.key === LINE_COL.UNIT || c.key === LINE_COL.QUANTITY,
        );
        const at = insertAfter >= 0 ? insertAfter + 1 : Math.min(3, base.length);
        return [...base.slice(0, at), ...extras, ...base.slice(at)];
    }, [selectedTemplate, lookups?.line_columns, industryFeatures.batch_expiry]);

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

    const totals = useMemo(() => calcBillTotals(form, taxRatesById), [form, taxRatesById]);

    useEffect(() => {
        let cancelled = false;
        setLoadingLookups(true);
        billsApi
            .formOptions()
            .then(async (res) => {
                if (cancelled) return;
                const data = res.data?.data || {};
                setLookups(data);
                const offlineEnabled = Boolean(data.company?.offline_sync_enabled);
                if (companyId) {
                    await setMeta(companyId, 'offline_sync_enabled', offlineEnabled);
                    if (offlineEnabled) {
                        await prefetchBillLookups(companyId, data);
                    }
                }
                if (!isEdit && !bill) {
                    setForm((f) => ({
                        ...f,
                        currency: data.base_currency || 'USD',
                        invoice_template_id: data.default_template_id ?
                            String(data.default_template_id) :
                            f.invoice_template_id,
                    }));
                }
            })
            .catch(async (err) => {
                if (cancelled) return;
                if (!isOnline() && companyId) {
                    try {
                        const enabled = await getMeta(companyId, 'offline_sync_enabled', false);
                        const cached = await loadCachedLookups(companyId);
                        if (enabled && (cached.vendors?.length || cached.products?.length)) {
                            setLookups((prev) => ({
                                ...(prev || {}),
                                ...cached,
                                company: {
                                    ...(prev?.company || {}),
                                    offline_sync_enabled: true,
                                },
                            }));
                            if (!isEdit && !bill) {
                                setForm((f) => ({
                                    ...f,
                                    currency: cached.base_currency || f.currency || 'USD',
                                    invoice_template_id: cached.default_template_id
                                        ? String(cached.default_template_id)
                                        : f.invoice_template_id,
                                    lines: f.lines?.length ? f.lines : [{ ...EMPTY_BILL_LINE }],
                                }));
                            }
                            toast.message('Working offline — using cached vendors & products');
                            return;
                        }
                    } catch {
                        /* fall through */
                    }
                }
                toast.error(err?.response?.data?.message || 'Failed to load bill form');
            })
            .finally(() => {
                if (!cancelled) setLoadingLookups(false);
            });
        return () => {
            cancelled = true;
        };
    }, [isEdit, bill, companyId]);

    useEffect(() => {
        if (!bill?.id) return;
        if (billInitRef.current === bill.id) return;
        billInitRef.current = bill.id;
        setForm(mapBillToForm(bill));
        setErrors({});
    }, [bill]);

    useEffect(() => {
        if (!isEdit || !bill?.invoice_template_id) return;
        const saved = String(bill.invoice_template_id);
        setForm((f) => (f.invoice_template_id === saved ? f : {...f, invoice_template_id: saved }));
    }, [isEdit, bill?.id, bill?.invoice_template_id]);

    useEffect(() => {
        if (bill?.attachments) {
            setAttachments(bill.attachments);
        }
    }, [bill?.attachments, bill?.id]);

    useEffect(() => {
        let cancelled = false;
        const date = form.bill_date;
        if (!date) return undefined;

        setLoadingBillNumber(true);
        billsApi
            .nextNumber({ date })
            .then((res) => {
                if (cancelled) return;
                const data = res.data?.data??res.data??null;
                setBillNumberPreview(data);
                setForm((f) => {
                    if (f.bill_number_manual) {
                        return f;
                    }
                    return {
                        ...f,
                        bill_sequence: data?.sequence != null ? String(data.sequence) : f.bill_sequence,
                    };
                });
            })
            .catch(() => {
                if (!cancelled) setBillNumberPreview(null);
            })
            .finally(() => {
                if (!cancelled) setLoadingBillNumber(false);
            });

        return () => {
            cancelled = true;
        };
    }, [form.bill_date]);

    const toggleBillNumberManual = useCallback(
        (manual) => {
            setForm((f) => ({
                ...f,
                bill_number_manual: manual,
                bill_sequence: manual ?
                    f.bill_sequence !== '' ?
                    f.bill_sequence :
                    String(billNumberPreview?.sequence??'') :
                    String(billNumberPreview?.sequence??''),
            }));
            setErrors((prev) => {
                if (!prev.bill_sequence) return prev;
                const next = {...prev };
                delete next.bill_sequence;
                return next;
            });
        }, [billNumberPreview?.sequence],
    );

    const setBillSequence = useCallback((value) => {
        setForm((f) => ({...f, bill_sequence: value }));
        setErrors((prev) => {
            if (!prev.bill_sequence) return prev;
            const next = {...prev };
            delete next.bill_sequence;
            return next;
        });
    }, []);

    useEffect(() => {
        if (!form.bill_number_manual || !isOnline()) return undefined;

        const seq = parseInt(form.bill_sequence, 10);
        if (!Number.isFinite(seq) || seq < 1 || !form.bill_date) {
            return undefined;
        }

        let cancelled = false;
        const timer = setTimeout(async() => {
            setCheckingBillSequence(true);
            try {
                const params = {
                    date: form.bill_date,
                    sequence: seq,
                };
                if (isEdit && bill?.id) {
                    params.exclude_bill_id = bill.id;
                }
                const res = await billsApi.checkNumber(params);
                if (cancelled) return;
                const data = res.data?.data??res.data??{};
                if (data.exists) {
                    setErrors((prev) => ({
                        ...prev,
                        bill_sequence: `Bill number ${data.full} already exists. Choose another number.`,
                    }));
                } else {
                    setErrors((prev) => {
                        if (!prev.bill_sequence) return prev;
                        const next = {...prev };
                        delete next.bill_sequence;
                        return next;
                    });
                }
            } catch {
                if (!cancelled) {
                    // Don't hard-block offline/manual entry on network blips.
                    setErrors((prev) => {
                        if (!prev.bill_sequence) return prev;
                        const next = {...prev };
                        delete next.bill_sequence;
                        return next;
                    });
                }
            } finally {
                if (!cancelled) setCheckingBillSequence(false);
            }
        }, 400);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [
        isEdit,
        bill?.id,
        form.bill_number_manual,
        form.bill_sequence,
        form.bill_date,
    ]);

    const loadVendorContext = useCallback(
        async(vendorId, previousVendorId = null) => {
            if (!vendorId) {
                setVendorContext(null);
                setPurchaseOrders([]);
                return;
            }

            const applyContext = (ctx, orders = []) => {
                setVendorContext(ctx);
                setPurchaseOrders(orders);
                setForm((f) => {
                    const vendorChanged =
                        previousVendorId != null ?
                        String(vendorId) !== String(previousVendorId) :
                        String(vendorId) !== String(f.vendor_id);
                    const next = {
                        ...f,
                        vendor_id: String(vendorId),
                        currency: baseCurrency,
                        due_date: dueDateFromVendor(f.bill_date, ctx),
                    };
                    if (!isEdit || vendorChanged) {
                        next.vendor_address = ctx?.vendor_address || '';
                    }
                    if ((!isEdit || vendorChanged) && ctx?.invoice_template_id) {
                        next.invoice_template_id = String(ctx.invoice_template_id);
                    }
                    return next;
                });
                if (!isEdit || (previousVendorId != null && String(vendorId) !== String(previousVendorId))) {
                    setAddressUnlocked(false);
                }
            };

            try {
                const [ctxRes, poRes] = await Promise.all([
                    billsApi.vendorContext(vendorId),
                    billsApi.vendorPurchaseOrders(vendorId),
                ]);
                applyContext(ctxRes.data?.data, poRes.data?.data?.orders || []);
            } catch {
                if (!isOnline()) {
                    const cached = (vendors || []).find((v) => String(v.id) === String(vendorId));
                    if (cached) {
                        applyContext({
                            vendor_address: cached.vendor_address || '',
                            payment_terms_days: cached.payment_terms_days,
                            invoice_template_id: cached.invoice_template_id || null,
                        }, []);
                        return;
                    }
                }
                toast.error('Failed to load vendor details');
            }
        }, [baseCurrency, isEdit, vendors]
    );

    const scheduleVendorRefresh = useCallback(
        (vendorId, previousVendorId = null) => {
            clearTimeout(vendorRefreshRef.current);
            vendorRefreshRef.current = setTimeout(
                () => loadVendorContext(vendorId, previousVendorId),
                30,
            );
        }, [loadVendorContext]
    );

    useEffect(() => {
        if (!sourceType || !sourceId || isEdit || bill || loadingLookups || conversionLoadedRef.current) {
            return;
        }
        let cancelled = false;
        conversionLoadedRef.current = true;
        setLoadingConversion(true);
        documentConversionsApi
            .preview({ sourceType, sourceId, target: 'bill' })
            .then((res) => {
                if (cancelled) return;
                const data = res.data?.data || {};
                const patch = applyBillConversionPreview(data, EMPTY_BILL_LINE);
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
                        currency: baseCurrency,
                        warehouse_id: f.warehouse_id || formPatch.warehouse_id || '',
                        // Use source's template when set; fall back to the default template.
                        invoice_template_id: formPatch.invoice_template_id || f.invoice_template_id,
                        template_custom: {
                            ...(f.template_custom || {}),
                            ...(formPatch.template_custom || {}),
                        },
                    };
                });
                if (formPatch.vendor_id) {
                    loadVendorContext(String(formPatch.vendor_id));
                }
            })
            .catch((err) => {
                if (!cancelled) {
                    if (!isOnline()) {
                        toast.error(
                            'Converting an invoice to a bill needs a connection. Create a blank bill offline instead, or reconnect and try again.',
                        );
                    } else {
                        toast.error(err?.response?.data?.message || 'Could not load invoice for bill');
                    }
                }
            })
            .finally(() => {
                if (!cancelled) setLoadingConversion(false);
            });
        return () => {
            cancelled = true;
        };
    }, [sourceType, sourceId, isEdit, bill, loadingLookups, taxRatesById, loadVendorContext]);

    useEffect(() => {
        if (
            !presetJobOrderId ||
            isEdit ||
            bill ||
            sourceType ||
            loadingLookups ||
            jobOrderPreviewLoadedRef.current
        ) {
            return;
        }
        let cancelled = false;
        jobOrderPreviewLoadedRef.current = true;
        setLoadingConversion(true);
        jobOrdersApi
            .billPreview(presetJobOrderId)
            .then((res) => {
                if (cancelled) return;
                const data = res.data?.data || {};
                const patch = applyJobOrderBillPreview(data, EMPTY_BILL_LINE);
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
                        invoice_template_id: formPatch.invoice_template_id || f.invoice_template_id,
                        job_order_id: formPatch.job_order_id || presetJobOrderId,
                        template_custom: {
                            ...(f.template_custom || {}),
                            ...(formPatch.template_custom || {}),
                        },
                        bill_metadata_custom_fields: {
                            ...(f.bill_metadata_custom_fields || {}),
                            ...(formPatch.bill_metadata_custom_fields || {}),
                        },
                    };
                });
                if (formPatch.vendor_id) {
                    loadVendorContext(formPatch.vendor_id);
                }
            })
            .catch((err) => {
                jobOrderPreviewLoadedRef.current = false;
                if (!cancelled) {
                    if (!isOnline()) {
                        toast.message(
                            'Job order details need a connection — you can still create the bill offline',
                        );
                    } else {
                        toast.error(
                            err?.response?.data?.message || 'Could not load job details for bill',
                        );
                    }
                }
            })
            .finally(() => {
                if (!cancelled) setLoadingConversion(false);
            });
        return () => {
            cancelled = true;
        };
    }, [
        presetJobOrderId,
        isEdit,
        bill,
        sourceType,
        loadingLookups,
        taxRatesById,
        loadVendorContext,
    ]);

    const setMetadataField = useCallback((defId, value) => {
        setForm((f) => ({
            ...f,
            bill_metadata_custom_fields: {
                ...(f.bill_metadata_custom_fields || {}),
                [String(defId)]: value,
            },
        }));
        setErrors((e) => ({...e, [`bill_metadata_custom_fields.${defId}`]: undefined }));
    }, []);

    const handleJobOrderChange = useCallback(
        async(jobOrderId) => {
            if (!jobOrderId) {
                setForm((f) => ({...f, job_order_id: '' }));
                if (conversionSource?.source_type === 'job_order') {
                    setConversionSource(null);
                    setConversionWarnings([]);
                }
                return;
            }
            try {
                const res = await jobOrdersApi.billPreview(jobOrderId);
                const data = res.data?.data || {};
                if (data.can_convert === false) {
                    toast.error(data.message || 'This job order cannot be linked to the bill');
                    return;
                }
                const previewPatch = applyJobOrderBillPreview(data, EMPTY_BILL_LINE);
                const jobVendorId = previewPatch.vendor_id || data.form?.vendor_id;
                if (
                    jobVendorId &&
                    form.vendor_id &&
                    String(jobVendorId) !== String(form.vendor_id)
                ) {
                    toast.error('This job order belongs to a different vendor');
                    return;
                }
                setConversionSource(previewPatch._conversionSource || data.source || null);
                setConversionWarnings(previewPatch._conversionWarnings || data.warnings || []);
                setForm((f) => applyJobFieldsToBillForm(f, previewPatch));
                if (!form.vendor_id && jobVendorId) {
                    loadVendorContext(String(jobVendorId));
                }
                const appliedFields =
                    Object.keys(previewPatch.template_custom || {}).length +
                    Object.keys(previewPatch.bill_metadata_custom_fields || {}).length;
                if (appliedFields > 0) {
                    toast.success('Job order fields applied to the bill');
                }
            } catch (err) {
                toast.error(err?.response?.data?.message || 'Could not load job order fields');
            }
        }, [
            conversionSource?.source_type,
            form.vendor_id,
            loadVendorContext,
        ],
    );

    useEffect(() => {
        if (bill?.vendor_id && !vendorContext) {
            loadVendorContext(String(bill.vendor_id));
        }
    }, [bill?.vendor_id, vendorContext, loadVendorContext]);

    const setField = useCallback((key, value) => {
        setForm((f) => {
            const next = {...f, [key]: value };
            if (key === 'bill_date' && vendorContext) {
                next.due_date = dueDateFromVendor(value, vendorContext);
            }
            return next;
        });
        setErrors((e) => {
            if (!e[key]) return e;
            const next = {...e };
            delete next[key];
            return next;
        });
    }, [vendorContext]);

    const appendVendor = useCallback((vendor) => {
        if (!vendor?.id) return;
        setLookups((prev) => {
            if (!prev) return prev;
            const list = prev.vendors || [];
            if (list.some((v) => String(v.id) === String(vendor.id))) return prev;
            return {
                ...prev,
                vendors: [
                    ...list,
                    {
                        id: vendor.id,
                        name: vendor.name || vendor.display_name || `Vendor #${vendor.id}`,
                        email: vendor.email,
                        currency: vendor.currency,
                    },
                ],
            };
        });
    }, []);

    const appendCustomer = useCallback((customer) => {
        if (!customer?.id) return;
        setLookups((prev) => {
            if (!prev) return prev;
            const list = prev.customers || [];
            if (list.some((c) => String(c.id) === String(customer.id))) return prev;
            return {
                ...prev,
                customers: [
                    ...list,
                    {
                        id: customer.id,
                        name: customer.name || customer.display_name || `Customer #${customer.id}`,
                        email: customer.email,
                    },
                ],
            };
        });
    }, []);

    const normalizeProductForBill = useCallback((product) => {
        if (!product?.id) return product;

        return {
            ...product,
            tracks_stock: product.tracks_stock??product.track_inventory??false,
            available_stock: product.available_stock??
                product.current_stock??
                product.quantity_on_hand??
                0,
            unit_price: product.unit_price??product.selling_price??0,
            qty_conversion: product.qty_conversion || null,
        };
    }, []);

    const mergeProductIntoLookups = useCallback(
        (product) => {
            const normalized = normalizeProductForBill(product);
            if (!normalized?.id) return normalized;

            setLookups((current) => {
                if (!current) return current;
                const productList = Array.isArray(current.products) ? current.products : [];
                const id = String(normalized.id);
                const exists = productList.some((p) => String(p.id) === id);
                return {
                    ...current,
                    products: exists ?
                        productList.map((p) => (String(p.id) === id ? {...p, ...normalized } : p)) :
                        [...productList, normalized],
                };
            });

            return normalized;
        }, [normalizeProductForBill],
    );

    const mergeTaxIntoLookups = useCallback((tax) => {
        if (!tax?.id) return tax;
        const normalized = {
            id: tax.id,
            name: tax.name || '',
            rate: Number(tax.rate) || 0,
            type: tax.type || 'percentage',
        };

        setLookups((current) => {
            if (!current) return current;
            const rates = Array.isArray(current.tax_rates) ? current.tax_rates : [];
            const id = String(normalized.id);
            const exists = rates.some((t) => String(t.id) === id);
            return {
                ...current,
                tax_rates: exists ?
                    rates.map((t) => (String(t.id) === id ? {...t, ...normalized } : t)) :
                    [...rates, normalized],
            };
        });

        return normalized;
    }, []);

    useEffect(() => {
        if (!lookups?.tax_rates?.length) return;
        setForm((f) => ({
            ...f,
            lines: f.lines.map((line) => refreshLineComputedFields(line, taxRatesById)),
        }));
    }, [lookups?.tax_rates, taxRatesById]);

    const onSelectTax = useCallback(
        (index, tax) => {
            const normalized = mergeTaxIntoLookups(tax);
            if (!normalized?.id) return false;

            const rates = {...taxRatesById, [String(normalized.id)]: normalized };

            setForm((f) => ({
                ...f,
                lines: f.lines.map((line, i) =>
                    i === index ?
                    refreshLineComputedFields({...line, tax_rate_id: String(normalized.id) },
                        rates,
                    ) :
                    line,
                ),
            }));

            return true;
        }, [mergeTaxIntoLookups, taxRatesById],
    );

    const setVendor = useCallback(
        (vendorId) => {
            if (!vendorId) {
                setForm((f) =>
                    isEdit ?
                    {...f, vendor_id: '' } :
                    {
                        ...EMPTY_BILL_FORM,
                        bill_date: f.bill_date,
                        due_date: f.due_date,
                        currency: baseCurrency,
                        warehouse_id: f.warehouse_id,
                    },
                );
                setVendorContext(null);
                setPurchaseOrders([]);
                return;
            }
            const previousVendorId = formRef.current.vendor_id;
            setForm((f) => ({...f, vendor_id: String(vendorId) }));
            scheduleVendorRefresh(vendorId, previousVendorId);
        }, [scheduleVendorRefresh, baseCurrency, isEdit],
    );

    const importPurchaseOrder = useCallback((po) => {
        if (!po?.lines?.length) {
            toast.error('Purchase order has no lines');
            return;
        }
        setForm((f) => ({
            ...f,
            lines: mapPoLinesToBillLines(po.lines),
            notes: po.notes || f.notes,
        }));
        toast.success(`Loaded lines from ${po.po_number || 'purchase order'}`);
    }, []);

    const updateLine = useCallback((index, key, value) => {
        setForm((f) => ({
            ...f,
            lines: f.lines.map((line, i) => {
                if (i !== index) return line;
                const next = {...line, [key]: value };
                const lockedBeforeEdit = parseLockedNetTotal(line);
                if (key === 'unit_price') {
                    next.net_total_locked = false;
                } else if (key === 'quantity' && lockedBeforeEdit != null) {
                    next.net_total_locked = true;
                } else if (['quantity_basis', 'entered_unit'].includes(key)) {
                    next.net_total_locked = false;
                }
                // Unit is presentation-only for commercial documents: switching it must
                // never touch the typed Quantity. The backend independently validates
                // and converts to base units at save time.
                if (key === 'quantity' && lockedBeforeEdit != null) {
                    return refreshLineComputedFields(
                        applyNetTotal(next, String(lockedBeforeEdit)),
                        taxRatesById,
                    );
                }
                return refreshLineComputedFields(next, taxRatesById);
            }),
        }));
    }, [taxRatesById]);

    const updateLineDiscountFixed = useCallback((index, value) => {
        setForm((f) => ({
            ...f,
            lines: f.lines.map((line, i) =>
                i === index ? refreshLineComputedFields(applyDiscountFixed(line, value), taxRatesById) : line
            ),
        }));
    }, [taxRatesById]);

    const updateLineDiscountPercent = useCallback((index, value) => {
        setForm((f) => ({
            ...f,
            lines: f.lines.map((line, i) =>
                i === index ? refreshLineComputedFields(applyDiscountPercent(line, value), taxRatesById) : line
            ),
        }));
    }, []);

    const updateLineNetTotal = useCallback((index, value) => {
        setForm((f) => ({
            ...f,
            lines: f.lines.map((line, i) => {
                if (i !== index) return line;
                const applied = applyNetTotal(line, value);
                const refreshed = refreshLineComputedFields(applied, taxRatesById);
                return {...refreshed, net_total: applied.net_total };
            }),
        }));
    }, [taxRatesById]);

    const selectProduct = useCallback(
        (index, productId, { autoAddLine = true, productOverride = null } = {}) => {
            const product = productOverride || productsById[String(productId)];

            setForm((f) => {
                let lines = f.lines.map((line, i) => {
                    if (i !== index) return line;
                    const next = {
                        ...line,
                        product_id: productId,
                        description: product?.name || line.description,
                        unit_price: product?.unit_price??line.unit_price,
                        tax_rate_id: product?.tax_rate_id ? String(product.tax_rate_id) : line.tax_rate_id,
                        entered_unit: defaultEnteredUnitForProduct(product) || '',
                        quantity_basis: 'sales',
                    };
                    return refreshLineComputedFields(next, taxRatesById);
                });
                if (
                    autoAddLine &&
                    index === lines.length - 1 &&
                    productId &&
                    lines[lines.length - 1].product_id
                ) {
                    lines = [...lines, {...EMPTY_BILL_LINE }];
                }
                return {...f, lines };
            });
            return true;
        }, [productsById, taxRatesById],
    );

    const addLine = useCallback(() => {
        setForm((f) => ({...f, lines: [...f.lines, {...EMPTY_BILL_LINE }] }));
    }, []);

    const removeLine = useCallback((index) => {
        setForm((f) => {
            const lines = f.lines.filter((_, i) => i !== index);
            return {...f, lines: lines.length ? lines : [{...EMPTY_BILL_LINE }] };
        });
    }, []);

    const setTemplateId = useCallback((templateId) => {
        setForm((f) => ({
            ...f,
            invoice_template_id: templateId,
            template_custom: {},
            bill_metadata_custom_fields: {},
        }));
    }, []);

    const setTemplateCustom = useCallback((fieldKey, value) => {
        setForm((f) => ({
            ...f,
            template_custom: {...f.template_custom, [fieldKey]: value },
        }));
    }, []);

    const addTemplateSelectOption = useCallback(
        async(field, optionLabel) => {
            const fieldKey = field?.field_key;
            const definitionId = field?.definition_id;
            const nextOption = String(optionLabel || '').trim();
            if (!fieldKey || !nextOption) return false;

            // Settings-linked fields share one option list across all pages.
            if (definitionId) {
                try {
                    const updated = await appendCustomFieldSelectOption({ id: definitionId }, nextOption);
                    if (!updated) return false;
                    const updatedOptions = parseDefinitionOptions(updated);

                    setLookups((current) => {
                        if (!current) return current;
                        return {
                            ...current,
                            templates: (current.templates || []).map((tpl) => ({
                                ...tpl,
                                header_fields: (tpl.header_fields || []).map((f) =>
                                    String(f.definition_id) === String(definitionId) ?
                                    {...f, options: updatedOptions } :
                                    f,
                                ),
                            })),
                        };
                    });

                    return true;
                } catch (err) {
                    toast.error(customFieldApiErrorMessage(err, 'Could not add option'));
                    return false;
                }
            }

            const templateId = selectedTemplate?.id;
            if (!templateId) return false;

            try {
                const res = await invoiceTemplatesApi.addFieldOption(templateId, fieldKey, {
                    option: nextOption,
                });
                const updatedOptions = Array.isArray(res?.data?.data?.options) ?
                    res.data.data.options.map((v) => String(v)) :
                    null;

                setLookups((current) => {
                    if (!current) return current;
                    return {
                        ...current,
                        templates: (current.templates || []).map((tpl) => {
                            if (String(tpl.id) !== String(templateId)) return tpl;
                            return {
                                ...tpl,
                                header_fields: (tpl.header_fields || []).map((f) => {
                                    if (f.field_key !== fieldKey) return f;
                                    const base = Array.isArray(f.options) ? f.options.map((v) => String(v)) : [];
                                    const merged = updatedOptions || (base.includes(nextOption) ? base : [...base, nextOption]);
                                    return {...f, options: merged };
                                }),
                            };
                        }),
                    };
                });

                return true;
            } catch (err) {
                toast.error(err?.response?.data?.message || 'Could not add template option');
                return false;
            }
        }, [selectedTemplate?.id],
    );

    const handleSubmit = useCallback(
        async(e) => {
            e?.preventDefault?.();
            if (saving) return;
            const nextErrors = {};
            const currentForm = formRef.current;
            if (!currentForm.vendor_id) nextErrors.vendor_id = 'Vendor is required';
            if (!currentForm.bill_date) nextErrors.bill_date = 'Bill date is required';
            if (!currentForm.due_date) nextErrors.due_date = 'Due date is required';

            const { templateFields } = resolveFormCustomFieldsForDocument(
                selectedTemplate?.header_fields || [],
                selectedTemplate?.form_layout || [],
            );
            templateFields.forEach((field) => {
                if (!field.is_required) return;
                const val = getTemplateFieldValue(currentForm, field, 'bill_metadata_custom_fields');
                if (field.field_type === 'checkbox') {
                    if (val !== '1' && val !== 1) {
                        const errKey = field.definition_id ?
                            `bill_metadata_custom_fields.${field.definition_id}` :
                            `template_custom.${field.field_key}`;
                        nextErrors[errKey] = `${field.label} is required`;
                    }
                    return;
                }
                if (!String(val??'').trim()) {
                    const errKey = field.definition_id ?
                        `bill_metadata_custom_fields.${field.definition_id}` :
                        `template_custom.${field.field_key}`;
                    nextErrors[errKey] = `${field.label} is required`;
                }
            });

            if (Object.keys(nextErrors).length) {
                setErrors(nextErrors);
                toast.error('Please fix the highlighted fields');
                return;
            }

            setSaving(true);
            try {
            if (currentForm.bill_number_manual && isOnline()) {
                const seq = parseInt(currentForm.bill_sequence, 10);
                if (!Number.isFinite(seq) || seq < 1) {
                    setErrors((prev) => ({
                        ...prev,
                        bill_sequence: 'Enter a valid sequence number (e.g. 0006).',
                    }));
                    toast.error('Please enter a valid bill sequence number');
                    return;
                }

                if (errors.bill_sequence) {
                    toast.error(errors.bill_sequence);
                    return;
                }

                try {
                    const checkParams = {
                        date: currentForm.bill_date,
                        sequence: seq,
                    };
                    if (isEdit && bill?.id) {
                        checkParams.exclude_bill_id = bill.id;
                    }
                    const checkRes = await billsApi.checkNumber(checkParams);
                    const checkData = checkRes.data?.data??checkRes.data??{};
                    if (checkData.exists) {
                        const message = `Bill number ${checkData.full} already exists. Choose another number.`;
                        setErrors((prev) => ({...prev, bill_sequence: message }));
                        toast.error(message);
                        return;
                    }
                } catch {
                    toast.error('Could not verify bill number. Try again.');
                    return;
                }
            }

                const payload = buildBillPayload({
                    ...currentForm,
                    invoice_template_id: activeTemplateId || currentForm.invoice_template_id,
                });
                if (!payload.lines?.length) {
                    toast.error('Add at least one line item with a product or description');
                    return;
                }

                // Phase 4: offline draft bill create via outbox (updates stay online for now).
                if (!isEdit && companyId) {
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
                      entity: 'bill',
                      op: 'create',
                      payload: {
                        ...payload,
                        vendor_name: vendor?.name || null,
                        vendor_email: vendor?.email || null,
                      },
                      offlineSyncEnabled: true,
                      forceOffline: true,
                    });
                    toast.success('Bill saved offline — will sync when you reconnect');
                    onSuccess?.(queued.data);
                    return;
                  }
                }

                const res = isEdit ?
                    await billsApi.update(bill.id, payload) :
                    await billsApi.create(payload);
                if (!res.data || res.data.success !== true) {
                    toast.error(res.data?.message || 'Failed to save bill');
                    return;
                }
                const saved = res.data?.data;
                if (!saved?.lines?.length) {
                    toast.error('Bill was not saved correctly. Please try again.');
                    return;
                }
                if (pendingAttachments.length > 0 && saved?.id) {
                    try {
                        const uploaded = await uploadPendingAttachments(billsApi, saved.id, pendingAttachments);
                        setPendingAttachments([]);
                        if (uploaded.length) {
                            setAttachments((prev) => [...uploaded, ...prev]);
                        }
                    } catch (uploadErr) {
                        toast.error(
                            uploadErr?.response?.data?.message ||
                            'Bill saved but some attachments failed to upload'
                        );
                        onSuccess?.(saved);
                        return;
                    }
                }
                if (isEdit && saved.lines?.length !== payload.lines.length) {
                    toast.error('Bill lines were not saved correctly. Please reload and try again.');
                    return;
                }
                toast.success(res.data?.message || (isEdit ? 'Bill updated' : 'Bill created'));
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
                toast.error(data?.message || 'Failed to save bill');
            } finally {
                setSaving(false);
            }
        }, [
          isEdit,
          bill,
          onSuccess,
          pendingAttachments,
          selectedTemplate,
          activeTemplateId,
          errors.bill_sequence,
          saving,
          companyId,
          vendors,
        ]
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
        templates,
        selectedTemplate,
        templateSelectValue: activeTemplateId,
        vendors,
        customers,
        products,
        taxRates,
        warehouses,
        taxRatesById,
        productsById,
        lineColumns,
        totals,
        currencySymbols,
        baseCurrency,
        vendorContext,
        purchaseOrders,
        addressUnlocked,
        setAddressUnlocked,
        isEdit,
        vendorLocked: false,
        canCreateProduct: lookups?.can_create_product,
        canCreateVendor: lookups?.can_create_vendor,
        canQuickCreateTax: lookups?.can_quick_create_tax,
        onFieldChange: setField,
        onJobOrderChange: handleJobOrderChange,
        onVendorChange: setVendor,
        onVendorCreated: appendVendor,
        onCustomerCreated: appendCustomer,
        importPurchaseOrder,
        onUpdateLine: updateLine,
        onUpdateLineDiscountFixed: updateLineDiscountFixed,
        onUpdateLineDiscountPercent: updateLineDiscountPercent,
        onUpdateLineNetTotal: updateLineNetTotal,
        onSelectProduct: selectProduct,
        onProductCreated: mergeProductIntoLookups,
        onTaxCreated: mergeTaxIntoLookups,
        onSelectTax,
        onAddLine: addLine,
        onRemoveLine: removeLine,
        setTemplateId,
        setTemplateCustom,
        addTemplateSelectOption,
        handleSubmit,
        pendingAttachments,
        setPendingAttachments,
        attachments,
        setAttachments,
        documentId: isEdit && bill?.id ? bill.id : null,
        customFieldDefinitions,
        setMetadataField,
        billNumberPreview,
        loadingBillNumber,
        checkingBillSequence,
        toggleBillNumberManual,
        setBillSequence,
        currentBillNumber: bill?.bill_number || '',
    };
}