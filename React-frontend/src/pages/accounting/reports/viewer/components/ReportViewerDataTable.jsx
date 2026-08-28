import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Input, InputWrapper } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatReportCell } from '../../lib/format-report-cell';

export function ReportViewerDataTable({
  result,
  loading,
  error,
  page,
  perPage,
  onPageChange,
  formatting = {},
}) {
  const [query, setQuery] = useState('');

  const filteredRows = useMemo(() => {
    if (!result?.rows) return [];
    const q = query.trim().toLowerCase();
    if (!q) return result.rows;
    return result.rows.filter((row) =>
      result.columns.some((col) => String(row[col.key] ?? '').toLowerCase().includes(q)),
    );
  }, [result, query]);

  if (loading && !result) {
    return (
      <div className="border border-slate-200 bg-white p-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="mb-2 h-8 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-red-200 bg-red-50/50 px-6 py-12 text-center">
        <p className="text-sm font-medium text-red-700">{error}</p>
      </div>
    );
  }

  if (!result?.columns?.length) {
    return (
      <div className="border border-dashed border-slate-300 bg-slate-50/50 px-6 py-12 text-center">
        <p className="text-sm font-semibold text-slate-800">No data to display</p>
        <p className="mt-1 text-sm text-slate-500">This report has no columns configured yet.</p>
      </div>
    );
  }

  if (result.rows.length === 0) {
    return (
      <div className="border border-dashed border-slate-300 bg-slate-50/50 px-6 py-12 text-center">
        <p className="text-sm font-semibold text-slate-800">No records match your filters</p>
        <p className="mt-1 text-sm text-slate-500">Try widening the date range or editing the report filters.</p>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil((result.total || 0) / perPage));

  return (
    <div className="border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
        <p className="text-xs font-medium text-slate-600">
          {(result.total ?? filteredRows.length).toLocaleString()} record{(result.total ?? filteredRows.length) === 1 ? '' : 's'}
        </p>
        <div className="w-full max-w-xs sm:w-56">
          <InputWrapper>
            <Search className="size-4" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search in results…"
              className="h-8"
            />
          </InputWrapper>
        </div>
      </div>

      <div>
        <table className="w-full min-w-[640px] text-sm">
          <thead className="sticky top-[10.5rem] z-20 bg-slate-50 shadow-[0_1px_0_0_rgb(226_232_240)] print:static">
            <tr>
              {result.columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'sticky top-[10.5rem] z-[21] whitespace-nowrap border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500 print:static',
                    ['number', 'money'].includes(col.type) && 'text-right',
                  )}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, i) => (
              <tr
                key={i}
                className={cn(
                  'h-8 border-b border-slate-100 transition-colors hover:bg-primary/5',
                  i % 2 === 1 && 'bg-slate-50/50',
                )}
              >
                {result.columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'whitespace-nowrap px-3 py-1 text-[13px] text-slate-700',
                      ['number', 'money'].includes(col.type) && 'text-right tabular-nums font-medium',
                    )}
                  >
                    {formatReportCell(row[col.key], col, formatting)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {result.grand_totals && Object.keys(result.grand_totals).length > 0 ? (
            <tfoot className="sticky bottom-0 bg-slate-100 font-semibold">
              <tr>
                {result.columns.map((col, i) => (
                  <td
                    key={col.key}
                    className={cn('px-4 py-2.5 text-slate-900', ['number', 'money'].includes(col.type) && 'text-right tabular-nums')}
                  >
                    {i === 0 && !result.grand_totals[col.key] ? 'Total' : formatReportCell(result.grand_totals[col.key], col, formatting)}
                  </td>
                ))}
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-7" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" className="h-7" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
