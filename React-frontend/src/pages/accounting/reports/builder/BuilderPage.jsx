import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { ArrowLeft, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { DatasetExplorer } from './components/DatasetExplorer';
import { FieldExplorer } from './components/FieldExplorer';
import { BuilderEmptyState } from './components/BuilderEmptyState';
import { PreviewGrid } from './components/PreviewGrid';
import { PropertiesPanel } from './components/PropertiesPanel';
import { BuilderToolbar } from './components/BuilderToolbar';
import { StatusBar } from './components/StatusBar';
import { emptyDefinition, useReportBuilderState } from './hooks/useReportBuilderState';
import { normalizeFilterTree } from './filter-tree';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useAutoSave } from './hooks/useAutoSave';
import { downloadReportExport, reportBuilderApi } from './api/report-builder.api';
import { reportCenterApi } from '../api/report-center.api';
import { BuilderContextTip, getBuilderTip } from './components/BuilderContextTip';
import { REPORT_TEMPLATES } from './report-templates';

const PER_PAGE = 50;

function toBuilderDefinitionPayload(definition) {
  const { render_settings, dataset_key, ...rest } = definition;
  return rest;
}

function definitionToBuilderState(report) {
  const tags = Array.isArray(report.tags) ? report.tags.map((t) => (typeof t === 'string' ? t : t.name)) : [];
  const categoryId = report.category?.id ?? report.category_id ?? null;
  const definition = report.definition || {};
  return {
    ...emptyDefinition(report.dataset_key),
    ...definition,
    filters: normalizeFilterTree(definition.filters),
    dataset_key: report.dataset_key,
    formatting: definition.formatting || {},
    render_settings: {
      name: report.name || '',
      description: report.description || '',
      category_id: categoryId,
      tags,
      visibility: report.visibility || 'private',
    },
  };
}

