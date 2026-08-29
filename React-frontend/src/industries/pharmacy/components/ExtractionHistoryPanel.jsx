import { Clock3, FileImage, Loader2, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatOcrEngineName } from '../lib/ocr-engine-label';

function formatWhen(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/**
 * Which engine produced these rows. A page corrected by the fallback shows both,
 * because "read by X, corrected by Y" is the answer to a disputed line.
 */
function engineLabel(row) {
  const primary = formatOcrEngineName(row?.provider);
  if (!primary) return '';
  const fallback = formatOcrEngineName(row?.fallback_provider);
  return fallback && fallback !== primary ? `${primary} → ${fallback}` : primary;
}

const statusTone = {
  draft: 'bg-amber-50 text-amber-800 border-amber-200',
  reviewed: 'bg-sky-50 text-sky-800 border-sky-200',
  imported: 'bg-emerald-50 text-emerald-800 border-emerald-200',
};

/**
 * @param {'panel'|'strip'} variant
 */
export function ExtractionHistoryPanel({
  rows = [],
  loading = false,
  activeId = null,
  onSelect,
  onDelete,
  className,
  variant = 'panel',
  showHeader = true,
  deletingId = null,
}) {
  if (variant === 'strip') {
    return (
      <div className={cn('min-w-0', className)}>
        {showHeader ? (
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <Clock3 className="size-3.5" />
              Recent scans
            </div>
            <span className="text-[11px] text-slate-400">{rows.length} saved</span>
          </div>
        ) : null}
        <div className="flex max-h-[72px] gap-1.5 overflow-x-auto pb-0.5">
          {loading ? (
            <div className="flex h-9 items-center gap-2 px-1 text-xs text-slate-500">
              <Loader2 className="size-3.5 animate-spin" />
              Loading…
            </div>
          ) : null}
          {!loading && rows.length === 0 ? (
            <div className="flex h-9 items-center px-1 text-xs text-slate-400">
              No previous scans yet
            </div>
          ) : null}
          {rows.map((row) => {
            const active = String(activeId) === String(row.id);
            const deleting = String(deletingId) === String(row.id);
            return (
              <div
                key={row.id}
                className={cn(
                  'relative flex h-9 shrink-0 items-center gap-2 rounded-lg border pe-7 pl-2 transition-colors',
                  active
                    ? 'border-emerald-400 bg-emerald-50'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
                  deleting && 'opacity-60',
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelect?.(row)}
                  className="flex min-w-0 items-center gap-2 text-left"
                >
                  <FileImage className="size-3 shrink-0 text-slate-400" />
                  <div className="min-w-0 max-w-[140px]">
                    <p className="truncate text-[11px] font-medium text-slate-800">
                      {row.page_count > 1
                        ? `${row.original_filename || 'Invoice'} (${row.page_count} pages)`
                        : row.original_filename || `Scan #${row.id}`}
                    </p>
                    <p className="truncate text-[10px] text-slate-500">
                      {formatWhen(row.created_at)} · {row.item_count} lines
                      {row.page_count > 1 ? ` · ${row.page_count} pages` : ''}
                      {row.provider ? ` · ${engineLabel(row)}` : ''}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded border px-1 py-0.5 text-[9px] font-medium capitalize',
                      statusTone[row.status] || statusTone.draft,
                    )}
                  >
                    {row.status || 'draft'}
                  </span>
                </button>
                {onDelete ? (
                  <button
                    type="button"
                    disabled={deleting}
                    aria-label={`Delete ${row.original_filename || `scan ${row.id}`}`}
                    className="absolute top-0.5 right-0.5 rounded p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(row);
                    }}
                  >
                    {deleting ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <X className="size-3" />
                    )}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex h-full min-h-[220px] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <Clock3 className="size-3.5" />
          Scan history
        </div>
        <span className="text-[11px] text-slate-400">{rows.length} saved</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-xs text-slate-500">
            <Loader2 className="size-4 animate-spin" />
            Loading history…
          </div>
        ) : null}
        {!loading && rows.length === 0 ? (
          <div className="px-2 py-8 text-center text-xs text-slate-500">
            Previous scans will appear here so you can reopen and review them.
          </div>
        ) : null}
        <div className="space-y-1.5">
          {rows.map((row) => {
            const active = String(activeId) === String(row.id);
            const deleting = String(deletingId) === String(row.id);
            return (
              <div
                key={row.id}
                className={cn(
                  'flex items-start gap-1 rounded-xl border px-2.5 py-2 transition-colors',
                  active
                    ? 'border-emerald-300 bg-emerald-50/80'
                    : 'border-transparent bg-slate-50/80 hover:border-slate-200 hover:bg-white',
                  deleting && 'opacity-60',
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelect?.(row)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 truncate text-[12px] font-medium text-slate-800">
                        <FileImage className="size-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">
                          {row.page_count > 1
                            ? `${row.original_filename || 'Invoice'} (${row.page_count} pages)`
                            : row.original_filename || `Scan #${row.id}`}
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500">
                        {formatWhen(row.created_at)} · {row.item_count} lines
                        {row.page_count > 1 ? ` · ${row.page_count} pages` : ''}
                        {row.provider ? ` · ${engineLabel(row)}` : ''}
                      </div>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium capitalize',
                        statusTone[row.status] || statusTone.draft,
                      )}
                    >
                      {row.status || 'draft'}
                    </span>
                  </div>
                </button>
                {onDelete ? (
                  <button
                    type="button"
                    disabled={deleting}
                    aria-label={`Delete ${row.original_filename || `scan ${row.id}`}`}
                    className="mt-0.5 shrink-0 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                    onClick={() => onDelete(row)}
                  >
                    {deleting ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
