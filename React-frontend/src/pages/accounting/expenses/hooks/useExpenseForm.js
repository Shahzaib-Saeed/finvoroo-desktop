import { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import {
  fetchJobOrderPreset,
  mapJobMetadataPreset,
} from '@/components/accounting/job-order-preset.lib';
import { isOnline } from '@/offline/connectivity';
import {
  cacheExpenseFormOptions,
  loadCachedExpenseFormOptions,
  toastOfflineLookups,
} from '@/offline/form-lookups';
import { expensesApi } from '../api/expenses.api';
import { vendorsApi } from '../../vendors/api/vendors.api';
import { billPaymentsApi } from '../../bill-payments/api/bill-payments.api';
import { transfersApi } from '../../transfers/api/transfers.api';
import { EMPTY_EXPENSE_FORM, buildExpenseFormData, formFromExpense } from '../constants';

function validateForm(form, customFieldDefinitions = []) {
  const errors = {};
  if (!form.expense_account_id) errors.expense_account_id = 'Expense account is required';
  if (!form.payment_account_id) errors.payment_account_id = 'Payment account is required';
  const amount = parseFloat(form.amount);
  if (!Number.isFinite(amount) || amount < 0.01) errors.amount = 'Amount must be at least 0.01';
  if (!form.expense_date) errors.expense_date = 'Date is required';
  customFieldDefinitions.forEach((def) => {
    if (!def.is_required) return;
    const val = form.expense_metadata_custom_fields?.[String(def.id)] ?? '';
    if (def.type === 'checkbox') {
      if (val !== '1' && val !== 1) {
        errors[`expense_metadata_custom_fields.${def.id}`] = `${def.label} is required`;
      }
      return;
    }
    if (!String(val).trim()) {
      errors[`expense_metadata_custom_fields.${def.id}`] = `${def.label} is required`;
    }
  });
  return errors;
}

export function useExpenseForm({ mode = 'create', expenseId, onSuccess }) {
  const isEdit = mode === 'edit';
  const { id: companyId } = useParams();
  const [searchParams] = useSearchParams();
  const presetJobOrderId = searchParams.get('job_order_id') || '';
  const [form, setForm] = useState({
    ...EMPTY_EXPENSE_FORM,
    job_order_id: !isEdit && presetJobOrderId ? presetJobOrderId : '',
  });
  const [errors, setErrors] = useState({});
  const [vendors, setVendors] = useState([]);
  const [expenseAccounts, setExpenseAccounts] = useState([]);
  const [paymentAccounts, setPaymentAccounts] = useState([]);
  const [currencies, setCurrencies] = useState(['USD']);
  const [multiCurrency, setMultiCurrency] = useState(false);
  const [customFieldDefinitions, setCustomFieldDefinitions] = useState([]);
  const [jobSource, setJobSource] = useState(null);
  const [loadingJobPreset, setLoadingJobPreset] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingExpense, setLoadingExpense] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [jobPresetJob, setJobPresetJob] = useState(null);

  const setField = useCallback((key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingOptions(true);
    Promise.all([
      vendorsApi.list({ per_page: 100, page: 1 }),
      vendorsApi.formOptions(),
      billPaymentsApi.formOptions(),
      transfersApi.formOptions(),
      expensesApi.formOptions(),
    ])
      .then(async ([vendorsRes, vendorOptsRes, billPayRes, transferRes, expenseOptsRes]) => {
        if (cancelled) return;
        const vendorItems = vendorsRes.data?.data ?? [];
        const vendorsList = Array.isArray(vendorItems) ? vendorItems : [];
        setVendors(vendorsList);
        const expense = vendorOptsRes.data?.data?.expense_accounts ?? [];
        setExpenseAccounts(Array.isArray(expense) ? expense : []);
        const payment = billPayRes.data?.data?.deposit_accounts ?? [];
        setPaymentAccounts(Array.isArray(payment) ? payment : []);
        const tData = transferRes.data?.data || {};
        setMultiCurrency(!!tData.multi_currency_enabled);
        const base = tData.base_currency || 'USD';
        const curList = tData.currencies?.length ? tData.currencies : [base];
        setCurrencies(curList);
        const defs = expenseOptsRes.data?.data?.custom_field_definitions ?? [];
        setCustomFieldDefinitions(Array.isArray(defs) ? defs : []);
        if (companyId) {
          await cacheExpenseFormOptions(companyId, {
            vendors: vendorsList,
            expenseAccounts: Array.isArray(expense) ? expense : [],
            paymentAccounts: Array.isArray(payment) ? payment : [],
            currencies: curList,
            baseCurrency: base,
            multiCurrency: !!tData.multi_currency_enabled,
            customFieldDefinitions: Array.isArray(defs) ? defs : [],
          });
        }
        if (!isEdit) {
          setForm((f) => ({
            ...f,
            currency: base,
            expense_account_id: expense[0]?.id ? String(expense[0].id) : '',
            payment_account_id: payment[0]?.id ? String(payment[0].id) : '',
          }));
        }
      })
      .catch(async () => {
        if (cancelled) return;
        try {
          const cached = await loadCachedExpenseFormOptions(companyId);
          if (cached && (cached.vendors?.length || cached.expenseAccounts?.length)) {
            setVendors(cached.vendors || []);
            setExpenseAccounts(cached.expenseAccounts || []);
            setPaymentAccounts(cached.paymentAccounts || []);
            setCurrencies(cached.currencies?.length ? cached.currencies : [cached.baseCurrency || 'USD']);
            setMultiCurrency(!!cached.multiCurrency);
            setCustomFieldDefinitions(cached.customFieldDefinitions || []);
            if (!isEdit) {
              setForm((f) => ({
                ...f,
                currency: cached.baseCurrency || f.currency || 'USD',
                expense_account_id:
                  f.expense_account_id ||
                  (cached.expenseAccounts?.[0]?.id ? String(cached.expenseAccounts[0].id) : ''),
                payment_account_id:
                  f.payment_account_id ||
                  (cached.paymentAccounts?.[0]?.id ? String(cached.paymentAccounts[0].id) : ''),
              }));
            }
            toastOfflineLookups('Working offline — using cached expense options');
            return;
          }
        } catch {
          /* fall through */
        }
        toast.error('Failed to load form options');
      })
      .finally(() => {
        if (!cancelled) setLoadingOptions(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isEdit, companyId]);

  useEffect(() => {
    if (!isEdit || !expenseId) return;
    let cancelled = false;
    setLoadingExpense(true);
    expensesApi
      .show(expenseId)
      .then((res) => {
        if (cancelled) return;
        const expense = res.data?.data;
        if (expense) setForm(formFromExpense(expense));
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err?.response?.data?.message || 'Failed to load expense');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingExpense(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isEdit, expenseId]);

  useEffect(() => {
    if (!presetJobOrderId || isEdit || loadingOptions) return;
    let cancelled = false;
    setLoadingJobPreset(true);
    fetchJobOrderPreset(presetJobOrderId)
      .then(({ job, source }) => {
        if (cancelled || !job) return;
        setJobSource(source);
        setJobPresetJob(job);
        setForm((f) => ({
          ...f,
          job_order_id: String(job.id),
          vendor_id: job.vendor_id ? String(job.vendor_id) : f.vendor_id,
          description:
            f.description || (job.title ? `Job: ${job.title}` : f.description),
        }));
      })
      .catch((err) => {
        if (!cancelled) {
          if (!isOnline()) {
            toast.message('Job order details need a connection — you can still save the expense offline');
          } else {
            toast.error(
              err?.response?.data?.message || 'Could not load job order for this expense',
            );
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingJobPreset(false);
      });
    return () => {
      cancelled = true;
    };
  }, [presetJobOrderId, isEdit, loadingOptions]);

  useEffect(() => {
    if (!jobPresetJob || isEdit) return;
    const expenseCustomPreset = mapJobMetadataPreset(
      jobPresetJob,
      customFieldDefinitions,
      'show_on_expense',
    );
    if (Object.keys(expenseCustomPreset).length === 0) return;
    setForm((f) => ({
      ...f,
      expense_metadata_custom_fields: {
        ...(f.expense_metadata_custom_fields || {}),
        ...expenseCustomPreset,
      },
    }));
  }, [jobPresetJob, customFieldDefinitions, isEdit]);

  const setMetadataField = useCallback((defId, value) => {
    setForm((f) => ({
      ...f,
      expense_metadata_custom_fields: {
        ...(f.expense_metadata_custom_fields || {}),
        [String(defId)]: value,
      },
    }));
    setErrors((e) => ({ ...e, [`expense_metadata_custom_fields.${defId}`]: undefined }));
  }, []);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    const nextErrors = validateForm(form, customFieldDefinitions);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    setSaving(true);
    try {
      if (!isEdit && companyId) {
        const { getMeta } = await import('@/offline/db');
        const { saveDocumentDraft } = await import('@/offline/documents-repository');
        const offlineSyncEnabled = Boolean(
          await getMeta(companyId, 'offline_sync_enabled', false),
        );
        if (offlineSyncEnabled && !isOnline()) {
          if (form.receipt) {
            toast.message('Receipt file will not sync offline — attach it after reconnecting');
          }
          const vendor = (vendors || []).find((v) => String(v.id) === String(form.vendor_id));
          const payload = {
            vendor_id: form.vendor_id ? Number(form.vendor_id) : null,
            vendor_name: vendor?.name || null,
            expense_account_id: Number(form.expense_account_id),
            payment_account_id: Number(form.payment_account_id),
            amount: Number(form.amount),
            currency: form.currency || undefined,
            expense_date: form.expense_date,
            reference: form.reference || undefined,
            description: form.description || undefined,
            job_order_id: form.job_order_id ? Number(form.job_order_id) : null,
            offline_sync: true,
          };
          const queued = await saveDocumentDraft({
            companyId,
            entity: 'expense',
            op: 'create',
            payload,
            offlineSyncEnabled: true,
            forceOffline: true,
          });
          toast.success('Expense saved offline — will sync (no GL post until approved online)');
          onSuccess?.(queued.data);
          return;
        }
      }
      const fd = buildExpenseFormData(form);
      const res = isEdit
        ? await expensesApi.update(expenseId, fd)
        : await expensesApi.create(fd);
      toast.success(res.data?.message || (isEdit ? 'Expense updated' : 'Expense recorded'));
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
      toast.error(data?.message || 'Could not save expense');
    } finally {
      setSaving(false);
    }
  };

  return {
    form,
    setField,
    errors,
    vendors,
    expenseAccounts,
    paymentAccounts,
    currencies,
    multiCurrency,
    loadingOptions: loadingOptions || loadingExpense || loadingJobPreset,
    saving,
    isEdit,
    handleSubmit,
    customFieldDefinitions,
    setMetadataField,
    jobSource,
  };
}
