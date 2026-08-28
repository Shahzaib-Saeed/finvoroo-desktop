import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import {
  Copy,
  FileDown,
  Loader2,
  RefreshCw,
  Share2,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuthStore } from '@/store/authStore';
import { reportCenterApi } from '../api/report-center.api';
import { downloadReportExport, reportBuilderApi } from '../builder/api/report-builder.api';
import { datasetDescription } from '../builder/dataset-meta';
import { ReportShareModal } from '../components/ReportShareModal';
import { ReportFavoriteToggle } from '../components/ReportFavoriteToggle';
import { ReportViewerFilterBar } from './components/ReportViewerFilterBar';
import { ReportPageShell } from '../components/ReportPageShell';
import { ReportActionBar } from '../components/ReportActionBar';
import { defaultReportPeriod } from '../constants';
import { definitionEditPath, recordViewPayload } from '../lib/report-definition-links';
import {
  resolveReportDateRange,
  summarizeReportFilters,
} from '../lib/summarize-filters';
import { ReportViewerStatementSheet } from './components/ReportViewerStatementSheet';
import { ReportViewerGeneralLedger } from './ReportViewerGeneralLedger';
import { useReportDefinition } from '../hooks/useReportDefinition';
import {
  getViewerPresentation,
  statementTitleForDataset,
  VIEWER_PRESENTATION,
} from './lib/viewer-presentation';
import { Skeleton } from '@/components/ui/skeleton';

function resolveFiscalYear(asOfDate, company) {
  if (company?.fiscal_year) return company.fiscal_year;
  if (company?.fiscal_year_label) return company.fiscal_year_label;
  if (!asOfDate) return null;
  try {
    return `FY ${format(parseISO(String(asOfDate).slice(0, 10)), 'yyyy')}`;
  } catch {
    return null;
  }
}

const PER_PAGE = 50;

function initialPeriodFromDefinition(definition) {
  const resolved = resolveReportDateRange(definition?.definition?.date_range);
  if (resolved?.from && resolved?.to) return resolved;
  return defaultReportPeriod();
}

