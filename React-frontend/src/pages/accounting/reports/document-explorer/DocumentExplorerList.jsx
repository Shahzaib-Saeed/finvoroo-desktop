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

function formatDocDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

function rowKeyOf(row) {
  return `${row.doc_type}-${row.id}`;
}

/* Shared grid template so the header and every row align on the same columns:
   [icon+document] [party/ref] [date] [amount] [status] */
const ROW_GRID =
  "grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.6fr)_7rem_8rem_7.25rem] items-center gap-3";

function DocumentRow({ row, formatMoney, selected, onSelect }) {
  const meta = getDocTypeMeta(row.doc_type);
  const Icon = meta.icon;
  const hasAmount = row.amount !== null && row.amount !== undefined;
  const dateLabel = formatDocDate(row.date);
  const reference = row.reference || row.external_reference || row.id;

  return (
    <button
      type="button"
      onClick={() => onSelect(row)}
      aria-pressed={selected}
      className={cn(
        "group relative w-full cursor-pointer px-4 py-3.5 text-left outline-none transition-all duration-150 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-inset",
        ROW_GRID,
        selected
          ? "bg-primary/[0.055] ring-1 ring-inset ring-primary/10"
          : "bg-card hover:bg-muted/30",
      )}
    >
      {/* Selection accent bar */}
      <span
        className={cn(
          "absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-primary transition-all duration-200",
          selected ? "opacity-100" : "opacity-0",
        )}
        aria-hidden
      />

      {/* Document: type icon + number + type label */}
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl border border-current/10 shadow-sm transition-transform duration-200 group-hover:scale-[1.03]",
            meta.iconBg,
            selected && "ring-2 ring-primary/10",
          )}
        >
          <Icon className="size-[17px]" strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <p
            className={cn(
              "truncate text-sm font-bold tracking-tight",
              selected ? "text-primary" : "text-foreground",
            )}
          >
            {row.document_no || "—"}
          </p>
          <p className="mt-1 flex min-w-0 items-center gap-1.5 truncate text-xs font-medium text-muted-foreground">
            <span
              className={cn(
                "inline-flex shrink-0 rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                meta.chip,
              )}
            >
              {meta.abbrev}
            </span>
            <span className="truncate">{row.doc_type_label || meta.label}</span>
            <span className="md:hidden">
              {dateLabel ? ` · ${dateLabel}` : ""}
            </span>
          </p>
        </div>
      </div>

      {/* Party + reference */}
      <div className="hidden min-w-0 md:block">
        <p className="truncate text-sm font-medium text-foreground/80">
          {row.party_name || <span className="text-muted-foreground/60">—</span>}
        </p>
        <p className="mt-1 truncate font-mono text-xs tracking-wide text-muted-foreground/70">
          REF · {reference}
        </p>
      </div>

      {/* Date */}
      <p className="hidden whitespace-nowrap text-xs font-medium tabular-nums text-muted-foreground md:block">
        {dateLabel || "—"}
      </p>

      {/* Amount */}
      <p
        className={cn(
          "hidden whitespace-nowrap text-right text-sm font-bold tabular-nums tracking-tight md:block",
          hasAmount ? "text-foreground" : "text-muted-foreground/30",
        )}
      >
        {hasAmount ? formatMoney(row.amount) : "—"}
      </p>

      {/* Status (also shows amount inline on mobile) */}
      <div className="flex shrink-0 items-center justify-end gap-2">
        <div className="flex min-w-0 flex-col items-end gap-1">
          <StatusBadge status={row.status} />
          {hasAmount ? (
            <span className="text-xs font-bold tabular-nums text-foreground md:hidden">
              {formatMoney(row.amount)}
            </span>
          ) : null}
        </div>
        <ChevronRight
          className={cn(
            "hidden size-3.5 shrink-0 transition-all md:block",
            selected
              ? "translate-x-0 text-primary"
              : "-translate-x-0.5 text-muted-foreground/30 group-hover:translate-x-0 group-hover:text-muted-foreground",
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
        "hidden border-b border-border/70 bg-muted/25 px-4 py-3 md:grid",
      )}
    >
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Document
      </span>
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Party / Reference
      </span>
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Date
      </span>
      <span className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Amount
      </span>
      <span className="pr-5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Status
      </span>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className={cn(ROW_GRID, "bg-card px-4 py-3.5")}>
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-xl" />
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <div className="hidden space-y-1.5 md:block">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="hidden h-3 w-16 md:block" />
      <Skeleton className="hidden h-3.5 w-16 justify-self-end md:block" />
      <Skeleton className="h-5 w-16 justify-self-end rounded-md" />
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
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <ListHeader />
      <div className="divide-y divide-border/60">
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
