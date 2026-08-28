import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { toast } from 'sonner';
import { mergeCustomerIntoLookups } from '@/lib/merge-customer-into-lookups';
import { isOnline } from '@/offline/connectivity';
import { getMeta, setMeta } from '@/offline/db';
import { loadCachedLookups } from '@/offline/invoices-repository';
import { creditNotesApi } from '../api/credit-notes.api';
import {
    EMPTY_CREDIT_NOTE_FORM,
    EMPTY_CREDIT_NOTE_LINE,
    buildCreditNotePayload,
    calcLinesTotals,
    lineFromCreditNoteApi,
    lineFromInvoiceApi,
    mapCreditNoteToForm,
} from '../constants';

export function useCreditNoteForm({ mode = 'create', creditNote, onSuccess }) {
    const isEdit = mode === 'edit';
    const { id: companyId } = useParams();
    const [form, setForm] = useState(EMPTY_CREDIT_NOTE_FORM);
    const [lines, setLines] = useState([{...EMPTY_CREDIT_NOTE_LINE }]);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [loadingLookups, setLoadingLookups] = useState(true);
    const [loadingInvoices, setLoadingInvoices] = useState(false);
    const [loadingLines, setLoadingLines] = useState(false);
    const [lookups, setLookups] = useState(null);
    const [invoices, setInvoices] = useState([]);
    const [showLines, setShowLines] = useState(false);
    /** Invoice lines available for return (prefetched when an invoice is linked; does not force line mode). */
    const [returnableInvoiceLineCount, setReturnableInvoiceLineCount] = useState(0);

    const customers = lookups?.customers || [];
    const baseCurrency = lookups?.base_currency || 'USD';
    const financialLocked = isEdit && creditNote?.flags?.financial_locked === true;

    const lineTotals = useMemo(() => calcLinesTotals(lines), [lines]);

    useEffect(() => {
        let cancelled = false;
        setLoadingLookups(true);
        creditNotesApi
            .formOptions()
            .then(async (res) => {
                if (cancelled) return;
                const data = res.data?.data || {};
                setLookups(data);
                if (companyId) {
                    await setMeta(companyId, 'offline_sync_enabled', Boolean(data.company?.offline_sync_enabled));
                }
            })
            .catch(async (err) => {
                if (cancelled) return;
                if (!isOnline() && companyId) {
                    try {
                        const enabled = await getMeta(companyId, 'offline_sync_enabled', false);
                        const cached = await loadCachedLookups(companyId);
                        if (enabled && cached.customers?.length) {
                            setLookups({ customers: cached.customers, base_currency: cached.base_currency });
                            toast.message('Working offline — using cached customers. Line-item returns need a connection; enter an amount instead.');
                            return;
                        }
                    } catch {
                        /* fall through */
                    }
                }
                toast.error(err?.response?.data?.message || 'Failed to load form options');
            })
            .finally(() => {
                if (!cancelled) setLoadingLookups(false);
            });
        return () => {
            cancelled = true;
        };
    }, [companyId]);

    useEffect(() => {
        if (creditNote) {
            const mapped = mapCreditNoteToForm(creditNote);
            setForm({
                customer_id: mapped.customer_id,
                invoice_id: mapped.invoice_id,
                credit_note_date: mapped.credit_note_date,
                amount: mapped.amount,
                reason: mapped.reason,
            });
            if (creditNote.lines?.length) {
                setLines(creditNote.lines.map(lineFromCreditNoteApi));
                setShowLines(true);
            }
        }
    }, [creditNote]);

    const loadInvoices = useCallback(
        async(customerId, includeInvoiceId) => {
            if (!customerId) {
                setInvoices([]);
                return;
            }
            setLoadingInvoices(true);
            try {
                const params = includeInvoiceId ? { include_invoice_id: includeInvoiceId } : {};
                const res = await creditNotesApi.customerOpenInvoices(customerId, params);
                setInvoices(res.data?.data?.invoices || []);
            } catch {
                // Offline: no cached open-invoices lookup yet — amount-only credit
                // notes (no invoice link) still work, so this isn't a hard failure.
                if (isOnline()) toast.error('Failed to load invoices');
                setInvoices([]);
            } finally {
                setLoadingInvoices(false);
            }
        }, []
    );

    useEffect(() => {
        if (form.customer_id) {
            loadInvoices(form.customer_id, form.invoice_id || undefined);
        } else {
            setInvoices([]);
        }
    }, [form.customer_id, form.invoice_id, loadInvoices]);

    useEffect(() => {
        if (!form.invoice_id || financialLocked) {
            setReturnableInvoiceLineCount(0);
            return;
        }
        let cancelled = false;
        setLoadingLines(true);
        setReturnableInvoiceLineCount(0);
        const params = isEdit && creditNote?.id ? { exclude_credit_note: creditNote.id } : {};
        creditNotesApi
            .invoiceLines(form.invoice_id, params)
            .then((res) => {
                if (cancelled) return;
                const invLines = res.data?.data?.lines || [];
                setReturnableInvoiceLineCount(invLines.length);
                if (invLines.length) {
                    setLines(
                        invLines.map((l) => ({
                            ...lineFromInvoiceApi(l),
                            _orig_unit_price: l.unit_price,
                        }))
                    );
                } else {
                    setLines([{...EMPTY_CREDIT_NOTE_LINE }]);
                }
            })
            .catch(() => {
                if (!cancelled) toast.error('Failed to load invoice lines');
            })
            .finally(() => {
                if (!cancelled) setLoadingLines(false);
            });
        return () => {
            cancelled = true;
        };
    }, [form.invoice_id, isEdit, creditNote?.id, financialLocked]);

    const openReturnedItemsFromInvoice = useCallback(() => {
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

    const setCustomer = useCallback((customerId, createdCustomer) => {
        mergeCustomerIntoLookups(setLookups, createdCustomer);
        setForm((f) => ({
            ...EMPTY_CREDIT_NOTE_FORM,
            credit_note_date: f.credit_note_date,
            customer_id: customerId,
        }));
        setLines([{...EMPTY_CREDIT_NOTE_LINE }]);
        setShowLines(false);
        if (customerId) loadInvoices(customerId);
    }, [loadInvoices]);

    const updateLine = useCallback((index, patch) => {
        setLines((prev) => prev.map((line, i) => (i === index ? {...line, ...patch } : line)));
    }, []);

    const addLine = useCallback(() => {
        setLines((prev) => [...prev, {...EMPTY_CREDIT_NOTE_LINE }]);
        setShowLines(true);
    }, []);

    const removeLine = useCallback((index) => {
        setLines((prev) => {
            const next = prev.filter((_, i) => i !== index);
            return next.length ? next : [{...EMPTY_CREDIT_NOTE_LINE }];
        });
    }, []);

    const handleSubmit = useCallback(
        async(e) => {
            e?.preventDefault?.();
            if (saving) return;
            const nextErrors = {};
            if (!form.customer_id) nextErrors.customer_id = 'Customer is required';
            if (!form.credit_note_date) nextErrors.credit_note_date = 'Date is required';
            if (!showLines) {
                if (!form.amount || Number(form.amount) <= 0) {
                    nextErrors.amount = 'Credit amount must be greater than 0';
                }
            } else if (lineTotals.total <= 0) {
                nextErrors.lines = 'Add at least one credit line with a total greater than 0';
            }
            if (Object.keys(nextErrors).length) {
                setErrors(nextErrors);
                toast.error('Please fix the highlighted fields');
                return;
            }

            setSaving(true);
            try {
                const payload = buildCreditNotePayload(form, showLines ? lines : []);

                // Offline: only the amount+reason path (no invoice-line returns —
                // that needs a live open-invoices/invoice-lines lookup this app
                // doesn't cache). Mirrors the offline-bill pattern in useBillForm.
                if (!isEdit && companyId && !isOnline() && !showLines) {
                    const offlineSyncEnabled = Boolean(
                        await getMeta(companyId, 'offline_sync_enabled', false),
                    );
                    if (offlineSyncEnabled) {
                        const { saveDocumentDraft } = await import('@/offline/documents-repository');
                        const customer = (customers || []).find(
                            (c) => String(c.id) === String(payload.customer_id),
                        );
                        const queued = await saveDocumentDraft({
                            companyId,
                            entity: 'credit_note',
                            op: 'create',
                            payload: {
                                ...payload,
                                customer_name: customer?.name || null,
                                customer_email: customer?.email || null,
                            },
                            offlineSyncEnabled: true,
                            forceOffline: true,
                        });
                        toast.success('Credit note saved offline — will sync when you reconnect');
                        onSuccess?.(queued.data);
                        return;
                    }
                }
                if (!isEdit && !isOnline() && showLines) {
                    toast.error(
                        'Line-item returns need a connection. Reconnect, or enter a credit amount instead.',
                    );
                    return;
                }

                const res = isEdit ?
                    await creditNotesApi.update(creditNote.id, payload) :
                    await creditNotesApi.create(payload);
                const saved = res.data?.data;
                toast.success(res.data?.message || (isEdit ? 'Credit note updated' : 'Credit note created'));
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
                toast.error(data?.message || 'Failed to save credit note');
            } finally {
                setSaving(false);
            }
        }, [form, lines, showLines, isEdit, creditNote, onSuccess, saving, lineTotals, companyId, customers]
    );

    return {
        form,
        lines,
        errors,
        saving,
        loadingLookups,
        loadingInvoices,
        loadingLines,
        lookups,
        customers,
        invoices,
        baseCurrency,
        lineTotals,
        showLines,
        setShowLines,
        returnableInvoiceLineCount,
        openReturnedItemsFromInvoice,
        financialLocked,
        isEdit,
        canCreateCustomer: lookups?.can_create_customer,
        onFieldChange: setField,
        onCustomerChange: setCustomer,
        onUpdateLine: updateLine,
        onAddLine: addLine,
        onRemoveLine: removeLine,
        handleSubmit,
    };
}