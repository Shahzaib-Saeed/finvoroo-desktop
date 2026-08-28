import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { toast } from 'sonner';
import { authService } from '@/auth/services/auth-service';
import {
  appendCustomFieldSelectOption,
  customFieldApiErrorMessage,
  mergeDefinitionInList,
  mergeDefinitionOptionsFromApi,
} from '@/components/accounting/custom-fields-lib';
import { jobOrderListOptionsApi } from '../api/job-order-list-options.api';
import { jobOrdersApi } from '../api/job-orders.api';
import {
  EMPTY_JOB_FORM,
  applyJobFormFromFixedAssetPreview,
  buildJobOrderPayload,
  mapJobToForm,
} from '../constants';
import {
  fallbackPriorityOptions,
  fallbackStatusOptions,
  mergeListOptionsFromApi,
  upsertListOption,
} from '../lib/job-order-list-options';

function applyFormOptionsData(data) {
  const statuses = Array.isArray(data.status_options) ? data.status_options : [];
  const priorities = Array.isArray(data.priority_options) ? data.priority_options : [];

  return {
    employees: Array.isArray(data.employees) ? data.employees : [],
    fixedAssets: Array.isArray(data.fixed_assets) ? data.fixed_assets : [],
    customers: Array.isArray(data.customers) ? data.customers : [],
    vendors: Array.isArray(data.vendors) ? data.vendors : [],
    customFieldDefinitions: Array.isArray(data.custom_field_definitions)
      ? data.custom_field_definitions
      : [],
    statusOptions: statuses.length ? statuses : fallbackStatusOptions(),
    priorityOptions: priorities.length ? priorities : fallbackPriorityOptions(),
  };
}

function attachmentUploadError(reason) {
  const response = reason?.response;
  const data = response?.data;
  const validationMessage = Array.isArray(data?.errors?.file)
    ? data.errors.file[0]
    : data?.errors?.file;

  if (response?.status === 404) {
    return 'The job-order attachment API is not available on the server. Deploy the backend routes and clear the Laravel route cache.';
  }

  return validationMessage || data?.message || reason?.message || 'The server rejected the attachment.';
}

function validateForm(form, isEdit, customFieldDefinitions = []) {
  const errors = {};
  if (!form.title?.trim()) errors.title = 'Title is required';
  if (form.job_type === 'maintenance' && !form.fixed_asset_id) {
    errors.fixed_asset_id = 'Select the asset being serviced';
  }
  if (!isEdit && !['maintenance', 'internal'].includes(form.job_type)) {
    errors.job_type = 'Choose maintenance or internal work';
  }
  if (form.start_date && form.end_date && form.end_date < form.start_date) {
    errors.end_date = 'End date cannot be before start date';
  }
  customFieldDefinitions.forEach((def) => {
    if (!def.is_required) return;
    const val = form.job_metadata_custom_fields?.[String(def.id)] ?? '';
    if (def.type === 'checkbox') {
      if (val !== '1' && val !== 1) {
        errors[`job_metadata_custom_fields.${def.id}`] = `${def.label} is required`;
      }
      return;
    }
    if (!String(val).trim()) {
      errors[`job_metadata_custom_fields.${def.id}`] = `${def.label} is required`;
    }
  });
  return errors;
}

