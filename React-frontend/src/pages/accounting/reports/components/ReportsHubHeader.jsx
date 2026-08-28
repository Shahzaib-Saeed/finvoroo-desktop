import { Link } from "react-router-dom";
import { Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, InputWrapper } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Hub chrome: title + create, search under heading, then category filter strip.
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
    <header className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">
            Reports Hub
          </h1>
          <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
            Manage, build, and access real-time financial reporting metrics
            across all entities.
          </p>
        </div>
        <Button
          size="sm"
          className="h-9 shrink-0 gap-1.5 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          asChild
        >
          <Link to={`${base}/accounting/reports/create`}>
            <Plus className="size-3.5" strokeWidth={2.25} />
            Create Custom Report
          </Link>
        </Button>
      </div>

      <InputWrapper className="h-9 w-full max-w-2xl rounded-lg border-slate-200/90 bg-white shadow-sm">
        <Search className="size-4 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder="Filter reports…"
          className="h-9 text-sm placeholder:text-slate-400"
          aria-label="Filter reports"
        />
        {search ? (
          <button
            type="button"
            onClick={() => onSearchChange?.("")}
            className="inline-flex size-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Clear filter"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </InputWrapper>

      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="tablist"
          aria-label="Report categories"
          className="flex flex-wrap items-center gap-1.5"
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
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium",
                  active
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white text-slate-600 ring-1 ring-slate-200/90 hover:bg-slate-50 hover:text-slate-900",
                )}
              >
                {filter.label}
                {typeof filter.count === "number" ? (
                  <span
                    className={cn(
                      "tabular-nums",
                      active ? "text-white/70" : "text-slate-400",
                    )}
                  >
                    ({filter.count})
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {typeof showingCount === "number" ? (
          <p className="shrink-0 text-[13px] text-slate-400">
            Showing{" "}
            <span className="font-semibold text-slate-600">{showingCount}</span>
            {typeof totalCount === "number" && totalCount !== showingCount
              ? ` of ${totalCount}`
              : ""}{" "}
            available views
          </p>
        ) : null}
      </div>
    </header>
  );
}
