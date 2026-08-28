import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { billPaymentsApi } from '../api/bill-payments.api';
import {
  EMPTY_BILL_PAYMENT_FORM,
  amountPaidFromRows,
  applyBillPrefill,
  billRowFromApi,
  buildBillPaymentPayload,
  buildBillRowsForEdit,
  calcBillPaymentTotals,
  defaultCashForBillRow,
  distributeCashToBillRows,
  mapBillPaymentToForm,
  prefillForBill,
  resolveBillPaymentPrefillMap,
} from '../constants';

export function useBillPaymentForm({
  mode = 'create',
  payment: paymentProp = null,
  editPaymentId = null,
  onSuccess,
  preselectBillId,
  preselectVendorId,
  preselectJobOrderId,
}) {
  const isEdit = mode === 'edit';
  const [payment, setPayment] = useState(paymentProp);
  const [form, setForm] = useState({
    ...EMPTY_BILL_PAYMENT_FORM,
    job_order_id: preselectJobOrderId ? String(preselectJobOrderId) : '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [loadingContext, setLoadingContext] = useState(isEdit);
  const [lookups, setLookups] = useState(null);
  const [rows, setRows] = useState([]);
  const [vendorCredits, setVendorCredits] = useState([]);
  const [openingBalanceInfo, setOpeningBalanceInfo] = useState(null);
  const [unappliedPayments, setUnappliedPayments] = useState([]);
  const editContextLoadedRef = useRef(null);
  const editHydratedRef = useRef(false);

  const vendors = lookups?.vendors || [];
  const depositAccounts = lookups?.deposit_accounts || [];
  const groupedAccounts = lookups?.grouped_accounts || [];
  const paymentMethods = lookups?.payment_methods || [];
  const baseCurrency = lookups?.base_currency || 'USD';
  const multiCurrency = lookups?.multi_currency_enabled === true;

  const totals = useMemo(
    () => calcBillPaymentTotals(rows, form.amount, form.opening_balance_amount),
    [rows, form.amount, form.opening_balance_amount],
  );

  const totalOpenBalance = useMemo(
    () => rows.reduce((sum, r) => sum + (Number(r.balance_due) || 0), 0),
    [rows],
  );

  useEffect(() => {
    if (paymentProp) setPayment(paymentProp);
  }, [paymentProp]);

  useEffect(() => {
    editContextLoadedRef.current = null;
    editHydratedRef.current = false;
  }, [editPaymentId, isEdit]);

  useEffect(() => {
    let cancelled = false;
    setLoadingLookups(true);
    billPaymentsApi
      .formOptions()
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.data || {};
        setLookups(data);
        if (!isEdit) {
          setForm((f) => ({
            ...f,
            currency: data.base_currency || 'USD',
            vendor_id: preselectVendorId ? String(preselectVendorId) : f.vendor_id,
          }));
        }
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err?.response?.data?.message || 'Failed to load form options');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingLookups(false);
      });
    return () => {
      cancelled = true;
    };
  }, [preselectVendorId, preselectJobOrderId, isEdit]);

  const applyContext = useCallback((ctx, prefillBillId, prefillCash, prefillMap = {}, options = {}) => {
    const vendorName = ctx?.vendor?.name || '';
    const billRows = (ctx?.bills || []).map((bill) => {
      let row = billRowFromApi(bill, vendorName);
      const pf = prefillForBill(bill, prefillMap);
      if (pf) {
        row = applyBillPrefill(row, {
          cash: pf.cash,
          vc_id: pf.vc_id,
          vc_amount: pf.vc_amount,
        });
      } else if (prefillBillId && String(bill.id) === String(prefillBillId)) {
        row = applyBillPrefill(row, {
          cash: prefillCash ?? bill.balance_due,
        });
      }
      return row;
    });

    setRows(billRows);

    const obInfo = ctx?.opening_balance || null;
    setOpeningBalanceInfo(obInfo);
    // Edit context includes `applied` = what THIS payment already allocated to the
    // opening balance; prefill it just like bill cash rows are prefilled above.
    const obPrefillAmount = Number(obInfo?.applied) || 0;
    if (obPrefillAmount > 0) {
      setForm((f) => ({ ...f, opening_balance_amount: String(obPrefillAmount) }));
    }

    const syncedAmount = amountPaidFromRows(billRows, obPrefillAmount);
    if (syncedAmount) {
      setForm((f) => ({ ...f, amount: syncedAmount }));
    } else if (!options.preserveAmount && options.fallbackAmount != null) {
      const fallback = String(options.fallbackAmount);
      if (fallback && Number(fallback) > 0) {
        setForm((f) => ({ ...f, amount: f.amount || fallback }));
      }
    }
    setVendorCredits(ctx?.vendor_credits || []);
    setUnappliedPayments(ctx?.unapplied_payments || []);
    if (ctx?.vendor?.currency) {
      setForm((f) => ({ ...f, currency: ctx.vendor.currency || f.currency }));
    }
  }, []);

  const loadVendorContext = useCallback(
    async (vendorId, billId, prefillCash, options = {}) => {
      if (!vendorId) {
        setRows([]);
        setVendorCredits([]);
        setOpeningBalanceInfo(null);
        setUnappliedPayments([]);
        return;
      }
      if (!options.silent) setLoadingContext(true);
      try {
        const res = await billPaymentsApi.vendorContext(vendorId);
        applyContext(res.data?.data || {}, billId, prefillCash, {}, {
          preserveAmount: options.preserveAmount,
        });
      } catch {
        toast.error('Failed to load open bills for vendor');
      } finally {
        if (!options.silent) setLoadingContext(false);
      }
    },
    [applyContext],
  );

  const loadEditContext = useCallback(async () => {
    const id = editPaymentId || payment?.id;
    if (!id) return;

    setLoadingContext(true);
    try {
      const [showRes, editRes] = await Promise.all([
        billPaymentsApi.show(id),
        billPaymentsApi.editContext(id).catch(() => null),
      ]);

      const paymentData = showRes.data?.data || null;
      if (!paymentData) {
        throw new Error('Payment not found');
      }

      const editData = editRes?.data?.data || {};
      let bills = editData?.allocation?.bills || [];
      let vendorCreditsList = editData?.allocation?.vendor_credits || [];
      let obInfo = editData?.allocation?.opening_balance || null;
      let unappliedList = editData?.allocation?.unapplied_payments || [];

      if (!bills.length && paymentData.vendor_id) {
        const vendorRes = await billPaymentsApi.vendorContext(paymentData.vendor_id);
        const vendorData = vendorRes.data?.data || {};
        bills = vendorData.bills || [];
        vendorCreditsList = vendorData.vendor_credits || vendorCreditsList;
        obInfo = obInfo ?? vendorData.opening_balance ?? null;
        if (!unappliedList.length) {
          unappliedList = vendorData.unapplied_payments || [];
        }
      }

      const prefillMap = resolveBillPaymentPrefillMap(
        paymentData,
        editData?.allocation?.prefill,
        bills,
      );

      // `applied` = what THIS payment already allocated to the vendor's opening
      // balance — prefill it the same way bill cash rows are prefilled.
      const obPrefillAmount = Number(obInfo?.applied) || 0;

      const billRows = buildBillRowsForEdit(bills, paymentData, prefillMap);
      const syncedAmount = amountPaidFromRows(billRows, obPrefillAmount);

      setPayment(paymentData);
      setForm({
        ...mapBillPaymentToForm(paymentData, baseCurrency),
        opening_balance_amount: obPrefillAmount > 0 ? String(obPrefillAmount) : '',
        amount: syncedAmount || String(paymentData.amount ?? ''),
      });
      setRows(billRows);
      setVendorCredits(vendorCreditsList);
      setOpeningBalanceInfo(obInfo);
      setUnappliedPayments(unappliedList);
      editHydratedRef.current = true;
    } catch (err) {
      toast.error(
        err?.response?.data?.message || err?.message || 'Failed to load bill payment for editing',
      );
    } finally {
      setLoadingContext(false);
    }
  }, [editPaymentId, payment?.id, baseCurrency]);

  useEffect(() => {
    if (loadingLookups || !isEdit) return;

    const id = editPaymentId || payment?.id;
    if (!id) return;

    const key = String(id);
    if (editContextLoadedRef.current === key) return;
    editContextLoadedRef.current = key;
    loadEditContext();
  }, [isEdit, editPaymentId, payment?.id, loadingLookups, loadEditContext]);

  useEffect(() => {
    if (loadingLookups || isEdit || !form.vendor_id) return;
    loadVendorContext(form.vendor_id, preselectBillId);
  }, [isEdit, loadingLookups, form.vendor_id, preselectBillId, loadVendorContext]);

  const setField = useCallback((key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  }, []);

  const onVendorChange = useCallback(
    (vendorId, createdVendor) => {
      if (createdVendor?.id && !vendors.some((v) => String(v.id) === String(createdVendor.id))) {
        setLookups((prev) =>
          prev
            ? {
                ...prev,
                vendors: [
                  ...prev.vendors,
                  {
                    id: createdVendor.id,
                    name: createdVendor.name,
                    email: createdVendor.email,
                    currency: createdVendor.currency,
                  },
                ],
              }
            : prev,
        );
      }

      if (isEdit) {
        if (String(vendorId) === String(form.vendor_id)) return;
        if (loadingContext) return;
        setForm((f) => ({ ...f, vendor_id: vendorId, opening_balance_amount: '' }));
        editHydratedRef.current = false;
        if (vendorId) loadVendorContext(vendorId);
        else {
          setRows([]);
          setVendorCredits([]);
          setOpeningBalanceInfo(null);
          setUnappliedPayments([]);
        }
        return;
      }

      setForm((f) => ({
        ...EMPTY_BILL_PAYMENT_FORM,
        payment_date: f.payment_date,
        currency: f.currency,
        vendor_id: vendorId,
        job_order_id: preselectJobOrderId ? String(preselectJobOrderId) : '',
      }));
      setRows([]);
      setVendorCredits([]);
      setOpeningBalanceInfo(null);
      setUnappliedPayments([]);
      if (vendorId) loadVendorContext(vendorId, preselectBillId);
    },
    [vendors, preselectJobOrderId, preselectBillId, loadVendorContext, isEdit, form.vendor_id, loadingContext],
  );

  const syncAmountFromRows = useCallback((nextRows) => {
    setForm((f) => ({ ...f, amount: amountPaidFromRows(nextRows, f.opening_balance_amount) }));
  }, []);

  const toggleOpeningBalance = useCallback(
    (selected) => {
      const due = Number(openingBalanceInfo?.due) || 0;
      const nextAmount = selected && due > 0 ? String(Number(due.toFixed(2))) : '';
      setForm((f) => ({
        ...f,
        opening_balance_amount: nextAmount,
        amount: amountPaidFromRows(rows, nextAmount),
      }));
    },
    [openingBalanceInfo, rows],
  );

  const updateOpeningBalanceAmount = useCallback(
    (rawValue) => {
      setForm((f) => ({
        ...f,
        opening_balance_amount: rawValue,
        amount: amountPaidFromRows(rows, rawValue),
      }));
    },
    [rows],
  );

  const updateRow = useCallback(
    (index, patch) => {
      setRows((prev) => {
        const next = prev.map((row, i) => (i === index ? { ...row, ...patch } : row));
        syncAmountFromRows(next);
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
              vc_id: '',
              vc_amount: '',
            };
          }
          return {
            ...row,
            selected: true,
            cash: row.cash !== '' ? row.cash : defaultCashForBillRow(row),
          };
        });
        syncAmountFromRows(next);
        return next;
      });
    },
    [syncAmountFromRows],
  );

  const distributeCashToSelected = useCallback(() => {
    const amountPaid = Number(form.amount) || 0;
    if (amountPaid <= 0) {
      toast.error('Enter amount paid above, then auto-apply or type cash per bill.');
      return;
    }

    const outcome = distributeCashToBillRows(rows, amountPaid);
    let appliedAny = outcome.appliedAny;

    // Whatever's left after bills are covered goes toward the vendor's opening
    // balance instead of sitting unexplained — mirrors the customer receive-payment
    // auto-apply behavior.
    let allocated = 0;
    outcome.next.forEach((r) => {
      if (r.selected) allocated += Number(r.cash) || 0;
    });
    let obAmount = 0;
    const obDue = Number(openingBalanceInfo?.due) || 0;
    const remaining = Math.max(0, amountPaid - allocated);
    if (remaining > 0 && obDue > 0) {
      obAmount = Math.min(obDue, remaining);
      appliedAny = true;
    }

    if (!appliedAny) {
      toast.error(
        outcome.hasSelected
          ? 'Selected bills have no remaining cash balance to apply.'
          : 'No open bill balance available to apply cash to.',
      );
      return;
    }

    setRows(outcome.next);
    if (obAmount > 0) {
      setForm((f) => ({ ...f, opening_balance_amount: String(Number(obAmount.toFixed(2))) }));
      toast.success('Cash applied to bills and opening balance.');
    } else {
      toast.success('Cash applied to bills (oldest first).');
    }
  }, [form.amount, rows, openingBalanceInfo]);

  const fillRowCashMax = useCallback(
    (index) => {
      const row = rows[index];
      if (!row) return;

      let appliedElsewhere = Number(form.opening_balance_amount) || 0;
      rows.forEach((r, i) => {
        if (i === index || !r.selected) return;
        appliedElsewhere += (Number(r.cash) || 0) + (Number(r.discount) || 0) + (Number(r.vc_amount) || 0);
      });

      const paid = Number(form.amount) || 0;
      const due = Number(row.balance_due) || 0;
      const vc = Number(row.vc_amount) || 0;
      const discount = Number(row.discount) || 0;
      const room = Math.max(0, due - vc - discount);

      let maxCash = room;
      if (paid > 0) {
        maxCash = Math.min(room, Math.max(0, paid - appliedElsewhere));
      }

      updateRow(index, {
        selected: true,
        cash: maxCash > 0 ? String(Number(maxCash.toFixed(2))) : '',
      });
    },
    [rows, form.amount, updateRow],
  );

  const suggestCreditsToFirstRow = useCallback(() => {
    setRows((prev) => {
      if (!prev.length) return prev;
      const first = { ...prev[0], selected: true };
      let remaining = Number(first.balance_due) || 0;

      if (vendorCredits.length > 0 && remaining > 0) {
        const vc = vendorCredits[0];
        const amt = Math.min(remaining, Number(vc.remaining) || 0);
        if (amt > 0) {
          first.vc_id = String(vc.id);
          first.vc_amount = String(amt);
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
  }, [vendorCredits, form.amount, syncAmountFromRows]);

  const validate = useCallback(() => {
    const next = {};
    if (!form.vendor_id) next.vendor_id = 'Vendor is required';
    if (!form.payment_date) next.payment_date = 'Payment date is required';

    const amountPaid = Number(form.amount) || 0;
    const hasAllocation =
      rows.some(
        (r) =>
          r.selected &&
          ((Number(r.cash) || 0) > 0 || (Number(r.vc_amount) || 0) > 0),
      ) || (Number(form.opening_balance_amount) || 0) > 0;
    // Advance / on-account payments are valid: cash received with no bill yet.
    if (!hasAllocation && amountPaid <= 0) {
      next.allocations =
        'Enter amount paid for an advance, or apply cash / vendor credit to a bill (or opening balance)';
    }

    if (amountPaid > 0 && !form.payment_account_id) {
      next.payment_account_id = 'Pay-from account is required when cash amount is greater than zero';
    }

    if (totals.received > 0 && (totals.cashTotal ?? totals.cashApplied ?? 0) > totals.received + 0.001) {
      next.allocations = 'Applied amount is greater than amount paid. Reduce allocations before saving.';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }, [form, rows, totals]);

  const reloadAccountLookups = useCallback(async () => {
    const res = await billPaymentsApi.formOptions();
    const data = res.data?.data || {};
    setLookups((prev) => ({ ...prev, ...data }));
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e?.preventDefault?.();
      if (!validate()) {
        toast.error('Please fix the highlighted fields');
        return;
      }

      const paymentId = payment?.id || editPaymentId;
      if (isEdit && !paymentId) {
        toast.error('Payment not loaded');
        return;
      }

      setSaving(true);
      try {
        const payload = buildBillPaymentPayload(form, rows);
        const res = isEdit
          ? await billPaymentsApi.update(paymentId, payload)
          : await billPaymentsApi.create(payload);
        toast.success(
          res.data?.message || (isEdit ? 'Bill payment updated' : 'Bill payment recorded'),
        );
        onSuccess?.(res.data?.data);
      } catch (err) {
        const data = err?.response?.data;
        if (data?.errors) setErrors(data.errors);
        toast.error(
          data?.message || (isEdit ? 'Could not update bill payment' : 'Could not record bill payment'),
        );
      } finally {
        setSaving(false);
      }
    },
    [form, rows, validate, onSuccess, isEdit, payment?.id, editPaymentId],
  );

  const refreshAfterUnappliedApplied = useCallback(async () => {
    if (!form.vendor_id) return;
    await loadVendorContext(form.vendor_id, null, null, {
      silent: false,
      preserveAmount: true,
    });
  }, [form.vendor_id, loadVendorContext]);

  const unappliedCashAvailable = useMemo(
    () =>
      Math.round(
        (unappliedPayments || []).reduce(
          (sum, row) => sum + (Number(row.unapplied) || 0),
          0,
        ) * 100,
      ) / 100,
    [unappliedPayments],
  );

  return {
    form,
    errors,
    saving,
    loadingLookups,
    loadingContext,
    lookups,
    vendors,
    depositAccounts,
    groupedAccounts,
    paymentMethods,
    baseCurrency,
    multiCurrency,
    rows,
    vendorCredits,
    totals,
    totalOpenBalance,
    openingBalanceInfo,
    openingBalanceSelected: (Number(form.opening_balance_amount) || 0) > 0,
    unappliedPayments,
    unappliedCashAvailable,
    isEdit,
    canCreateCoa: lookups?.can_create_coa !== false,
    onAccountCreated: reloadAccountLookups,
    setField,
    onVendorChange,
    updateRow,
    onToggleRow: toggleRow,
    onToggleOpeningBalance: toggleOpeningBalance,
    onOpeningBalanceAmountChange: updateOpeningBalanceAmount,
    onDistributeCashToSelected: distributeCashToSelected,
    onFillRowCashMax: fillRowCashMax,
    onSuggestCreditsToFirstRow: suggestCreditsToFirstRow,
    onUnappliedApplied: refreshAfterUnappliedApplied,
    handleSubmit,
  };
}
