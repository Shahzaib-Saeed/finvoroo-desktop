import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { recurringExpensesApi } from '../api/recurring-expenses.api';
import { vendorsApi } from '../../vendors/api/vendors.api';
import { billPaymentsApi } from '../../bill-payments/api/bill-payments.api';
import {
  EMPTY_RECURRING_FORM,
  buildRecurringPayload,
  formFromRecurring,
} from '../constants';

function validateForm(form, isEdit) {
  const errors = {};
  if (!form.name?.trim()) errors.name = 'Name is required';
  if (!form.expense_account_id) errors.expense_account_id = 'Expense account is required';
  if (!form.payment_account_id) errors.payment_account_id = 'Payment account is required';
  const amount = parseFloat(form.amount);
  if (!Number.isFinite(amount) || amount < 0.01) errors.amount = 'Amount must be at least 0.01';
  if (!form.frequency) errors.frequency = 'Frequency is required';
  if (!form.start_date) errors.start_date = 'Start date is required';
  if (isEdit && !form.next_run_date) errors.next_run_date = 'Next run date is required';
  return errors;
}

export function useRecurringExpenseForm({ mode, recurringId, onSuccess }) {
  const isEdit = mode === 'edit';
  const [form, setForm] = useState({ ...EMPTY_RECURRING_FORM });
  const [errors, setErrors] = useState({});
  const [expenseAccounts, setExpenseAccounts] = useState([]);
  const [paymentAccounts, setPaymentAccounts] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [saving, setSaving] = useState(false);

  const setField = useCallback((key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([vendorsApi.formOptions(), billPaymentsApi.formOptions()])
      .then(([vendorOptsRes, billPayRes]) => {
        if (cancelled) return;
        const expense = vendorOptsRes.data?.data?.expense_accounts ?? [];
        const payment = billPayRes.data?.data?.deposit_accounts ?? [];
        setExpenseAccounts(Array.isArray(expense) ? expense : []);
        setPaymentAccounts(Array.isArray(payment) ? payment : []);
        if (!isEdit) {
          setForm((f) => ({
            ...f,
            expense_account_id: expense[0]?.id ? String(expense[0].id) : '',
            payment_account_id: payment[0]?.id ? String(payment[0].id) : '',
          }));
        }
      })
      .catch(() => toast.error('Failed to load form options'))
      .finally(() => {
        if (!cancelled) setLoadingOptions(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isEdit]);

  useEffect(() => {
    if (!isEdit || !recurringId) return;
    let cancelled = false;
    setLoading(true);
    recurringExpensesApi
      .show(recurringId)
      .then((res) => {
        if (cancelled) return;
        const item = res.data?.data;
        if (item) setForm(formFromRecurring(item));
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err?.response?.data?.message || 'Failed to load recurring expense');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isEdit, recurringId]);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    const nextErrors = validateForm(form, isEdit);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    setSaving(true);
    try {
      const payload = buildRecurringPayload(form);
      const res = isEdit
        ? await recurringExpensesApi.update(recurringId, payload)
        : await recurringExpensesApi.create(payload);
      toast.success(res.data?.message || (isEdit ? 'Recurring expense updated' : 'Recurring expense created'));
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
      toast.error(data?.message || 'Could not save recurring expense');
    } finally {
      setSaving(false);
    }
  };

  return {
    form,
    setField,
    errors,
    expenseAccounts,
    paymentAccounts,
    loading,
    loadingOptions,
    saving,
    isEdit,
    handleSubmit,
  };
}
