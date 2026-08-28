export const JOB_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const JOB_TYPES = [
  { value: 'sales', label: 'Sales' },
  { value: 'production', label: 'Production' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'internal', label: 'Internal' },
];

export const JOB_PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export const STATUS_COLORS = {
  draft: 'text-muted-foreground border-border bg-muted/50',
  scheduled: 'text-sky-700 border-sky-200 bg-sky-50',
  in_progress: 'text-primary border-primary/20 bg-primary/5',
  on_hold: 'text-amber-700 border-amber-200 bg-amber-50',
  completed: 'text-emerald-700 border-emerald-200 bg-emerald-50',
  cancelled: 'text-destructive border-destructive/20 bg-destructive/5',
};

export const PRIORITY_COLORS = {
  low: 'text-muted-foreground border-border bg-muted/50',
  normal: 'text-foreground border-border bg-background',
  high: 'text-amber-700 border-amber-200 bg-amber-50',
  urgent: 'text-destructive border-destructive/20 bg-destructive/5',
};

/** Job type value for asset maintenance jobs (fixed asset required). */
export const CREATE_MAINTENANCE_JOB_TYPE = 'maintenance';

/** Manual create: profitability / project-style jobs (stored as internal). */
export const CREATE_JOB_TYPES = [
  { value: 'internal', label: 'Job (profitability tracking)' },
];

export const CREATE_JOB_TYPE_META = {
  internal: {
    value: 'internal',
    label: 'Project job',
    shortLabel: 'Project',
    description:
      'Track income, costs, and profit for customer work or internal projects. Link invoices, bills, and journal entries from the job page.',
    createTitle: 'New project job',
    createSubtitle:
      'Set up a job to track revenue, expenses, and margin. You can link invoices, bills, and costs after saving.',
    listFilter: 'internal',
  },
  maintenance: {
    value: 'maintenance',
    label: 'Maintenance job',
    shortLabel: 'Maintenance',
    description:
      'Schedule repair or servicing for a fixed asset. Costs are tracked against the asset and job for maintenance reporting.',
    createTitle: 'Schedule maintenance',
    createSubtitle:
      'Create a maintenance job for a fixed asset. Select the asset below and assign work before saving.',
    listFilter: 'maintenance',
  },
};

export function getCreateJobTypeMeta(jobType) {
  if (jobType === CREATE_MAINTENANCE_JOB_TYPE) {
    return CREATE_JOB_TYPE_META.maintenance;
  }
  return CREATE_JOB_TYPE_META.internal;
}

export const CREATE_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const EMPTY_JOB_FORM = {
  title: '',
  job_type: 'internal',
  status: 'scheduled',
  priority: 'normal',
  customer_id: '',
  vendor_id: '',
  fixed_asset_id: '',
  assigned_to: '',
  start_date: '',
  due_date: '',
  end_date: '',
  notes: '',
  estimated_revenue: '',
  estimated_cost: '',
  job_metadata_custom_fields: {},
  job_number: '',
  job_sequence: '',
};

/** "JO-26-0012" / "JOB-00012" -> "12" for the editable sequence field. */
export function extractJobSequence(jobNumber) {
  const match = String(jobNumber || '').match(/(\d+)\s*$/);
  if (!match) return '';
  return String(parseInt(match[1], 10));
}

/** Current year suffix for JO-YY-#### previews. */
export function jobNumberYearSuffix(date = new Date()) {
  let y;
  if (date instanceof Date) {
    y = date.getFullYear();
  } else if (typeof date === 'string' && date.trim() !== '') {
    const parsed = new Date(date.includes('T') ? date : `${date}T12:00:00`);
    y = Number.isNaN(parsed.getTime()) ? new Date().getFullYear() : parsed.getFullYear();
  } else if (typeof date === 'number' && Number.isFinite(date)) {
    y = date > 1000 ? date : 2000 + (date % 100);
  } else {
    y = new Date().getFullYear();
  }
  return String(y % 100).padStart(2, '0');
}

/** Prefix shown beside the sequence input, e.g. "JO-26-". */
export function jobNumberPrefixLabel(date) {
  return `JO-${jobNumberYearSuffix(date)}-`;
}

/** "12" -> "JO-26-0012" — mirrors resolveManualJobNumber() on the backend. */
export function formatJobSequencePreview(sequence, date = new Date()) {
  const n = Math.max(1, parseInt(sequence, 10) || 1);
  return `${jobNumberPrefixLabel(date)}${String(n).padStart(4, '0')}`;
}