export function useJobOrderForm({ mode = 'create', jobOrderId, fixedAssetId, initialJobType, onSuccess }) {
  const { id: workspaceCompanyId } = useParams();
  const isEdit = mode === 'edit';
  const [form, setForm] = useState({ ...EMPTY_JOB_FORM, job_type: initialJobType || 'internal' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingSource, setLoadingSource] = useState(false);
  const [conversionSource, setConversionSource] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [fixedAssets, setFixedAssets] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [customFieldDefinitions, setCustomFieldDefinitions] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);
  const [priorityOptions, setPriorityOptions] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [attachmentBusyId, setAttachmentBusyId] = useState(null);

  const loadFormOptions = useCallback(async ({ mergeListOptions = false } = {}) => {
    if (workspaceCompanyId) {
      authService.setCompanyId(workspaceCompanyId);
    }
    const [formRes, listRes] = await Promise.all([
      jobOrdersApi.formOptions(),
      jobOrderListOptionsApi.list(),
    ]);
    const next = applyFormOptionsData(formRes.data?.data || {});
    const listData = listRes.data?.data || {};
    const statuses = Array.isArray(listData.status_options) ? listData.status_options : [];
    const priorities = Array.isArray(listData.priority_options) ? listData.priority_options : [];
    next.statusOptions = statuses.length ? statuses : fallbackStatusOptions();
    next.priorityOptions = priorities.length ? priorities : fallbackPriorityOptions();

    setEmployees(next.employees);
    setFixedAssets(next.fixedAssets);
    setCustomers(next.customers);
    setVendors(next.vendors);
    setCustomFieldDefinitions((prev) =>
      mergeDefinitionOptionsFromApi(next.customFieldDefinitions, prev),
    );
    if (mergeListOptions) {
      setStatusOptions((prev) => mergeListOptionsFromApi(next.statusOptions, prev));
      setPriorityOptions((prev) => mergeListOptionsFromApi(next.priorityOptions, prev));
    } else {
      setStatusOptions(next.statusOptions);
      setPriorityOptions(next.priorityOptions);
    }
    return next;
  }, [workspaceCompanyId]);

  useEffect(() => {
    if (!workspaceCompanyId) return undefined;
    let cancelled = false;
    setLoadingOptions(true);
    loadFormOptions()
      .catch((err) => {
        if (!cancelled) {
          toast.error(err?.response?.data?.message || 'Failed to load form options');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingOptions(false);
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceCompanyId, loadFormOptions]);

  useEffect(() => {
    if (!isEdit || !jobOrderId) return;
    let cancelled = false;
    setLoading(true);
    Promise.allSettled([jobOrdersApi.show(jobOrderId), jobOrdersApi.attachments(jobOrderId)])
      .then(([jobResult, attachmentsResult]) => {
        if (cancelled) return;
        if (jobResult.status === 'rejected') {
          throw jobResult.reason;
        }
        const job = jobResult.value.data?.data;
        if (job) setForm(mapJobToForm(job));
        setAttachments(
          attachmentsResult.status === 'fulfilled'
            ? attachmentsResult.value.data?.data || []
            : job?.attachments || [],
        );
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err?.response?.data?.message || 'Failed to load job order');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isEdit, jobOrderId]);

  const addPendingFiles = useCallback((files) => {
    const incoming = Array.from(files || []);
    setPendingFiles((current) => {
      const remainingSlots = Math.max(0, 20 - attachments.length - current.length);
      const allowedExtensions = new Set([
        'pdf', 'jpg', 'jpeg', 'png', 'webp', 'gif',
        'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt',
      ]);
      const accepted = incoming
        .filter((file) => {
          const extension = file.name.split('.').pop()?.toLowerCase();
          return file.size <= 30 * 1024 * 1024 && allowedExtensions.has(extension);
        })
        .slice(0, remainingSlots);
      if (accepted.length !== incoming.length) {
        toast.error('Some files were not added. Use an accepted file type under 30 MB (20 files maximum).');
      }
      return [...current, ...accepted];
    });
  }, [attachments.length]);

  const removePendingFile = useCallback((index) => {
    setPendingFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
  }, []);

  const deleteAttachment = useCallback(async (attachmentId) => {
    if (!isEdit || !jobOrderId) return;
    setAttachmentBusyId(attachmentId);
    try {
      await jobOrdersApi.deleteAttachment(jobOrderId, attachmentId);
      setAttachments((current) => current.filter((item) => item.id !== attachmentId));
      toast.success('Attachment removed');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not remove attachment');
    } finally {
      setAttachmentBusyId(null);
    }
  }, [isEdit, jobOrderId]);

  const downloadAttachment = useCallback(async (attachment) => {
    if (!jobOrderId || !attachment?.id) return;
    setAttachmentBusyId(attachment.id);
    try {
      const res = await jobOrdersApi.downloadAttachment(jobOrderId, attachment.id);
      const url = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.original_name || 'attachment';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not download attachment');
    } finally {
      setAttachmentBusyId(null);
    }
  }, [jobOrderId]);

  useEffect(() => {
    if (!fixedAssetId || isEdit) return;
    let cancelled = false;
    setLoadingSource(true);
    jobOrdersApi
      .fromFixedAsset(fixedAssetId)
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.data || {};
        const mapped = applyJobFormFromFixedAssetPreview(data);
        setForm((f) => ({
          ...f,
          ...mapped,
          job_type: 'maintenance',
        }));
        setConversionSource(mapped._conversionSource || data.source || null);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err?.response?.data?.message || 'Could not load fixed asset for job');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSource(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fixedAssetId, isEdit]);

  const setField = useCallback((name, value) => {
    setForm((f) => {
      const next = { ...f, [name]: value };
      if (name === 'job_type') {
        if (value === 'internal') next.fixed_asset_id = '';
        if (value === 'maintenance') next.customer_id = '';
      }
      return next;
    });
    setErrors((e) => ({ ...e, [name]: undefined }));
  }, []);

  const setMetadataField = useCallback((defId, value) => {
    setForm((f) => ({
      ...f,
      job_metadata_custom_fields: {
        ...(f.job_metadata_custom_fields || {}),
        [String(defId)]: value,
      },
    }));
    setErrors((e) => ({ ...e, [`job_metadata_custom_fields.${defId}`]: undefined }));
  }, []);

  const reloadCustomFieldDefinitions = useCallback(async () => {
    const next = await loadFormOptions();
    return next.customFieldDefinitions;
  }, [loadFormOptions]);

  const onCustomerCreated = useCallback(
    (created) => {
      if (!created?.id) return;
      setCustomers((list) => {
        if (list.some((c) => String(c.id) === String(created.id))) {
          return list.map((c) =>
            String(c.id) === String(created.id)
              ? { ...c, name: created.name ?? c.name, email: created.email ?? c.email }
              : c,
          );
        }
        return [...list, { id: created.id, name: created.name, email: created.email }].sort(
          (a, b) => String(a.name).localeCompare(String(b.name)),
        );
      });
      setField('customer_id', String(created.id));
    },
    [setField],
  );

  const onVendorCreated = useCallback(
    (created) => {
      if (!created?.id) return;
      setVendors((list) => {
        if (list.some((v) => String(v.id) === String(created.id))) {
          return list.map((v) =>
            String(v.id) === String(created.id)
              ? { ...v, name: created.name ?? v.name, email: created.email ?? v.email }
              : v,
          );
        }
        return [...list, { id: created.id, name: created.name, email: created.email }].sort(
          (a, b) => String(a.name).localeCompare(String(b.name)),
        );
      });
      setField('vendor_id', String(created.id));
    },
    [setField],
  );

  const reloadListOptions = useCallback(async () => {
    await loadFormOptions({ mergeListOptions: true });
  }, [loadFormOptions]);

  const addMetadataSelectOption = useCallback(
    async (defId, optionLabel) => {
      const def = customFieldDefinitions.find((d) => String(d.id) === String(defId));
      if (!def) return false;
      try {
        const updated = await appendCustomFieldSelectOption(def, optionLabel);
        if (!updated) return false;
        setCustomFieldDefinitions((prev) => mergeDefinitionInList(prev, defId, updated));
        await loadFormOptions();
        return true;
      } catch (err) {
        toast.error(customFieldApiErrorMessage(err, 'Could not add option'));
        return false;
      }
    },
    [customFieldDefinitions, loadFormOptions],
  );

  const addListOption = useCallback(
    async (listType, optionLabel) => {
      const label = String(optionLabel || '').trim();
      if (!label) return null;
      try {
        const res = await jobOrderListOptionsApi.create({
          list_type: listType,
          label,
          is_active: true,
        });
        const created = res.data?.data ?? null;
        if (!created?.value) return null;

        if (listType === 'status') {
          setStatusOptions((prev) => upsertListOption(prev, created));
        } else {
          setPriorityOptions((prev) => upsertListOption(prev, created));
        }

        await reloadListOptions();
        return created;
      } catch (err) {
        toast.error(err?.response?.data?.message || err?.message || 'Could not add option');
        return null;
      }
    },
    [reloadListOptions],
  );

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    const nextErrors = validateForm(form, isEdit, customFieldDefinitions);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    setSaving(true);
    try {
      const payload = buildJobOrderPayload(form);
      const res = isEdit
        ? await jobOrdersApi.update(jobOrderId, payload)
        : await jobOrdersApi.create(payload);
      const savedJob = res.data?.data;
      const savedJobId = isEdit ? jobOrderId : savedJob?.id;
      let failedUploads = 0;
      if (savedJobId && pendingFiles.length) {
        const results = await Promise.allSettled(
          pendingFiles.map((file) => jobOrdersApi.uploadAttachment(savedJobId, file)),
        );
        const rejectedUploads = results.filter((result) => result.status === 'rejected');
        failedUploads = rejectedUploads.length;
        if (failedUploads) {
          toast.error(attachmentUploadError(rejectedUploads[0].reason));
        }
      }
      if (failedUploads) {
        toast.warning(
          `Job saved, but ${failedUploads} attachment${failedUploads === 1 ? '' : 's'} could not be uploaded.`,
        );
      } else {
        toast.success(res.data?.message || (isEdit ? 'Job updated' : 'Job created'));
      }
      onSuccess?.(savedJob);
    } catch (err) {
      const data = err?.response?.data;
      if (data?.errors) {
        const mapped = {};
        Object.entries(data.errors).forEach(([k, v]) => {
          mapped[k] = Array.isArray(v) ? v[0] : v;
        });
        setErrors(mapped);
      }
      toast.error(data?.message || 'Could not save job order');
    } finally {
      setSaving(false);
    }
  };

  return {
    form,
    setField,
    errors,
    saving,
    loading,
    loadingOptions,
    loadingSource,
    conversionSource,
    employees,
    fixedAssets,
    customers,
    vendors,
    onCustomerCreated,
    onVendorCreated,
    customFieldDefinitions,
    statusOptions,
    priorityOptions,
    attachments,
    pendingFiles,
    attachmentBusyId,
    addPendingFiles,
    removePendingFile,
    deleteAttachment,
    downloadAttachment,
    setMetadataField,
    addMetadataSelectOption,
    addListOption,
    reloadCustomFieldDefinitions,
    reloadListOptions,
    isEdit,
    handleSubmit,
  };
}
