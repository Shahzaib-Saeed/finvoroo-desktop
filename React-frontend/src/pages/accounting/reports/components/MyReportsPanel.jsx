import { useMemo, useState } from 'react';
import {
  ChevronDown,
  Copy,
  FileSpreadsheet,
  FolderKanban,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Share2,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input, InputWrapper } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { REPORT_TEMPLATES } from '../builder/report-templates';
import { reportCenterApi } from '../api/report-center.api';
import {
  definitionOpenPath,
  recordViewPayload,
} from '../lib/report-definition-links';
import { datasetLabel } from '../lib/dataset-label';
import { ReportShareModal } from './ReportShareModal';
import { ReportTile, BuildNewCustomViewCard, REPORT_HUB_GRID_CLASS } from './ReportCard';

const SORT_OPTIONS = [
  { id: 'updated', label: 'Last Modified' },
  { id: 'name', label: 'Name' },
  { id: 'created', label: 'Date Created' },
  { id: 'last_run', label: 'Last Run' },
];

const SUGGESTED_PRESETS = [
  {
    label: 'Monthly AR Aging Summary',
    description: 'Track overdue accounts across 30, 60, and 90+ day buckets.',
    templateId: 'customer-invoice-ledger',
  },
  {
    label: 'Sales by Customer',
    description: 'Invoiced revenue grouped and totaled by customer account.',
    templateId: 'sales-by-customer',
  },
];

