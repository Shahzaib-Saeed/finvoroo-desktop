import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { jobOrdersApi } from '../api/job-orders.api';

const DEFAULT_FILTERS = {
  from: '',
  to: '',
  customer_id: '',
  status: '',
  job_type: '',
  priority: '',
  assigned_to: '',
};

function filtersFromSearchParams(searchParams) {
  return {
    from: searchParams.get('from') || '',
    to: searchParams.get('to') || '',
    customer_id: searchParams.get('customer_id') || '',
    status: searchParams.get('status') || '',
    job_type: searchParams.get('job_type') || '',
    priority: searchParams.get('priority') || '',
    assigned_to: searchParams.get('assigned_to') || '',
  };
}

function buildQueryParams(filters) {
  const params = {};
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== '' && value != null) params[key] = value;
  });
  return params;
}

export function useJobOrderDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => filtersFromSearchParams(searchParams));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (nextFilters = filters) => {
    setLoading(true);
    try {
      const res = await jobOrdersApi.dashboard(buildQueryParams(nextFilters));
      setData(res.data?.data || null);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load job dashboard');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load(filters);
  }, [filters, load]);

  const applyFilters = useCallback((patch) => {
    setFilters((current) => {
      const next = { ...current, ...patch };
      const params = new URLSearchParams();
      Object.entries(next).forEach(([key, value]) => {
        if (value) params.set(key, String(value));
      });
      setSearchParams(params, { replace: true });
      return next;
    });
  }, [setSearchParams]);

  const resetFilters = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS });
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const stats = data?.stats || {};
  const filterOptions = data?.filter_options || {};

  const drillDownPath = useCallback(
    (base, drillDown = {}) => {
      const params = new URLSearchParams();
      if (drillDown.view === 'overdue') params.set('overdue', '1');
      if (drillDown.view === 'due_today') params.set('due_today', '1');
      if (drillDown.status) params.set('status', drillDown.status);
      if (drillDown.pipeline) params.set('status', '');
      const q = params.toString();
      return q ? `${base}?${q}#all-jobs` : `${base}#all-jobs`;
    },
    [],
  );

  return useMemo(
    () => ({
      data,
      loading,
      filters,
      stats,
      filterOptions,
      currency: data?.currency || 'USD',
      applyFilters,
      resetFilters,
      reload: () => load(filters),
      drillDownPath,
    }),
    [data, loading, filters, stats, filterOptions, applyFilters, resetFilters, load, drillDownPath],
  );
}