export function mapJobToForm(job) {
  return {
    title: job?.title || '',
    job_type: job?.job_type || 'internal',
    status: job?.status || 'scheduled',
    priority: job?.priority || 'normal',
    customer_id: job?.customer_id ? String(job.customer_id) : '',
    vendor_id: job?.vendor_id ? String(job.vendor_id) : '',
    fixed_asset_id: job?.fixed_asset_id ? String(job.fixed_asset_id) : '',
    assigned_to: job?.assigned_to ? String(job.assigned_to) : '',
    start_date: job?.start_date || (job?.started_at ? String(job.started_at).slice(0, 10) : ''),
    due_date: job?.due_date || '',
    end_date: job?.end_date || (job?.completed_at ? String(job.completed_at).slice(0, 10) : ''),
    notes: job?.notes || '',
    job_metadata_custom_fields: normalizeMetadataMap(job?.job_metadata_custom_fields),
    estimated_revenue:
      job?.estimated_revenue != null && job?.estimated_revenue !== ''
        ? String(job.estimated_revenue)
        : '',
    estimated_cost:
      job?.estimated_cost != null && job?.estimated_cost !== ''
        ? String(job.estimated_cost)
        : '',
    job_number: job?.job_number || '',
    job_sequence: extractJobSequence(job?.job_number),
  };
}

export function applyJobFormFromFixedAssetPreview(data) {
  const form = data?.form || data || {};
  return {
    title: form.title || '',
    job_type: form.job_type || 'maintenance',
    status: form.status || 'scheduled',
    priority: form.priority || 'normal',
    fixed_asset_id: form.fixed_asset_id ? String(form.fixed_asset_id) : '',
    notes: form.notes || '',
    _conversionSource: data?.source || form.source || null,
  };
}

function normalizeMetadataMap(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const out = {};
  Object.entries(raw).forEach(([k, v]) => {
    if (v === null || v === undefined) return;
    out[String(k)] = String(v);
  });
  return out;
}

export function buildJobOrderPayload(form) {
  const metadata = form.job_metadata_custom_fields || {};
  const job_metadata_custom_fields = {};
  Object.entries(metadata).forEach(([id, val]) => {
    if (val === null || val === undefined || val === '') return;
    job_metadata_custom_fields[id] = String(val);
  });

  const payload = {
    title: form.title?.trim() || null,
    job_type: form.job_type || 'internal',
    status: form.status || 'scheduled',
    priority: form.priority || 'normal',
    customer_id: form.customer_id ? parseInt(form.customer_id, 10) : null,
    vendor_id: form.vendor_id ? parseInt(form.vendor_id, 10) : null,
    fixed_asset_id: form.fixed_asset_id ? parseInt(form.fixed_asset_id, 10) : null,
    assigned_to: form.assigned_to ? parseInt(form.assigned_to, 10) : null,
    start_date: form.start_date || null,
    due_date: form.due_date || null,
    end_date: form.end_date || null,
    notes: form.notes?.trim() || null,
    job_metadata_custom_fields,
    estimated_revenue:
      form.estimated_revenue !== '' && form.estimated_revenue != null
        ? parseFloat(form.estimated_revenue)
        : null,
    estimated_cost:
      form.estimated_cost !== '' && form.estimated_cost != null
        ? parseFloat(form.estimated_cost)
        : null,
    // Blank/unset means "auto-assign the next number" on create, or "keep the
    // current number" on edit — see resolveManualJobNumber() on the backend.
    job_sequence:
      form.job_sequence !== '' && form.job_sequence != null
        ? parseInt(form.job_sequence, 10)
        : null,
  };

  if (payload.job_type === 'internal') {
    payload.fixed_asset_id = null;
  }
  if (payload.job_type === 'maintenance') {
    payload.customer_id = payload.customer_id ?? null;
  }

  return payload;
}

export function formatStatus(status) {
  if (!status) return '—';
  return JOB_STATUSES.find((s) => s.value === status)?.label || status;
}

export function formatJobType(type) {
  if (!type) return '—';
  return JOB_TYPES.find((t) => t.value === type)?.label || type;
}

export function formatPriority(priority) {
  if (!priority) return '—';
  return JOB_PRIORITIES.find((p) => p.value === priority)?.label || priority;
}
