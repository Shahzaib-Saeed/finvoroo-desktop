import { Loader2, RotateCcw, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ReportDateRangePicker } from '../../components/ReportDateRangePicker';
import { reportStickyFiltersClass } from '../../components/report-sticky';

/**
 * Compact enterprise filter toolbar — single horizontal row, no card chrome.
 */
export function ReportViewerFilterBar({
  from,
  to,
  onFromChange,
  onToChange,
  onApply,
  onReset,
  loading = false,
  savedFilterHint,
  search,
  onSearchChange,
  searchPlaceholder = 'Search in results…',
  recordCountLabel,
  children,
  className,
  sticky = true,
}) {
  return (
    <div
      className={cn(
        'no-print flex min-h-11 flex-wrap items-center gap-x-3 gap-y-2 border-y border-slate-200 bg-white py-2',
        sticky && reportStickyFiltersClass,
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Period
        </span>
        <ReportDateRangePicker
          from={from}
          to={to}
          onChange={({ from: f, to: t }) => {
            onFromChange?.(f);
            onToChange?.(t);
          }}
          disabled={loading}
          className="[&_button]:h-8 [&_button]:rounded-sm [&_button]:border-border [&_button]:bg-background [&_button]:text-xs [&_button]:shadow-none [&_button]:focus-visible:border-primary [&_button]:focus-visible:ring-1 [&_button]:focus-visible:ring-primary/30 [&_input]:h-8 [&_input]:focus-visible:border-primary [&_input]:focus-visible:ring-1 [&_input]:focus-visible:ring-primary/30"
        />
      </div>

      <div className="hidden h-4 w-px shrink-0 bg-slate-200 sm:block" aria-hidden />

      {onSearchChange != null ? (
        <div className="relative min-w-[160px] flex-1 sm:max-w-[240px]">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            value={search ?? ''}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-8 rounded-sm border-border bg-background pl-7 pr-7 text-xs shadow-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/30"
          />
          {search ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 size-8 rounded-sm text-slate-400 hover:text-slate-600"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </Button>
          ) : null}
        </div>
      ) : null}

      {children ? (
        <>
          <div className="hidden h-4 w-px shrink-0 bg-slate-200 sm:block" aria-hidden />
          <div className="flex min-w-0 flex-wrap items-center gap-2">{children}</div>
        </>
      ) : null}

      {savedFilterHint ? (
        <>
          <div className="hidden h-4 w-px shrink-0 bg-slate-200 lg:block" aria-hidden />
          <p
            className="hidden min-w-0 max-w-[200px] truncate text-[11px] text-slate-500 lg:block"
            title={savedFilterHint}
          >
            {savedFilterHint}
          </p>
        </>
      ) : null}

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {recordCountLabel ? (
          <span className="hidden text-[11px] tabular-nums text-slate-500 md:inline">
            {recordCountLabel}
          </span>
        ) : null}
        {onReset ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onReset}
            disabled={loading}
            className="h-8 gap-1.5 rounded-sm px-2.5 text-xs text-slate-600 hover:bg-slate-100"
          >
            <RotateCcw className="size-3.5" />
            Reset
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          onClick={onApply}
          disabled={loading || !from || !to}
          className="h-8 rounded-sm bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-none hover:bg-primary/90"
        >
          {loading ? (
            <>
              <Loader2 className="mr-1 size-3.5 animate-spin" />
              Loading…
            </>
          ) : (
            'Apply filters'
          )}
        </Button>
      </div>
    </div>
  );
}
