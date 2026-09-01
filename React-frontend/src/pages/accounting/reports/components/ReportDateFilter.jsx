import { Filter, Loader2, CalendarRange, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { ReportDateRangePicker } from "./ReportDateRangePicker";
import { ReportCompactFilterBar } from "./ReportCompactFilterBar";
import { cn } from "@/lib/utils";

export function ReportDateFilter({
  from,
  to,
  onFromChange,
  onToChange,
  onApply,
  onReset,
  loading = false,
  currency,
  hint,
  children,
  compact = false,
  embedded = false,
  className,
  mode = "range",
  asOf,
  onAsOfChange,
  /** Keep filter strip stuck under workspace chrome while scrolling. */
  stickyFilters = true,
}) {
  const handleRangeChange = ({ from: nextFrom, to: nextTo }) => {
    onFromChange?.(nextFrom);
    onToChange?.(nextTo);
  };

  const isInline = compact || embedded;

  const toolbar = (
    <div
      className={cn(
        isInline
          ? "flex w-full flex-wrap items-center gap-x-3 gap-y-2"
          : "flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-3",
        embedded && !compact && "w-full",
      )}
    >
      {mode === "asOf" ? (
        <div
          className={cn(
            isInline
              ? "w-full min-w-0 sm:w-[160px] sm:shrink-0"
              : "flex w-full flex-col gap-1.5 lg:w-[200px] lg:shrink-0",
          )}
        >
          {!isInline ? (
            <label className="text-xs font-medium text-muted-foreground">
              As of date
            </label>
          ) : null}
          <DatePicker
            value={asOf}
            onChange={onAsOfChange}
            disabled={loading}
            aria-label="As of date"
            className={cn(
              "w-full border-border/80 bg-background text-sm shadow-none",
              isInline ? "h-8" : "h-9",
            )}
          />
        </div>
      ) : (
        <div
          className={cn(
            isInline
              ? "shrink-0"
              : "flex w-full flex-col gap-1.5 lg:w-auto lg:shrink-0",
          )}
        >
          {!isInline ? (
            <label className="text-xs font-medium text-muted-foreground">
              Reporting period
            </label>
          ) : null}
          <ReportDateRangePicker
            from={from}
            to={to}
            onChange={handleRangeChange}
            disabled={loading}
            className={isInline ? "[&_button]:h-8 [&_input]:h-8" : undefined}
          />
        </div>
      )}

      {children ? (
        <div
          className={cn(
            "flex min-w-0 flex-wrap items-center gap-3",
            !isInline &&
              "w-full flex-col gap-3 sm:flex-row sm:items-center lg:flex-1",
          )}
        >
          {children}
        </div>
      ) : null}

      {onReset ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onReset}
          disabled={loading}
          className={cn(
            "shrink-0 gap-1.5 rounded-sm px-3 text-xs text-muted-foreground hover:text-foreground",
            isInline ? "ml-1 h-8" : "h-9",
          )}
        >
          <RotateCcw className="size-3.5" />
          Reset
        </Button>
      ) : null}

      <Button
        type="button"
        size="sm"
        onClick={onApply}
        disabled={loading || (mode === "asOf" ? !asOf : !from || !to)}
        className={cn(
          "shrink-0 gap-1.5 rounded-sm bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-none hover:bg-primary/90",
          isInline ? "ml-auto h-8 min-w-[7.5rem]" : "h-9 w-full lg:ml-auto lg:w-auto",
        )}
      >
        {loading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Filter className="size-3.5" />
        )}
        {loading ? "Loading…" : "Apply filters"}
      </Button>
    </div>
  );

  if (compact) {
    return (
      <ReportCompactFilterBar
        className={className}
        sticky={stickyFilters}
        footer={
          hint ? (
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {hint}
            </p>
          ) : null
        }
      >
        {toolbar}
      </ReportCompactFilterBar>
    );
  }

  if (embedded) {
    return (
      <div className={cn("no-print w-full", className)}>
        {toolbar}
        {hint && !isInline ? (
          <p className="mt-3 border-t border-border/50 pt-2 text-xs leading-relaxed text-muted-foreground">
            {hint}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "no-print overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border/40 px-4 py-2.5">
        <CalendarRange className="size-4 text-muted-foreground" />
        <span className="text-sm font-semibold text-foreground">
          Report filters
        </span>
        {currency ? (
          <span className="ml-auto text-xs text-muted-foreground">
            Currency:{" "}
            <span className="font-semibold text-foreground">{currency}</span>
          </span>
        ) : null}
      </div>

      <div className="px-4 py-3.5">{toolbar}</div>

      {hint ? (
        <p className="border-t border-border/40 px-4 py-2 text-xs leading-relaxed text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