export function ReportViewerPage() {
  const { id: workspaceId, definitionId } = useParams();
  const navigate = useNavigate();
  const base = `/workspace/${workspaceId}`;
  const user = useAuthStore((s) => s.user);
  const activeCompany = useAuthStore((s) => s.activeCompany);

  const {
    definition,
    hub,
    datasets,
    loading: loadingMeta,
    error: definitionLoadError,
  } = useReportDefinition(definitionId);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [period, setPeriod] = useState(null);
  const [draft, setDraft] = useState(null);
  const [hasRun, setHasRun] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const datasetMeta = useMemo(
    () => datasets.find((d) => d.key === definition?.dataset_key),
    [datasets, definition?.dataset_key],
  );
  const fields = useMemo(() => datasetMeta?.fields ?? [], [datasetMeta?.fields]);
  const reportDef = definition?.definition || {};
  const formatting = reportDef.formatting || {};

  const isFavorited = useMemo(() => {
    return (hub?.favorites ?? []).some(
      (f) =>
        f.favoritable_kind === 'definition' &&
        f.report_definition?.id === Number(definitionId),
    );
  }, [hub, definitionId]);

  // Seed period whenever the saved definition loads or changes (e.g. after edit).
  useEffect(() => {
    if (!definition) return;
    const initial = initialPeriodFromDefinition(definition);
    setPeriod(initial);
    setDraft(initial);
    setHasRun(true);
    setPage(1);
    setResult(null);
    setError(null);
  }, [definition, definition?.id]);

  useEffect(() => {
    if (!definition) return;
    const payload = recordViewPayload(definition);
    if (payload) reportCenterApi.recordView(payload).catch(() => {});
  }, [definition, definition?.id]);

  const runReport = useCallback(() => {
    if (!definitionId || !period?.from || !period?.to) return;
    setLoading(true);
    setError(null);
    reportBuilderApi
      .run(definitionId, page, PER_PAGE, {
        from: period.from,
        to: period.to,
      })
      .then(({ data }) => {
        setResult(data?.data ?? null);
      })
      .catch((err) =>
        setError(err?.response?.data?.message || 'Could not run this report.'),
      )
      .finally(() => setLoading(false));
  }, [definitionId, page, period]);

  useEffect(() => {
    if (!loadingMeta && definition && hasRun && period?.from && period?.to) {
      runReport();
    }
  }, [loadingMeta, definition, hasRun, page, refreshKey, period, runReport]);

  const applyFilters = () => {
    if (!draft?.from || !draft?.to) {
      toast.error('Please select a from and to date.');
      return;
    }
    setPage(1);
    setHasRun(true);
    if (period?.from === draft.from && period?.to === draft.to) {
      setRefreshKey((k) => k + 1);
    } else {
      setPeriod({ from: draft.from, to: draft.to });
    }
  };

  const resetFilters = () => {
    const initial = initialPeriodFromDefinition(definition);
    setDraft(initial);
    setPeriod(initial);
    setSearchQuery('');
    setPage(1);
    setHasRun(true);
  };

  const handleDuplicate = async () => {
    try {
      const { data } = await reportCenterApi.duplicateDefinition(definition.id);
      const newId = data?.data?.id;
      toast.success('Report duplicated');
      if (newId) navigate(`${base}/accounting/reports/view/${newId}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not duplicate report.');
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await reportCenterApi.archiveDefinition(definition.id);
      toast.success(`"${definition.name}" deleted`);
      setDeleteOpen(false);
      navigate(`${base}/accounting/reports`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not delete this report.');
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async (formatKey) => {
    if (!period?.from || !period?.to) {
      toast.error('Run the report with a date range before exporting.');
      return;
    }
    try {
      const { data } = await reportBuilderApi.export(definition.id, formatKey, {
        from: period.from,
        to: period.to,
      });
      downloadReportExport(data, definition.name, formatKey);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Export failed.');
    }
  };

  const filterLines = useMemo(
    () => summarizeReportFilters(reportDef.filters, fields),
    [reportDef.filters, fields],
  );
  const presentation = getViewerPresentation(definition?.dataset_key);
  const isStatementDataset =
    presentation === VIEWER_PRESENTATION.LEDGER ||
    presentation === VIEWER_PRESENTATION.TRIAL_BALANCE ||
    presentation === VIEWER_PRESENTATION.LEDGER_PARTY;
  const editPath = definition
    ? definitionEditPath(definition, base)
    : `${base}/accounting/reports`;

  const companyName =
    activeCompany?.name ||
    activeCompany?.company_name ||
    'Company';
  const logoUrl =
    activeCompany?.logo_url ||
    activeCompany?.logo ||
    activeCompany?.logoUrl ||
    null;
  const generatedBy = user?.name || user?.full_name || null;
  const printedAt = format(new Date(), "dd/MM/yyyy 'at' hh:mm a");
  const currency =
    activeCompany?.base_currency || activeCompany?.currency || 'PKR';
  const fiscalYear = resolveFiscalYear(period?.to, activeCompany);
  const statementTitle = statementTitleForDataset(
    definition?.dataset_key,
    definition?.name,
  );
  const pageTitle = isStatementDataset
    ? statementTitle
    : definition?.name || 'Custom Report';
  const pageSubtitle = isStatementDataset
    ? definition?.description ||
      datasetDescription(definition?.dataset_key) ||
      (presentation === VIEWER_PRESENTATION.LEDGER
        ? 'Detailed transaction breakdown across accounts for selected period.'
        : presentation === VIEWER_PRESENTATION.TRIAL_BALANCE
          ? 'Working ledger summary verifying mathematical equilibrium across matching entries.'
          : null)
    : definition?.description ||
      datasetDescription(definition?.dataset_key) ||
      'Saved custom report';

  const showSheet = hasRun && Boolean(period?.from && period?.to);

  const searchPlaceholder =
    presentation === VIEWER_PRESENTATION.LEDGER
      ? 'Search reference, memo, party, account…'
      : 'Search in results…';

  const recordCountLabel = result?.total
    ? `${result.total.toLocaleString()} ${
        presentation === VIEWER_PRESENTATION.LEDGER ? 'journal lines' : 'records'
      } in this period`
    : null;

  if (loadingMeta) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-[480px] w-full rounded-xl" />
      </div>
    );
  }

  if (!definition) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-lg font-semibold text-slate-900">Report not found</p>
        <p className="mt-2 text-sm text-slate-500">
          {definitionLoadError ||
            'It may have been deleted or you may not have access.'}
        </p>
        <Button className="mt-6" asChild>
          <Link to={`${base}/accounting/reports`}>Back to Reports</Link>
        </Button>
      </div>
    );
  }

  if (definition.dataset_key === 'accounting.general_ledger') {
    return (
      <ReportViewerGeneralLedger
        definition={definition}
        definitionId={definitionId}
        fields={fields}
        isFavorited={isFavorited}
      />
    );
  }

  return (
    <>
      <ReportPageShell
        workspaceId={workspaceId}
        compact
        title={pageTitle}
        subtitle={pageSubtitle}
        breadcrumbs={[
          { label: 'Reports', to: `${base}/accounting/reports` },
          { label: definition?.name || pageTitle },
        ]}
        contentClassName={
          presentation === VIEWER_PRESENTATION.TRIAL_BALANCE
            ? 'max-w-4xl mx-auto'
            : 'w-full max-w-none general-ledger-report-root'
        }
        actions={
          <>
            <ReportActionBar
            leading={
              <ReportFavoriteToggle
                favoritableKind="definition"
                reportDefinitionId={Number(definitionId)}
                isFavorited={isFavorited}
                className="size-8 rounded-sm border border-slate-300 bg-white hover:bg-slate-100"
              />
            }
            onExport={() => handleExport('xlsx')}
            exportLabel="Export"
            exportDisabled={loading || !result?.rows?.length}
            onPdf={() => handleExport('pdf')}
            pdfDisabled={loading || !result?.rows?.length}
            onPrint={() => window.print()}
            printDisabled={!showSheet}
            editTo={editPath}
            more={
              <>
                <DropdownMenuItem
                  disabled={loading || !showSheet}
                  onClick={() => setRefreshKey((k) => k + 1)}
                >
                  <RefreshCw className="size-3.5" />
                  Refresh
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShareOpen(true)}>
                  <Share2 className="size-3.5" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDuplicate}>
                  <Copy className="size-3.5" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={!result?.rows?.length}
                  onClick={() => handleExport('csv')}
                >
                  <FileDown className="size-3.5" />
                  Download CSV
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </DropdownMenuItem>
              </>
            }
            />
            <ReportShareModal
              definitionId={Number(definitionId)}
              open={shareOpen}
              onOpenChange={setShareOpen}
            />
          </>
        }
      >
        <div className="no-print">
          <ReportViewerFilterBar
            from={draft?.from || ''}
            to={draft?.to || ''}
            onFromChange={(v) => setDraft((p) => ({ ...(p || {}), from: v }))}
            onToChange={(v) => setDraft((p) => ({ ...(p || {}), to: v }))}
            onApply={applyFilters}
            onReset={resetFilters}
            loading={loading}
            savedFilterHint={
              filterLines.length ? filterLines.join(' · ') : undefined
            }
            search={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={searchPlaceholder}
            recordCountLabel={showSheet ? recordCountLabel : undefined}
          />
        </div>

        {showSheet ? (
          <ReportViewerStatementSheet
            datasetKey={definition?.dataset_key}
            reportName={definition?.name || statementTitle}
            periodFrom={period.from}
            periodTo={period.to}
            fiscalYear={fiscalYear}
            workspaceId={workspaceId}
            companyName={companyName}
            logoUrl={logoUrl}
            currency={currency}
            generatedBy={generatedBy}
            printedAt={printedAt}
            result={result}
            loading={loading || loadingMeta}
            error={error}
            page={page}
            perPage={PER_PAGE}
            onPageChange={setPage}
            formatting={formatting}
            searchQuery={searchQuery}
          />
        ) : (
          <div className="no-print border border-dashed border-slate-300 bg-white px-4 py-10 text-center">
            <p className="text-sm font-semibold text-slate-900">
              Select a date range to run this report
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Use the filters above, then click Apply filters.
            </p>
          </div>
        )}
      </ReportPageShell>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete report?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{definition?.name}&rdquo; will be removed from My Reports.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
            >
              {deleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
