import { useCallback, useEffect, useMemo, useState } from 'react';
import { Briefcase, Loader2 } from 'lucide-react';
import { jobOrdersApi } from '@/pages/accounting/job-orders/api/job-orders.api';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import { Label } from '@/components/ui/label';

function jobOption(job) {
  const num = job.job_number || `#${job.id}`;
  const title = job.title?.trim();
  const customer = job.customer?.name;
  const label = title ? `${num} — ${title}` : num;
  const keywords = [num, title, customer, job.job_type, job.status].filter(Boolean);

  return {
    value: String(job.id),
    label,
    keywords,
    job,
  };
}

export function JobOrderPickerSelect({
  value,
  onValueChange,
  customerId = '',
  label = 'Job order',
  hint,
  disabled = false,
  className,
  allowNone = true,
  error,
  requireCustomer = false,
}) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadedForCustomer, setLoadedForCustomer] = useState(null);

  const customerKey = customerId ? String(customerId) : '';

  const loadJobs = useCallback(() => {
    if (requireCustomer && !customerKey) {
      setJobs([]);
      setLoadedForCustomer(null);
      return;
    }
    setLoading(true);
    const params = { per_page: 100 };
    if (customerKey) {
      params.customer_id = customerKey;
    }
    jobOrdersApi
      .list(params)
      .then((res) => {
        const rows = res.data?.data ?? [];
        const list = Array.isArray(rows) ? rows : [];
        const filtered = customerKey
          ? list.filter(
              (j) =>
                !j.customer_id || String(j.customer_id) === customerKey,
            )
          : list;
        setJobs(filtered);
        setLoadedForCustomer(customerKey || '__all__');
      })
      .catch(() => {
        setJobs([]);
        setLoadedForCustomer(null);
      })
      .finally(() => setLoading(false));
  }, [customerKey, requireCustomer]);

  useEffect(() => {
    setLoadedForCustomer(null);
    setJobs([]);
  }, [customerKey]);

  // Keep the selected job visible even before the full list loads.
  useEffect(() => {
    if (!value) return;
    let cancelled = false;
    jobOrdersApi
      .show(value)
      .then((res) => {
        if (cancelled) return;
        const job = res.data?.data;
        if (!job?.id) return;
        setJobs((prev) => {
          if (prev.some((row) => String(row.id) === String(job.id))) return prev;
          return [job, ...prev];
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [value]);

  const options = useMemo(() => jobs.map(jobOption), [jobs]);

  const needsCustomer = requireCustomer && !customerKey;
  const defaultHint = needsCustomer
    ? 'Select a customer first — only that customer’s jobs can be linked.'
    : customerKey
      ? 'Only job orders for the selected customer are listed.'
      : null;
  const resolvedHint = hint === undefined ? defaultHint : hint;

  return (
    <div className={className}>
      {label ? (
        <Label className="text-sm flex items-center gap-1.5 mb-1.5">
          <Briefcase className="size-3.5 text-muted-foreground" />
          {label}
        </Label>
      ) : null}
      <SearchableCombobox
        value={value || ''}
        onValueChange={onValueChange}
        options={options}
        placeholder={
          needsCustomer
            ? 'Select a customer first'
            : loading
              ? 'Loading jobs…'
              : 'Link to a job (optional)'
        }
        searchPlaceholder="Search job number or title…"
        disabled={disabled || loading || needsCustomer}
        allowNone={allowNone}
        noneLabel="No job"
        onOpenChange={(open) => {
          if (open && !needsCustomer) loadJobs();
        }}
      />
      {resolvedHint ? (
        <p className="text-xs text-muted-foreground mt-1">{resolvedHint}</p>
      ) : null}
      {error ? <p className="text-xs text-destructive mt-1">{error}</p> : null}
      {loading && loadedForCustomer !== (customerKey || '__all__') ? (
        <p className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1">
          <Loader2 className="size-3 animate-spin" /> Loading jobs…
        </p>
      ) : null}
    </div>
  );
}
