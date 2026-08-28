import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from '@tanstack/react-table';
import {
  Activity,
  ChevronDown,
  Download,
  Eye,
  FileEdit,
  FilePlus2,
  History,
  KeyRound,
  LayoutList,
  ListTree,
  Loader2,
  LogIn,
  LogOut,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { auditLogsApi } from './api/audit-logs.api';
import { AuditLogDetailDialog } from './components/AuditLogDetailSheet';
import { AuditStatsStrip } from './components/AuditStatsStrip';
import { AuditTimeline } from './components/AuditTimeline';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardFooter,
  CardHeader,
  CardTable,
  CardTitle,
} from '@/components/ui/card';
import { employeesApi } from '@/pages/employee/api/employees.api';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { DatePicker } from '@/components/ui/date-picker';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDateTime } from '@/lib/format-datetime';
import { cn } from '@/lib/utils';

const ACTIONS = [
  { value: 'all', label: 'All actions' },
  { value: 'created', label: 'Created' },
  { value: 'updated', label: 'Updated' },
  { value: 'deleted', label: 'Deleted' },
  { value: 'posted', label: 'Posted' },
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
  { value: 'failed_login', label: 'Failed login' },
  { value: 'request', label: 'Request / activity' },
];

const SEVERITY_BADGES = {
  // Real severities (App\Support\Audit\AuditSeverity).
  critical: 'bg-red-50 text-red-700 border-red-200',
  security: 'bg-violet-50 text-violet-700 border-violet-200',
  financial: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  info: 'bg-slate-50 text-slate-700 border-slate-200',
  // Legacy guess-from-verb severities, still returned for rows written
  // before the severity column existed (AuditLogResource falls back to
  // these only when the stored value is null).
  high: 'bg-amber-50 text-amber-800 border-amber-200',
  medium: 'bg-blue-50 text-blue-800 border-blue-200',
  low: 'bg-emerald-50 text-emerald-800 border-emerald-200',
};

const ACTION_ICON_TONES = {
  created: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  updated: 'bg-blue-50 text-blue-600 border-blue-100',
  deleted: 'bg-red-50 text-red-600 border-red-100',
  posted: 'bg-violet-50 text-violet-600 border-violet-100',
  login: 'bg-teal-50 text-teal-600 border-teal-100',
  logout: 'bg-slate-50 text-slate-500 border-slate-200',
  failed_login: 'bg-amber-50 text-amber-600 border-amber-100',
  request: 'bg-sky-50 text-sky-600 border-sky-100',
};

