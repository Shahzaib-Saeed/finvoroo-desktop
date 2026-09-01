import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

/** Same table chrome as accounting/invoices/index.jsx */
export const DEFAULT_TABLE_LAYOUT = {
  headerBackground: true,
  rowBorder: true,
  rowRounded: false,
  cellBorder: false,
  stripped: false,
};

export const DEFAULT_PAGINATION_SIZES = [15, 25, 50, 100];

/**
 * DataGrid shell aligned with invoices list pages:
 * DataGrid → space-y wrapper → DataGridContainer + ScrollArea → pagination below.
 */
export function DataGridLayout({
  table,
  recordCount,
  isLoading = false,
  className,
  scrollClassName,
  children,
  showPagination = true,
  tableLayout = DEFAULT_TABLE_LAYOUT,
  paginationSizes = DEFAULT_PAGINATION_SIZES,
}) {
  return (
    <DataGrid
      table={table}
      recordCount={recordCount ?? 0}
      isLoading={isLoading}
      tableLayout={tableLayout}
    >
      <div className={cn('w-full space-y-2.5', className)}>
        {children}
        <DataGridContainer>
          <ScrollArea className={cn('w-full min-w-0 max-w-full', scrollClassName)}>
            <DataGridTable />
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </DataGridContainer>
        {showPagination && <DataGridPagination sizes={paginationSizes} />}
      </div>
    </DataGrid>
  );
}
