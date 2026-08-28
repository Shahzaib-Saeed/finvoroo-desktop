import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Copy,
  Download,
  Edit3,
  ExternalLink,
  Loader2,
  MoreHorizontal,
  Pencil,
  Play,
  Share2,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { reportCenterApi } from '../api/report-center.api';
import { downloadReportExport, reportBuilderApi } from '../builder/api/report-builder.api';
import { datasetDescription, datasetIcon } from '../builder/dataset-meta';
import { ReportFavoriteToggle } from './ReportFavoriteToggle';
import { ReportShareModal } from './ReportShareModal';
import { definitionEditPath, definitionOpenPath, recordViewPayload } from '../lib/report-definition-links';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function trackOpen(definition) {
  const payload = recordViewPayload(definition);
  if (payload) reportCenterApi.recordView(payload).catch(() => {});
}

export function ReportDefinitionCard({
  definition,
  workspaceBase,
  standardItemsByKey,
  canDelete = false,
  canManage = true,
  isFavorited = false,
  onFavoriteChange,
  onUpdated,
  onArchived,
  className,
  compact = false,
  showHoverActions = false,
  premium = false,
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(definition.name || '');
  const [description, setDescription] = useState(definition.description || '');

  const openPath = definitionOpenPath(definition, workspaceBase, standardItemsByKey);
  const editPath = definitionEditPath(definition, workspaceBase);
  const Icon = datasetIcon(definition.dataset_key);
  const isCustom = definition.source_type === 'custom' || Boolean(definition.dataset_key);
  const datasetLabel = definition.dataset_key?.split('.').pop()?.replace(/_/g, ' ') || 'Custom';

  const meta = useMemo(
    () =>
      [
        { label: 'Created', value: formatDate(definition.created_at) },
        { label: 'Updated', value: formatDate(definition.updated_at) },
        { label: 'Last run', value: formatDate(definition.last_run_at) },
        definition.created_by_name ? { label: 'Owner', value: definition.created_by_name } : null,
      ].filter(Boolean),
    [definition],
  );

  const handleArchive = async () => {
    setArchiving(true);
    try {
      await reportCenterApi.archiveDefinition(definition.id);
      toast.success(`"${definition.name}" deleted`);
      onArchived?.(definition.id);
      setDeleteOpen(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not delete this report.');
    } finally {
      setArchiving(false);
    }
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

  const handleRename = async () => {
    setSaving(true);
    try {
      await reportCenterApi.updateDefinition(definition.id, {
        name: name.trim() || definition.name,
        description: description.trim() || null,
      });
      toast.success('Report updated');
      onUpdated?.({ ...definition, name: name.trim(), description: description.trim() });
      setRenameOpen(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not update report.');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (format) => {
    if (!isCustom || !definition.id) return;
    try {
      const { data } = await reportBuilderApi.export(definition.id, format);
      downloadReportExport(data, definition.name, format);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Export failed.');
    }
  };

  return (
    <>
      <article
        className={cn(
          'group relative flex h-full flex-col rounded-xl border border-slate-200/80 bg-white',
          'shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-200',
          'hover:border-slate-300 hover:shadow-md',
          className,
        )}
      >
        <div className="flex items-start gap-3 p-4 pb-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-600 ring-1 ring-slate-200/80">
            <Icon className="size-5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <Link
                to={openPath}
                onClick={() => trackOpen(definition)}
                className="min-w-0 text-base font-semibold text-slate-900 hover:text-slate-950"
              >
                {definition.name}
              </Link>
              <div className="flex shrink-0 items-center gap-0.5">
                {canManage && isCustom ? (
                  <ReportFavoriteToggle
                    favoritableKind="definition"
                    reportDefinitionId={definition.id}
                    isFavorited={isFavorited}
                    onChange={onFavoriteChange}
                  />
                ) : null}
                {canManage ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="ghost" size="sm" className="size-8 p-0 opacity-70 group-hover:opacity-100">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem asChild>
                        <Link to={openPath} onClick={() => trackOpen(definition)}>
                          <ExternalLink className="size-4" />
                          Open
                        </Link>
                      </DropdownMenuItem>
                      {isCustom ? (
                        <DropdownMenuItem asChild>
                          <Link to={editPath}>
                            <Edit3 className="size-4" />
                            Edit report
                          </Link>
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuItem onClick={() => setRenameOpen(true)}>
                        <Pencil className="size-4" />
                        Rename
                      </DropdownMenuItem>
                      {isCustom ? (
                        <DropdownMenuItem onClick={handleDuplicate}>
                          <Copy className="size-4" />
                          Duplicate
                        </DropdownMenuItem>
                      ) : null}
                      {isCustom && definition.id ? (
                        <ReportShareModal
                          definitionId={definition.id}
                          trigger={
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Share2 className="size-4" />
                              Share
                            </DropdownMenuItem>
                          }
                        />
                      ) : null}
                      {isCustom && definition.id ? (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleExport('csv')}>
                            <Download className="size-4" />
                            Export CSV
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                            <Download className="size-4" />
                            Export Excel
                          </DropdownMenuItem>
                        </>
                      ) : null}
                      {canDelete ? (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setDeleteOpen(true)}>
                            <Trash2 className="size-4" />
                            Delete
                          </DropdownMenuItem>
                        </>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </div>
            </div>
            {definition.description && !compact ? (
              <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-500">{definition.description}</p>
            ) : null}
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {isCustom ? (
                <Badge variant="secondary" appearance="light" size="sm" className="capitalize">
                  {datasetLabel}
                </Badge>
              ) : (
                <Badge variant="secondary" appearance="light" size="sm">
                  Saved standard
                </Badge>
              )}
              <Badge variant="outline" size="sm" className="capitalize">
                {definition.visibility}
              </Badge>
              {definition.category?.label ? (
                <Badge variant="outline" size="sm">
                  {definition.category.label}
                </Badge>
              ) : null}
              {(definition.tags || []).slice(0, 2).map((tag) => (
                <Badge key={typeof tag === 'string' ? tag : tag.name} variant="outline" size="sm">
                  {typeof tag === 'string' ? tag : tag.name}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {!compact ? (
          <div className="grid grid-cols-2 gap-px border-t border-slate-100 bg-slate-100 sm:grid-cols-4">
            {meta.map((item) => (
              <div key={item.label} className="bg-white px-4 py-2.5">
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{item.label}</p>
                <p className="mt-0.5 truncate text-xs font-medium text-slate-700">{item.value}</p>
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-3">
          {!showHoverActions ? (
            <>
              <p className="truncate text-[11px] text-slate-400">
                {isCustom ? datasetDescription(definition.dataset_key) : 'Opens with your saved filters'}
              </p>
              <Button size="sm" variant="outline" className="h-8 shrink-0 rounded-lg" asChild>
                <Link to={openPath} onClick={() => trackOpen(definition)}>
                  Open
                </Link>
              </Button>
            </>
          ) : (
            <>
              <p className="truncate text-[11px] text-slate-400">
                {definition.created_by_name ? `By ${definition.created_by_name}` : datasetLabel}
              </p>
              <div className="flex items-center gap-1 opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100">
                <Button size="sm" className="h-8 gap-1 rounded-lg shadow-sm" asChild>
                  <Link to={openPath} onClick={() => trackOpen(definition)}>
                    <Play className="size-3 fill-current" />
                    Open
                  </Link>
                </Button>
                {isCustom ? (
                  <Button size="sm" variant="outline" className="h-8 rounded-lg px-2.5" asChild>
                    <Link to={editPath}>
                      <Edit3 className="size-3.5" />
                    </Link>
                  </Button>
                ) : null}
                {isCustom ? (
                  <Button size="sm" variant="ghost" className="h-8 px-2" onClick={handleDuplicate}>
                    <Copy className="size-3.5" />
                  </Button>
                ) : null}
                {isCustom && definition.id ? (
                  <ReportShareModal
                    definitionId={definition.id}
                    trigger={
                      <Button size="sm" variant="ghost" className="h-8 px-2">
                        <Share2 className="size-3.5" />
                      </Button>
                    }
                  />
                ) : null}
              </div>
            </>
          )}
        </div>
      </article>

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
              <Textarea className="mt-1 min-h-20" value={description} onChange={(e) => setDescription(e.target.value)} />
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

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete report?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{definition.name}&rdquo; will be removed permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={archiving}
              className="bg-red-600 hover:bg-red-700"
              onClick={(e) => {
                e.preventDefault();
                handleArchive();
              }}
            >
              {archiving ? <Loader2 className="size-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function ReportDefinitionCardGrid({ children, className }) {
  return (
    <div className={cn('grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4', className)}>
      {children}
    </div>
  );
}