function actionLabel(action) {
  if (!action) return 'Unknown';
  const found = ACTIONS.find((item) => item.value === action);
  if (found) return found.label;
  return action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function actionIcon(action) {
  switch (action) {
    case 'login':
      return LogIn;
    case 'logout':
      return LogOut;
    case 'failed_login':
      return ShieldAlert;
    case 'created':
      return FilePlus2;
    case 'updated':
      return FileEdit;
    case 'deleted':
      return Trash2;
    case 'request':
      return Activity;
    default:
      return KeyRound;
  }
}

function userInitials(name) {
  const clean = String(name || '').trim();
  if (!clean || clean.toLowerCase() === 'system') return 'SY';
  return clean
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

const SEVERITIES = [
  { value: 'all', label: 'All severities' },
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'critical', label: 'Critical' },
  { value: 'security', label: 'Security' },
  { value: 'financial', label: 'Financial' },
];

const MODULES = [
  { value: 'all', label: 'All modules' },
  { value: 'Customers', label: 'Customers' },
  { value: 'Vendors', label: 'Vendors' },
  { value: 'Products', label: 'Products' },
  { value: 'Invoices', label: 'Invoices' },
  { value: 'Bills', label: 'Bills' },
  { value: 'Payments', label: 'Payments' },
  { value: 'Credits', label: 'Credits' },
  { value: 'Accounting', label: 'Accounting' },
  { value: 'ChartOfAccounts', label: 'Chart of Accounts' },
  { value: 'FixedAssets', label: 'Fixed Assets' },
  { value: 'Banking', label: 'Banking' },
  { value: 'Inventory', label: 'Inventory' },
  { value: 'Production', label: 'Production' },
  { value: 'PurchaseOrders', label: 'Purchase Orders' },
  { value: 'Expenses', label: 'Expenses' },
  { value: 'Taxes', label: 'Taxes' },
  { value: 'Security', label: 'Security' },
  { value: 'System', label: 'System' },
  { value: 'Quotations', label: 'Quotations' },
  { value: 'SalesOrders', label: 'Sales Orders' },
  { value: 'DeliveryNotes', label: 'Delivery Notes' },
  { value: 'Backups', label: 'Backups' },
  { value: 'Audit', label: 'Audit' },
];

const CHANNELS = [
  { value: 'all', label: 'All sources' },
  { value: 'api', label: 'API' },
  { value: 'web', label: 'Web' },
  { value: 'console', label: 'Console' },
  { value: 'system', label: 'System' },
];

const RESULTS = [
  { value: 'all', label: 'All results' },
  { value: 'success', label: 'Success' },
  { value: 'failed', label: 'Failed' },
];

const RECORD_TYPES = [
  { value: '', label: 'Any record type' },
  { value: 'AccInvoice', label: 'Invoice' },
  { value: 'AccBill', label: 'Bill' },
  { value: 'AccPayment', label: 'Customer payment' },
  { value: 'AccBillPayment', label: 'Bill payment' },
  { value: 'AccJournalEntry', label: 'Journal entry' },
  { value: 'AccCustomer', label: 'Customer' },
  { value: 'AccVendor', label: 'Vendor' },
  { value: 'AccProduct', label: 'Product' },
  { value: 'AccBankAccount', label: 'Bank account' },
  { value: 'AccFixedAsset', label: 'Fixed asset' },
  { value: 'AccFiscalPeriod', label: 'Fiscal period' },
  { value: 'AccPurchaseOrder', label: 'Purchase order' },
  { value: 'AccQuotation', label: 'Quotation' },
  { value: 'AccSalesOrder', label: 'Sales order' },
  { value: 'AccDeliveryNote', label: 'Delivery note' },
  { value: 'AccExpense', label: 'Expense' },
  { value: 'auth', label: 'Authentication' },
];

const DEFAULT_FILTERS = {
  search: '',
  action: 'all',
  type: '',
  severity: 'all',
  module: 'all',
  documentNumber: '',
  auditableId: '',
  correlationId: '',
  dateFrom: '',
  dateTo: '',
  userId: 'all',
  channel: 'all',
  result: 'all',
  ipAddress: '',
};

export function AuditLogsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [viewMode, setViewMode] = useState('table');
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [workspaceUsers, setWorkspaceUsers] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMoreCursor, setHasMoreCursor] = useState(false);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 25,
  });
  const [totalRows, setTotalRows] = useState(0);
  const [integrity, setIntegrity] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchInput.trim() }));
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
      setNextCursor(null);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const queryParams = useMemo(() => {
    const params = {};
    if (filters.search) params.search = filters.search;
    if (filters.action !== 'all') params.action = filters.action;
    if (filters.type.trim()) params.type = filters.type.trim();
    if (filters.severity !== 'all') params.severity = filters.severity;
    if (filters.module !== 'all') params.module = filters.module;
    if (filters.documentNumber.trim())
      params.document_number = filters.documentNumber.trim();
    if (filters.auditableId) params.auditable_id = filters.auditableId;
    if (filters.correlationId) params.correlation_id = filters.correlationId;
    if (filters.dateFrom) params.date_from = filters.dateFrom;
    if (filters.dateTo) params.date_to = filters.dateTo;
    if (filters.userId !== 'all') params.user_id = filters.userId;
    if (filters.channel !== 'all') params.channel = filters.channel;
    if (filters.result !== 'all') params.result = filters.result;
    if (filters.ipAddress.trim()) params.ip_address = filters.ipAddress.trim();
    return params;
  }, [filters]);

  const fetchRows = useCallback(async ({ append = false, cursor = null } = {}) => {
    setLoading(true);
    try {
      if (viewMode === 'timeline') {
        const res = await auditLogsApi.list({
          ...queryParams,
          use_cursor: 1,
          cursor: cursor || undefined,
          direction: 'next',
          per_page: pagination.pageSize,
        });
        const items = res.data?.data || [];
        const meta = res.data?.meta || {};
        setRows((prev) => (append ? [...prev, ...(Array.isArray(items) ? items : [])] : (Array.isArray(items) ? items : [])));
        setNextCursor(meta.next_cursor || null);
        setHasMoreCursor(Boolean(meta.has_more));
        setTotalRows((prev) => (append ? prev + items.length : items.length));
      } else {
        const res = await auditLogsApi.list({
          ...queryParams,
          page: pagination.pageIndex + 1,
          per_page: pagination.pageSize,
        });
        const items = res.data?.data || [];
        const meta = res.data?.meta || {};
        setRows(Array.isArray(items) ? items : []);
        setTotalRows(meta.total ?? items.length);
        setNextCursor(null);
        setHasMoreCursor(false);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [queryParams, pagination.pageIndex, pagination.pageSize, viewMode]);

  useEffect(() => {
    fetchRows({ append: false });
  }, [fetchRows]);

  useEffect(() => {
    let active = true;
    setStatsLoading(true);
    auditLogsApi
      .stats({ days: 14 })
      .then((res) => {
        if (active) setStats(res.data?.data || null);
      })
      .catch(() => {
        if (active) setStats(null);
      })
      .finally(() => {
        if (active) setStatsLoading(false);
      });

    auditLogsApi
      .integrityStatus()
      .then((res) => {
        if (active) setIntegrity(res.data?.data || null);
      })
      .catch(() => {
        if (active) setIntegrity(null);
      });

    employeesApi
      .list({ per_page: 100 })
      .then((res) => {
        if (!active) return;
        const items = res.data?.data || [];
        setWorkspaceUsers(Array.isArray(items) ? items : []);
      })
      .catch(() => {
        if (active) setWorkspaceUsers([]);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const res = await auditLogsApi.exportCsv(queryParams);
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('Audit log export downloaded');
    } catch {
      toast.error('Could not export audit logs');
    } finally {
      setExporting(false);
    }
  }, [queryParams]);

  const setFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    setNextCursor(null);
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSearchInput('');
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    setNextCursor(null);
  };

  const switchViewMode = (mode) => {
    setViewMode(mode);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    setNextCursor(null);
    setRows([]);
  };

  const openDetail = useCallback((row) => {
    setSelectedLog(row);
    setDetailOpen(true);
  }, []);

  const columns = useMemo(
    () => [
      {
        accessorKey: 'created_at_display',
        header: 'When',
        cell: ({ row }) => (
          <div className="min-w-[132px] py-0.5">
            <div className="text-sm font-medium tabular-nums">
              {formatDateTime(row.original.created_at_iso || row.original.created_at, {
                timeZone: row.original.timezone || row.original.event_timezone,
              })}
            </div>
            {row.original.timezone ? (
              <div className="text-xs text-muted-foreground mt-0.5">
                {row.original.timezone}
              </div>
            ) : null}
          </div>
        ),
        size: 156,
      },
      {
        accessorKey: 'message',
        header: 'Activity',
        cell: ({ row }) => {
          const log = row.original;
          const Icon = actionIcon(log.action);
          const record = log.entity_label || log.auditable_type_short;
          return (
            <div className="flex items-start gap-3 min-w-[300px] max-w-xl py-0.5">
              <span
                className={cn(
                  'size-8 rounded-lg flex items-center justify-center shrink-0 border mt-0.5',
                  ACTION_ICON_TONES[log.action] || 'bg-muted text-muted-foreground border-border',
                )}
              >
                <Icon className="size-4" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-medium leading-snug">
                  {log.message || record || actionLabel(log.action)}
                </div>
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground mt-1">
                  <span className="font-medium text-foreground/70">
                    {actionLabel(log.action)}
                  </span>
                  {record ? (
                    <>
                      <span aria-hidden>·</span>
                      <span>
                        {record}
                        {log.auditable_id ? ` #${log.auditable_id}` : ''}
                      </span>
                    </>
                  ) : null}
                  {log.document_number ? (
                    <>
                      <span aria-hidden>·</span>
                      <span className="font-mono">{log.document_number}</span>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          );
        },
        size: 380,
      },
      {
        accessorKey: 'module',
        header: 'Module',
        cell: ({ row }) =>
          row.original.module ? (
            <Badge
              variant="outline"
              className="rounded-full font-normal bg-muted/40 text-foreground/80"
            >
              {row.original.module}
            </Badge>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          ),
        size: 128,
      },
      {
        accessorKey: 'user_name',
        header: 'User',
        cell: ({ row }) => {
          const name = row.original.user_name || 'System';
          const ip = row.original.ip_address;
          return (
            <div className="flex items-center gap-2 min-w-[150px]">
              <span className="size-7 rounded-full bg-primary/10 text-primary text-[11px] font-semibold flex items-center justify-center shrink-0">
                {userInitials(name)}
              </span>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{name}</div>
                {ip ? (
                  <div className="text-xs text-muted-foreground font-mono truncate">
                    {ip}
                  </div>
                ) : null}
              </div>
            </div>
          );
        },
        size: 180,
      },
      {
        accessorKey: 'severity',
        header: 'Severity',
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={cn(
              'rounded-full capitalize',
              SEVERITY_BADGES[row.original.severity] || SEVERITY_BADGES.info,
            )}
          >
            {row.original.severity || 'info'}
          </Badge>
        ),
        size: 112,
      },
      {
        id: 'details',
        header: () => <span className="sr-only">Details</span>,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                openDetail(row.original);
              }}
            >
              <Eye className="size-4" />
              <span className="hidden sm:inline text-xs">View</span>
            </Button>
          </div>
        ),
        size: 88,
      },
    ],
    [openDetail],
  );

  const table = useReactTable({
    data: rows,
    columns,
    pageCount: Math.max(1, Math.ceil(totalRows / pagination.pageSize)),
    state: { pagination },
    onPaginationChange: setPagination,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const advancedFilterCount = [
    filters.type.trim(),
    filters.documentNumber.trim(),
    filters.dateFrom,
    filters.dateTo,
    filters.userId !== 'all' ? filters.userId : '',
    filters.channel !== 'all' ? filters.channel : '',
    filters.result !== 'all' ? filters.result : '',
    filters.ipAddress.trim(),
  ].filter(Boolean).length;

  const hasActiveFilters =
    Boolean(filters.search) ||
    filters.action !== 'all' ||
    filters.severity !== 'all' ||
    filters.module !== 'all' ||
    Boolean(filters.auditableId) ||
    Boolean(filters.correlationId) ||
    advancedFilterCount > 0;

  const isScopedView = Boolean(filters.auditableId || filters.correlationId);

  const viewRecordHistory = useCallback(({ type, id }) => {
    setDetailOpen(false);
    setFilters({
      ...DEFAULT_FILTERS,
      type: type || '',
      auditableId: id ? String(id) : '',
    });
    setSearchInput('');
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  const viewRelatedEvents = useCallback((correlationId) => {
    setDetailOpen(false);
    setFilters({ ...DEFAULT_FILTERS, correlationId });
    setSearchInput('');
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  return (
    <div className="space-y-6 w-full min-w-0">
      <PageHeader
        title="Audit logs"
        subtitle="Track who did what, when, and from where across your workspace."
        actions={
          <div className="flex flex-wrap gap-2">
            {integrity ? (
              <Badge
                variant="outline"
                title={
                  integrity.status === 'passed'
                    ? `${Number(integrity.rows_checked || 0).toLocaleString()} rows verified`
                    : integrity.status === 'failed'
                      ? `${integrity.hash_failures || 0} hash failures, ${integrity.missing_hashes || 0} missing hashes`
                      : 'The scheduled integrity verifier has not run yet'
                }
                className={cn(
                  'h-9 rounded-lg gap-1.5 px-3 font-medium',
                  integrity.status === 'passed' &&
                    'border-emerald-200 bg-emerald-50 text-emerald-700',
                  integrity.status === 'failed' &&
                    'border-red-200 bg-red-50 text-red-700',
                  integrity.status === 'not_run' &&
                    'border-amber-200 bg-amber-50 text-amber-700',
                )}
              >
                <ShieldCheck className="size-4" />
                {integrity.status === 'passed'
                  ? 'Integrity verified'
                  : integrity.status === 'failed'
                    ? 'Integrity issue'
                    : 'Verification pending'}
              </Badge>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={exporting || loading}
            >
              {exporting ? (
                <Loader2 className="size-4 mr-1.5 animate-spin" />
              ) : (
                <Download className="size-4 mr-1.5" />
              )}
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchRows({ append: false })}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="size-4 mr-1.5 animate-spin" />
              ) : (
                <RefreshCw className="size-4 mr-1.5" />
              )}
              Refresh
            </Button>
          </div>
        }
      />

      <AuditStatsStrip stats={stats} loading={statsLoading} />

      {isScopedView ? (
        <div className="flex items-start gap-3.5 rounded-xl border border-primary/25 bg-primary/5 px-5 py-4">
          <div className="rounded-lg bg-primary/10 p-2.5 text-primary shrink-0">
            <History className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-foreground">
              {filters.correlationId
                ? 'Everything that happened in one operation'
                : `Full history for ${filters.type || 'record'} #${filters.auditableId}`}
            </h2>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed max-w-3xl">
              {filters.correlationId
                ? 'These events were all recorded during the same request — e.g. a document posted alongside the journal entry it created.'
                : 'Every recorded event for this specific record, oldest actions included.'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={resetFilters} className="shrink-0">
            Clear filter
          </Button>
        </div>
      ) : null}

      <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm">
        <CardHeader className="flex-col items-stretch gap-4 border-b border-slate-200 bg-white px-5 py-4">
          <div className="flex items-center justify-between gap-2 w-full">
            <div>
              <CardTitle className="text-base font-semibold text-slate-950">
                Security log
              </CardTitle>
              <p className="mt-0.5 text-xs text-slate-500">
                {totalRows.toLocaleString()} {totalRows === 1 ? 'event' : 'events'}
                {hasActiveFilters ? ' matching your filters' : ' recorded'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                <Button
                  type="button"
                  variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-8 px-2.5"
                  onClick={() => switchViewMode('table')}
                >
                  <LayoutList className="size-4 mr-1.5" />
                  Table
                </Button>
                <Button
                  type="button"
                  variant={viewMode === 'timeline' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-8 px-2.5"
                  onClick={() => switchViewMode('timeline')}
                >
                  <ListTree className="size-4 mr-1.5" />
                  Timeline
                </Button>
              </div>
              {hasActiveFilters ? (
                <Button variant="ghost" size="sm" onClick={resetFilters} className="h-9">
                  <X className="size-4 mr-1" /> Clear all
                </Button>
              ) : null}
            </div>
          </div>

          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <div className="relative min-w-0 flex-1 xl:max-w-md">
                <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search activity, user, IP…"
                  className="h-9 pl-9 pr-9"
                />
                {searchInput ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 size-9"
                    onClick={() => {
                      setSearchInput('');
                      setFilters((prev) => ({ ...prev, search: '' }));
                    }}
                  >
                    <X className="size-4" />
                  </Button>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Select value={filters.action} onValueChange={(v) => setFilter('action', v)}>
                  <SelectTrigger className="w-[150px] h-9">
                    <SelectValue placeholder="All actions" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIONS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filters.severity}
                  onValueChange={(v) => setFilter('severity', v)}
                >
                  <SelectTrigger className="w-[145px] h-9">
                    <SelectValue placeholder="All severities" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITIES.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filters.module} onValueChange={(v) => setFilter('module', v)}>
                  <SelectTrigger className="w-[145px] h-9">
                    <SelectValue placeholder="All modules" />
                  </SelectTrigger>
                  <SelectContent>
                    {MODULES.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9">
                    <SlidersHorizontal className="size-4 mr-1.5" />
                    More filters
                    {advancedFilterCount > 0 ? (
                      <Badge
                        variant="outline"
                        className="ml-1.5 rounded-full px-1.5 py-0 text-[11px] bg-primary/10 text-primary border-primary/20"
                      >
                        {advancedFilterCount}
                      </Badge>
                    ) : null}
                    <ChevronDown
                      className={cn(
                        'size-4 ml-1 transition-transform',
                        advancedOpen && 'rotate-180',
                      )}
                    />
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>

            <CollapsibleContent>
              <div className="mt-3 grid grid-cols-1 gap-3 rounded-xl border border-dashed border-slate-200 bg-muted/20 p-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Record type
                  </label>
                  <Select
                    value={filters.type || 'any'}
                    onValueChange={(v) => setFilter('type', v === 'any' ? '' : v)}
                  >
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue placeholder="Any record type" />
                    </SelectTrigger>
                    <SelectContent>
                      {RECORD_TYPES.map((item) => (
                        <SelectItem key={item.value || 'any'} value={item.value || 'any'}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Document #
                  </label>
                  <Input
                    value={filters.documentNumber}
                    onChange={(e) => setFilter('documentNumber', e.target.value)}
                    placeholder="e.g. INV-1042"
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">User</label>
                  <Select
                    value={String(filters.userId)}
                    onValueChange={(v) => setFilter('userId', v)}
                  >
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue placeholder="All users" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All users</SelectItem>
                      {workspaceUsers.map((user) => (
                        <SelectItem key={user.id} value={String(user.id)}>
                          {user.name || user.email || `User #${user.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Source</label>
                  <Select
                    value={filters.channel}
                    onValueChange={(v) => setFilter('channel', v)}
                  >
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue placeholder="All sources" />
                    </SelectTrigger>
                    <SelectContent>
                      {CHANNELS.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Result</label>
                  <Select
                    value={filters.result}
                    onValueChange={(v) => setFilter('result', v)}
                  >
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue placeholder="All results" />
                    </SelectTrigger>
                    <SelectContent>
                      {RESULTS.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">IP address</label>
                  <Input
                    value={filters.ipAddress}
                    onChange={(e) => setFilter('ipAddress', e.target.value)}
                    placeholder="e.g. 203.0.113."
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">From</label>
                  <DatePicker
                    className="w-full"
                    value={filters.dateFrom}
                    onChange={(v) => setFilter('dateFrom', v || '')}
                    placeholder="Start date"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">To</label>
                  <DatePicker
                    className="w-full"
                    value={filters.dateTo}
                    onChange={(v) => setFilter('dateTo', v || '')}
                    placeholder="End date"
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardHeader>

        {viewMode === 'timeline' ? (
          <AuditTimeline
            rows={rows}
            loading={loading}
            hasMore={hasMoreCursor}
            onLoadMore={() => fetchRows({ append: true, cursor: nextCursor })}
            onOpen={openDetail}
          />
        ) : (
          <DataGrid
            table={table}
            recordCount={totalRows}
            isLoading={loading}
            onRowClick={openDetail}
            emptyMessage="No audit events match your current filters."
            tableLayout={{
              cellBorder: true,
              rowBorder: true,
              headerBackground: true,
              headerBorder: true,
              columnsVisibility: false,
            }}
          >
            <CardTable>
              <ScrollArea>
                <DataGridTable />
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardTable>
            <CardFooter className="border-t">
              <DataGridPagination sizes={[25, 50, 100]} />
            </CardFooter>
          </DataGrid>
        )}
      </Card>

      <AuditLogDetailDialog
        log={selectedLog}
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setSelectedLog(null);
        }}
        onViewHistory={viewRecordHistory}
        onViewRelatedEvents={viewRelatedEvents}
      />
    </div>
  );
}
