import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { mergeCustomerIntoLookups } from '@/lib/merge-customer-into-lookups';
import {
    applyInvoiceConversionPreview,
    applyJobOrderInvoicePreview,
} from '@/components/accounting/invoice-conversion';
import { applyJobFieldsToInvoiceForm } from '@/components/accounting/job-order-preset.lib';
import { documentConversionsApi } from '../../api/document-conversions.api';
import { jobOrdersApi } from '../../job-orders/api/job-orders.api';
import { invoiceTemplatesApi } from '../../invoice-templates/api/invoice-templates.api';
import { invoicesApi } from '../api/invoices.api';
import { uploadPendingAttachments } from '@/components/accounting/document-attachments.lib';
import { companyDocumentFooterFor } from '@/pages/accounting/lib/documentFooter';
import {
    EMPTY_INVOICE_FORM,
    EMPTY_INVOICE_LINE,
    applyDiscountFixed,
    applyDiscountPercent,
    applyNetTotal,
    buildAddressDisplay,
    calcInvoiceTotals,
    computeDueDateByTerms,
    dueDateFromCustomer,
    mapInvoiceToForm,
    maxQtyInLineBasis,
    parseLockedNetTotal,
    productTracksStock,
    refreshLineComputedFields,
    resolveDocumentLineQuantityString,
    splitAddressDisplay,
    unitPriceForFormInput,
} from '../constants';
import { buildPreviewInvoiceFromForm } from '../invoice-form-preview';
import {
    defaultEnteredUnitForProduct,
} from '@/lib/units';
import {
    findTemplateById,
    resolveActiveTemplateId,
} from '@/lib/document-template-selection';
import { DEFAULT_LINE_COLUMNS } from '../invoice-template-constants';
import {
    appendCustomFieldSelectOption,
    customFieldApiErrorMessage,
    parseDefinitionOptions,
} from '@/components/accounting/custom-fields-lib';
import { buildPasteLineUpdates } from '../components/invoice-lines-keyboard';
import { isOnline } from '@/offline/connectivity';
import { getMeta, setMeta } from '@/offline/db';
import { saveDraftInvoice, loadCachedLookups } from '@/offline/invoices-repository';
import { prefetchInvoiceLookups } from '@/offline/sync-manager';

const EMPTY_LOOKUP_LIST = [];

function buildCustomerContextFromInvoice(invoice, customers = []) {
    const customerId = invoice?.customer_id ? String(invoice.customer_id) : '';
    if (!customerId) return null;

    const cached = customers.find((c) => String(c.id) === customerId);
    const nested = invoice.customer;

    return {
        customer_id: customerId,
        name: nested?.name || cached?.name || '',
        email: invoice.contact_email || nested?.email || cached?.email || '',
        contact_person: invoice.contact_person || nested?.name || cached?.name || '',
        currency: invoice.currency || cached?.currency || nested?.currency,
        payment_terms_type: invoice.payment_terms_type || cached?.payment_terms_type || 'net_days',
        payment_terms_days: invoice.payment_terms_days ?? cached?.payment_terms_days ?? 30,
        payment_terms_fixed_day: invoice.payment_terms_fixed_day ?? cached?.payment_terms_fixed_day ?? '',
        billing_address_display: invoice.billing_address || cached?.billing_address || '',
    };
}

function invoiceLinesTaxSynced(lines, taxRatesById) {
    return lines.every((line) => {
        const next = refreshLineComputedFields(line, taxRatesById);
        return (
            String(next.sale_tax_amount ?? '') === String(line.sale_tax_amount ?? '') &&
            String(next.net_total ?? '') === String(line.net_total ?? '')
        );
    });
}

function mergeProductStockFields(incoming, existing) {
    // Invoice form-options attach live `available_stock` — trust that snapshot.
    if (incoming?.available_stock != null) {
        return {
            available_stock: incoming.available_stock,
            current_stock: incoming.current_stock ?? incoming.available_stock,
            quantity_on_hand: incoming.quantity_on_hand ?? incoming.available_stock,
        };
    }

    // Product save/show often returns current_stock: 0 when stock was not loaded.
    if (existing) {
        const hasExistingStock =
            existing.available_stock != null ||
            existing.current_stock != null ||
            existing.quantity_on_hand != null;
        if (hasExistingStock) {
            return {
                available_stock: existing.available_stock ??
                    existing.current_stock ??
                    existing.quantity_on_hand ??
                    0,
                current_stock: existing.current_stock,
                quantity_on_hand: existing.quantity_on_hand,
            };
        }
    }

    if (incoming?.current_stock != null || incoming?.quantity_on_hand != null) {
        const stock = incoming.current_stock ?? incoming.quantity_on_hand ?? 0;
        return {
            available_stock: stock,
            current_stock: incoming.current_stock,
            quantity_on_hand: incoming.quantity_on_hand,
        };
    }

    return {
        available_stock: 0,
        current_stock: existing?.current_stock,
        quantity_on_hand: existing?.quantity_on_hand,
    };
}

function mergeProductQtyConversion(incoming, existing) {
    const inc = incoming?.qty_conversion;
    const ext = existing?.qty_conversion;
    if (!inc) return ext ?? null;
    if (!ext) return inc;
    return {
        ...ext,
        ...inc,
        family_units: inc.family_units?.length ? inc.family_units : ext.family_units,
        default_entered_unit: inc.default_entered_unit ?? ext.default_entered_unit,
        storage_unit_key: inc.storage_unit_key ?? ext.storage_unit_key,
        factor_to_base: inc.factor_to_base ?? ext.factor_to_base,
    };
}

