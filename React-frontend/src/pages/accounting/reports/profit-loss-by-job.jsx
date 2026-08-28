import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { format, parseISO } from 'date-fns';
import { ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { jobOrdersApi } from '../job-orders/api/job-orders.api';
import { defaultReportPeriod, formatCurrency } from './constants';
import { formatJobType, JOB_STATUSES, JOB_TYPES } from '../job-orders/constants';
import { ReportPageShell } from './components/ReportPageShell';
import { ReportDateFilter } from './components/ReportDateFilter';
import { ReportDraggableTableHead } from './components/ReportDraggableTableHead';
import { ReportTableToolbar } from './components/ReportTableToolbar';
import { ReportActionBar } from './components/ReportActionBar';
import { ReportSummaryStrip } from './components/ReportSummaryStrip';
import { usePersistedReportColumns } from './hooks/usePersistedReportColumns';
import { PROFIT_LOSS_BY_JOB_COLUMNS } from './constants/report-columns';
import { CustomerDrillLink } from './components/CustomerDrillLink';
import { JobDrillLink } from './components/JobDrillLink';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

function formatPeriodDate(value) {
  if (!value) return '—';
  try {
    return format(parseISO(value), 'dd/MM/yyyy');
  } catch {
    return value;
  }
}

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

export function ProfitLossByJobReportPage() {
  const { id: workspaceId } = useParams();
  const navigate = useNavigate();
  const jobsBase = `/workspace/${workspaceId}/accounting/job-orders`;

  const [period, setPeriod] = useState(defaultReportPeriod());
  const [draft, setDraft] = useState(defaultReportPeriod());
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    job_type: '',
    hide_zero: true,
  });
  const [draftFilters, setDraftFilters] = useState(filters);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [data, setData] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    jobOrdersApi
      .profitLossReport({
        from: period.from,
        to: period.to,
        search: filters.search || undefined,
        status: filters.status || undefined,
        job_type: filters.job_type || undefined,
        hide_zero: filters.hide_zero ? 1 : 0,
      })
      .then((res) => setData(res.data?.data || null))
      .catch((err) => toast.error(err?.response?.data?.message || 'Failed to load report'))
      .finally(() => setLoading(false));
  }, [period, filters]);

  useEffect(() => {
    load();
  }, [load]);

  const currency = data?.currency || 'USD';
  const rows = data?.rows || [];
  const totals = data?.totals || {};

  const periodLabel = useMemo(() => {
    const from = data?.period?.from || period.from;
    const to = data?.period?.to || period.to;
    return `${formatPeriodDate(from)} – ${formatPeriodDate(to)}`;
  }, [data?.period, period]);

  const {
    allColumns,
    visibleColumns,
    toggleColumn,
    isColumnVisible,
    reorderColumns,
  } = usePersistedReportColumns(
    workspaceId,
    'profit-loss-by-job',
    PROFIT_LOSS_BY_JOB_COLUMNS,
  );

  const renderJobCell = (col, row) => {
    switch (col.id) {
      case 'job':
        return (
          <TableCell key={col.id}>
            <JobDrillLink workspaceId={workspaceId} jobId={row.id}>
              <div className="font-mono text-sm font-medium">{row.job_number}</div>
            </JobDrillLink>
            {row.title ? (
              <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                {row.title}
              </div>
            ) : null}
            <div className="flex gap-1 mt-1">
              <Badge variant="outline" className="text-[10px] capitalize">
                {formatJobType(row.job_type)}
              </Badge>
              <Badge variant="outline" className="text-[10px] capitalize">
                {row.status}
              </Badge>
            </div>
          </TableCell>
        );
      case 'customer':
        return (
          <TableCell key={col.id} className="text-sm">
            <CustomerDrillLink customerId={row.customer_id}>
              {row.customer_name || '—'}
            </CustomerDrillLink>
          </TableCell>
        );
      case 'revenue':
        return (
          <TableCell key={col.id} className="text-right tabular-nums">
            {formatCurrency(row.revenue, currency)}
          </TableCell>
        );
      case 'production':
        return (
          <TableCell key={col.id} className="text-right tabular-nums text-muted-foreground">
            {formatCurrency(row.production_cost, currency)}
          </TableCell>
        );
      case 'expenses':
        return (
          <TableCell key={col.id} className="text-right tabular-nums text-muted-foreground">
            {formatCurrency(row.expenses, currency)}
          </TableCell>
        );
      case 'bills':
        return (
          <TableCell key={col.id} className="text-right tabular-nums text-muted-foreground">
            {formatCurrency(row.bills, currency)}
          </TableCell>
        );
      case 'labor':
        return (
          <TableCell key={col.id} className="text-right tabular-nums text-muted-foreground">
            {formatCurrency(row.labor, currency)}
          </TableCell>
        );
      case 'total_cost':
        return (
          <TableCell key={col.id} className="text-right tabular-nums font-medium">
            {formatCurrency(row.total_cost, currency)}
          </TableCell>
        );
      case 'gross_profit':
        return (
          <TableCell
            key={col.id}
            className={cn(
              'text-right tabular-nums font-semibold',
              row.is_profitable
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-red-700 dark:text-red-400',
            )}
          >
            {formatCurrency(row.gross_profit, currency)}
          </TableCell>
        );
      case 'margin':
        return (
          <TableCell key={col.id} className="text-right tabular-nums text-muted-foreground">
            {row.margin_percent != null ? `${row.margin_percent}%` : '—'}
          </TableCell>
        );
      case 'actions':
        return (
          <TableCell key={col.id}>
            <Link
              to={`${jobsBase}/${row.id}`}
              className="text-primary hover:text-primary/80"
              title="Open job"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="size-4" />
            </Link>
          </TableCell>
        );
      default:
        return null;
    }
  };

  const renderTotalCell = (col) => {
    switch (col.id) {
      case 'revenue':
        return (
          <TableCell key={col.id} className="text-right tabular-nums">
            {formatCurrency(totals.revenue, currency)}
          </TableCell>
        );
      case 'production':
        return (
          <TableCell key={col.id} className="text-right tabular-nums">
            {formatCurrency(totals.production_cost, currency)}
          </TableCell>
        );
      case 'expenses':
        return (
          <TableCell key={col.id} className="text-right tabular-nums">
            {formatCurrency(totals.expenses, currency)}
          </TableCell>
        );
      case 'bills':
        return (
          <TableCell key={col.id} className="text-right tabular-nums">
            {formatCurrency(totals.bills, currency)}
          </TableCell>
        );
      case 'labor':
        return (
          <TableCell key={col.id} className="text-right tabular-nums">
            {formatCurrency(totals.labor, currency)}
          </TableCell>
        );
      case 'total_cost':
        return (
          <TableCell key={col.id} className="text-right tabular-nums">
            {formatCurrency(totals.total_cost, currency)}
          </TableCell>
        );
      case 'gross_profit':
        return (
          <TableCell
            key={col.id}
            className={cn(
              'text-right tabular-nums',
              (totals.gross_profit ?? 0) >= 0
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-red-700 dark:text-red-400',
            )}
          >
            {formatCurrency(totals.gross_profit, currency)}
          </TableCell>
        );
      case 'margin':
        return (
          <TableCell key={col.id} className="text-right tabular-nums">
            {totals.margin_percent != null ? `${totals.margin_percent}%` : '—'}
          </TableCell>
        );
      default:
        return <TableCell key={col.id} />;
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await jobOrdersApi.profitLossExport({
        from: period.from,
        to: period.to,
        search: filters.search || undefined,
        status: filters.status || undefined,
        job_type: filters.job_type || undefined,
        hide_zero: filters.hide_zero ? 1 : 0,
      });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      downloadBlob(blob, `profit-loss-by-job-${period.from}-to-${period.to}.csv`);
      toast.success('Report exported');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const applyFilters = () => {
    setPeriod({ ...draft });
    setFilters({ ...draftFilters });
  };

  const resetFilters = () => {
    setDraft(defaultReportPeriod());
    setDraftFilters({
      search: '',
      status: '',
      job_type: '',
      hide_zero: true,
    });
  };

  return (
    <ReportPageShell
      workspaceId={workspaceId}
      title="Profit & Loss by Job"
      subtitle="Job profitability: revenue and costs per job for the selected period."
      actions={
        <ReportActionBar
          leading={
            <ReportTableToolbar
              columns={allColumns}
              isColumnVisible={isColumnVisible}
              onToggle={toggleColumn}
            />
          }
          onExport={handleExport}
          exportLabel={exporting ? 'Exporting…' : 'Export'}
          exportDisabled={exporting || loading}
          onPdf={() => window.print()}
          pdfDisabled={loading}
          onPrint={() => window.print()}
          printDisabled={loading}
        />
      }
    >
      <div className="no-print space-y-3">
        <ReportDateFilter
          compact
          from={draft.from}
          to={draft.to}
          onFromChange={(v) => setDraft((p) => ({ ...p, from: v }))}
          onToChange={(v) => setDraft((p) => ({ ...p, to: v }))}
          onApply={applyFilters}
          onReset={resetFilters}
          loading={loading}
          currency={currency}
          hint="Revenue uses invoice dates. Costs use expense/bill/journal dates, production completion dates, and labor entry dates."
        >
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Search</Label>
            <Input
              value={draftFilters.search}
              onChange={(e) => setDraftFilters((f) => ({ ...f, search: e.target.value }))}
              placeholder="Job # or title"
              className="w-[180px] h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select
              value={draftFilters.status || '_all'}
              onValueChange={(v) =>
                setDraftFilters((f) => ({ ...f, status: v === '_all' ? '' : v }))
              }
            >
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All statuses</SelectItem>
                {JOB_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Job type</Label>
            <Select
              value={draftFilters.job_type || '_all'}
              onValueChange={(v) =>
                setDraftFilters((f) => ({ ...f, job_type: v === '_all' ? '' : v }))
              }
            >
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All types</SelectItem>
                {JOB_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm pb-1 cursor-pointer">
            <Checkbox
              checked={draftFilters.hide_zero}
              onCheckedChange={(v) => setDraftFilters((f) => ({ ...f, hide_zero: !!v }))}
            />
            Hide jobs with no activity
          </label>
        </ReportDateFilter>
      </div>

      {loading && !data ? (
        <Skeleton className="h-12 w-full rounded-sm" />
      ) : (
        <ReportSummaryStrip
          items={[
            { label: 'Total revenue', value: formatCurrency(totals.revenue, currency) },
            { label: 'Total cost', value: formatCurrency(totals.total_cost, currency) },
            {
              label: 'Net job profit',
              value: formatCurrency(totals.gross_profit, currency),
              tone: (totals.gross_profit ?? 0) >= 0 ? 'positive' : 'negative',
            },
            { label: 'Margin', value: totals.margin_percent != null ? `${totals.margin_percent}%` : '—' },
          ]}
          context={`${totals.job_count ?? 0} jobs`}
        />
      )}

      {loading && !data ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <Card id="pl-by-job-report" className="report-print-sheet shadow-none print:shadow-none">
          <CardContent className="p-0">
            <div className="px-5 py-4 border-b print:border-b-2">
              <h2 className="text-lg font-bold">Profit &amp; Loss by Job</h2>
              <p className="text-sm text-muted-foreground">{periodLabel}</p>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-slate-50">
                  <ReportDraggableTableHead
                    columns={visibleColumns}
                    onReorder={reorderColumns}
                    renderLabel={(col) => col.label}
                    isRightAligned={(col) =>
                      [
                        'revenue',
                        'production',
                        'expenses',
                        'bills',
                        'labor',
                        'total_cost',
                        'gross_profit',
                        'margin',
                      ].includes(col.id)
                    }
                    getExtraClassName={(col) =>
                      col.id === 'actions' ? 'w-10' : ''
                    }
                  />
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={visibleColumns.length}
                        className="text-center py-10 text-muted-foreground"
                      >
                        No jobs match your filters for this period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => (
                      <TableRow
                        key={row.id}
                        className="cursor-pointer even:bg-muted/30 hover:bg-primary/5"
                        onClick={() => navigate(`${jobsBase}/${row.id}`)}
                        title="View job details"
                      >
                        {visibleColumns.map((col) => renderJobCell(col, row))}
                      </TableRow>
                    ))
                  )}
                  {rows.length > 0 ? (
                    <TableRow className="bg-muted/30 font-semibold border-t-2">
                      {visibleColumns.map((col, idx) =>
                        idx === 0 ? (
                          <TableCell key={col.id}>
                            Totals ({totals.job_count} jobs)
                          </TableCell>
                        ) : (
                          renderTotalCell(col)
                        ),
                      )}
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </ReportPageShell>
  );
}
