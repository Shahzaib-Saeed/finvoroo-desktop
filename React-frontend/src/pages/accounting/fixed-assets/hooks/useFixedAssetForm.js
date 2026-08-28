import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { fixedAssetsApi } from '../api/fixed-assets.api';
import { billPaymentsApi } from '../../bill-payments/api/bill-payments.api';
import { vendorsApi } from '../../vendors/api/vendors.api';
import {
  EMPTY_FIXED_ASSET_FORM,
  buildFixedAssetPayload,
  formFromAsset,
} from '../constants';

function validateForm(form, { requirePayment } = {}) {
  const errors = {};
  if (!form.asset_name?.trim()) errors.asset_name = 'Asset name is required';
  if (!form.category) errors.category = 'Category is required';
  if (!form.purchase_date) errors.purchase_date = 'Purchase date is required';
  const cost = parseFloat(form.purchase_cost);
  if (!Number.isFinite(cost) || cost < 0) errors.purchase_cost = 'Valid purchase cost is required';
  const life = parseInt(form.useful_life_years, 10);
  if (!Number.isFinite(life) || life < 1 || life > 100) {
    errors.useful_life_years = 'Useful life must be between 1 and 100 years';
  }
  if (requirePayment && !form.payment_account_id) {
    errors.payment_account_id = 'Payment account is required';
  }
  return errors;
}

export function useFixedAssetForm({ mode, assetId, onSuccess }) {
  const isEdit = mode === 'edit';
  const [form, setForm] = useState({ ...EMPTY_FIXED_ASSET_FORM });
  const [errors, setErrors] = useState({});
  const [vendors, setVendors] = useState([]);
  const [depositAccounts, setDepositAccounts] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [saving, setSaving] = useState(false);

  const setField = useCallback((key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingOptions(true);
    Promise.all([
      vendorsApi.list({ per_page: 100, page: 1 }),
      billPaymentsApi.formOptions(),
    ])
      .then(([vendorsRes, optionsRes]) => {
        if (cancelled) return;
        const vendorItems = vendorsRes.data?.data ?? [];
        setVendors(Array.isArray(vendorItems) ? vendorItems : []);
        const accounts = optionsRes.data?.data?.deposit_accounts ?? [];
        setDepositAccounts(Array.isArray(accounts) ? accounts : []);
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load form options');
      })
      .finally(() => {
        if (!cancelled) setLoadingOptions(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isEdit || !assetId) return;
    let cancelled = false;
    setLoading(true);
    fixedAssetsApi
      .show(assetId)
      .then((res) => {
        if (cancelled) return;
        const asset = res.data?.data?.asset;
        if (asset) setForm(formFromAsset(asset));
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err?.response?.data?.message || 'Failed to load asset');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isEdit, assetId]);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    const nextErrors = validateForm(form, { requirePayment: !isEdit });
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    setSaving(true);
    try {
      const payload = buildFixedAssetPayload(form, { includePayment: !isEdit });
      const res = isEdit
        ? await fixedAssetsApi.update(assetId, payload)
        : await fixedAssetsApi.create(payload);
      toast.success(res.data?.message || (isEdit ? 'Asset updated' : 'Fixed asset created'));
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
      toast.error(data?.message || 'Could not save fixed asset');
    } finally {
      setSaving(false);
    }
  };

  return {
    form,
    setField,
    errors,
    vendors,
    depositAccounts,
    loading,
    loadingOptions,
    saving,
    isEdit,
    handleSubmit,
  };
}