export function ReportBuilderPage() {
  const { id: workspaceId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const editingId = searchParams.get('definition_id');
  const templateId = searchParams.get('template');
  const isAdvancedMode = searchParams.get('mode') === 'advanced';

  const [datasets, setDatasets] = useState([]);
  const [hub, setHub] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const { definition, update, undo, redo, reset, canUndo, canRedo } = useReportBuilderState();

  const [savedDefinitionId, setSavedDefinitionId] = useState(editingId ? Number(editingId) : null);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [durationMs, setDurationMs] = useState(null);
  const [dragItem, setDragItem] = useState(null);
  const debounceRef = useRef(null);

  const leftPanelRef = useRef(null);
  const rightPanelRef = useRef(null);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  // Saved reports open in the viewer — builder is edit-only (?mode=advanced)
  useEffect(() => {
    if (editingId && !isAdvancedMode && !templateId) {
      navigate(`/workspace/${workspaceId}/accounting/reports/view/${editingId}`, { replace: true });
    }
  }, [editingId, isAdvancedMode, templateId, navigate, workspaceId]);

  useEffect(() => {
    reportBuilderApi.datasets().then(({ data }) => setDatasets(data?.data ?? []));
    reportCenterApi.index().then(({ data }) => setHub(data?.data ?? null));
  }, []);

  // Bootstrap from template link or hub template card (sessionStorage)
  useEffect(() => {
    if (editingId || hydrated) return;
    const bootstrapRaw = sessionStorage.getItem('report_builder_bootstrap');
    if (bootstrapRaw) {
      try {
        const bootstrap = JSON.parse(bootstrapRaw);
        reset({
          ...bootstrap,
          filters: normalizeFilterTree(bootstrap.filters),
        });
        sessionStorage.removeItem('report_builder_bootstrap');
        setHydrated(true);
        return;
      } catch {
        sessionStorage.removeItem('report_builder_bootstrap');
      }
    }
    if (templateId) {
      const template = REPORT_TEMPLATES.find((t) => t.id === templateId);
      if (template) {
        reset({
          ...emptyDefinition(template.datasetKey),
          ...template.definition,
          filters: normalizeFilterTree(template.definition?.filters),
          render_settings: {
            name: template.label,
            description: template.description,
            category_id: null,
            tags: [],
            visibility: 'private',
          },
        });
      }
      setHydrated(true);
    }
  }, [templateId, editingId, hydrated, reset]);

  // Hydrate from an existing saved definition when opened for editing (?mode=advanced)
  useEffect(() => {
    if (!editingId || hydrated || !isAdvancedMode) return;

    let cancelled = false;

    (async () => {
      let found = null;
      if (hub) {
        const pool = [
          ...(hub.my_reports || []),
          ...(hub.custom_reports || []),
          ...(hub.shared_reports || []),
        ];
        found = pool.find((r) => String(r.id) === String(editingId)) || null;
      }

      if (!found) {
        try {
          const { data } = await reportCenterApi.showDefinition(editingId);
          found = data?.data ?? null;
        } catch {
          found = null;
        }
      }

      if (cancelled) return;
      if (found) {
        reset(definitionToBuilderState(found));
      }
      setHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId, hub, hydrated, isAdvancedMode]);

  // Mark ready when opening advanced builder with no pending hydration
  useEffect(() => {
    if (hydrated || editingId || templateId) return;
    if (sessionStorage.getItem('report_builder_bootstrap')) return;
    if (isAdvancedMode) setHydrated(true);
  }, [hydrated, editingId, templateId, isAdvancedMode]);

  const selectedDataset = useMemo(() => datasets.find((d) => d.key === definition.dataset_key), [datasets, definition.dataset_key]);
  const fields = selectedDataset?.fields ?? [];
  const filterableFields = fields.filter((f) => f.filterable);
  const sortableFields = fields.filter((f) => f.sortable);
  const groupableFields = fields.filter((f) => f.groupable);
  const aggregatableFields = fields.filter((f) => f.aggregatable);
  const numericFields = fields.filter((f) => f.is_numeric);

  const runPreview = useCallback((def, pageNum) => {
    if (!def.dataset_key || def.columns.length === 0) {
      setResult(null);
      return;
    }
    setLoading(true);
    setError(null);
    const startedAt = performance.now();
    reportBuilderApi
      .preview(def.dataset_key, toBuilderDefinitionPayload(def), pageNum, PER_PAGE)
      .then(({ data }) => {
        setResult(data?.data ?? null);
        setDurationMs(Math.round(performance.now() - startedAt));
      })
      .catch((err) => setError(err?.response?.data?.message || 'Failed to run report.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runPreview(definition, page), 400);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [definition, page, hydrated]);

  const handleSelectDataset = (key) => {
    const ds = datasets.find((d) => d.key === key);
    const starterColumns = (ds?.fields ?? []).slice(0, 5).map((f) => f.key);
    reset({ ...emptyDefinition(key), columns: starterColumns });
    setSavedDefinitionId(null);
    setSearchParams({}, { replace: true });
    setPage(1);
  };

  const handleUseTemplate = (template) => {
    reset({
      ...emptyDefinition(template.datasetKey),
      ...template.definition,
      filters: normalizeFilterTree(template.definition?.filters),
      render_settings: { name: template.label, description: template.description, category_id: null, tags: [], visibility: 'private' },
    });
    setSavedDefinitionId(null);
    setSearchParams({}, { replace: true });
    setPage(1);
  };

  const handleOpenReport = (report) => {
    reset(definitionToBuilderState(report));
    setSavedDefinitionId(report.id);
    setSearchParams({ definition_id: report.id }, { replace: true });
    setPage(1);
  };

  const buildSavePayload = () => ({
    source_type: 'custom',
    dataset_key: definition.dataset_key,
    name: definition.render_settings.name || 'Untitled report',
    description: definition.render_settings.description || null,
    category_id: definition.render_settings.category_id,
    tags: definition.render_settings.tags,
    definition: toBuilderDefinitionPayload(definition),
    visibility: definition.render_settings.visibility,
  });

  const { lastSavedAt, saving: autoSaving, markSavedNow } = useAutoSave(
    savedDefinitionId,
    definition,
    (payload) => reportCenterApi.updateDefinition(savedDefinitionId, {
      name: payload.render_settings.name || 'Untitled report',
      description: payload.render_settings.description || null,
      category_id: payload.render_settings.category_id,
      definition: toBuilderDefinitionPayload(payload),
      visibility: payload.render_settings.visibility,
    }),
  );

  const handleSave = useCallback(async (asNew = false) => {
    setSaving(true);
    try {
      let targetId = savedDefinitionId;
      if (savedDefinitionId && !asNew) {
        await reportCenterApi.updateDefinition(savedDefinitionId, buildSavePayload());
        markSavedNow();
      } else {
        const { data } = await reportCenterApi.createDefinition(buildSavePayload());
        targetId = data?.data?.id ?? null;
        setSavedDefinitionId(targetId);
        if (targetId) setSearchParams({ definition_id: targetId, mode: 'advanced' }, { replace: true });
      }
      if (targetId && !asNew) {
        navigate(`/workspace/${workspaceId}/accounting/reports/view/${targetId}`);
      }
    } finally {
      setSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedDefinitionId, definition, workspaceId, navigate]);

  const handleDuplicate = async () => {
    if (!savedDefinitionId) return;
    const { data } = await reportCenterApi.duplicateDefinition(savedDefinitionId);
    const newId = data?.data?.id ?? null;
    setSavedDefinitionId(newId);
    if (newId) setSearchParams({ definition_id: newId }, { replace: true });
  };

  const handleRun = useCallback(async () => {
    setRunning(true);
    const startedAt = performance.now();
    try {
      if (savedDefinitionId) {
        const { data } = await reportBuilderApi.run(savedDefinitionId, page, PER_PAGE);
        setResult(data?.data ?? null);
        setDurationMs(Math.round(performance.now() - startedAt));
      } else {
        runPreview(definition, page);
      }
    } finally {
      setRunning(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedDefinitionId, page, definition]);

  const handleExport = async (format) => {
    if (!savedDefinitionId) return;
    const { data } = await reportBuilderApi.export(savedDefinitionId, format);
    downloadReportExport(data, definition.render_settings.name, format);
  };

  const handleResetReport = () => reset(emptyDefinition(definition.dataset_key));

  useKeyboardShortcuts({
    save: () => handleSave(false),
    undo,
    redo,
    run: handleRun,
    reset: handleResetReport,
  });

  const toggleLeft = () => {
    const panel = leftPanelRef.current;
    if (!panel) return;
    if (panel.isCollapsed()) panel.expand();
    else panel.collapse();
  };
  const toggleRight = () => {
    const panel = rightPanelRef.current;
    if (!panel) return;
    if (panel.isCollapsed()) panel.expand();
    else panel.collapse();
  };

  const handleSortColumn = (fieldKey, direction) => {
    update((d) => ({ ...d, sort: [{ field: fieldKey, direction }] }));
  };
  const handleRemoveColumn = (fieldKey) => {
    update((d) => ({ ...d, columns: d.columns.filter((k) => k !== fieldKey) }));
  };

  // --- Drag & drop: available fields (sidebar) -> selected columns (sidebar list, sortable) or preview grid (drop-to-add) ---
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragStart = (event) => {
    const id = String(event.active.id);
    if (id.startsWith('avail:')) {
      const key = id.slice('avail:'.length);
      setDragItem(fields.find((f) => f.key === key)?.label || key);
    } else if (id.startsWith('col:')) {
      const key = id.slice('col:'.length);
      setDragItem(fields.find((f) => f.key === key)?.label || key);
    }
  };

  const handleDragEnd = (event) => {
    setDragItem(null);
    const { active, over } = event;
    if (!active?.id || !over?.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId.startsWith('avail:')) {
      const key = activeId.slice('avail:'.length);
      if (!definition.columns.includes(key)) {
        update((d) => ({ ...d, columns: [...d.columns, key] }));
      }
      return;
    }

    if (activeId.startsWith('col:') && overId.startsWith('col:')) {
      const from = activeId.slice('col:'.length);
      const to = overId.slice('col:'.length);
      if (from === to) return;
      const cols = [...definition.columns];
      const oldIndex = cols.indexOf(from);
      const newIndex = cols.indexOf(to);
      if (oldIndex === -1 || newIndex === -1) return;
      cols.splice(oldIndex, 1);
      cols.splice(newIndex, 0, from);
      update((d) => ({ ...d, columns: cols }));
    }
  };

  const recentCustomReports = useMemo(
    () =>
      (hub?.recent ?? [])
        .filter((v) => v.favoritable_kind === 'definition' && v.report_definition?.dataset_key)
        .map((v) => v.report_definition),
    [hub],
  );

  const popularReports = useMemo(() => {
    const pool = [...(hub?.my_reports ?? []), ...(hub?.custom_reports ?? []), ...(hub?.shared_reports ?? [])];
    const byId = new Map();
    pool.forEach((r) => {
      if (r.dataset_key && r.last_run_at) byId.set(r.id, r);
    });
    return [...byId.values()].sort((a, b) => new Date(b.last_run_at) - new Date(a.last_run_at));
  }, [hub]);

  const reportStatus = running || loading ? 'running' : savedDefinitionId ? 'saved' : 'draft';

  const contextTip = getBuilderTip({
    datasetKey: definition.dataset_key,
    columns: definition.columns,
    groupBy: definition.group_by,
    filters: definition.filters,
  });

  // New users landing on bare /builder are guided to the wizard
  useEffect(() => {
    if (!hydrated || editingId || templateId || isAdvancedMode) return;
    if (!definition.dataset_key) {
      navigate(`/workspace/${workspaceId}/accounting/reports/create`, { replace: true });
    }
  }, [hydrated, editingId, templateId, isAdvancedMode, definition.dataset_key, navigate, workspaceId]);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-[calc(100vh-4rem)] w-full min-w-0 flex-col bg-[#F1F5F9]">
        <div className="flex items-center gap-2 border-b border-slate-200/80 bg-white px-5 py-2">
          {savedDefinitionId ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 rounded-lg px-2 text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              onClick={() => navigate(`/workspace/${workspaceId}/accounting/reports/view/${savedDefinitionId}`)}
            >
              <ArrowLeft className="size-3.5" />
              Back to report
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 rounded-lg px-2 text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              onClick={() => navigate(`/workspace/${workspaceId}/accounting/reports`)}
            >
              <ArrowLeft className="size-3.5" />
              Reports
            </Button>
          )}
          <span className="text-slate-300">/</span>
          <span className="text-xs font-medium text-slate-500">Custom builder</span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-1 h-7 gap-1.5 rounded-lg px-2 text-xs text-blue-600 hover:bg-blue-50 hover:text-blue-700"
            asChild
          >
            <Link to={`/workspace/${workspaceId}/accounting/reports/create`}>
              <Sparkles className="size-3.5" />
              Guided setup
            </Link>
          </Button>
          <div className="ml-auto flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/80 p-0.5">
            <PanelToggleButton onClick={toggleLeft} collapsed={leftCollapsed} side="left" />
            <PanelToggleButton onClick={toggleRight} collapsed={rightCollapsed} side="right" />
          </div>
        </div>

        <BuilderToolbar
          name={definition.render_settings.name}
          datasetLabel={selectedDataset?.label}
          onNameChange={(name) => update((d) => ({ ...d, render_settings: { ...d.render_settings, name } }))}
          onSave={() => handleSave(false)}
          onSaveAs={() => handleSave(true)}
          onDuplicate={handleDuplicate}
          onRun={handleRun}
          onExport={handleExport}
          onReset={handleResetReport}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          savedDefinitionId={savedDefinitionId}
          saving={saving}
          running={running}
          lastSavedAt={lastSavedAt}
          autoSaving={autoSaving}
        />

        <div className="relative flex min-h-0 flex-1">
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel
              ref={leftPanelRef}
              defaultSize={24}
              minSize={18}
              maxSize={34}
              collapsible
              collapsedSize={0}
              onCollapse={() => setLeftCollapsed(true)}
              onExpand={() => setLeftCollapsed(false)}
              className="overflow-hidden border-r border-slate-200/80 bg-white"
            >
              {!definition.dataset_key ? (
                <DatasetExplorer datasets={datasets} onSelect={handleSelectDataset} />
              ) : (
                <FieldExplorer
                  datasetLabel={selectedDataset?.label}
                  fields={fields}
                  selectedKeys={definition.columns}
                  onChange={(columns) => update((d) => ({ ...d, columns }))}
                  onBack={() => update((d) => ({ ...d, dataset_key: null, columns: [] }))}
                />
              )}
            </ResizablePanel>

            <ResizableHandle withHandle className="w-1.5 bg-transparent transition-colors hover:bg-blue-100" />

            <ResizablePanel defaultSize={52} minSize={30}>
              <div className="flex h-full flex-col overflow-auto bg-[radial-gradient(ellipse_at_top,_rgba(239,246,255,0.7),_transparent_55%),linear-gradient(180deg,#F8FAFC_0%,#F1F5F9_100%)] p-4 lg:p-5">
                {definition.dataset_key ? (
                  <BuilderContextTip tip={contextTip} className="mb-3.5 shrink-0" />
                ) : null}
                {!definition.dataset_key ? (
                  <BuilderEmptyState
                    recentReports={recentCustomReports}
                    popularReports={popularReports}
                    onStartBlank={() => leftPanelRef.current?.expand()}
                    onUseTemplate={handleUseTemplate}
                    onOpenReport={handleOpenReport}
                  />
                ) : (
                  <PreviewGrid
                    result={result}
                    loading={loading}
                    error={error}
                    page={page}
                    perPage={PER_PAGE}
                    onPageChange={setPage}
                    formatting={definition.formatting}
                    currentSort={definition.sort}
                    onSortColumn={handleSortColumn}
                    onRemoveColumn={handleRemoveColumn}
                  />
                )}
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle className="w-1.5 bg-transparent transition-colors hover:bg-blue-100" />

            <ResizablePanel
              ref={rightPanelRef}
              defaultSize={24}
              minSize={18}
              maxSize={34}
              collapsible
              collapsedSize={0}
              onCollapse={() => setRightCollapsed(true)}
              onExpand={() => setRightCollapsed(false)}
              className="overflow-hidden border-l border-slate-200/80 bg-white"
            >
              <PropertiesPanel
                filterableFields={filterableFields}
                sortableFields={sortableFields}
                groupableFields={groupableFields}
                aggregatableFields={aggregatableFields}
                numericFields={numericFields}
                definition={definition}
                categories={hub?.categories ?? []}
                onUpdate={(patch) => update((d) => ({ ...d, ...patch }))}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        <StatusBar
          datasetLabel={selectedDataset?.label}
          result={result}
          loading={loading}
          durationMs={durationMs}
          filters={definition.filters}
          status={reportStatus}
        />
      </div>

      <DragOverlay>
        {dragItem ? (
          <div className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-lg shadow-blue-900/10 ring-1 ring-blue-100">
            {dragItem}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function PanelToggleButton({ onClick, collapsed, side }) {
  const Icon = side === 'left' ? (collapsed ? PanelLeftOpen : PanelLeftClose) : collapsed ? PanelRightOpen : PanelRightClose;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className="inline-flex size-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white hover:text-slate-700"
        >
          <Icon className="size-3.5" strokeWidth={1.75} />
        </button>
      </TooltipTrigger>
      <TooltipContent>{collapsed ? `Show ${side} panel` : `Hide ${side} panel`}</TooltipContent>
    </Tooltip>
  );
}
