import { useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

/**
 * DataTable — ergonomic server-side table for all ERP module list pages.
 *
 * Props:
 *  - columns      TanStack column defs array
 *  - data         Array of row objects
 *  - meta         Pagination meta from Laravel: { current_page, last_page, per_page, total, from, to }
 *  - onPageChange (page: number) => void   — called when user clicks a page
 *  - isLoading    boolean — shows skeleton rows
 *  - onSearch     (query: string) => void  — shows a search box when provided
 *  - searchPlaceholder  string             — placeholder for search box
 *  - emptyTitle   string
 *  - emptySubtitle string
 *  - className    string
 */
export function DataTable({
  columns,
  data = [],
  meta,
  onPageChange,
  isLoading = false,
  onSearch,
  searchPlaceholder = 'Search…',
  emptyTitle = 'No records found',
  emptySubtitle = 'Try adjusting your search or filters.',
  className,
}) {
  const [searchValue, setSearchValue] = useState('');

  const tableData = useMemo(() => (isLoading ? Array(10).fill({}) : data), [isLoading, data]);

  const skeletonColumns = useMemo(
    () =>
      columns.map((col) => ({
        ...col,
        cell: () => <Skeleton className="h-4 w-full rounded" />,
      })),
    [columns],
  );

  const table = useReactTable({
    data: tableData,
    columns: isLoading ? skeletonColumns : columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: meta?.last_page ?? 1,
    state: {
      pagination: {
        pageIndex: (meta?.current_page ?? 1) - 1,
        pageSize: meta?.per_page ?? 15,
      },
    },
  });

  const currentPage = meta?.current_page ?? 1;
  const lastPage = meta?.last_page ?? 1;
  const from = meta?.from ?? 0;
  const to = meta?.to ?? 0;
  const total = meta?.total ?? 0;

  function handleSearch(e) {
    e.preventDefault();
    onSearch?.(searchValue);
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Search bar */}
      {onSearch && (
        <form onSubmit={handleSearch} className="flex items-center gap-2 max-w-sm">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <Button type="submit" size="sm" variant="outline" className="h-8">
            Search
          </Button>
        </form>
      )}

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="bg-muted/40 hover:bg-muted/40">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="text-xs font-semibold text-muted-foreground uppercase tracking-wide py-3"
                      style={header.column.columnDef.meta?.width ? { width: header.column.columnDef.meta.width } : undefined}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>

            <TableBody>
              {table.getRowModel().rows.length === 0 && !isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="py-16 text-center"
                  >
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <div className="size-10 rounded-full bg-muted flex items-center justify-center">
                        <SearchIcon className="size-5" />
                      </div>
                      <p className="text-sm font-medium text-foreground">{emptyTitle}</p>
                      <p className="text-xs">{emptySubtitle}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-muted/30 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-3 text-sm">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {(lastPage > 1 || total > 0) && !isLoading && (
        <div className="flex items-center justify-between gap-4 px-1 flex-wrap">
          <p className="text-xs text-muted-foreground">
            {total > 0 ? `${from}–${to} of ${total} records` : ''}
          </p>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => onPageChange?.(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              <ChevronLeftIcon className="size-3.5" />
            </Button>

            {buildPageNumbers(currentPage, lastPage).map((item, i) =>
              item === '…' ? (
                <span key={`ellipsis-${i}`} className="px-1 text-xs text-muted-foreground">
                  …
                </span>
              ) : (
                <Button
                  key={item}
                  variant={item === currentPage ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 w-7 p-0 text-xs"
                  onClick={() => onPageChange?.(item)}
                >
                  {item}
                </Button>
              ),
            )}

            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => onPageChange?.(currentPage + 1)}
              disabled={currentPage >= lastPage}
            >
              <ChevronRightIcon className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Returns a compact array of page numbers with '…' ellipsis for large ranges. */
function buildPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = [];
  if (current <= 4) {
    pages.push(1, 2, 3, 4, 5, '…', total);
  } else if (current >= total - 3) {
    pages.push(1, '…', total - 4, total - 3, total - 2, total - 1, total);
  } else {
    pages.push(1, '…', current - 1, current, current + 1, '…', total);
  }
  return pages;
}
