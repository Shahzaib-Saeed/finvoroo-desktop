import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { toast } from 'sonner';
import { isOnline } from '@/offline/connectivity';
import { getMeta, setMeta } from '@/offline/db';
import { loadCachedLookups } from '@/offline/invoices-repository';
import { vendorCreditsApi } from '../api/vendor-credits.api';
import {
    EMPTY_VENDOR_CREDIT_FORM,
    EMPTY_VENDOR_CREDIT_LINE,
    buildVendorCreditPayload,
    calcLinesTotals,
    lineFromBillApi,
    lineFromProduct,
    mapVendorCreditToForm,
    resolveTaxForLine,
} from '../constants';

export function useVendorCreditForm({ mode = 'create', vendorCredit, onSuccess }) {
    const isEdit = mode === 'edit';
    const { id: companyId } = useParams();

    // Hydrate synchronously from `vendorCredit` so the form is never rendered
    // in an EMPTY state on the way to being populated. The old useEffect-based
    // hydration raced with the lookups load / parent re-renders and could leave
    // the form empty on screen even though `vendorCredit` was already loaded.
    const initialMapped = useMemo(
        () => (isEdit && vendorCredit ? mapVendorCreditToForm(vendorCredit, []) : null),
        // Intentionally only recompute if the identity of vendorCredit changes.
        // EditFormInner remounts via `key={vendorCredit.id}`, so this runs once.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [vendorCredit ?.id],
    );

    const [form, setForm] = useState(() =>
        initialMapped ? {
            vendor_id: initialMapped.vendor_id,
            bill_id: initialMapped.bill_id,
            currency: initialMapped.currency,
            credit_date: initialMapped.credit_date,
            amount: initialMapped.amount,
            reason: initialMapped.reason,
        } :
        EMPTY_VENDOR_CREDIT_FORM,
    );
    const [lines, setLines] = useState(() =>
        initialMapped && !initialMapped.isAmountOnly && initialMapped.lines ?.length ?
        initialMapped.lines : [{...EMPTY_VENDOR_CREDIT_LINE }],
    );
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [loadingLookups, setLoadingLookups] = useState(true);
    const [loadingLines, setLoadingLines] = useState(false);
    const [lookups, setLookups] = useState(null);
    const [showLines, setShowLines] = useState(
        () => !!(initialMapped && !initialMapped.isAmountOnly && initialMapped.lines ?.length),
    );
    const [returnableBillLineCount, setReturnableBillLineCount] = useState(0);
    // Set right before hydrating `lines` from an existing vendor credit's own saved
    // line items, so the bill-lines-fetch effect below (which exists for the create
    // flow, to suggest returnable items) doesn't immediately overwrite them with
    // blank-quantity rows fetched from the bill.
    const skipBillLinesFetchRef = useRef(false);

    const vendors = lookups ?.vendors || [];
    const bills = lookups ?.bills || [];
    const products = lookups ?.products || [];
    const taxRates = lookups ?.tax_rates || [];
    const baseCurrency = lookups ?.base_currency || 'USD';
    const multiCurrency = lookups ?.multi_currency_enabled === true;
    // Informational only — editing an applied debit note is allowed. The backend
    // (UpdateVendorCreditOrchestrator) automatically reverses its existing bill
    // application(s), recalculates inventory/GL from the edited lines, and reapplies
    // the updated amount, capped by each bill's current balance. Nothing here should
    // ever disable a field based on this flag.
    const hasApplication =
        isEdit && Number(vendorCredit ?.amount_applied || 0) > 0.001;

    const lineTotals = useMemo(() => calcLinesTotals(lines, taxRates), [lines, taxRates]);

    const billsForVendor = useMemo(() => {
        if (!form.vendor_id) return bills;
        return bills.filter((b) => String(b.vendor_id) === String(form.vendor_id));
    }, [bills, form.vendor_id]);

    useEffect(() => {
        let cancelled = false;
        setLoadingLookups(true);
        vendorCreditsApi
            .formOptions()
            .then(async (res) => {
                if (cancelled) return;
                const data = res.data ?.data || {};
                setLookups(data);
                if (companyId) {
                    await setMeta(companyId, 'offline_sync_enabled', Boolean(data.company?.offline_sync_enabled));
                }
                if (!isEdit && !vendorCredit) {
                    setForm((f) => ({...f, currency: data.base_currency || 'USD' }));
                }
            })
            .catch(async (err) => {
                if (cancelled) return;
                if (!isOnline() && companyId) {
                    try {
                        const enabled = await getMeta(companyId, 'offline_sync_enabled', false);
                        const cached = await loadCachedLookups(companyId);
                        if (enabled && cached.vendors?.length) {
                            setLookups({ vendors: cached.vendors, base_currency: cached.base_currency });
                            if (!isEdit && !vendorCredit) {
                                setForm((f) => ({ ...f, currency: cached.base_currency || 'USD' }));
                            }
                            toast.message('Working offline — using cached vendors. Line-item returns need a connection; enter an amount instead.');
                            return;
                        }
                    } catch {
                        /* fall through */
                    }
                }
                toast.error(err ?.response ?.data ?.message || 'Failed to load form options');
            })
            .finally(() => {
                if (!cancelled) setLoadingLookups(false);
            });
        return () => {
            cancelled = true;
        };
        // Lookups don't depend on the VC — loading them once on mount is enough.
        // Keeping `vendorCredit` in deps caused the whole form to flash back to
        // the loading spinner whenever the parent handed us a new VC reference.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEdit, companyId]);

    // Form + lines are already hydrated synchronously from `vendorCredit` via
    // useState initializers above. Once product lookups arrive we re-map the
    // saved lines so tax metadata resolves against the loaded product list.
    // This runs at most once per VC and must never clobber user edits.
    const productsHydratedRef = useRef(false);
    useEffect(() => {
        if (productsHydratedRef.current) return;
        if (!isEdit || !vendorCredit || !products.length) return;
        if (!vendorCredit.lines || !vendorCredit.lines.length) return;
        const mapped = mapVendorCreditToForm(vendorCredit, products);
        if (!mapped.isAmountOnly) {
            skipBillLinesFetchRef.current = true;
            setLines(mapped.lines);
        }
        productsHydratedRef.current = true;
    }, [isEdit, vendorCredit, products]);

    useEffect(() => {
        if (!form.bill_id) {
            setReturnableBillLineCount(0);
            return;
        }
        if (skipBillLinesFetchRef.current) {
            skipBillLinesFetchRef.current = false;
            return;
        }
        let cancelled = false;
        setLoadingLines(true);
        setReturnableBillLineCount(0);
        const params =
            isEdit && vendorCredit ?.id ? { exclude_vendor_credit: vendorCredit.id } : {};
        vendorCreditsApi
            .billLines(form.bill_id, params)
            .then((res) => {
                if (cancelled) return;
                const billLines = res.data ?.data ?.lines || [];
                setReturnableBillLineCount(billLines.length);
                if (billLines.length) {
                    setLines(billLines.map((l) => lineFromBillApi(l)));
                } else {
                    setLines([{...EMPTY_VENDOR_CREDIT_LINE }]);
                }
            })
            .catch((err) => {
                if (!cancelled) {
                    toast.error(err ?.response ?.data ?.message || 'Failed to load bill lines');
                }
            })
            .finally(() => {
                if (!cancelled) setLoadingLines(false);
            });
        return () => {
            cancelled = true;
        };
    }, [form.bill_id, isEdit, vendorCredit ?.id]);

    const openReturnedItemsFromBill = useCallback(() => {
        setShowLines(true);
    }, []);

    const setField = useCallback((key, value) => {
        setForm((f) => ({...f, [key]: value }));
        setErrors((e) => {
            if (!e[key]) return e;
            const next = {...e };
            delete next[key];
            return next;
        });
    }, []);

    const onVendorChange = useCallback(
        (vendorId) => {
            const vendor = vendors.find((v) => String(v.id) === String(vendorId));
            setForm((f) => ({
                ...EMPTY_VENDOR_CREDIT_FORM,
                credit_date: f.credit_date,
                vendor_id: vendorId,
                currency: vendor ?.currency || f.currency || baseCurrency,
            }));
            setLines([{...EMPTY_VENDOR_CREDIT_LINE }]);
            setShowLines(false);
        }, [vendors, baseCurrency]
    );

    const onBillChange = useCallback(
        (billId) => {
            const bill = bills.find((b) => String(b.id) === String(billId));
            setForm((f) => ({
                ...f,
                bill_id: billId,
                vendor_id: bill ?.vendor_id ? String(bill.vendor_id) : f.vendor_id,
                currency: bill ?.currency || f.currency,
            }));
            if (!billId) {
                setLines([{...EMPTY_VENDOR_CREDIT_LINE }]);
                setShowLines(false);
            }
        }, [bills]
    );

    const updateLine = useCallback(
        (index, patch) => {
            setLines((prev) =>
                prev.map((row, i) => {
                    if (i !== index) return row;
                    const next = {...row, ...patch };
                    if (patch.tax_rate_id !== undefined) {
                        const tax = resolveTaxForLine(taxRates, patch.tax_rate_id);
                        next.tax_rate = tax.tax_rate;
                        next.tax_type = tax.tax_type;
                    }
                    if (patch.product_id !== undefined && patch.product_id) {
                        const product = products.find((p) => String(p.id) === String(patch.product_id));
                        if (product) {
                            const fromProd = lineFromProduct(product);
                            const tax = resolveTaxForLine(taxRates, fromProd.tax_rate_id);
                            return {...next, ...fromProd, tax_rate: tax.tax_rate, tax_type: tax.tax_type };
                        }
                    }
                    return next;
                })
            );
        }, [products, taxRates]
    );

    const addLine = useCallback(() => {
        setLines((prev) => [...prev, {...EMPTY_VENDOR_CREDIT_LINE }]);
        setShowLines(true);
    }, []);

    const removeLine = useCallback((index) => {
        setLines((prev) => {
            const next = prev.filter((_, i) => i !== index);
            return next.length ? next : [{...EMPTY_VENDOR_CREDIT_LINE }];
        });
    }, []);

    const handleSubmit = useCallback(
        async(e) => {
            e ?.preventDefault ?.();
            if (saving) return;

            const nextErrors = {};
            if (!form.vendor_id) nextErrors.vendor_id = 'Vendor is required';
            if (!form.credit_date) nextErrors.credit_date = 'Credit date is required';
            if (!form.currency) nextErrors.currency = 'Currency is required';

            if (!showLines) {
                if (!form.amount || Number(form.amount) <= 0) {
                    nextErrors.amount = 'Debit amount must be greater than 0';
                }
            } else if (lineTotals.total <= 0) {
                nextErrors.lines = 'Add at least one line item with a total greater than 0';
            }

            if (Object.keys(nextErrors).length) {
                setErrors(nextErrors);
                toast.error('Please fix the highlighted fields');
                return;
            }

            setSaving(true);
            try {
                const payload = buildVendorCreditPayload(form, showLines ? lines : []);

                // Offline: only the amount+reason path (no bill-line returns —
                // that needs a live bill-lines lookup this app doesn't cache).
                if (!isEdit && companyId && !isOnline() && !showLines) {
                    const offlineSyncEnabled = Boolean(
                        await getMeta(companyId, 'offline_sync_enabled', false),
                    );
                    if (offlineSyncEnabled) {
                        const { saveDocumentDraft } = await import('@/offline/documents-repository');
                        const vendor = (vendors || []).find(
                            (v) => String(v.id) === String(payload.vendor_id),
                        );
                        const queued = await saveDocumentDraft({
                            companyId,
                            entity: 'debit_note',
                            op: 'create',
                            payload: {
                                ...payload,
                                vendor_name: vendor?.name || null,
                                vendor_email: vendor?.email || null,
                            },
                            offlineSyncEnabled: true,
                            forceOffline: true,
                        });
                        toast.success('Debit note saved offline — will sync when you reconnect');
                        onSuccess?.(queued.data);
                        return;
                    }
                }
                if (!isEdit && !isOnline() && showLines) {
                    toast.error(
                        'Line-item returns need a connection. Reconnect, or enter a debit amount instead.',
                    );
                    return;
                }

                const res = isEdit ?
                    await vendorCreditsApi.update(vendorCredit.id, payload) :
                    await vendorCreditsApi.create(payload);
                toast.success(
                    res.data ?.message || (isEdit ? 'Debit note updated' : 'Debit note created')
                );
                onSuccess ?.(res.data ?.data);
            } catch (err) {
                const data = err ?.response ?.data;
                if (data ?.errors && typeof data.errors === 'object') {
                    const flat = {};
                    Object.entries(data.errors).forEach(([k, v]) => {
                        flat[k] = Array.isArray(v) ? v[0] : v;
                    });
                    setErrors(flat);
                }
                toast.error(data ?.message || 'Could not save debit note');
            } finally {
                setSaving(false);
            }
        }, [form, lines, showLines, isEdit, vendorCredit, onSuccess, saving, lineTotals, companyId, vendors]
    );

    return {
        form,
        lines,
        errors,
        saving,
        loadingLookups,
        loadingLines,
        lookups,
        vendors,
        billsForVendor,
        products,
        taxRates,
        baseCurrency,
        multiCurrency,
        lineTotals,
        showLines,
        setShowLines,
        returnableBillLineCount,
        openReturnedItemsFromBill,
        hasApplication,
        isEdit,
        onFieldChange: setField,
        onVendorChange,
        onBillChange,
        updateLine,
        addLine,
        removeLine,
        handleSubmit,
    };
}