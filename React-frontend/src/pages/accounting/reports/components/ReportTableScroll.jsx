import { cn } from '@/lib/utils';

/**
 * Horizontal scroll container for wide report tables on small screens.
 * Keeps page layout from expanding; tables scroll inside this wrapper.
 */
export function ReportTableScroll({ children, className, minWidth }) {
  return (
    <div
      className={cn(
        '-mx-4 overflow-x-auto overscroll-x-contain px-4 sm:mx-0 sm:px-0',
        '[-webkit-overflow-scrolling:touch]',
        className,
      )}
      data-report-table-scroll=""
    >
      {minWidth ? (
        <div style={{ minWidth: typeof minWidth === 'number' ? `${minWidth}px` : minWidth }}>
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
