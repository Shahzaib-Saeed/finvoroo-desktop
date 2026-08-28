import { jobOrdersApi } from '@/pages/accounting/job-orders/api/job-orders.api';

/** Build `source` payload for SourceDocumentBanner from a job order API record. */
export function buildJobOrderSource(job) {
  if (!job?.id) return null;
  return {
    source_type: 'job_order',
    source_id: Number(job.id),
    source_number: job.job_number || `JO-${job.id}`,
    party_name: job.customer?.name || job.vendor?.name || job.title || '',
    status: job.status,
    title: job.title,
  };
}

/** Fetch job order for create forms opened with ?job_order_id= */
export async function fetchJobOrderPreset(jobOrderId) {
  if (!jobOrderId) return { job: null, source: null };
  const res = await jobOrdersApi.show(jobOrderId);
  const job = res.data?.data || null;
  return {
    job,
    source: buildJobOrderSource(job),
  };
}

export const JOB_ORDER_PRESET_TARGET_LABELS = {
  invoice: 'invoice',
  bill: 'bill',
  expense: 'expense',
  journal: 'journal entry',
};

/** Map job metadata values onto definitions visible for a target screen. */
export function mapJobMetadataPreset(job, definitions = [], visibilityKey) {
  if (!job?.job_metadata_custom_fields) return {};
  const jobValues = job.job_metadata_custom_fields;
  const out = {};
  definitions.forEach((def) => {
    if (visibilityKey && !def[visibilityKey]) return;
    const val = jobValues[String(def.id)] ?? jobValues[def.id];
    if (val != null && val !== '') {
      out[String(def.id)] = String(val);
    }
  });
  return out;
}

/**
 * Merge invoice template custom fields (and optional reference) from a job-order preview patch
 * without overwriting unrelated form data the user already entered.
 */
export function applyJobFieldsToInvoiceForm(form, previewPatch = {}) {
  const templateCustom = previewPatch.template_custom || {};
  const metadataCustom = previewPatch.invoice_metadata_custom_fields || {};
  const hasTemplateCustom = Object.keys(templateCustom).length > 0;
  const hasMetadataCustom = Object.keys(metadataCustom).length > 0;
  const ref = String(form.reference_number || '').trim();

  return {
    ...form,
    job_order_id: previewPatch.job_order_id
      ? String(previewPatch.job_order_id)
      : form.job_order_id,
    template_custom: hasTemplateCustom
      ? { ...(form.template_custom || {}), ...templateCustom }
      : form.template_custom,
    invoice_metadata_custom_fields: hasMetadataCustom
      ? { ...(form.invoice_metadata_custom_fields || {}), ...metadataCustom }
      : form.invoice_metadata_custom_fields,
    reference_number: ref ? form.reference_number : (previewPatch.reference_number || form.reference_number),
  };
}

/** Merge bill/invoice template custom fields and metadata from a job-order preview patch. */
export function applyJobFieldsToBillForm(form, previewPatch = {}) {
  const templateCustom = previewPatch.template_custom || {};
  const metadataCustom = previewPatch.bill_metadata_custom_fields || {};
  const hasTemplateCustom = Object.keys(templateCustom).length > 0;
  const hasMetadataCustom = Object.keys(metadataCustom).length > 0;

  return {
    ...form,
    job_order_id: previewPatch.job_order_id
      ? String(previewPatch.job_order_id)
      : form.job_order_id,
    vendor_id: form.vendor_id || (previewPatch.vendor_id ? String(previewPatch.vendor_id) : ''),
    reference_number: form.reference_number || previewPatch.reference_number || form.reference_number,
    template_custom: hasTemplateCustom
      ? { ...(form.template_custom || {}), ...templateCustom }
      : form.template_custom,
    bill_metadata_custom_fields: hasMetadataCustom
      ? { ...(form.bill_metadata_custom_fields || {}), ...metadataCustom }
      : form.bill_metadata_custom_fields,
  };
}
