import { Link } from "react-router-dom";
import { Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, InputWrapper } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Hub chrome: title + create, search, scrollable category filters.
 */
export function ReportsHubHeader({
  base,
  filters = [],
  activeFilter,
  onFilterChange,
  showingCount,
  totalCount,
  search = "",
  onSearchChange,
}) {
  return (
    <header className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-[22px]">
            Reports Hub
          </h1>
          <p className="mt-0.5 max-w-xl text-sm text-muted-foreground">
            Financial statements, ledgers, AR/AP, inventory, and custom views in one place.
          </p>
        </div>
        <Button size="sm" className="h-9 shrink-0 gap-1.5" asChild>
          <Link to={`${base}/accounting/reports/create`}>
            <Plus className="size-3.5" strokeWidth={2.25} />
            Create custom report
          </Link>
        </Button>
      </div>

      <div className="rounded-xl border border-border/70 bg-card p-3 shadow-xs sm:p-3.5">
        <InputWrapper className="h-9 w-full rounded-lg border-border/70 bg-background">
          <Search className="size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Search reports by name or description…"
            className="h-9 text-sm"
            aria-label="Search reports"
          />
          {search ? (
            <button
              type="button"
              onClick={() => onSearchChange?.("")}
              className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </InputWrapper>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div
            role="tablist"
            aria-label="Report categories"
            className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5 scrollbar-none"
          >
            {filters.map((filter) => {
              const active = activeFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onFilterChange(filter.id)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors",
                    active
                      ? "bg-foreground text-background shadow-sm"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  {filter.label}
                  {typeof filter.count === "number" && filter.count > 0 ? (
                    <span
                      className={cn(
                        "rounded-md px-1 py-px text-[11px] tabular-nums",
                        active ? "bg-background/20 text-background" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {filter.count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {typeof showingCount === "number" ? (
            <p className="shrink-0 text-xs text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground">{showingCount}</span>
              {typeof totalCount === "number" && totalCount !== showingCount
                ? ` of ${totalCount}`
                : ""}
            </p>
          ) : null}
        </div>
      </div>
    </header>
  );
}
