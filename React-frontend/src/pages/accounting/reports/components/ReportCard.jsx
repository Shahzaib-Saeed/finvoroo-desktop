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

/** Equal-height tiles in each grid row. */
export const REPORT_HUB_CARD_HEIGHT = "h-full";

const cardSurfaceClass = cn(
  "relative flex h-full w-full items-start gap-3 overflow-hidden rounded-xl px-3.5 py-3 no-underline hover:no-underline",
  "border border-slate-200 bg-white",
  "shadow-[0_1px_2px_rgba(15,23,42,0.05)]",
  "transition-[box-shadow,border-color,transform] duration-150",
  "hover:-translate-y-px hover:border-slate-300",
  "hover:shadow-[0_4px_12px_rgba(15,23,42,0.07)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200/80",
);

function CardIcon({ icon: Icon, iconClass }) {
  if (!Icon) return null;
  return (
    <div
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg border bg-slate-50 text-slate-500 ring-1 ring-slate-200/70",
        "transition-colors duration-150",
        "group-hover:border-blue-200 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:ring-blue-200/80",
        iconClass,
      )}
    >
      <Icon className="size-4 transition-colors duration-150" strokeWidth={1.75} />
    </div>
  );
}

function CardHeaderActions({
  menuSlot,
  editPath,
  onDeleteRequest,
  stop,
}) {
  return (
    <div className="-mr-1 flex shrink-0 items-center gap-0">
      <span
        className="inline-flex size-6 items-center justify-center text-blue-600 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
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
              className="size-6 p-0 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
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
}) {
  const stop = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const [deleteOpen, setDeleteOpen] = useState(false);
  const Icon = icon || FileSpreadsheet;

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
            <h3 className="min-w-0 flex-1 text-[15px] font-semibold leading-snug tracking-tight text-slate-900">
              {title}
            </h3>

            <CardHeaderActions
              menuSlot={menuSlot}
              editPath={editPath}
              onDeleteRequest={onDelete ? () => setDeleteOpen(true) : undefined}
              stop={stop}
            />
          </div>

          {description || metaLine ? (
            <p className="mt-0.5 line-clamp-2 min-h-[2.625rem] text-[13px] leading-snug text-slate-500">
              {description || metaLine}
            </p>
          ) : (
            <p
              className="mt-0.5 min-h-[2.625rem] text-[13px] leading-snug text-slate-500"
              aria-hidden
            />
          )}
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
        "group flex h-full w-full items-start gap-3 rounded-xl px-3.5 py-3 no-underline hover:no-underline",
        "border border-dashed border-slate-300 bg-white",
        "shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
        "transition-[box-shadow,border-color,transform] duration-150",
        "hover:-translate-y-px hover:border-blue-300 hover:bg-blue-50/30",
        "hover:shadow-[0_4px_12px_rgba(37,99,235,0.08)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-100",
      )}
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 ring-1 ring-blue-100">
        <Plus className="size-4" strokeWidth={2.25} />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="text-[15px] font-semibold leading-snug text-slate-900">
          Build New Custom View
        </p>
        <p className="mt-0.5 line-clamp-2 min-h-[2.625rem] text-[13px] leading-snug text-slate-500">
          Add filters, formulas &amp; custom columns
        </p>
      </div>
    </Link>
  );
}

export const REPORT_HUB_GRID_CLASS =
  "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4";