export function useInvoiceForm({ mode = 'create', invoiceId, invoice, fromSource, onSuccess }) {
    const { id: companyId } = useParams();
    const [searchParams] = useSearchParams();
    const presetJobOrderId = searchParams.get('job_order_id') || '';
    const sourceType = fromSource?.sourceType || '';
    const sourceId = fromSource?.sourceId || '';
    const isEdit = mode === 'edit';
    const [form, setForm] = useState({
        ...EMPTY_INVOICE_FORM,
        job_order_id: !isEdit && presetJobOrderId ? presetJobOrderId : '',
        uuid: invoice?.uuid || '',
    });
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [loadingLookups, setLoadingLookups] = useState(true);
    const [loadingConversion, setLoadingConversion] = useState(false);
    const [conversionSource, setConversionSource] = useState(null);
    const [conversionWarnings, setConversionWarnings] = useState([]);
    const [lookups, setLookups] = useState(null);
    const [customerContext, setCustomerContext] = useState(null);
    const [loadingCustomerContext, setLoadingCustomerContext] = useState(false);
    const [salesOrders, setSalesOrders] = useState([]);
    const [addressUnlocked, setAddressUnlocked] = useState(false);
    const [paymentTermsUnlocked, setPaymentTermsUnlocked] = useState(false);
    const [pendingAttachments, setPendingAttachments] = useState([]);
    const [attachments, setAttachments] = useState(invoice?.attachments || []);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [invoiceNumberPreview, setInvoiceNumberPreview] = useState(null);
    const [loadingInvoiceNumber, setLoadingInvoiceNumber] = useState(false);
    const [checkingInvoiceSequence, setCheckingInvoiceSequence] = useState(false);

    const formLocked =
        isEdit &&
        (invoice?.status === 'cancelled' || invoice?.approval_status === 'pending');
    const conversionLoadedRef = useRef(false);
    const jobOrderPreviewLoadedRef = useRef(false);
    const customerContextLoadIdRef = useRef(null);
    const invoiceHydratedIdRef = useRef(null);
    const taxLinesSyncedRef = useRef(false);
    const loadCustomerContextRef = useRef(() => {});
    const invoiceSnapshotRef = useRef(invoice);

    invoiceSnapshotRef.current = invoice;

    const autoPostEnabled = Boolean(lookups?.auto_post_to_accounting);
    const products = lookups?.products ?? EMPTY_LOOKUP_LIST;
    const taxRates = lookups?.tax_rates ?? EMPTY_LOOKUP_LIST;
    const customers = lookups?.customers ?? EMPTY_LOOKUP_LIST;
    const templates = lookups?.templates ?? EMPTY_LOOKUP_LIST;
    const currencySymbols = lookups?.currency_symbols || {};
    const baseCurrency = lookups?.base_currency || 'USD';

    const activeTemplateId = useMemo(
        () =>
        resolveActiveTemplateId({
            formTemplateId: form.invoice_template_id,
            documentTemplateId: invoice?.invoice_template_id,
            defaultTemplateId: lookups?.default_template_id,
            isEdit,
        }), [
            form.invoice_template_id,
            invoice?.invoice_template_id,
            lookups?.default_template_id,
            isEdit,
        ],
    );

    const selectedTemplate = useMemo(() => {
        const match = findTemplateById(templates, activeTemplateId);
        return match || templates[0] || null;
    }, [templates, activeTemplateId]);

    const lineColumns = useMemo(() => {
        const fromTemplate = selectedTemplate?.line_columns;
        if (Array.isArray(fromTemplate) && fromTemplate.length) return fromTemplate;
        const fromLookups = lookups?.line_columns;
        if (Array.isArray(fromLookups) && fromLookups.length) return fromLookups;
        return DEFAULT_LINE_COLUMNS;
    }, [selectedTemplate, lookups?.line_columns]);

    const getMaxQtyForLine = useCallback(
        (line, _index, product) => {
            if (!productTracksStock(product)) return null;
            // The update orchestrator reverses the existing invoice's stock
            // footprint before rebuilding it. A frontend cap based on the
            // form-options snapshot can therefore be stale after a bill or
            // stock adjustment changes inventory while this invoice exists.
            // Let the backend perform the authoritative atomic check on edit.
            if (isEdit) return null;
            return maxQtyInLineBasis(line, product);
        }, [isEdit],
    );

    const taxRatesById = useMemo(() => {
        const map = {};
        taxRates.forEach((t) => {
            map[String(t.id)] = t;
        });
        return map;
    }, [taxRates]);

    const refreshLine = useCallback(
        (line) => refreshLineComputedFields(line, taxRatesById), [taxRatesById],
    );

    const productsById = useMemo(() => {
        const map = {};
        products.forEach((p) => {
            map[String(p.id)] = p;
        });
        return map;
    }, [products]);

    const totals = useMemo(
        () => calcInvoiceTotals(form, taxRatesById), [form, taxRatesById]
    );

    useEffect(() => {
        let cancelled = false;
        setLoadingLookups(true);
        invoicesApi
            .formOptions()
            .then(async (res) => {
                if (cancelled) return;
                const data = res.data?.data || {};
                setLookups(data);
                const offlineEnabled = Boolean(data.company?.offline_sync_enabled);
                if (companyId) {
                    await setMeta(companyId, 'offline_sync_enabled', offlineEnabled);
                    if (offlineEnabled) {
                        await prefetchInvoiceLookups(companyId, data);
                    }
                }
                if (!isEdit && !invoice) {
                    setForm((f) => ({
                        ...f,
                        invoice_template_id: data.default_template_id ?
                            String(data.default_template_id) :
                            '',
                        currency: data.base_currency || 'USD',
                        // Prefill banking/legal text from Settings → Footer settings (when enabled for invoices)
                        notes: companyDocumentFooterFor(data.company, 'invoice') || (f.notes || '').trim(),
                    }));
                }
            })
            .catch(async (err) => {
                if (cancelled) return;
                // Offline fallback: hydrate lookups from Dexie when flag was previously enabled.
                if (!isOnline() && companyId) {
                    try {
                        const enabled = await getMeta(companyId, 'offline_sync_enabled', false);
                        const cached = await loadCachedLookups(companyId);
                        if (enabled && (cached.customers?.length || cached.products?.length)) {
                            setLookups((prev) => ({
                                ...(prev || {}),
                                ...cached,
                                company: {
                                    ...(prev?.company || {}),
                                    offline_sync_enabled: true,
                                },
                            }));
                            if (!isEdit && !invoice) {
                                setForm((f) => ({
                                    ...f,
                                    currency: cached.base_currency || f.currency || 'USD',
                                    invoice_template_id: cached.default_template_id
                                        ? String(cached.default_template_id)
                                        : f.invoice_template_id,
                                    lines: f.lines?.length ? f.lines : [{ ...EMPTY_INVOICE_LINE }],
                                }));
                            }
                            toast.message('Working offline — using cached customers & products');
                            return;
                        }
                    } catch {
                        /* fall through */
                    }
                }
                toast.error(
                    err?.response?.data?.message || 'Failed to load invoice form'
                );
            })
            .finally(() => {
                if (!cancelled) setLoadingLookups(false);
            });
        return () => {
            cancelled = true;
        };
    }, [companyId, isEdit]);

    useEffect(() => {
        const snapshot = invoiceSnapshotRef.current;
        if (!snapshot?.id) {
            invoiceHydratedIdRef.current = null;
            taxLinesSyncedRef.current = false;
            customerContextLoadIdRef.current = null;
            return;
        }
        if (invoiceHydratedIdRef.current === snapshot.id) return;

        invoiceHydratedIdRef.current = snapshot.id;
        taxLinesSyncedRef.current = false;
        setForm(mapInvoiceToForm(snapshot));
        if (snapshot.attachments) {
            setAttachments(snapshot.attachments);
        }

        if (isEdit && snapshot.customer_id) {
            const customerId = String(snapshot.customer_id);
            customerContextLoadIdRef.current = customerId;
            setCustomerContext(buildCustomerContextFromInvoice(snapshot, customers));
            loadCustomerContextRef.current(customerId, {
                syncForm: false,
                preserveJobOrder: true,
            });
        }
    }, [invoice?.id, isEdit]);

    useEffect(() => {
        if (!lookups?.tax_rates?.length || taxLinesSyncedRef.current) return;

        taxLinesSyncedRef.current = true;
        setForm((f) => {
            if (invoiceLinesTaxSynced(f.lines, taxRatesById)) return f;
            return {
                ...f,
                lines: f.lines.map((line) =>
                    refreshLineComputedFields(line, taxRatesById),
                ),
            };
        });
    }, [isEdit, invoice?.id, lookups?.tax_rates, taxRatesById]);

    const fetchExchangeRate = useCallback(
        async(currency, date) => {
            if (!lookups?.multi_currency_enabled) return;
            const curr = String(currency || baseCurrency).toUpperCase();
            if (curr === String(baseCurrency).toUpperCase()) {
                setForm((f) => (f.exchange_rate === '1' ? f : {...f, exchange_rate: '1' }));
                return;
            }
            try {
                const res = await invoicesApi.exchangeRate({ currency: curr, date });
                const rate = res.data?.data?.rate;
                const nextRate = rate != null ? String(rate) : '1';
                setForm((f) => (f.exchange_rate === nextRate ? f : {...f, exchange_rate: nextRate }));
            } catch {
                setForm((f) => (f.exchange_rate === '1' ? f : {...f, exchange_rate: '1' }));
            }
        }, [lookups?.multi_currency_enabled, baseCurrency]
    );

    useEffect(() => {
        if (!lookups || formLocked) return;
        fetchExchangeRate(form.currency, form.invoice_date);
    }, [form.currency, form.invoice_date, lookups, formLocked, fetchExchangeRate]);

    useEffect(() => {
        if (isEdit) return undefined;
        let cancelled = false;
        const date = form.invoice_date;
        if (!date || formLocked) return undefined;

        setLoadingInvoiceNumber(true);
        invoicesApi
            .nextNumber({ date })
            .then((res) => {
                if (cancelled) return;
                const data = res.data?.data??res.data??null;
                setInvoiceNumberPreview(data);
                setForm((f) => {
                    if (f.invoice_number_manual) {
                        return f;
                    }
                    return {
                        ...f,
                        invoice_sequence: data?.sequence != null ? String(data.sequence) : f.invoice_sequence,
                    };
                });
            })
            .catch(() => {
                if (!cancelled) setInvoiceNumberPreview(null);
            })
            .finally(() => {
                if (!cancelled) setLoadingInvoiceNumber(false);
            });

        return () => {
            cancelled = true;
        };
    }, [form.invoice_date, formLocked, isEdit]);

    const toggleInvoiceNumberManual = useCallback(
        (manual) => {
            setForm((f) => ({
                ...f,
                invoice_number_manual: manual,
                invoice_sequence: manual ?
                    f.invoice_sequence !== '' ?
                    f.invoice_sequence :
                    String(invoiceNumberPreview?.sequence??'') :
                    String(invoiceNumberPreview?.sequence??''),
            }));
            setErrors((prev) => {
                if (!prev.invoice_sequence) return prev;
                const next = {...prev };
                delete next.invoice_sequence;
                return next;
            });
        }, [invoiceNumberPreview?.sequence],
    );

    const setInvoiceSequence = useCallback((value) => {
        setForm((f) => ({...f, invoice_sequence: value }));
        setErrors((prev) => {
            if (!prev.invoice_sequence) return prev;
            const next = {...prev };
            delete next.invoice_sequence;
            return next;
        });
    }, []);

    useEffect(() => {
        if (!form.invoice_number_manual) return undefined;

        const seq = parseInt(form.invoice_sequence, 10);
        if (!Number.isFinite(seq) || seq < 1 || !form.invoice_date) {
            return undefined;
        }

        let cancelled = false;
        const timer = setTimeout(async() => {
            setCheckingInvoiceSequence(true);
            try {
                const params = {
                    date: form.invoice_date,
                    sequence: seq,
                };
                if (isEdit && invoiceId) {
                    params.exclude_invoice_id = invoiceId;
                }
                const res = await invoicesApi.checkNumber(params);
                if (cancelled) return;
                const data = res.data?.data??res.data??{};
                if (data.exists) {
                    setErrors((prev) => ({
                        ...prev,
                        invoice_sequence: `Invoice number ${data.full} already exists. Choose another number.`,
                    }));
                } else {
                    setErrors((prev) => {
                        if (!prev.invoice_sequence) return prev;
                        const next = {...prev };
                        delete next.invoice_sequence;
                        return next;
                    });
                }
            } catch {
                if (!cancelled) {
                    setErrors((prev) => ({
                        ...prev,
                        invoice_sequence: 'Could not verify invoice number. Try again.',
                    }));
                }
            } finally {
                if (!cancelled) setCheckingInvoiceSequence(false);
            }
        }, 400);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [
        isEdit,
        invoiceId,
        form.invoice_number_manual,
        form.invoice_sequence,
        form.invoice_date,
    ]);

    const applyCustomerContextToForm = useCallback(
        (customerId, ctx, { preserveJobOrder = false, syncForm = true } = {}) => {
            setCustomerContext(
                ctx && typeof ctx === 'object' ?
                ctx :
                { customer_id: String(customerId) },
            );
            if (!syncForm) return;

            setForm((f) => {
                const bill = ctx?.billing_address_display || ctx?.billing_address || '';
                const ship = ctx?.shipping_address || bill;
                const customerChanged = String(customerId) !== String(f.customer_id);
                const clearJobLink = customerChanged && !preserveJobOrder;
                const next = {
                    ...f,
                    customer_id: String(customerId),
                    contact_person: ctx?.contact_person || ctx?.name || '',
                    contact_email: ctx?.email || '',
                    billing_address: bill,
                    shipping_address: ship,
                    address_display: buildAddressDisplay(bill, ship),
                    currency: ctx?.currency || f.currency || baseCurrency,
                };
                if (clearJobLink) {
                    next.job_order_id = '';
                }
                if (customerChanged && !isEdit) {
                    if (f.sales_order_id) {
                        next.sales_order_id = '';
                        next.lines = [{...EMPTY_INVOICE_LINE }];
                    } else {
                        next.sales_order_id = '';
                    }
                }
                if (!isEdit || customerChanged) {
                    if (ctx?.invoice_template_id) {
                        next.invoice_template_id = String(ctx.invoice_template_id);
                    }
                    next.payment_terms_type = ctx?.payment_terms_type || f.payment_terms_type || 'net_days';
                    next.payment_terms_days = ctx?.payment_terms_days??f.payment_terms_days??30;
                    next.payment_terms_fixed_day = ctx?.payment_terms_fixed_day??f.payment_terms_fixed_day??'';
                    next.due_date = dueDateFromCustomer(
                        f.invoice_date, {
                            payment_terms_type: next.payment_terms_type,
                            payment_terms_days: next.payment_terms_days,
                            payment_terms_fixed_day: next.payment_terms_fixed_day,
                        },
                    );
                }
                return next;
            });
            setAddressUnlocked(false);
            if (!isEdit) setPaymentTermsUnlocked(false);
        },
        [baseCurrency, isEdit],
    );

    const loadCustomerContext = useCallback(
        async(customerId, options = {}) => {
            const { preserveJobOrder = false, syncForm = true } = options;
            if (!customerId) {
                setCustomerContext(null);
                setSalesOrders([]);
                setLoadingCustomerContext(false);
                return;
            }

            setLoadingCustomerContext(true);
            try {
                const ctxRes = await invoicesApi.customerInvoiceContext(customerId);
                const ctx = ctxRes.data?.data;
                applyCustomerContextToForm(customerId, ctx, { preserveJobOrder, syncForm });

                // Sales orders are optional for the SO import bar — load in background.
                if (!isEdit) {
                    invoicesApi
                        .customerSalesOrders(customerId)
                        .then((soRes) => {
                            setSalesOrders(soRes.data?.data?.orders || []);
                        })
                        .catch(() => {
                            setSalesOrders([]);
                        });
                } else {
                    setSalesOrders([]);
                }
            } catch {
                if (!isOnline()) {
                    const cached = (customers || []).find((c) => String(c.id) === String(customerId));
                    if (cached) {
                        const bill = [
                            cached.bill_address1,
                            cached.bill_address2,
                            [cached.bill_city, cached.bill_state, cached.bill_postal_code].filter(Boolean).join(', '),
                            cached.bill_country,
                        ].filter(Boolean).join('\n');
                        applyCustomerContextToForm(customerId, {
                            name: cached.name,
                            email: cached.email,
                            contact_person: cached.contact_person || cached.name || '',
                            currency: cached.currency,
                            billing_address: bill || cached.billing_address || '',
                            billing_address_display: bill || cached.billing_address_display || cached.billing_address || '',
                            shipping_address: cached.shipping_address || bill || '',
                            payment_terms_type: cached.payment_terms_type || 'net_days',
                            payment_terms_days: cached.payment_terms_days ?? 30,
                            payment_terms_fixed_day: cached.payment_terms_fixed_day ?? '',
                            invoice_template_id: cached.invoice_template_id || null,
                        }, { preserveJobOrder, syncForm });
                        setSalesOrders([]);
                        return;
                    }
                }
                applyCustomerContextToForm(
                    customerId,
                    { customer_id: String(customerId) },
                    { preserveJobOrder, syncForm },
                );
                toast.error('Failed to load customer details');
            } finally {
                setLoadingCustomerContext(false);
            }
        }, [applyCustomerContextToForm, customers, isEdit]
    );

    loadCustomerContextRef.current = loadCustomerContext;

    useEffect(() => {
        if (!sourceType || !sourceId || isEdit || invoice || loadingLookups || conversionLoadedRef.current) {
            return;
        }
        let cancelled = false;
        conversionLoadedRef.current = true;
        setLoadingConversion(true);
        documentConversionsApi
            .preview({
                sourceType,
                sourceId,
                target: 'invoice',
            })
            .then((res) => {
                if (cancelled) return;
                const data = res.data?.data || {};
                const patch = applyInvoiceConversionPreview(data, EMPTY_INVOICE_LINE);
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
                        // Use source's template when set; fall back to the default template.
                        invoice_template_id: formPatch.invoice_template_id || f.invoice_template_id,
                        job_order_id: formPatch.job_order_id || f.job_order_id || '',
                        template_custom: {
                            ...(f.template_custom || {}),
                            ...(formPatch.template_custom || {}),
                        },
                        invoice_metadata_custom_fields: {
                            ...(f.invoice_metadata_custom_fields || {}),
                            ...(formPatch.invoice_metadata_custom_fields || {}),
                        },
                    };
                });
            })
            .catch((err) => {
                if (!cancelled) {
                    if (!isOnline()) {
                        toast.error(
                            'Copying an invoice needs a connection. Create a blank invoice offline instead.',
                        );
                    } else {
                        toast.error(err?.response?.data?.message || 'Could not load invoice copy');
                    }
                }
            })
            .finally(() => {
                if (!cancelled) setLoadingConversion(false);
            });
        return () => {
            cancelled = true;
        };
    }, [sourceType, sourceId, isEdit, invoice, loadingLookups, taxRatesById]);

    useEffect(() => {
        if (!presetJobOrderId ||
            isEdit ||
            invoice ||
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
            .invoicePreview(presetJobOrderId)
            .then((res) => {
                if (cancelled) return;
                const data = res.data?.data || {};
                const patch = applyJobOrderInvoicePreview(data, EMPTY_INVOICE_LINE);
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
                        invoice_metadata_custom_fields: {
                            ...(f.invoice_metadata_custom_fields || {}),
                            ...(formPatch.invoice_metadata_custom_fields || {}),
                        },
                    };
                });
                if (formPatch.customer_id) {
                    loadCustomerContext(formPatch.customer_id, { preserveJobOrder: true });
                }
            })
            .catch((err) => {
                jobOrderPreviewLoadedRef.current = false;
                if (!cancelled) {
                    if (!isOnline()) {
                        toast.message(
                            'Job order details need a connection — you can still create the invoice offline',
                        );
                    } else {
                        toast.error(
                            err?.response?.data?.message || 'Could not load job details for invoice',
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
        invoice,
        sourceType,
        loadingLookups,
        taxRatesById,
        loadCustomerContext,
    ]);

    const setField = useCallback((key, value) => {
        setForm((f) => {
            const next = {...f, [key]: value };
            if (key === 'payment_terms_type' || key === 'payment_terms_days' || key === 'payment_terms_fixed_day') {
                next.due_date = computeDueDateByTerms(
                    f.invoice_date,
                    key === 'payment_terms_type' ? value : f.payment_terms_type,
                    key === 'payment_terms_days' ? value : f.payment_terms_days,
                    key === 'payment_terms_fixed_day' ? value : f.payment_terms_fixed_day
                );
            }
            if (key === 'invoice_date') {
                next.due_date = computeDueDateByTerms(
                    value,
                    f.payment_terms_type,
                    f.payment_terms_days,
                    f.payment_terms_fixed_day
                );
            }
            return next;
        });
        setErrors((e) => {
            if (!e[key]) return e;
            const next = {...e };
            delete next[key];
            return next;
        });
    }, []);

    const handleJobOrderChange = useCallback(
        async(jobOrderId) => {
            if (!jobOrderId) {
                setField('job_order_id', '');
                setConversionSource(null);
                setConversionWarnings([]);
                return;
            }
            if (!form.customer_id) {
                toast.error('Select a customer before linking a job order');
                return;
            }
            try {
                const res = await jobOrdersApi.invoicePreview(jobOrderId);
                const data = res.data?.data || {};
                if (data.can_convert === false) {
                    toast.error(data.message || 'This job order cannot be linked to the invoice');
                    return;
                }
                const previewPatch = applyJobOrderInvoicePreview(data, EMPTY_INVOICE_LINE);
                const jobCustomerId = previewPatch.customer_id || data.form?.customer_id;
                if (
                    jobCustomerId &&
                    String(jobCustomerId) !== String(form.customer_id)
                ) {
                    toast.error('This job order belongs to a different customer');
                    return;
                }
                setConversionSource(previewPatch._conversionSource || data.source || null);
                setConversionWarnings(previewPatch._conversionWarnings || data.warnings || []);
                setForm((f) => applyJobFieldsToInvoiceForm(f, previewPatch));
                const appliedFields =
                    Object.keys(previewPatch.template_custom || {}).length +
                    Object.keys(previewPatch.invoice_metadata_custom_fields || {}).length;
                if (appliedFields > 0) {
                    toast.success('Job order fields applied to the invoice');
                }
            } catch (err) {
                toast.error(
                    err?.response?.data?.message || 'Could not load job order fields',
                );
            }
        }, [form.customer_id],
    );

    const setTemplateCustom = useCallback((fieldKey, value) => {
        setForm((f) => ({
            ...f,
            template_custom: {...f.template_custom, [fieldKey]: value },
        }));
    }, []);

    const setInvoiceMetadataField = useCallback((defId, value) => {
        setForm((f) => ({
            ...f,
            invoice_metadata_custom_fields: {
                ...(f.invoice_metadata_custom_fields || {}),
                [String(defId)]: value,
            },
        }));
        setErrors((e) => ({
            ...e,
            [`invoice_metadata_custom_fields.${defId}`]: undefined,
            [`invoice_metadata_custom_fields.${String(defId)}`]: undefined,
        }));
    }, []);

    const setCustomer = useCallback(
        (customerId, createdCustomer) => {
            if (!customerId) {
                customerContextLoadIdRef.current = null;
                setForm((f) => ({
                    ...EMPTY_INVOICE_FORM,
                    invoice_template_id: f.invoice_template_id,
                    invoice_date: f.invoice_date,
                }));
                setCustomerContext(null);
                setSalesOrders([]);
                setLoadingCustomerContext(false);
                return;
            }
            customerContextLoadIdRef.current = String(customerId);
            mergeCustomerIntoLookups(setLookups, createdCustomer);
            loadCustomerContext(customerId);
        }, [loadCustomerContext]
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

    const setTemplateId = useCallback((templateId) => {
        setForm((f) => ({
            ...f,
            invoice_template_id: templateId,
            template_custom: {},
            invoice_metadata_custom_fields: {},
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

    const normalizeProductForInvoice = useCallback((product, existing = null) => {
        if (!product?.id) return product;

        return {
            ...(existing || {}),
            ...product,
            ...mergeProductStockFields(product, existing),
            qty_conversion: mergeProductQtyConversion(product, existing),
            tracks_stock: product.tracks_stock ??
                product.track_inventory ??
                existing?.tracks_stock ??
                existing?.track_inventory ??
                false,
            track_inventory: product.track_inventory ?? existing?.track_inventory,
            unit_price: product.unit_price ?? product.selling_price ?? existing?.unit_price ?? 0,
            selling_price: product.selling_price ?? product.unit_price ?? existing?.selling_price,
        };
    }, []);

    const mergeProductIntoLookups = useCallback(
        (product) => {
            if (!product?.id) return product;

            const existing = productsById[String(product.id)] || null;
            const normalized = normalizeProductForInvoice(product, existing);

            setLookups((current) => {
                if (!current) return current;
                const products = Array.isArray(current.products) ? current.products : [];
                const id = String(product.id);
                const exists = products.some((p) => String(p.id) === id);
                return {
                    ...current,
                    products: exists ?
                        products.map((p) => (String(p.id) === id ? normalized : p)) :
                        [...products, normalized],
                };
            });

            return normalized;
        }, [normalizeProductForInvoice, productsById]
    );

    const onProductUpdated = useCallback(
        (product) => {
            const normalized = mergeProductIntoLookups(product);
            if (!normalized?.id) return normalized;

            setForm((f) => ({
                ...f,
                lines: f.lines.map((line) => {
                    if (String(line.product_id) !== String(normalized.id)) return line;
                    const preservedQty =
                        line.quantity != null && String(line.quantity).trim() !== '' ?
                        line.quantity :
                        resolveDocumentLineQuantityString(line);
                    const rawPrice =
                        normalized.unit_price ?? normalized.selling_price ?? line.unit_price;
                    const next = {
                        ...line,
                        description: normalized.name || line.description,
                        unit_price: unitPriceForFormInput(rawPrice),
                        tax_rate_id: normalized.tax_rate_id ?
                            String(normalized.tax_rate_id) :
                            line.tax_rate_id,
                        quantity: preservedQty,
                        entered_quantity_decimal: line.entered_quantity_decimal,
                        entered_unit: line.entered_unit,
                        quantity_basis: line.quantity_basis,
                    };
                    return refreshLine(next);
                }),
            }));

            return normalized;
        },
        [mergeProductIntoLookups, refreshLine],
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
            const taxRates = Array.isArray(current.tax_rates) ? current.tax_rates : [];
            const id = String(normalized.id);
            const exists = taxRates.some((t) => String(t.id) === id);
            return {
                ...current,
                tax_rates: exists ?
                    taxRates.map((t) => (String(t.id) === id ? {...t, ...normalized } : t)) :
                    [...taxRates, normalized],
            };
        });

        return normalized;
    }, []);

    const patchInvoiceSettings = useCallback(
        ({
            company: companyPatch,
            auto_post_to_accounting: autoPostPatch,
            invoice_billing_mode: billingModePatch,
        } = {}) => {
            setLookups((current) => {
                if (!current) return current;
                return {
                    ...current,
                    company: companyPatch ?
                        {...current.company, ...companyPatch, ...(billingModePatch ?
                                { invoice_billing_mode: billingModePatch } :
                                {}) } :
                        billingModePatch ?
                        {...current.company, invoice_billing_mode: billingModePatch } :
                        current.company,
                    auto_post_to_accounting:
                        autoPostPatch !== undefined ?
                        !!autoPostPatch :
                        current.auto_post_to_accounting,
                };
            });

            if (!isEdit && companyPatch) {
                setForm((f) => {
                    const previousFooter = companyDocumentFooterFor(lookups?.company, 'invoice');
                    const nextFooter = companyDocumentFooterFor(
                        {...lookups?.company, ...companyPatch },
                        'invoice',
                    );
                    const currentNotes = (f.notes || '').trim();
                    if (currentNotes === previousFooter || currentNotes === '') {
                        return {...f, notes: nextFooter };
                    }
                    return f;
                });
            }
        },
        [isEdit, lookups?.company],
    );

    const refreshTemplateFooter = useCallback((templateId, footerContent) => {
        if (!templateId) return;
        setLookups((current) => {
            if (!current?.templates?.length) return current;
            return {
                ...current,
                templates: current.templates.map((t) =>
                    String(t.id) === String(templateId) ?
                    {...t, footer_content: footerContent } :
                    t,
                ),
            };
        });
    }, []);

    const onSelectTax = useCallback((index, tax) => {
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
    }, [mergeTaxIntoLookups, taxRatesById]);

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
                // never touch the typed Quantity. Likewise, a quantity that exceeds
                // available stock is never silently rewritten here — InvoiceLinesGrid
                // only highlights the field (red border / tooltip); the backend remains
                // the sole authority that rejects the save.
                if (key === 'sale_tax_amount') {
                    return refreshLineComputedFields(next);
                }
                if (key === 'quantity' && lockedBeforeEdit != null) {
                    return refreshLine(applyNetTotal(next, String(lockedBeforeEdit)));
                }
                return refreshLine(next);
            }),
        }));
    }, [refreshLine]);

    const updateLineDiscountFixed = useCallback((index, value) => {
        setForm((f) => ({
            ...f,
            lines: f.lines.map((line, i) =>
                i === index ? refreshLine(applyDiscountFixed(line, value)) : line
            ),
        }));
    }, [refreshLine]);

    const updateLineDiscountPercent = useCallback((index, value) => {
        setForm((f) => ({
            ...f,
            lines: f.lines.map((line, i) =>
                i === index ? refreshLine(applyDiscountPercent(line, value)) : line
            ),
        }));
    }, [refreshLine]);

    const updateLineNetTotal = useCallback((index, value) => {
        setForm((f) => ({
            ...f,
            lines: f.lines.map((line, i) => {
                if (i !== index) return line;
                const applied = applyNetTotal(line, value);
                const refreshed = refreshLine(applied);
                return {...refreshed, net_total: applied.net_total };
            }),
        }));
    }, [refreshLine]);

    const onSelectProduct = useCallback(
        (index, productId, { autoAddLine = true, productOverride = null } = {}) => {
            const product = productOverride || productsById[String(productId)];

            setForm((f) => {
                let lines = f.lines.map((line, i) => {
                    if (i !== index) return line;
                    const rawPrice = product?.unit_price ?? product?.selling_price ?? line.unit_price;
                    const next = {
                        ...line,
                        product_id: productId,
                        description: product?.name || line.description,
                        unit_price: unitPriceForFormInput(rawPrice),
                        tax_rate_id: product?.tax_rate_id ? String(product.tax_rate_id) : line.tax_rate_id,
                        entered_unit: defaultEnteredUnitForProduct(product) || '',
                        quantity_basis: 'sales',
                    };
                    // Quantity is never auto-adjusted when a product is picked either —
                    // if the line's existing quantity exceeds the new product's stock,
                    // the grid's live availability warning surfaces it immediately.
                    return refreshLine(next);
                });
                if (
                    autoAddLine &&
                    index === lines.length - 1 &&
                    productId &&
                    lines[lines.length - 1].product_id
                ) {
                    lines = [...lines, {...EMPTY_INVOICE_LINE }];
                }
                return {...f, lines };
            });
            return true;
        }, [productsById, refreshLine]
    );

    const onAddLine = useCallback(() => {
        setForm((f) => ({...f, lines: [...f.lines, {...EMPTY_INVOICE_LINE }] }));
    }, []);

    const onRemoveLine = useCallback((index) => {
        setForm((f) => {
            if (f.lines.length <= 1) return f;
            return {...f, lines: f.lines.filter((_, i) => i !== index) };
        });
    }, []);

    const onDuplicateLine = useCallback((index) => {
        setForm((f) => {
            const source = f.lines[index];
            if (!source) return f;
            const copy = {...source, sales_order_line_id: '' };
            const lines = [...f.lines];
            lines.splice(index + 1, 0, copy);
            return {...f, lines };
        });
    }, []);

    const onReorderLines = useCallback((fromIndex, toIndex) => {
        if (fromIndex === toIndex) return;
        setForm((f) => {
            const lines = [...f.lines];
            const [moved] = lines.splice(fromIndex, 1);
            if (!moved) return f;
            lines.splice(toIndex, 0, moved);
            return {...f, lines };
        });
    }, []);

    const onPasteLines = useCallback(
        (startIndex, pasteRows, startCol, visibleColKeys, productList) => {
            if (!pasteRows?.length) return;
            const visibleSet = new Set(visibleColKeys || []);
            setForm((f) => {
                let lines = [...f.lines];
                pasteRows.forEach((cells, rowOffset) => {
                    const idx = startIndex + rowOffset;
                    while (lines.length <= idx) {
                        lines.push({...EMPTY_INVOICE_LINE });
                    }
                    const updates = buildPasteLineUpdates(cells, startCol, visibleSet, productList || products);
                    if (!Object.keys(updates).length) return;

                    let line = {...lines[idx] };

                    if (updates.product_id) {
                        const product = productsById[String(updates.product_id)];
                        const rawPrice = product?.unit_price ?? product?.selling_price ?? line.unit_price;
                        line = {
                            ...line,
                            product_id: updates.product_id,
                            description: product?.name || line.description,
                            unit_price: unitPriceForFormInput(rawPrice),
                            tax_rate_id: product?.tax_rate_id ? String(product.tax_rate_id) : line.tax_rate_id,
                            entered_unit: defaultEnteredUnitForProduct(product) || '',
                            quantity_basis: 'sales',
                        };
                    }
                    if (updates.description != null) line.description = updates.description;
                    if (updates.quantity != null) line.quantity = updates.quantity;
                    if (updates.unit_price != null) {
                        line.unit_price = unitPriceForFormInput(updates.unit_price);
                        line.net_total_locked = false;
                    }
                    if (updates.discount_fixed != null) {
                        line = applyDiscountFixed(line, updates.discount_fixed);
                    }
                    if (updates.discount_percent != null) {
                        line = applyDiscountPercent(line, updates.discount_percent);
                    }
                    if (updates.net_total != null) {
                        line = applyNetTotal(line, updates.net_total);
                    }
                    lines[idx] = refreshLine(line);
                });
                return {...f, lines };
            });
        },
        [products, productsById, refreshLine],
    );

    const importSalesOrder = useCallback(
        (orderId) => {
            const order = salesOrders.find((o) => String(o.id) === String(orderId));
            if (!order) {
                toast.error('Could not load selected sales order.');
                return;
            }
            const soLines = order.lines || [];
            const mapped =
                soLines.length > 0 ?
                soLines.map((l) => {
                    const qty =
                        typeof l.quantity_remaining === 'number' ?
                        Math.max(0, l.quantity_remaining) :
                        Math.max(0, (Number(l.quantity) || 0) - (Number(l.quantity_invoiced) || 0));
                    const useQty = qty > 0 ? qty : Number(l.quantity) || 1;
                    const base = {
                        product_id: l.product_id ? String(l.product_id) : '',
                        description: l.description || '',
                        quantity: useQty,
                        unit_price: l.unit_price??'',
                        discount: l.discount??'',
                        discount_type: l.discount_type || 'fixed',
                        tax_rate_id: l.tax_rate_id ? String(l.tax_rate_id) : '',
                        sale_tax_amount: l.sale_tax_amount??'',
                        sales_order_line_id: l.id ? String(l.id) : '',
                    };
                    return refreshLine(syncDiscountFromSoLine(base));
                }) :
                [{...EMPTY_INVOICE_LINE }];

            setForm((f) => ({
                ...f,
                sales_order_id: String(order.id),
                lines: mapped,
            }));
            toast.success('Sales order lines imported.');
        }, [salesOrders, refreshLine]
    );

    const clearSalesOrderImport = useCallback(() => {
        setForm((f) => ({
            ...f,
            sales_order_id: '',
            lines: [{...EMPTY_INVOICE_LINE }],
        }));
        toast.message('Sales order cleared — enter lines manually.');
    }, []);

    function syncDiscountFromSoLine(line) {
        const gross = (Number(line.quantity) || 0) * (Number(line.unit_price) || 0);
        const disc = Number(line.discount) || 0;
        if (line.discount_type === 'percent' && gross > 0) {
            return {...line, discount: (disc / gross) * 100 };
        }
        return line;
    }

    const validateStock = useCallback(() => {
        if (isEdit) return true;
        for (let i = 0; i < form.lines.length; i++) {
            const line = form.lines[i];
            if (!line.product_id) continue;
            const product = productsById[line.product_id];
            if (!productTracksStock(product)) continue;
            const max = getMaxQtyForLine(line, i, product);
            if (max != null && Number(line.quantity) > max + 0.000001) {
                toast.error(`Line ${i + 1}: quantity exceeds available stock (${max.toFixed(2)}).`);
                return false;
            }
        }
        return true;
    }, [form.lines, productsById, getMaxQtyForLine, isEdit]);

    const resetFormForNew = useCallback(() => {
        setForm({
            ...EMPTY_INVOICE_FORM,
            invoice_template_id: lookups?.default_template_id ?
                String(lookups.default_template_id) :
                '',
            currency: lookups?.base_currency || 'USD',
            invoice_sequence: invoiceNumberPreview?.sequence != null ?
                String(invoiceNumberPreview.sequence) :
                '',
        });
        setErrors({});
        setConversionSource(null);
        setConversionWarnings([]);
        setCustomerContext(null);
        setSalesOrders([]);
        setPendingAttachments([]);
        conversionLoadedRef.current = false;
        jobOrderPreviewLoadedRef.current = false;
    }, [lookups?.default_template_id, lookups?.base_currency, invoiceNumberPreview?.sequence]);

    const previewInvoice = useMemo(
        () =>
        buildPreviewInvoiceFromForm(form, {
            customers,
            productsById,
            taxRatesById,
            selectedTemplate,
            company: lookups?.company,
            invoiceNumberPreview,
        }), [
            form,
            customers,
            productsById,
            taxRatesById,
            selectedTemplate,
            lookups?.company,
            invoiceNumberPreview,
        ],
    );

    const openPreview = useCallback(() => {
        if (!form.customer_id) {
            toast.error('Select a customer to preview the invoice');
            return;
        }
        setPreviewOpen(true);
    }, [form.customer_id]);

    const saveWithMode = useCallback(
        async(saveMode = 'view') => {
            if (saving) return;
            if (!form.customer_id) {
                setErrors({ customer_id: 'Customer is required' });
                toast.error('Please select a customer');
                return;
            }
            if (!validateStock()) return;

            const offlineSyncEnabled = Boolean(lookups?.company?.offline_sync_enabled);
            if (saveMode === 'post' && offlineSyncEnabled && !isOnline()) {
                toast.error('Posting requires a connection. Save as draft offline, then post after sync.');
                return;
            }

            setSaving(true);
            try {
            if (form.invoice_number_manual && isOnline()) {
                const seq = parseInt(form.invoice_sequence, 10);
                if (!Number.isFinite(seq) || seq < 1) {
                    setErrors((prev) => ({
                        ...prev,
                        invoice_sequence: 'Enter a valid sequence number (e.g. 0006).',
                    }));
                    toast.error('Please enter a valid invoice sequence number');
                    return;
                }

                if (errors.invoice_sequence) {
                    toast.error(errors.invoice_sequence);
                    return;
                }

                try {
                    const checkParams = {
                        date: form.invoice_date,
                        sequence: seq,
                    };
                    if (isEdit && invoiceId) {
                        checkParams.exclude_invoice_id = invoiceId;
                    }
                    const checkRes = await invoicesApi.checkNumber(checkParams);
                    const checkData = checkRes.data?.data??checkRes.data??{};
                    if (checkData.exists) {
                        const message = `Invoice number ${checkData.full} already exists. Choose another number.`;
                        setErrors((prev) => ({...prev, invoice_sequence: message }));
                        toast.error(message);
                        return;
                    }
                } catch {
                    toast.error('Could not verify invoice number. Try again.');
                    return;
                }
            }

                const formForSave = {
                    ...form,
                    invoice_template_id: activeTemplateId || form.invoice_template_id,
                    uuid: form.uuid || invoice?.uuid || '',
                };

                const result = await saveDraftInvoice({
                    companyId,
                    form: formForSave,
                    isEdit,
                    invoiceId,
                    existingLocalUuid: form.uuid || invoice?.uuid,
                    lockVersion: invoice?.lock_version,
                    offlineSyncEnabled,
                });

                if (result.formPatch) {
                    setForm((f) => ({
                        ...f,
                        ...result.formPatch,
                    }));
                }

                if (result.offline) {
                    toast.success('Saved offline — will sync when you reconnect');
                    if (!isEdit && saveMode === 'new') {
                        resetFormForNew();
                        return;
                    }
                    onSuccess?.(result.invoice, saveMode === 'post' ? 'view' : saveMode);
                    return;
                }

                const res = result.response;
                let saved = result.invoice;

                if (pendingAttachments.length > 0 && saved?.id) {
                    try {
                        const uploaded = await uploadPendingAttachments(invoicesApi, saved.id, pendingAttachments);
                        setPendingAttachments([]);
                        if (uploaded.length) {
                            setAttachments((prev) => [...uploaded, ...prev]);
                        }
                    } catch (uploadErr) {
                        toast.error(
                            uploadErr?.response?.data?.message ||
                            'Invoice saved but some attachments failed to upload',
                        );
                        onSuccess?.(saved, saveMode);
                        return;
                    }
                }

                if (!isEdit && saveMode === 'post' && !autoPostEnabled && saved?.id) {
                    try {
                        const postRes = await invoicesApi.post(saved.id);
                        toast.success(
                            postRes?.data?.message || 'Invoice saved and posted to accounting',
                        );
                        saved = {...saved, is_posted: true };
                    } catch (postErr) {
                        toast.error(
                            postErr?.response?.data?.message ||
                            'Invoice saved but posting to accounting failed',
                        );
                        onSuccess?.(saved, 'view');
                        return;
                    }
                } else {
                    const autoNote = !isEdit && autoPostEnabled ? ' (posted to accounting)' : '';
                    toast.success(
                        (res?.data?.message ||
                            `Invoice ${isEdit ? 'updated' : 'created'} successfully`) + autoNote,
                    );
                }

                if (!isEdit && saveMode === 'new') {
                    resetFormForNew();
                    return;
                }

                onSuccess?.(saved, saveMode);
            } catch (err) {
                // Online API failed while offline sync is enabled — queue draft locally.
                const offlineSyncEnabled = Boolean(lookups?.company?.offline_sync_enabled);
                if (offlineSyncEnabled && (!isOnline() || !err?.response)) {
                    try {
                        const queued = await saveDraftInvoice({
                            companyId,
                            form: {
                                ...form,
                                invoice_template_id: activeTemplateId || form.invoice_template_id,
                                force_offline_queue: true,
                                uuid: form.uuid || invoice?.uuid || '',
                            },
                            isEdit,
                            invoiceId,
                            existingLocalUuid: form.uuid || invoice?.uuid,
                            lockVersion: invoice?.lock_version,
                            offlineSyncEnabled: true,
                        });
                        if (queued.formPatch) {
                            setForm((f) => ({ ...f, ...queued.formPatch }));
                        }
                        toast.success('Saved offline — will sync when you reconnect');
                        onSuccess?.(queued.invoice, 'view');
                        return;
                    } catch {
                        /* fall through to normal error */
                    }
                }
                const apiErrors = err?.response?.data?.errors;
                if (apiErrors && typeof apiErrors === 'object') {
                    const flat = {};
                    Object.entries(apiErrors).forEach(([k, v]) => {
                        flat[k] = Array.isArray(v) ? v[0] : String(v);
                    });
                    setErrors(flat);
                }
                toast.error(
                    err?.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} invoice`,
                );
            } finally {
                setSaving(false);
            }
        }, [
            form,
            errors,
            activeTemplateId,
            validateStock,
            isEdit,
            invoiceId,
            invoice,
            pendingAttachments,
            autoPostEnabled,
            checkingInvoiceSequence,
            resetFormForNew,
            onSuccess,
            saving,
            companyId,
            lookups?.company?.offline_sync_enabled,
        ],
    );

    const handleSubmit = (e) => {
        e?.preventDefault?.();
        saveWithMode('view');
    };

    return {
        form,
        errors,
        saving,
        loadingLookups,
        loadingConversion,
        conversionSource,
        conversionWarnings,
        formLocked,
        postedLocked: formLocked,
        lookups,
        customers,
        products,
        taxRates,
        taxRatesById,
        productsById,
        templates,
        selectedTemplate,
        templateSelectValue: activeTemplateId,
        lineColumns,
        totals,
        currencySymbols,
        baseCurrency,
        customerContext,
        loadingCustomerContext,
        salesOrders,
        addressUnlocked,
        setAddressUnlocked,
        paymentTermsUnlocked,
        setPaymentTermsUnlocked,
        isEdit,
        setField,
        setCustomer,
        setAddressDisplay,
        setTemplateId,
        setTemplateCustom,
        setInvoiceMetadataField,
        addTemplateSelectOption,
        getMaxQtyForLine,
        onFieldChange: setField,
        onJobOrderChange: handleJobOrderChange,
        onCustomerChange: setCustomer,
        onUpdateLine: updateLine,
        onUpdateLineDiscountFixed: updateLineDiscountFixed,
        onUpdateLineDiscountPercent: updateLineDiscountPercent,
        onUpdateLineNetTotal: updateLineNetTotal,
        onProductCreated: mergeProductIntoLookups,
        onProductUpdated,
        onTaxCreated: mergeTaxIntoLookups,
        onSelectTax,
        onSelectProduct,
        onAddLine,
        onRemoveLine,
        onDuplicateLine,
        onReorderLines,
        onPasteLines,
        importSalesOrder,
        clearSalesOrderImport,
        handleSubmit,
        saveWithMode,
        openPreview,
        previewOpen,
        setPreviewOpen,
        previewInvoice,
        autoPostEnabled,
        patchInvoiceSettings,
        refreshTemplateFooter,
        presetJobOrderId,
        canCreateProduct: lookups?.can_create_product,
        canQuickCreateTax: lookups?.can_quick_create_tax,
        pendingAttachments,
        setPendingAttachments,
        attachments,
        setAttachments,
        documentId: isEdit ? invoiceId : null,
        invoiceNumberPreview,
        loadingInvoiceNumber,
        checkingInvoiceSequence,
        toggleInvoiceNumberManual,
        setInvoiceSequence,
        currentInvoiceNumber: invoice?.invoice_number || '',
        invoiceStatus: invoice?.status || 'draft',
    };
}