import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  FileSpreadsheet,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ReportFavoriteToggle } from "./ReportFavoriteToggle";

/** Equal-height tiles in each grid row. */
export const REPORT_HUB_CARD_HEIGHT = "h-full";

const cardSurfaceClass = cn(
  "relative flex h-full w-full items-start gap-3 overflow-hidden rounded-xl px-3 py-2.5 no-underline hover:no-underline",
  "border border-border/70 bg-card shadow-xs",
  "transition-[box-shadow,border-color,background-color] duration-150",
  "hover:border-border hover:bg-muted/30",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25",
);

function CardIcon({ icon: Icon, iconClass }) {
  if (!Icon) return null;
  return (
    <div
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-md border border-slate-200/80 bg-slate-50 text-slate-600 ring-1 ring-slate-200/60",
        "transition-colors duration-150",
        "group-hover:border-primary/20 group-hover:bg-primary/5 group-hover:text-primary",
        iconClass,
      )}
    >
      <Icon className="size-3.5 transition-colors duration-150" strokeWidth={2} />
    </div>
  );
}

function CardHeaderActions({
  menuSlot,
  editPath,
  onDeleteRequest,
  favoriteSlot,
  isFavorited = false,
  stop,
}) {
  return (
    <div className="-mr-1 flex shrink-0 items-center gap-0">
      {favoriteSlot ? (
        <div
          className={cn(
            "opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100",
            isFavorited && "opacity-100",
          )}
          onClick={stop}
          onKeyDown={stop}
        >
          {favoriteSlot}
        </div>
      ) : null}

      <span
        className="inline-flex size-6 items-center justify-center text-primary opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
        aria-hidden
      >
        <ArrowRight className="size-3.5" strokeWidth={2.25} />
      </span>

      {menuSlot ? (
        <div onClick={stop} onKeyDown={stop}>
          {menuSlot}
        </div>
      ) : editPath || onDeleteRequest ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="size-6 p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={stop}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36" onClick={stop}>
            {editPath ? (
              <DropdownMenuItem asChild>
                <Link to={editPath} className="no-underline">
                  <Pencil className="size-3.5" />
                  Edit
                </Link>
              </DropdownMenuItem>
            ) : null}
            {onDeleteRequest ? (
              <>
                {editPath ? <DropdownMenuSeparator /> : null}
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600"
                  onClick={(e) => {
                    e.preventDefault();
                    onDeleteRequest();
                  }}
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}

export function ReportTile({
  title,
  description,
  metaLine,
  path,
  editPath,
  onDelete,
  onNavigate,
  icon,
  iconClass,
  menuSlot,
  standardReportKey,
  reportDefinitionId,
  isFavorited = false,
  onFavoriteChange,
}) {
  const stop = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const [deleteOpen, setDeleteOpen] = useState(false);
  const Icon = icon || FileSpreadsheet;

  const favoriteSlot =
    standardReportKey || reportDefinitionId ? (
      <ReportFavoriteToggle
        favoritableKind={standardReportKey ? "standard" : "definition"}
        standardReportKey={standardReportKey}
        reportDefinitionId={reportDefinitionId}
        isFavorited={isFavorited}
        onChange={onFavoriteChange}
        className="size-6"
      />
    ) : null;

  return (
    <>
      <Link
        to={path}
        onClick={() => onNavigate?.(path)}
        aria-label={`Open ${title}`}
        className={cn("group", cardSurfaceClass)}
      >
        <CardIcon icon={Icon} iconClass={iconClass} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 flex-1 text-[14px] font-semibold leading-snug tracking-tight text-foreground">
              {title}
            </h3>

            <CardHeaderActions
              menuSlot={menuSlot}
              editPath={editPath}
              onDeleteRequest={onDelete ? () => setDeleteOpen(true) : undefined}
              favoriteSlot={favoriteSlot}
              isFavorited={isFavorited}
              stop={stop}
            />
          </div>

          {description || metaLine ? (
            <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-muted-foreground">
              {description || metaLine}
            </p>
          ) : null}
        </div>
      </Link>

      {onDelete ? (
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this report?</AlertDialogTitle>
              <AlertDialogDescription>
                &ldquo;{title}&rdquo; will be permanently removed from your
                custom views. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={(e) => {
                  e.preventDefault();
                  setDeleteOpen(false);
                  onDelete();
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </>
  );
}

export function ReportCard(props) {
  return <ReportTile {...props} />;
}

export function ReportListRow(props) {
  return <ReportTile {...props} />;
}

export function BuildNewCustomViewCard({ to }) {
  return (
    <Link
      to={to}
      className={cn(
        "group flex h-full w-full items-start gap-3 rounded-xl px-3 py-2.5 no-underline hover:no-underline",
        "border border-dashed border-border bg-card/50 shadow-xs",
        "transition-[border-color,background-color] duration-150",
        "hover:border-primary/30 hover:bg-primary/5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25",
      )}
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary">
        <Plus className="size-3.5" strokeWidth={2.25} />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="text-[14px] font-semibold leading-snug text-foreground">
          Build new custom view
        </p>
        <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-muted-foreground">
          Filters, formulas, and custom columns
        </p>
      </div>
    </Link>
  );
}

export const REPORT_HUB_GRID_CLASS =
  "grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4";
