import { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { motion } from 'motion/react';
import { ArrowDown, ArrowUp, CheckCircle2, Inbox, Rows3, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';
import { DEFAULT_FORMATTING } from './FormattingPanel';
import { BUILDER_COPY } from '../../lib/report-business-copy';

function formatCell(value, col, formatting) {
  if (value === null || value === undefined || value === '') return '—';

  if (col.formatter === 'money' || col.type === 'money') {
    const n = Number(value);
    const opts = {
      minimumFractionDigits: formatting.decimalPlaces,
      maximumFractionDigits: formatting.decimalPlaces,
    };
    const formatted = formatting.thousandsSeparator
      ? n.toLocaleString(undefined, opts)
      : n.toFixed(formatting.decimalPlaces);
    if (n < 0 && formatting.negativeStyle === 'parentheses') {
      const positive = formatting.thousandsSeparator
        ? Math.abs(n).toLocaleString(undefined, opts)
        : Math.abs(n).toFixed(formatting.decimalPlaces);
      return `(${positive})`;
    }
    return formatted;
  }

  if (col.type === 'number') {
    return formatting.thousandsSeparator ? Number(value).toLocaleString() : String(value);
  }

  if (col.formatter === 'date' || col.type === 'date') {
    const d = new Date(String(value).slice(0, 10));
    if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
    if (formatting.dateFormat === 'iso') return d.toISOString().slice(0, 10);
    if (formatting.dateFormat === 'long') {
      return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
    }
    return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  }

  return String(value);
}

function sumMoneyColumn(rows, key) {
  return rows.reduce((sum, row) => sum + (Number(row?.[key]) || 0), 0);
}

function LoadingSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="grid grid-cols-3 gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-xl" />
        ))}
      </div>
      <div className="p-4">
        <div className="flex gap-4 border-b border-slate-100 pb-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-3.5 w-24" />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, row) => (
          <div key={row} className="flex gap-4 py-2.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-24" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewMetrics({ result, formatting }) {
  const moneyCols = useMemo(
    () => (result?.columns || []).filter((c) => c.type === 'money' || c.formatter === 'money'),
    [result?.columns],
  );

  const debitCol =
    moneyCols.find((c) => /debit/i.test(c.key) || /debit/i.test(c.label || '')) || null;
  const creditCol =
    moneyCols.find((c) => /credit/i.test(c.key) || /credit/i.test(c.label || '')) || null;

  const totals = result?.grand_totals || {};
  const debit =
    debitCol
      ? Number(totals[debitCol.key] ?? sumMoneyColumn(result.rows || [], debitCol.key)) || 0
      : null;
  const credit =
    creditCol
      ? Number(totals[creditCol.key] ?? sumMoneyColumn(result.rows || [], creditCol.key)) || 0
      : null;

  const balanced =
    debit != null && credit != null ? Math.abs(debit - credit) < 0.005 : null;

  const fmt = (n) => {
    if (n == null) return '—';
    return Number(n).toLocaleString(undefined, {
      minimumFractionDigits: formatting.decimalPlaces ?? 2,
      maximumFractionDigits: formatting.decimalPlaces ?? 2,
    });
  };

  return (
    <div className="grid gap-3 border-b border-slate-200/80 bg-gradient-to-r from-slate-50 via-white to-blue-50/40 px-4 py-3 sm:grid-cols-3">
      <MetricCard
        label={debitCol ? `Total ${debitCol.label}` : 'Total debits'}
        value={debit != null ? fmt(debit) : '—'}
      />
      <MetricCard
        label={creditCol ? `Total ${creditCol.label}` : 'Total credits'}
        value={credit != null ? fmt(credit) : '—'}
      />
      <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Net status
          </p>
          {balanced == null ? (
            <p className="mt-1 text-sm font-semibold text-slate-700">Preview ready</p>
          ) : balanced ? (
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
              <CheckCircle2 className="size-3.5" />
              Balanced
            </p>
          ) : (
            <p className="mt-1 text-sm font-semibold text-amber-700">Out of balance</p>
          )}
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
          <Rows3 className="size-3" />
          {(result?.rows?.length || 0).toLocaleString()} rows
        </span>
      </div>
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums tracking-tight text-slate-900">{value}</p>
    </div>
  );
}

export function PreviewGrid({
  result,
  loading,
  error,
  page,
  perPage,
  onPageChange,
  formatting,
  onSortColumn,
  onRemoveColumn,
  currentSort,
}) {
  const { setNodeRef, isOver } = useDroppable({ id: 'preview-drop-zone' });
  const fmt = { ...DEFAULT_FORMATTING, ...formatting };

  if (loading && !result) {
    return (
      <div ref={setNodeRef} className="h-full">
        <LoadingSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div
        ref={setNodeRef}
        className="flex h-full flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50/40 text-center"
      >
        <p className="text-sm font-semibold text-red-600">{error}</p>
      </div>
    );
  }

  if (!result || result.columns.length === 0) {
    return (
      <div
        ref={setNodeRef}
        className={cn(
          'flex h-full flex-col items-center justify-center rounded-2xl border-2 border-dashed text-center transition-all',
          isOver
            ? 'border-blue-400 bg-blue-50/50 shadow-inner'
            : 'border-slate-200 bg-white/70',
        )}
      >
        <div
          className={cn(
            'flex size-14 items-center justify-center rounded-2xl border',
            isOver ? 'border-blue-200 bg-blue-50 text-blue-600' : 'border-slate-200 bg-slate-50 text-slate-300',
          )}
        >
          <Inbox className="size-6" strokeWidth={1.5} />
        </div>
        <p className="mt-4 text-sm font-semibold text-slate-700">
          {isOver ? BUILDER_COPY.previewDropHint : BUILDER_COPY.previewEmptyTitle}
        </p>
        <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-400">
          {BUILDER_COPY.previewEmptyDescription}
        </p>
      </div>
    );
  }

  if (result.rows.length === 0) {
    return (
      <div
        ref={setNodeRef}
        className="flex h-full flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white text-center"
      >
        <Inbox className="size-8 text-slate-300" strokeWidth={1.5} />
        <p className="mt-3 text-sm font-semibold text-slate-700">{BUILDER_COPY.previewNoRows}</p>
        <p className="mt-1 max-w-xs text-xs text-slate-400">{BUILDER_COPY.previewNoRowsHint}</p>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(result.total / perPage));

  return (
    <motion.div
      ref={setNodeRef}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]',
        loading && 'opacity-70',
        isOver && 'ring-2 ring-blue-300',
      )}
    >
      <PreviewMetrics result={result} formatting={fmt} />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/90">
              {result.columns.map((col) => (
                <ColumnHeader
                  key={col.key}
                  col={col}
                  currentSort={currentSort}
                  onSort={onSortColumn}
                  onRemove={onRemoveColumn}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row, i) => (
              <tr
                key={i}
                className="border-b border-slate-100 transition-colors odd:bg-white even:bg-slate-50/40 hover:bg-blue-50/30"
              >
                {result.columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'whitespace-nowrap px-3.5 py-2.5 text-slate-700',
                      ['number', 'money'].includes(col.type) && 'text-right tabular-nums font-medium text-slate-800',
                    )}
                  >
                    {formatCell(row[col.key], col, fmt)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {result.grand_totals && Object.keys(result.grand_totals).length > 0 ? (
            <tfoot className="bg-slate-50 font-semibold">
              <tr>
                {result.columns.map((col, i) => (
                  <td
                    key={col.key}
                    className={cn(
                      'border-t border-slate-200 px-3.5 py-2.5 text-slate-800',
                      ['number', 'money'].includes(col.type) && 'text-right tabular-nums',
                    )}
                  >
                    {i === 0 ? 'Total' : formatCell(result.grand_totals[col.key], col, fmt)}
                  </td>
                ))}
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-4 py-2.5 text-xs text-slate-500">
        <span className="font-medium">
          {result.total.toLocaleString()} row{result.total === 1 ? '' : 's'} in preview
        </span>
        {totalPages > 1 ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 rounded-lg text-xs"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              Previous
            </Button>
            <span className="min-w-[4.5rem] text-center tabular-nums">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 rounded-lg text-xs"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </Button>
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}

function ColumnHeader({ col, currentSort, onSort, onRemove }) {
  const activeSort = currentSort?.find((s) => s.field === col.key);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <th
          className={cn(
            'group whitespace-nowrap px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 select-none',
            ['number', 'money'].includes(col.type) && 'text-right',
            col.is_calculated && 'bg-violet-50/50 text-violet-700',
          )}
        >
          <span className="inline-flex items-center gap-1">
            {col.label}
            {activeSort ? (
              activeSort.direction === 'asc' ? (
                <ArrowUp className="size-3 text-blue-500" />
              ) : (
                <ArrowDown className="size-3 text-blue-500" />
              )
            ) : null}
          </span>
        </th>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onSort?.(col.key, 'asc')}>
          <ArrowUp className="size-3.5" />
          Sort ascending
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onSort?.(col.key, 'desc')}>
          <ArrowDown className="size-3.5" />
          Sort descending
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onClick={() => onRemove?.(col.key)}>
          <X className="size-3.5" />
          Remove column
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
