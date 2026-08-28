import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Inbox, Loader2, MoreHorizontal, Trash2 } from 'lucide-react';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { reportCenterApi } from '../api/report-center.api';
import {
  definitionOpenPath,
  recentViewPath,
  recentViewRecordPayload,
  recordViewPayload,
} from '../lib/report-definition-links';

/**
 * List-style panels for the Reports & Analytics Center hub's My Reports /
 * Shared with Me / Favorites / Recent tabs.
 */
function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center py-14 text-center">
      <Inbox className="size-8 text-slate-300" strokeWidth={1.5} />
      <p className="mt-3 max-w-sm text-sm text-slate-500">{message}</p>
    </div>
  );
}

function trackReportOpen(definition) {
  const payload = recordViewPayload(definition);
  if (!payload) return;
  reportCenterApi.recordView(payload).catch(() => {});
}

function DefinitionRow({
  definition,
  workspaceBase,
  standardItemsByKey,
  canDelete = false,
  onArchived,
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const openPath = definitionOpenPath(definition, workspaceBase, standardItemsByKey);
  const isCustom = definition.source_type === 'custom' || Boolean(definition.dataset_key);

  const handleOpen = () => {
    trackReportOpen(definition);
  };

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

  return (
    <>
      <div className="group flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3.5 transition-colors hover:border-slate-300 hover:bg-slate-50/50">
        <Link
          to={openPath}
          onClick={handleOpen}
          className="min-w-0 flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 rounded-sm"
        >
          <p className="text-sm font-semibold text-slate-900 group-hover:text-slate-950">
            {definition.name}
          </p>
          {definition.description ? (
            <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{definition.description}</p>
          ) : null}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {definition.category ? (
              <Badge variant="secondary" appearance="light" size="sm">
                {definition.category.label}
              </Badge>
            ) : null}
            <Badge variant="outline" size="sm" className="capitalize">
              {definition.visibility}
            </Badge>
            {isCustom ? (
              <Badge variant="secondary" appearance="light" size="sm">
                Custom
              </Badge>
            ) : (
              <Badge variant="secondary" appearance="light" size="sm">
                Saved standard
              </Badge>
            )}
            {definition.created_by_name ? (
              <span className="text-[11px] text-slate-400">by {definition.created_by_name}</span>
            ) : null}
          </div>
        </Link>

        <div className="flex shrink-0 items-center gap-1.5">
          {definition.last_run_at ? (
            <span className="hidden text-[11px] text-slate-400 sm:inline">
              Last run {new Date(definition.last_run_at).toLocaleDateString()}
            </span>
          ) : null}
          <Button size="sm" variant="outline" asChild className="h-8">
            <Link to={openPath} onClick={handleOpen}>
              <ExternalLink className="size-3.5" />
              Open
            </Link>
          </Button>
          {canDelete ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="size-8 p-0"
                  aria-label="Report actions"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete report?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{definition.name}&rdquo; will be removed from My Reports. This cannot be undone.
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

export function DefinitionListPanel({
  definitions,
  emptyMessage,
  workspaceBase,
  standardItemsByKey,
  canDelete = false,
  onArchived,
}) {
  if (!definitions?.length) {
    return <EmptyState message={emptyMessage} />;
  }
  return (
    <div className="flex flex-col gap-2">
      {definitions.map((d) => (
        <DefinitionRow
          key={d.id}
          definition={d}
          workspaceBase={workspaceBase}
          standardItemsByKey={standardItemsByKey}
          canDelete={canDelete}
          onArchived={onArchived}
        />
      ))}
    </div>
  );
}

export function FavoritesPanel({ favorites, standardItemsByKey, workspaceBase, onArchived }) {
  if (!favorites?.length) {
    return <EmptyState message="Star a report from the Browse tab to pin it here." />;
  }
  return (
    <div className="flex flex-col gap-2">
      {favorites.map((favorite, idx) => {
        if (favorite.favoritable_kind === 'standard') {
          const item = standardItemsByKey.get(favorite.standard_report_key);
          const path = item ? item.path : `${workspaceBase}/accounting/reports`;
          return (
            <Link
              key={`std-${favorite.standard_report_key}-${idx}`}
              to={path}
              onClick={() => {
                reportCenterApi
                  .recordView({
                    favoritable_kind: 'standard',
                    standard_report_key: favorite.standard_report_key,
                  })
                  .catch(() => {});
              }}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3.5 hover:border-slate-300 hover:bg-slate-50/80"
            >
              <span className="text-sm font-semibold text-slate-900">
                {item?.title || favorite.standard_report_key}
              </span>
              <Badge variant="secondary" appearance="light" size="sm">
                Standard
              </Badge>
            </Link>
          );
        }
        return favorite.report_definition ? (
          <DefinitionRow
            key={`def-${favorite.report_definition.id}`}
            definition={favorite.report_definition}
            workspaceBase={workspaceBase}
            standardItemsByKey={standardItemsByKey}
            onArchived={onArchived}
          />
        ) : null;
      })}
    </div>
  );
}

export function RecentPanel({ recent, standardItemsByKey, workspaceBase }) {
  if (!recent?.length) {
    return <EmptyState message="Reports you open will show up here." />;
  }
  return (
    <div className="flex flex-col gap-2">
      {recent.map((view) => {
        const label =
          view.favoritable_kind === 'standard'
            ? standardItemsByKey.get(view.standard_report_key)?.title || view.standard_report_key
            : view.report_definition?.name || 'Deleted report';
        const path = recentViewPath(view, workspaceBase, standardItemsByKey);

        return (
          <Link
            key={view.id}
            to={path}
            onClick={() => {
              const payload = recentViewRecordPayload(view);
              if (payload) reportCenterApi.recordView(payload).catch(() => {});
            }}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3.5 hover:border-slate-300 hover:bg-slate-50/80"
          >
            <span className="text-sm font-semibold text-slate-900">{label}</span>
            <span className="text-[11px] text-slate-400">
              {new Date(view.viewed_at).toLocaleString()}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