function MyReportCard({
  definition,
  workspaceBase,
  standardItemsByKey,
  onArchived,
  onUpdated,
}) {
  const openPath = definitionOpenPath(definition, workspaceBase, standardItemsByKey);
  const category = datasetLabel(definition.dataset_key);

  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState(definition.name || '');
  const [description, setDescription] = useState(definition.description || '');
  const [saving, setSaving] = useState(false);

  const trackOpen = () => {
    const payload = recordViewPayload(definition);
    if (payload) reportCenterApi.recordView(payload).catch(() => {});
  };

  const handleDuplicate = async () => {
    try {
      const { data } = await reportCenterApi.duplicateDefinition(definition.id);
      toast.success('Report duplicated');
      onUpdated?.(data?.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not duplicate report.');
    }
  };

  const handleArchive = async () => {
    try {
      await reportCenterApi.archiveDefinition(definition.id);
      toast.success(`"${definition.name}" deleted`);
      onArchived?.(definition.id);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not delete this report.');
    }
  };

  const handleRename = async () => {
    setSaving(true);
    try {
      await reportCenterApi.updateDefinition(definition.id, {
        name: name.trim() || definition.name,
        description: description.trim() || null,
      });
      toast.success('Report updated');
      onUpdated?.({
        ...definition,
        name: name.trim() || definition.name,
        description: description.trim() || null,
      });
      setRenameOpen(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not update report.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ReportTile
        title={definition.name}
        description={definition.description || category}
        path={openPath}
        icon={FileSpreadsheet}
        onNavigate={trackOpen}
        menuSlot={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                  className="size-6 p-0 text-slate-400 hover:text-slate-700"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <ReportShareModal
                definitionId={definition.id}
                trigger={
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Share2 className="size-3.5" />
                    Share
                  </DropdownMenuItem>
                }
              />
              <DropdownMenuItem
                onClick={() => {
                  setName(definition.name || '');
                  setDescription(definition.description || '');
                  setRenameOpen(true);
                }}
              >
                <Pencil className="size-3.5" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="size-3.5" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="size-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this report?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{definition.name}&rdquo; will be permanently removed from
              your custom views. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={(e) => {
                e.preventDefault();
                setDeleteOpen(false);
                handleArchive();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename report</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Name</Label>
              <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea
                className="mt-1 min-h-20"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={saving || !name.trim()}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SuggestedTemplateCard({ suggestion, onUse }) {
  if (!suggestion) return null;
  return (
    <div className="group relative flex gap-3 rounded-lg border border-slate-200 bg-white p-3.5 hover:border-slate-300 hover:shadow-sm">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
        <Sparkles className="size-[18px]" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1 pr-2">
        <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Suggested
        </span>
        <p className="mt-1.5 text-sm font-semibold leading-snug text-slate-900">
          {suggestion.label}
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
          {suggestion.description}
        </p>
        <button
          type="button"
          onClick={() => onUse?.(suggestion.template)}
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-slate-900 transition-colors hover:text-slate-600"
        >
          <Plus className="size-3" />
          Save to My Reports
        </button>
      </div>
    </div>
  );
}

export function MyReportsPanel({
  reports = [],
  workspaceBase,
  standardItemsByKey,
  favoritedDefinitionIds,
  onFavoriteDefinitionChange,
  onDefinitionArchived,
  onDefinitionUpdated,
  onUseTemplate,
}) {
  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState('updated');

  const suggestion = useMemo(() => {
    const usedNames = new Set((reports || []).map((r) => (r.name || '').toLowerCase()));
    const preset =
      SUGGESTED_PRESETS.find((p) => !usedNames.has(p.label.toLowerCase())) ||
      SUGGESTED_PRESETS[0];
    const template =
      REPORT_TEMPLATES.find((t) => t.id === preset.templateId) ||
      REPORT_TEMPLATES.find((t) => t.category === 'sales') ||
      REPORT_TEMPLATES[0];
    if (!template) return null;
    return {
      label: preset.label,
      description: preset.description,
      template,
    };
  }, [reports]);

  const sorted = useMemo(() => {
    const q = filter.trim().toLowerCase();
    let list = reports;
    if (q) {
      list = list.filter(
        (r) =>
          (r.name || '').toLowerCase().includes(q) ||
          (r.description || '').toLowerCase().includes(q) ||
          (r.dataset_key || '').toLowerCase().includes(q) ||
          datasetLabel(r.dataset_key).toLowerCase().includes(q),
      );
    }
    const copy = [...list];
    copy.sort((a, b) => {
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'created') {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
      if (sortBy === 'last_run') {
        return new Date(b.last_run_at || 0) - new Date(a.last_run_at || 0);
      }
      return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
    });
    return copy;
  }, [reports, filter, sortBy]);

  const sortLabel = SORT_OPTIONS.find((o) => o.id === sortBy)?.label || 'Last Modified';

  return (
    <div className="space-y-4">
      {/* Section header — matches Standard Reports */}
      <div className="mb-1">
        <div className="flex items-center gap-2">
          <span className="size-2 shrink-0 rounded-full bg-violet-500" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            My Reports
          </h2>
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded bg-slate-100 px-1.5 text-[10px] font-bold tabular-nums text-slate-600">
            {reports.length}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Tailored views built for your business workflow
        </p>
      </div>

      {/* Filter + sort toolbar */}
      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:px-4">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <InputWrapper className="h-9 border-slate-200 bg-white">
              <Search className="size-4 shrink-0 text-slate-400" />
              <Input
                type="search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter my reports…"
                autoComplete="off"
                className="text-sm placeholder:text-slate-400"
              />
            </InputWrapper>
            {filter ? (
              <button
                type="button"
                onClick={() => setFilter('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-700"
                aria-label="Clear filter"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 shrink-0 gap-1.5 border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              >
                Sort: {sortLabel}
                <ChevronDown className="size-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {SORT_OPTIONS.map((opt) => (
                <DropdownMenuItem key={opt.id} onClick={() => setSortBy(opt.id)}>
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {filter && sorted.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/40 py-12 text-center">
          <FolderKanban className="size-8 text-slate-300" strokeWidth={1.5} />
          <p className="mt-3 text-sm font-semibold text-slate-900">
            No reports match “{filter.trim()}”
          </p>
          <Button
            className="mt-3"
            size="sm"
            variant="outline"
            onClick={() => setFilter('')}
          >
            Clear filter
          </Button>
        </div>
      ) : (
        <div className={REPORT_HUB_GRID_CLASS}>
          {sorted.map((def) => (
            <MyReportCard
              key={def.id}
              definition={def}
              workspaceBase={workspaceBase}
              standardItemsByKey={standardItemsByKey}
              onArchived={onDefinitionArchived}
              onUpdated={onDefinitionUpdated}
            />
          ))}

          <BuildNewCustomViewCard
            to={`${workspaceBase}/accounting/reports/create`}
          />

          <SuggestedTemplateCard
            suggestion={suggestion}
            onUse={onUseTemplate}
          />
        </div>
      )}
    </div>
  );
}
