import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { deliveryNotesApi } from '../api/delivery-notes.api';
import {
  EMPTY_DELIVERY_FORM,
  applyDeliveryNoteFromSalesOrderPreview,
  buildDeliveryNotePayload,
  mapDeliveryNoteToForm,
} from '../constants';

export function useDeliveryNoteForm({ mode = 'create', deliveryNote, salesOrderId, onSuccess }) {
  const isEdit = mode === 'edit';
  const [form, setForm] = useState(EMPTY_DELIVERY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [loadingSource, setLoadingSource] = useState(false);
  const [conversionSource, setConversionSource] = useState(null);
  const [warehouses, setWarehouses] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setLoadingLookups(true);
    deliveryNotesApi
      .formOptions()
      .then((res) => {
        if (cancelled) return;
        setWarehouses(res.data?.data?.warehouses || []);
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
  }, []);

  useEffect(() => {
    if (deliveryNote) {
      setForm(mapDeliveryNoteToForm(deliveryNote));
    }
  }, [deliveryNote]);

  useEffect(() => {
    if (!salesOrderId || isEdit || deliveryNote) return;
    let cancelled = false;
    setLoadingSource(true);
    deliveryNotesApi
      .fromSalesOrder(salesOrderId)
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.data || {};
        const mapped = applyDeliveryNoteFromSalesOrderPreview(data);
        setForm((f) => ({ ...f, ...mapped }));
        setConversionSource(mapped._conversionSource || data.source || null);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err?.response?.data?.message || 'Could not load sales order for delivery');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSource(false);
      });
    return () => {
      cancelled = true;
    };
  }, [salesOrderId, isEdit, deliveryNote]);

  const setField = useCallback((name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((e) => ({ ...e, [name]: undefined }));
  }, []);

  const setLine = useCallback((index, patch) => {
    setForm((f) => {
      const lines = [...(f.lines || [])];
      lines[index] = { ...lines[index], ...patch };
      return { ...f, lines };
    });
  }, []);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setSaving(true);
    setErrors({});
    try {
      const payload = buildDeliveryNotePayload(form);
      const res = isEdit
        ? await deliveryNotesApi.update(deliveryNote.id, payload)
        : await deliveryNotesApi.create(payload);
      toast.success(res.data?.message || (isEdit ? 'Delivery note updated' : 'Delivery note created'));
      onSuccess?.(res.data?.data);
    } catch (err) {
      const apiErrors = err?.response?.data?.errors || {};
      setErrors(apiErrors);
      toast.error(err?.response?.data?.message || 'Could not save delivery note');
    } finally {
      setSaving(false);
    }
  };

  return {
    form,
    setForm,
    setField,
    setLine,
    errors,
    saving,
    loadingLookups,
    loadingSource,
    conversionSource,
    warehouses,
    handleSubmit,
  };
}
