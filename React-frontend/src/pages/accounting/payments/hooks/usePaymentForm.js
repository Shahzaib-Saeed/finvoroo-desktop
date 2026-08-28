import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { mergeCustomerIntoLookups } from '@/lib/merge-customer-into-lookups';
import { paymentsApi } from '../api/payments.api';
import {
  EMPTY_PAYMENT_FORM,
  amountReceivedFromRows,
  applyPrefillToRow,
  buildPaymentPayload,
  calcAllocationTotals,
  defaultCashForRow,
  invoiceRowFromApi,
  mapPaymentToForm,
  moneyRound,
  normalizeAllocationRow,
} from '../constants';

export function usePaymentForm({ mode = 'create', payment, initialInvoice, onSuccess }) {
  const [searchParams] = useSearchParams();
  const presetJobOrderId = searchParams.get('job_order_id') || '';
  const isEdit = mode === 'edit';
  const [form, setForm] = useState({
    ...EMPTY_PAYMENT_FORM,
    job_order_id: !isEdit && !payment && presetJobOrderId ? presetJobOrderId : '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [loadingContext, setLoadingContext] = useState(false);
  const [lookups, setLookups] = useState(null);
  const [rows, setRows] = useState([]);
  const [creditNotes, setCreditNotes] = useState([]);
  const [overpaymentInvoices, setOverpaymentInvoices] = useState([]);
  const [unappliedPayments, setUnappliedPayments] = useState([]);
  const [paidInvoices, setPaidInvoices] = useState([]);
  const [openingBalanceInfo, setOpeningBalanceInfo] = useState(null);

  const customers = lookups?.customers || [];
  const depositAccounts = lookups?.deposit_accounts || [];
  const paymentMethods = lookups?.payment_methods || PAYMENT_METHODS_FALLBACK;
  const baseCurrency = lookups?.base_currency || 'USD';
  const multiCurrency = lookups?.multi_currency_enabled === true;

  const totals = useMemo(
    () => calcAllocationTotals(rows, form.amount, form.opening_balance_amount),
    [rows, form.amount, form.opening_balance_amount]
  );

  const totalOpenBalance = useMemo(
    () =>
      rows.reduce((sum, r) => sum + (Number(r.balance_due) || 0), 0) +
      (Number(openingBalanceInfo?.due) || 0),
    [rows, openingBalanceInfo]
  );

  useEffect(() => {
    let cancelled = false;
    setLoadingLookups(true);
    paymentsApi
      .formOptions()
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.data || {};
        setLookups(data);
        if (!isEdit && !payment) {
          setForm((f) => ({ ...f, currency: data.base_currency || 'USD' }));
        }
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err?.response?.data?.message || 'Failed to load payment form');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingLookups(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isEdit, payment]);

  useEffect(() => {
    if (payment) setForm(mapPaymentToForm(payment, baseCurrency));
  }, [payment, baseCurrency]);

  const applyContext = useCallback((ctx, prefill = {}, options = {}) => {
    const invoiceRows = (ctx?.invoices || []).map((inv) => {
      const row = invoiceRowFromApi(inv);
      return applyPrefillToRow(row, prefill[String(inv.id)]);
    });
    const preselectInvoiceId = options.preselectInvoiceId
      ? String(options.preselectInvoiceId)
      : '';
    const amountReceived = Number(options.amountReceived) || 0;
    const nextRows = invoiceRows.map((row) => {
      if (!preselectInvoiceId || String(row.invoice_id) !== preselectInvoiceId) {
        return row;
      }
      const cash = Math.min(Number(row.balance_due) || 0, amountReceived || Number(row.balance_due) || 0);
      return {
        ...row,
        selected: true,
        cash: cash > 0 ? String(cash) : '',
      };
    });

    const finalRows = nextRows.length ? nextRows : [];
    setRows(finalRows);

    const obInfo = ctx?.opening_balance || null;
    setOpeningBalanceInfo(obInfo);
    // Edit context includes `applied` = what THIS payment already allocated to the
    // opening balance; prefill it just like invoice cash rows are prefilled above.
    const obPrefillAmount = Number(obInfo?.applied) || 0;
    if (obPrefillAmount > 0) {
      setForm((f) => ({ ...f, opening_balance_amount: String(obPrefillAmount) }));
    }

    const syncedAmount = amountReceivedFromRows(finalRows, obPrefillAmount);
    if (syncedAmount) {
      setForm((f) => ({ ...f, amount: syncedAmount }));
    }
    setCreditNotes(ctx?.credit_notes || []);
    setOverpaymentInvoices(ctx?.overpayment_invoices || []);
    setUnappliedPayments(ctx?.unapplied_payments || []);
    setPaidInvoices(ctx?.paid_invoices || []);
    if (ctx?.customer?.currency) {
      setForm((f) => ({ ...f, currency: ctx.customer.currency || f.currency }));
    }
    if (ctx?.customer?.billing_address) {
      setForm((f) => ({ ...f, billing_address: ctx.customer.billing_address }));
    }
  }, []);

  const loadCustomerContext = useCallback(
    async (customerId, prefill = {}, options = {}) => {
      if (!customerId) {
        setRows([]);
        setCreditNotes([]);
        setOverpaymentInvoices([]);
        setUnappliedPayments([]);
        setPaidInvoices([]);
        setOpeningBalanceInfo(null);
        return;
      }
      setLoadingContext(true);
      try {
        const res = await paymentsApi.customerContext(customerId);
        applyContext(res.data?.data || {}, prefill, options);
      } catch {
        toast.error('Failed to load customer invoices');
      } finally {
        setLoadingContext(false);
      }
    },
    [applyContext]
  );

  const loadEditContext = useCallback(async () => {
    if (!payment?.id) return;
    setLoadingContext(true);
    try {
      const res = await paymentsApi.editContext(payment.id);
      const data = res.data?.data || {};
      if (data.payment) {
        setForm(mapPaymentToForm(data.payment, baseCurrency));
      }
      applyContext(
        {
          invoices: data.allocation?.invoices,
          credit_notes: data.allocation?.credit_notes,
          overpayment_invoices: data.allocation?.overpayment_invoices,
          unapplied_payments: data.allocation?.unapplied_payments,
          customer: data.payment?.customer,
          opening_balance: data.allocation?.opening_balance,
        },
        data.allocation?.prefill || {}
      );
    } catch {
      toast.error('Failed to load payment allocation');
    } finally {
      setLoadingContext(false);
    }
  }, [payment?.id, baseCurrency, applyContext]);

  useEffect(() => {
    if (isEdit && payment?.id) {
      loadEditContext();
    } else if (form.customer_id && !isEdit) {
      loadCustomerContext(form.customer_id);
    }
  }, [isEdit, payment?.id]);

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
    (customerId, createdCustomer, options = {}) => {
      mergeCustomerIntoLookups(setLookups, createdCustomer);
      setForm((f) => ({
        ...EMPTY_PAYMENT_FORM,
        payment_date: f.payment_date,
        currency: f.currency,
        customer_id: customerId,
        amount: options.amountReceived ? String(options.amountReceived) : '',
      }));
      setRows([]);
      setOpeningBalanceInfo(null);
      if (customerId) loadCustomerContext(customerId, {}, options);
    },
    [loadCustomerContext]
  );

  useEffect(() => {
    if (isEdit || !initialInvoice?.id || !lookups || form.customer_id) return;
    const customerId =
      initialInvoice.customer_id ||
      initialInvoice.customer?.id ||
      initialInvoice.customer?.value;
    if (!customerId) return;

    const balanceDue = Number(initialInvoice.balance_due) || 0;
    setCustomer(String(customerId), null, {
      preselectInvoiceId: String(initialInvoice.id),
      amountReceived: balanceDue,
    });
  }, [isEdit, initialInvoice, lookups, form.customer_id, setCustomer]);

  /**
   * Keep Amount received in sync with cash allocations, but preserve a larger
   * manually entered lump sum so leftover can stay as prepaid (Sage-style).
   */
  const syncAmountFromRows = useCallback((nextRows, prevRows = null) => {
    setForm((f) => {
      const nextCash = Number(amountReceivedFromRows(nextRows, f.opening_balance_amount)) || 0;
      const current = Number(f.amount) || 0;
      if (prevRows) {
        const prevCash = Number(amountReceivedFromRows(prevRows, f.opening_balance_amount)) || 0;
        // User typed a higher received amount than cash applied → keep prepaid headroom.
        if (current > prevCash + 0.001 && current > nextCash + 0.001) {
          return f;
        }
      }
      return {
        ...f,
        amount: nextCash > 0 ? String(moneyRound(nextCash)) : '',
      };
    });
  }, []);

  const updateRow = useCallback(
    (index, patch) => {
      setRows((prev) => {
        const next = prev.map((row, i) =>
          i === index ? normalizeAllocationRow(row, { ...patch, selected: true }) : row
        );
        syncAmountFromRows(next, prev);
        return next;
      });
    },
    [syncAmountFromRows],
  );

  const toggleRow = useCallback(
    (index, selected) => {
      setRows((prev) => {
        const next = prev.map((row, i) => {
          if (i !== index) return row;
          if (!selected) {
            return {
              ...row,
              selected: false,
              cash: '',
              discount: '',
              cn_id: '',
              cn_amt: '',
              src_id: '',
              src_amt: '',
            };
          }
          return normalizeAllocationRow(row, {
            selected: true,
            cash: row.cash !== '' ? row.cash : defaultCashForRow(row),
          });
        });
        syncAmountFromRows(next, prev);
        return next;
      });
    },
    [syncAmountFromRows],
  );

  const toggleAllRows = useCallback(
    (selected) => {
      setRows((prev) => {
        const next = prev.map((row) => {
          if (!selected) {
            return {
              ...row,
              selected: false,
              cash: '',
              discount: '',
              cn_id: '',
              cn_amt: '',
              src_id: '',
              src_amt: '',
            };
          }
          return normalizeAllocationRow(row, {
            selected: true,
            cash: defaultCashForRow(row),
          });
        });
        syncAmountFromRows(next, prev);
        return next;
      });
    },
    [syncAmountFromRows],
  );

  const refreshCustomerContext = useCallback(() => {
    if (form.customer_id) {
      loadCustomerContext(form.customer_id);
    }
  }, [form.customer_id, loadCustomerContext]);

  const reloadAccountLookups = useCallback(async () => {
    const res = await paymentsApi.formOptions();
    const data = res.data?.data || {};
    setLookups((prev) => ({ ...prev, ...data }));
  }, []);

  const distributeCashToSelected = useCallback(() => {
    const amountReceived = Number(form.amount) || 0;
    if (amountReceived <= 0) {
      toast.error('Enter amount received above, then auto-apply or type cash per invoice.');
      return;
    }

    const hasSelected = rows.some((r) => r.selected);
    let remaining = amountReceived;
    let appliedAny = false;

    const nextRows = rows.map((row) => {
      const shouldApply = hasSelected ? row.selected : remaining > 0;

      if (!shouldApply) {
        return hasSelected ? { ...row, cash: '' } : { ...row, selected: false, cash: '' };
      }

      const due = Number(row.balance_due) || 0;
      const cn = Number(row.cn_amt) || 0;
      const src = Number(row.src_amt) || 0;
      const discount = Number(row.discount) || 0;
      const room = Math.max(0, due - cn - src - discount);

      if (room <= 0) {
        return hasSelected
          ? { ...row, selected: true, cash: '' }
          : { ...row, selected: false, cash: '' };
      }

      const cash = Math.min(room, remaining);
      remaining -= cash;
      if (cash > 0) appliedAny = true;

      return {
        ...row,
        selected: true,
        cash: cash > 0 ? String(Number(cash.toFixed(2))) : '',
      };
    });

    // Whatever's left after invoices are covered goes toward the customer's
    // opening balance instead of sitting as unexplained "unapplied cash" — this is
    // the exact scenario reported: 80,000 received, 36,000 covers the invoice, the
    // remaining 44,000 should settle the opening balance, not float unapplied.
    let obAmount = 0;
    const obDue = Number(openingBalanceInfo?.due) || 0;
    if (remaining > 0 && obDue > 0) {
      obAmount = Math.min(obDue, remaining);
      remaining -= obAmount;
      appliedAny = true;
    }

    if (!appliedAny) {
      toast.error(
        hasSelected
          ? 'Selected invoices have no remaining cash balance to apply.'
          : 'No open invoice balance available to apply cash to.',
      );
      return;
    }

    setRows(nextRows);
    if (obAmount > 0) {
      setForm((f) => ({ ...f, opening_balance_amount: String(Number(obAmount.toFixed(2))) }));
      toast.success('Cash applied to invoices and opening balance.');
    } else {
      toast.success('Cash applied to invoices (oldest first).');
    }
  }, [form.amount, rows, openingBalanceInfo]);

  const toggleOpeningBalance = useCallback(
    (selected) => {
      const due = Number(openingBalanceInfo?.due) || 0;
      const nextAmount = selected && due > 0 ? String(Number(due.toFixed(2))) : '';
      setForm((f) => ({
        ...f,
        opening_balance_amount: nextAmount,
        amount: amountReceivedFromRows(rows, nextAmount),
      }));
    },
    [openingBalanceInfo, rows],
  );

  const updateOpeningBalanceAmount = useCallback(
    (rawValue) => {
      setForm((f) => ({
        ...f,
        opening_balance_amount: rawValue,
        amount: amountReceivedFromRows(rows, rawValue),
      }));
    },
    [rows],
  );

  const fillRowCashMax = useCallback(
    (index) => {
      const row = rows[index];
      if (!row) return;

      // Only cash consumes Amount received — discounts/credits do not.
      let cashElsewhere = Number(form.opening_balance_amount) || 0;
      rows.forEach((r, i) => {
        if (i === index || !r.selected) return;
        cashElsewhere += Number(r.cash) || 0;
      });

      const received = Number(form.amount) || 0;
      const due = Number(row.balance_due) || 0;
      const cn = Number(row.cn_amt) || 0;
      const src = Number(row.src_amt) || 0;
      const discount = Number(row.discount) || 0;
      const room = Math.max(0, due - cn - src - discount);

      let maxCash = room;
      if (received > 0) {
        maxCash = Math.min(room, Math.max(0, received - cashElsewhere));
      }

      updateRow(index, {
        selected: true,
        cash: maxCash > 0 ? String(moneyRound(maxCash)) : '',
      });
    },
    [rows, form.amount, form.opening_balance_amount, updateRow],
  );

  const suggestCreditsToFirstRow = useCallback(() => {
    setRows((prev) => {
      if (!prev.length) return prev;
      const first = { ...prev[0], selected: true };
      let remaining = Number(first.balance_due) || 0;

      if (overpaymentInvoices.length > 0 && remaining > 0) {
        const op = overpaymentInvoices[0];
        const amt = Math.min(remaining, Number(op.available) || 0);
        if (amt > 0) {
          first.src_id = String(op.id);
          first.src_amt = String(amt);
          remaining -= amt;
        }
      }

      if (creditNotes.length > 0 && remaining > 0) {
        const cn = creditNotes[0];
        const amt = Math.min(remaining, Number(cn.remaining) || 0);
        if (amt > 0) {
          first.cn_id = String(cn.id);
          first.cn_amt = String(amt);
          remaining -= amt;
        }
      }

      if (remaining > 0 && !first.cash) {
        first.cash = String(Math.min(remaining, Number(form.amount) || remaining));
      }

      const next = [first, ...prev.slice(1)];
      syncAmountFromRows(next);
      return next;
    });
  }, [creditNotes, overpaymentInvoices, form.amount, syncAmountFromRows]);

  const handleSubmit = useCallback(
    async (e) => {
      e?.preventDefault?.();
      const nextErrors = {};
      if (!form.customer_id) nextErrors.customer_id = 'Customer is required';
      if (!form.payment_date) nextErrors.payment_date = 'Date is required';
      if (Object.keys(nextErrors).length) {
        setErrors(nextErrors);
        toast.error('Please fix the highlighted fields');
        return;
      }

      setSaving(true);
      try {
        const payload = buildPaymentPayload(form, rows);
        const res = isEdit
          ? await paymentsApi.update(payment.id, payload)
          : await paymentsApi.create(payload);
        const saved = res.data?.data;
        toast.success(res.data?.message || (isEdit ? 'Payment updated' : 'Payment recorded'));
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
        toast.error(data?.message || 'Failed to save payment');
      } finally {
        setSaving(false);
      }
    },
    [form, rows, isEdit, payment, onSuccess]
  );

  return {
    form,
    errors,
    saving,
    loadingLookups,
    loadingContext,
    lookups,
    customers,
    depositAccounts,
    paymentMethods,
    baseCurrency,
    multiCurrency,
    rows,
    creditNotes,
    overpaymentInvoices,
    unappliedPayments,
    paidInvoices,
    openingBalanceInfo,
    openingBalanceSelected: (Number(form.opening_balance_amount) || 0) > 0,
    totals,
    totalOpenBalance,
    isEdit,
    canCreateCustomer: lookups?.can_create_customer,
    canCreateCoa: lookups?.can_create_coa !== false,
    onAccountCreated: reloadAccountLookups,
    onFieldChange: setField,
    onCustomerChange: setCustomer,
    onUpdateRow: updateRow,
    onToggleRow: toggleRow,
    onToggleAllRows: toggleAllRows,
    onDistributeCashToSelected: distributeCashToSelected,
    onFillRowCashMax: fillRowCashMax,
    onSuggestCreditsToFirstRow: suggestCreditsToFirstRow,
    onToggleOpeningBalance: toggleOpeningBalance,
    onOpeningBalanceAmountChange: updateOpeningBalanceAmount,
    refreshCustomerContext,
    handleSubmit,
  };
}

const PAYMENT_METHODS_FALLBACK = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
];
