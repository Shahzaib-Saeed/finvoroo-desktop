import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import {
  Search, X, ChevronLeft, ChevronRight, ChevronDown,
  Briefcase, RefreshCw, CheckCircle2, AlertTriangle,
  SlidersHorizontal, RotateCcw, Columns3,
} from 'lucide-react';
import { toast } from 'sonner';
import { jobOrdersApi } from '../api/job-orders.api';
import { jobOrderListOptionsApi } from '../api/job-order-list-options.api';
import { JOB_TYPES } from '../constants';
import { fallbackPriorityOptions, fallbackStatusOptions } from '../lib/job-order-list-options';
import { summaryFromKpis } from '../lib/job-order-list.lib';
import {
  JobOrderPremiumCard,
  JobOrderPremiumCardSkeleton,
} from './JobOrderPremiumCard';
import { JobCardLayoutDialog } from './JobCardLayoutDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/ui/date-picker';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const DATE_FIELD_LABELS = {
  due_date: 'Due date',
  created_at: 'Created date',
  started_at: 'Start date',
  completed_at: 'Completed date',
};

/** Labeled field used inside the "More filters" panel so every control is aligned. */
function FilterField({ label, children }) {
  return (
    <div className="space-y-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      {children}
    </div>
  );
}

function StatusMultiSelect({ options, value, onValueChange }) {
  const selected = Array.isArray(value) ? value : [];
  const allSelected = selected.length === 0;
  const selectedLabels = options
    .filter((option) => selected.includes(option.value))
    .map((option) => option.label);
  const triggerLabel = allSelected
    ? 'All statuses'
    : selectedLabels.length === 1
      ? selectedLabels[0]
      : `${selectedLabels.length} statuses`;

  const toggle = (statusValue, checked) => {
    const allValues = options.map((option) => option.value);
    const current = allSelected ? allValues : selected;
    let next = checked
      ? Array.from(new Set([...current, statusValue]))
      : current.filter((item) => item !== statusValue);

    // Keep at least one status visible. Selecting every option is normalized
    // back to [] — the compact "All statuses" representation.
    if (next.length === 0) return;
    if (next.length === allValues.length) next = [];
    onValueChange(next);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            'h-9 w-40 justify-between rounded-md px-3 text-sm font-normal',
            !allSelected && 'border-primary/40 bg-primary/5 text-primary',
          )}
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronDown className="ml-2 size-3.5 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <div className="border-b px-3 py-2.5">
          <p className="text-xs font-semibold text-slate-800">Filter by status</p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Select the statuses you want to display.
          </p>
        </div>
        <div className="max-h-64 overflow-y-auto p-1.5">
          <label
            className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm font-medium hover:bg-slate-50"
          >
            <Checkbox checked={allSelected} onCheckedChange={() => onValueChange([])} />
            <span className="flex-1">All statuses</span>
            <span className="text-[10px] text-slate-400">{options.length}</span>
          </label>
          <div className="my-1 border-t border-slate-100" />
          {options.map((option) => {
            const checked = allSelected || selected.includes(option.value);
            return (
              <label
                key={option.value}
                className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm hover:bg-slate-50"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(next) => toggle(option.value, next === true)}
                />
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
              </label>
            );
          })}
        </div>
        {!allSelected ? (
          <div className="flex items-center justify-between border-t bg-slate-50/60 px-3 py-2">
            <span className="text-[11px] font-medium text-slate-500">
              {selected.length} selected
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => onValueChange([])}
            >
              Show all
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

const SUMMARY_META = {
  total: {
    label: 'Total Jobs',
    hint: 'All created system items',
    icon: Briefcase,
    tone: 'bg-gradient-to-br from-slate-50 to-slate-100',
    iconTone: 'bg-white/80 text-slate-600 shadow-sm',
    textTone: 'text-slate-900',
  },
  inProgress: {
    label: 'In Progress',
    hint: 'Active operations',
    icon: RefreshCw,
    tone: 'bg-gradient-to-br from-blue-50 to-blue-100',
    iconTone: 'bg-white/80 text-blue-600 shadow-sm',
    textTone: 'text-blue-900',
  },
  completed: {
    label: 'Completed',
    hint: 'Successfully closed',
    icon: CheckCircle2,
    tone: 'bg-gradient-to-br from-emerald-50 to-emerald-100',
    iconTone: 'bg-white/80 text-emerald-600 shadow-sm',
    textTone: 'text-emerald-900',
  },
  overdue: {
    label: 'Overdue',
    hint: 'Requires immediate action',
    icon: AlertTriangle,
    tone: 'bg-gradient-to-br from-rose-50 to-rose-100',
    iconTone: 'bg-white/80 text-rose-600 shadow-sm',
    textTone: 'text-rose-900',
  },
};

function JobListSummaryStrip({ summary, loading }) {
  const entries = [
    { key: 'total', value: summary.total },
    { key: 'inProgress', value: summary.inProgress },
    { key: 'completed', value: summary.completed },
    { key: 'overdue', value: summary.overdue },
  ];

  return (
    <div className="mb-6 grid w-full grid-cols-2 gap-5 sm:grid-cols-4">
      {entries.map(({ key, value }) => {
        const meta = SUMMARY_META[key];
        const Icon = meta.icon;
        return (
          <Card key={key} className="h-full border-0 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
            <CardContent
              className={cn(
                'flex flex-col justify-between h-full p-0',
                meta.tone,
              )}
            >
              <div
                className={cn(
                  'flex size-10 items-center justify-center rounded-xl ms-5 mt-5',
                  meta.iconTone,
                )}
              >
                <Icon className="size-5" strokeWidth={2} />
              </div>
              <div className="flex flex-col gap-1 pb-5 px-5">
                <span
                  className={cn(
                    'text-2xl font-semibold text-mono tabular-nums',
                    meta.textTone,
                  )}
                >
                  {loading ? '—' : value}
                </span>
                <span className="text-sm font-medium text-foreground/80">
                  {meta.label}
                </span>
                <span className="text-xs text-muted-foreground">{meta.hint}</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function JobOrdersListTable({
  sectionId = 'all-jobs',
  className,
  onView,
  onEdit,
  onDelete,
  refreshSignal,
  summaryKpis = [],
}) {
  const [searchParams] = useSearchParams();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 50,
    total: 0,
    lastPage: 1,
  });
  const [searchInput, setSearchInput] = useState('');
  const initialJobType = searchParams.get('job_type');
  const initialStatus = searchParams.get('status');
  const initialStatuses =
    initialStatus && initialStatus !== 'all'
      ? initialStatus.split(',').map((item) => item.trim()).filter(Boolean)
      : [];
  const initialCustomerId = searchParams.get('customer_id');
  const initialVendorId = searchParams.get('vendor_id');
  const initialAssignedTo = searchParams.get('assigned_to');
  const initialOverdue = searchParams.get('overdue') === '1';
  const initialDueToday = searchParams.get('due_today') === '1';
  const [filters, setFilters] = useState({
    search: '',
    statuses: initialStatuses,
    job_type: initialJobType && initialJobType !== 'all' ? initialJobType : 'all',
    priority: 'all',
    customer_id: initialCustomerId && initialCustomerId !== 'all' ? initialCustomerId : 'all',
    vendor_id: initialVendorId && initialVendorId !== 'all' ? initialVendorId : 'all',
    assigned_to: initialAssignedTo && initialAssignedTo !== 'all' ? initialAssignedTo : 'all',
    fixed_asset_id: 'all',
    date_field: 'due_date',
    date_from: '',
    date_to: '',
    overdue: initialOverdue,
    due_today: initialDueToday,
  });
  const [moreOpen, setMoreOpen] = useState(
    Boolean(
      (initialCustomerId && initialCustomerId !== 'all') ||
        (initialVendorId && initialVendorId !== 'all') ||
        (initialAssignedTo && initialAssignedTo !== 'all'),
    ),
  );
  const [statusOptions, setStatusOptions] = useState([]);
  const [priorityOptions, setPriorityOptions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [fixedAssets, setFixedAssets] = useState([]);
  const [customFieldDefinitions, setCustomFieldDefinitions] = useState([]);
  const [layoutOpen, setLayoutOpen] = useState(false);

  useEffect(() => {
    jobOrderListOptionsApi
      .list()
      .then((res) => {
        const data = res.data?.data || {};
        const statuses = Array.isArray(data.status_options) ? data.status_options : [];
        const priorities = Array.isArray(data.priority_options) ? data.priority_options : [];
        setStatusOptions(statuses.length ? statuses : fallbackStatusOptions());
        setPriorityOptions(priorities.length ? priorities : fallbackPriorityOptions());
      })
      .catch(() => {});

    jobOrdersApi
      .formOptions()
      .then((res) => {
        const data = res.data?.data || {};
        const defs = data.custom_field_definitions;
        setCustomers(Array.isArray(data.customers) ? data.customers : []);
        setVendors(Array.isArray(data.vendors) ? data.vendors : []);
        setEmployees(Array.isArray(data.employees) ? data.employees : []);
        setFixedAssets(Array.isArray(data.fixed_assets) ? data.fixed_assets : []);
        if (Array.isArray(defs) && defs.length) {
          setCustomFieldDefinitions(defs);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const status = searchParams.get('status');
    const jobType = searchParams.get('job_type');
    const customerId = searchParams.get('customer_id');
    const vendorId = searchParams.get('vendor_id');
    const assignedTo = searchParams.get('assigned_to');
    const overdue = searchParams.get('overdue') === '1';
    const dueToday = searchParams.get('due_today') === '1';
    setFilters((current) => ({
      ...current,
      statuses:
        status && status !== 'all'
          ? status.split(',').map((item) => item.trim()).filter(Boolean)
          : [],
      job_type: jobType && jobType !== 'all' ? jobType : 'all',
      customer_id: customerId && customerId !== 'all' ? customerId : 'all',
      vendor_id: vendorId && vendorId !== 'all' ? vendorId : 'all',
      assigned_to: assignedTo && assignedTo !== 'all' ? assignedTo : 'all',
      overdue,
      due_today: dueToday,
    }));
    setPagination((p) => ({ ...p, page: 1 }));
  }, [searchParams]);

  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchInput.trim() }));
      setPagination((p) => ({ ...p, page: 1 }));
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, per_page: pagination.perPage };
      if (filters.search) params.search = filters.search;
      if (filters.statuses.length) params.statuses = filters.statuses;
      if (filters.job_type && filters.job_type !== 'all') params.job_type = filters.job_type;
      if (filters.priority && filters.priority !== 'all') params.priority = filters.priority;
      if (filters.customer_id && filters.customer_id !== 'all') params.customer_id = filters.customer_id;
      if (filters.vendor_id && filters.vendor_id !== 'all') params.vendor_id = filters.vendor_id;
      if (filters.assigned_to && filters.assigned_to !== 'all') params.assigned_to = filters.assigned_to;
      if (filters.fixed_asset_id && filters.fixed_asset_id !== 'all') {
        params.fixed_asset_id = filters.fixed_asset_id;
      }
      if (filters.date_from || filters.date_to) params.date_field = filters.date_field;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      if (filters.overdue) params.overdue = 1;
      if (filters.due_today) params.due_today = 1;
      const res = await jobOrdersApi.list(params);
      const items = res.data?.data ?? [];
      const meta = res.data?.meta ?? {};
      const defs = meta.custom_field_definitions;
      if (Array.isArray(defs) && defs.length) {
        setCustomFieldDefinitions(defs);
      }
      setRows(Array.isArray(items) ? items : []);
      setPagination((p) => ({
        ...p,
        total: meta.total ?? items.length,
        lastPage: meta.last_page ?? 1,
      }));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load job orders');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.perPage, filters]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows, refreshSignal]);

  const resetFilters = () => {
    setFilters({
      search: '',
      statuses: [],
      job_type: 'all',
      priority: 'all',
      customer_id: 'all',
      vendor_id: 'all',
      assigned_to: 'all',
      fixed_asset_id: 'all',
      date_field: 'due_date',
      date_from: '',
      date_to: '',
      overdue: false,
      due_today: false,
    });
    setSearchInput('');
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const nameOf = (list, id) => {
    const found = list.find((item) => String(item.id) === String(id));
    return found?.name || found?.asset_name || `#${id}`;
  };

  const applyFilter = (patch) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const selectedStatusLabels = filters.statuses.map(
    (value) => statusOptions.find((s) => s.value === value)?.label || value,
  );

  // One chip per active filter so the user always sees (and can undo)
  // exactly what is narrowing the list.
  const activeFilterChips = [
    filters.statuses.length > 0 && {
      key: 'status',
      label: `Statuses: ${selectedStatusLabels.slice(0, 2).join(', ')}${
        selectedStatusLabels.length > 2 ? ` +${selectedStatusLabels.length - 2}` : ''
      }`,
      clear: () => applyFilter({ statuses: [] }),
    },
    filters.job_type !== 'all' && {
      key: 'job_type',
      label: `Type: ${JOB_TYPES.find((t) => t.value === filters.job_type)?.label || filters.job_type}`,
      clear: () => applyFilter({ job_type: 'all' }),
    },
    filters.priority !== 'all' && {
      key: 'priority',
      label: `Priority: ${priorityOptions.find((p) => p.value === filters.priority)?.label || filters.priority}`,
      clear: () => applyFilter({ priority: 'all' }),
    },
    filters.customer_id !== 'all' && {
      key: 'customer',
      label: `Customer: ${nameOf(customers, filters.customer_id)}`,
      clear: () => applyFilter({ customer_id: 'all' }),
    },
    filters.vendor_id !== 'all' && {
      key: 'vendor',
      label: `Vendor: ${nameOf(vendors, filters.vendor_id)}`,
      clear: () => applyFilter({ vendor_id: 'all' }),
    },
    filters.assigned_to !== 'all' && {
      key: 'assignee',
      label: `Assignee: ${nameOf(employees, filters.assigned_to)}`,
      clear: () => applyFilter({ assigned_to: 'all' }),
    },
    filters.fixed_asset_id !== 'all' && {
      key: 'asset',
      label: `Asset: ${nameOf(fixedAssets, filters.fixed_asset_id)}`,
      clear: () => applyFilter({ fixed_asset_id: 'all' }),
    },
    (filters.date_from || filters.date_to) && {
      key: 'dates',
      label: `${DATE_FIELD_LABELS[filters.date_field] || 'Date'}: ${filters.date_from || '…'} → ${filters.date_to || '…'}`,
      clear: () => applyFilter({ date_from: '', date_to: '' }),
    },
    filters.overdue && {
      key: 'overdue',
      label: 'Overdue',
      clear: () => applyFilter({ overdue: false }),
    },
    filters.due_today && {
      key: 'due_today',
      label: 'Due today',
      clear: () => applyFilter({ due_today: false }),
    },
  ].filter(Boolean);

  const advancedCount = activeFilterChips.filter((c) =>
    ['customer', 'vendor', 'assignee', 'asset', 'dates', 'overdue', 'due_today'].includes(c.key),
  ).length;

  const summary = useMemo(
    () => summaryFromKpis(summaryKpis, pagination.total),
    [summaryKpis, pagination.total],
  );

  return (
    <section id={sectionId} className={cn('scroll-mt-6 space-y-4', className)}>
      <JobListSummaryStrip summary={summary} loading={loading && rows.length === 0} />

      <Card className="overflow-hidden rounded-lg border border-[#E2E8F0] bg-white shadow-none">
        {/* Sticky search + filters */}
        <div className="sticky top-0 z-20 border-b border-[#E2E8F0] bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90">
          <div className="space-y-3 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-[#0F172A]">All jobs</h2>
              <div className="flex items-center gap-3">
                {!loading && pagination.total > 0 ? (
                  <span className="text-xs tabular-nums text-[#64748B]">
                    {pagination.total} job{pagination.total === 1 ? '' : 's'}
                  </span>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 px-2 text-xs text-slate-500 hover:text-slate-700"
                  onClick={() => setLayoutOpen(true)}
                  title="Choose which column each custom field appears in"
                >
                  <Columns3 className="size-3.5" />
                  Card layout
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[#94A3B8]" />
                <Input
                  placeholder="Search job #, title, customer, vendor, assignee or asset…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="h-9 rounded-md border-[#E2E8F0] pl-9 pr-9 text-sm"
                />
                {searchInput ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 size-9"
                    onClick={() => setSearchInput('')}
                  >
                    <X className="size-4" />
                  </Button>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <StatusMultiSelect
                  options={statusOptions}
                  value={filters.statuses}
                  onValueChange={(statuses) => applyFilter({ statuses })}
                />
                <Select
                  value={filters.job_type}
                  onValueChange={(v) => {
                    setFilters((f) => ({ ...f, job_type: v }));
                    setPagination((p) => ({ ...p, page: 1 }));
                  }}
                >
                  <SelectTrigger className="h-9 w-32 rounded-md text-sm">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {JOB_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={filters.priority}
                  onValueChange={(v) => {
                    setFilters((f) => ({ ...f, priority: v }));
                    setPagination((p) => ({ ...p, page: 1 }));
                  }}
                >
                  <SelectTrigger className="h-9 w-32 rounded-md text-sm">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All priority</SelectItem>
                    {priorityOptions.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn(
                    'h-9 gap-1.5 rounded-md border-[#E2E8F0] px-3 text-sm font-medium',
                    (moreOpen || advancedCount > 0) && 'border-primary/40 bg-primary/5 text-primary',
                  )}
                  onClick={() => setMoreOpen((v) => !v)}
                >
                  <SlidersHorizontal className="size-4" />
                  More filters
                  {advancedCount > 0 ? (
                    <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {advancedCount}
                    </span>
                  ) : (
                    <ChevronDown
                      className={cn('size-3.5 transition-transform', moreOpen && 'rotate-180')}
                    />
                  )}
                </Button>
                {activeFilterChips.length > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 gap-1.5 px-2.5 text-sm text-slate-500 hover:text-slate-700"
                    onClick={resetFilters}
                  >
                    <RotateCcw className="size-3.5" />
                    Reset
                  </Button>
                ) : null}
              </div>
            </div>

            {moreOpen ? (
              <div className="rounded-lg border border-slate-200/80 bg-slate-50/60 p-3.5">
                <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
                  <FilterField label="Customer">
                    <SearchableCombobox
                      value={filters.customer_id === 'all' ? '' : filters.customer_id}
                      onValueChange={(v) => applyFilter({ customer_id: v || 'all' })}
                      options={customers.map((c) => ({
                        value: String(c.id),
                        label: c.name,
                        keywords: [c.email],
                      }))}
                      allowNone
                      noneLabel="All customers"
                      placeholder="All customers"
                      searchPlaceholder="Search customers…"
                      triggerClassName="h-9 w-full rounded-md bg-white text-sm"
                    />
                  </FilterField>
                  <FilterField label="Vendor">
                    <SearchableCombobox
                      value={filters.vendor_id === 'all' ? '' : filters.vendor_id}
                      onValueChange={(v) => applyFilter({ vendor_id: v || 'all' })}
                      options={vendors.map((v) => ({
                        value: String(v.id),
                        label: v.name,
                        keywords: [v.email],
                      }))}
                      allowNone
                      noneLabel="All vendors"
                      placeholder="All vendors"
                      searchPlaceholder="Search vendors…"
                      triggerClassName="h-9 w-full rounded-md bg-white text-sm"
                    />
                  </FilterField>
                  <FilterField label="Assigned to">
                    <SearchableCombobox
                      value={filters.assigned_to === 'all' ? '' : filters.assigned_to}
                      onValueChange={(v) => applyFilter({ assigned_to: v || 'all' })}
                      options={employees.map((e) => ({
                        value: String(e.id),
                        label: e.name,
                        keywords: [e.email],
                      }))}
                      allowNone
                      noneLabel="All assignees"
                      placeholder="All assignees"
                      searchPlaceholder="Search team members…"
                      triggerClassName="h-9 w-full rounded-md bg-white text-sm"
                    />
                  </FilterField>
                  <FilterField label="Fixed asset">
                    <SearchableCombobox
                      value={filters.fixed_asset_id === 'all' ? '' : filters.fixed_asset_id}
                      onValueChange={(v) => applyFilter({ fixed_asset_id: v || 'all' })}
                      options={fixedAssets.map((a) => ({
                        value: String(a.id),
                        label: a.asset_code ? `${a.asset_code} — ${a.asset_name}` : a.asset_name,
                        keywords: [a.asset_code, a.location],
                      }))}
                      allowNone
                      noneLabel="All assets"
                      placeholder="All assets"
                      searchPlaceholder="Search assets…"
                      triggerClassName="h-9 w-full rounded-md bg-white text-sm"
                    />
                  </FilterField>
                  <FilterField label="Filter dates by">
                    <Select
                      value={filters.date_field}
                      onValueChange={(v) => applyFilter({ date_field: v })}
                    >
                      <SelectTrigger className="h-9 w-full rounded-md bg-white text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(DATE_FIELD_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FilterField>
                  <FilterField label="From">
                    <DatePicker
                      value={filters.date_from}
                      onChange={(v) => applyFilter({ date_from: v || '' })}
                      placeholder="Start of range"
                      className="[&_button]:bg-white"
                    />
                  </FilterField>
                  <FilterField label="To">
                    <DatePicker
                      value={filters.date_to}
                      onChange={(v) => applyFilter({ date_to: v || '' })}
                      placeholder="End of range"
                      className="[&_button]:bg-white"
                    />
                  </FilterField>
                  <FilterField label="Deadline">
                    <Select
                      value={filters.overdue ? 'overdue' : filters.due_today ? 'today' : 'all'}
                      onValueChange={(v) =>
                        applyFilter({ overdue: v === 'overdue', due_today: v === 'today' })
                      }
                    >
                      <SelectTrigger className="h-9 w-full rounded-md bg-white text-sm">
                        <SelectValue placeholder="Any deadline" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any deadline</SelectItem>
                        <SelectItem value="today">Due today</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                  </FilterField>
                </div>
              </div>
            ) : null}

            {activeFilterChips.length ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Filtered by
                </span>
                {activeFilterChips.map((chip) => (
                  <Badge
                    key={chip.key}
                    variant="secondary"
                    className="gap-1 rounded-full py-1 pl-2.5 pr-1 text-xs font-medium"
                  >
                    {chip.label}
                    <button
                      type="button"
                      className="flex size-4 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-300/60 hover:text-slate-700"
                      onClick={chip.clear}
                      aria-label={`Remove ${chip.label}`}
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-slate-500"
                  onClick={resetFilters}
                >
                  Clear all
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        {/* Document Ticket cards */}
        {loading || rows.length > 0 ? (
          <div className="border-t border-slate-200 bg-white px-4 py-4">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <JobOrderPremiumCardSkeleton key={i} />
                ))
              : rows.map((job) => (
                  <JobOrderPremiumCard
                    key={job.id}
                    job={job}
                    customFieldDefinitions={customFieldDefinitions}
                    onView={onView}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
          </div>
        ) : (
          <div className="bg-white px-6 py-14 text-center">
            <p className="text-sm font-medium text-[#0F172A]">No jobs found</p>
            <p className="mt-1 text-sm text-[#64748B]">Try adjusting your search or filters.</p>
            <Button className="mt-4" variant="outline" size="sm" onClick={resetFilters}>
              Clear filters
            </Button>
          </div>
        )}

        <CardFooter className="flex items-center justify-between gap-4 border-t border-[#E2E8F0] bg-white py-2.5">
          <div className="flex items-center gap-2 text-sm text-[#64748B]">
            <span>Rows per page:</span>
            <Select
              value={String(pagination.perPage)}
              onValueChange={(v) => setPagination((p) => ({ ...p, perPage: Number(v), page: 1 }))}
            >
              <SelectTrigger className="h-8 w-20 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[25, 50, 100].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <span className="text-sm tabular-nums text-[#64748B]">
            Page {pagination.page} of {pagination.lastPage}
            {pagination.total > 0 ? ` · ${pagination.total} total` : ''}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-8 border-[#E2E8F0]"
              disabled={pagination.page <= 1}
              onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8 border-[#E2E8F0]"
              disabled={pagination.page >= pagination.lastPage}
              onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>

      <JobCardLayoutDialog
        open={layoutOpen}
        onOpenChange={setLayoutOpen}
        onSaved={fetchRows}
      />
    </section>
  );
}
