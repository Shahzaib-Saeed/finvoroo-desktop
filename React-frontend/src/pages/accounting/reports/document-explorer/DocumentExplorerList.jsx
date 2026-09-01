import { ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/workspace/documents/sharedColumns";
import { cn } from "@/lib/utils";
import { getDocTypeMeta } from "./document-explorer.lib";

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const ICON_CHIP =
  "flex size-8 shrink-0 items-center justify-center rounded-md border border-slate-200/80 bg-slate-50 text-slate-600 ring-1 ring-slate-200/60";

function formatDocDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

function rowKeyOf(row) {
  return `${row.doc_type}-${row.id}`;
}

const ROW_GRID =
  "grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_6.5rem_7.5rem_6.5rem] items-center gap-2.5";

function DocumentRow({ row, formatMoney, selected, onSelect }) {
  const meta = getDocTypeMeta(row.doc_type);
  const Icon = meta.icon;
  const hasAmount = row.amount !== null && row.amount !== undefined;
  const dateLabel = formatDocDate(row.date);
  const reference = row.reference || row.external_reference;

  return (
    <button
      type="button"
      onClick={() => onSelect(row)}
      aria-pressed={selected}
      className={cn(
        "group relative w-full cursor-pointer px-3 py-2.5 text-left outline-none transition-colors focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-inset",
        ROW_GRID,
        selected ? "bg-primary/[0.06]" : "hover:bg-muted/40",
      )}
    >
      <span
        className={cn(
          "absolute inset-y-1.5 left-0 w-0.5 rounded-r-full bg-primary transition-opacity",
          selected ? "opacity-100" : "opacity-0",
        )}
        aria-hidden
      />

      <div className="flex min-w-0 items-center gap-2.5">
        <span className={cn(ICON_CHIP, selected && "border-primary/25 bg-primary/5 text-primary")}>
          <Icon className="size-3.5" strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <p
            className={cn(
              "truncate text-[13px] font-semibold tracking-tight",
              selected ? "text-primary" : "text-foreground",
            )}
          >
            {row.document_no || "—"}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {row.doc_type_label || meta.label}
            {dateLabel ? (
              <span className="md:hidden">{` · ${dateLabel}`}</span>
            ) : null}
          </p>
        </div>
      </div>

      <div className="hidden min-w-0 md:block">
        <p className="truncate text-[13px] font-medium text-foreground/90">
          {row.party_name || <span className="text-muted-foreground/50">—</span>}
        </p>
        {reference ? (
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            Ref {reference}
          </p>
        ) : null}
      </div>

      <p className="hidden whitespace-nowrap text-[12px] tabular-nums text-muted-foreground md:block">
        {dateLabel || "—"}
      </p>

      <p
        className={cn(
          "hidden whitespace-nowrap text-right text-[13px] font-semibold tabular-nums md:block",
          hasAmount ? "text-foreground" : "text-muted-foreground/40",
        )}
      >
        {hasAmount ? formatMoney(row.amount) : "—"}
      </p>

      <div className="flex shrink-0 items-center justify-end gap-1.5">
        <div className="flex flex-col items-end gap-0.5">
          <StatusBadge status={row.status} />
          {hasAmount ? (
            <span className="text-[11px] font-semibold tabular-nums text-foreground md:hidden">
              {formatMoney(row.amount)}
            </span>
          ) : null}
        </div>
        <ChevronRight
          className={cn(
            "hidden size-3.5 shrink-0 md:block",
            selected ? "text-primary" : "text-muted-foreground/30 group-hover:text-muted-foreground",
          )}
          aria-hidden
        />
      </div>
    </button>
  );
}

function ListHeader() {
  return (
    <div
      className={cn(
        ROW_GRID,
        "hidden border-b border-border/60 bg-muted/20 px-3 py-2 md:grid",
      )}
    >
      <span className="text-[11px] font-medium text-muted-foreground">Document</span>
      <span className="text-[11px] font-medium text-muted-foreground">Party</span>
      <span className="text-[11px] font-medium text-muted-foreground">Date</span>
      <span className="text-right text-[11px] font-medium text-muted-foreground">
        Amount
      </span>
      <span className="text-right text-[11px] font-medium text-muted-foreground">
        Status
      </span>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className={cn(ROW_GRID, "px-3 py-2.5")}>
      <div className="flex items-center gap-2.5">
        <Skeleton className="size-8 rounded-md" />
        <div className="space-y-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-2.5 w-16" />
        </div>
      </div>
      <Skeleton className="hidden h-3 w-28 md:block" />
      <Skeleton className="hidden h-3 w-14 md:block" />
      <Skeleton className="hidden h-3.5 w-16 justify-self-end md:block" />
      <Skeleton className="h-5 w-14 justify-self-end rounded-md" />
    </div>
  );
}

export function DocumentExplorerList({
  rows,
  formatMoney,
  loading,
  perPage,
  selectedKey,
  onSelect,
  embedded = false,
}) {
  return (
    <div
      className={cn(
        embedded ? "" : "overflow-hidden rounded-xl border border-border/70 bg-card shadow-xs",
      )}
    >
      <ListHeader />
      <div className="divide-y divide-border/50">
        {loading
          ? Array.from({ length: Math.min(perPage || 8, 8) }).map((_, i) => (
              <SkeletonRow key={i} />
            ))
          : rows.map((row) => (
              <DocumentRow
                key={rowKeyOf(row)}
                row={row}
                formatMoney={formatMoney}
                selected={selectedKey === rowKeyOf(row)}
                onSelect={onSelect}
              />
            ))}
      </div>
    </div>
  );
}

export { rowKeyOf as documentRowKey };
