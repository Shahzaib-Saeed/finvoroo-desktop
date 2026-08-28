import { Clock3, Eye, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

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

const statusTone = {
  draft: 'bg-amber-50 text-amber-800',
  reviewed: 'bg-sky-50 text-sky-800',
  imported: 'bg-emerald-50 text-emerald-800',
};

export function SavedScansMenu({
  rows = [],
  loading = false,
  activeId = null,
  deletingId = null,
  clearing = false,
  disabled = false,
  onOpen,
  onViewImage,
  onDelete,
  onClearAll,
}) {
  const count = rows.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className="h-9 gap-1.5 border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-700 shadow-none hover:border-slate-300 hover:bg-slate-50"
        >
          <Clock3 className="size-3.5 text-slate-500" />
          History
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-slate-600">
            {count}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[320px] p-1.5" data-pharmacy-typing>
        <DropdownMenuLabel className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
          <span>Saved scans</span>
          {count > 0 && onClearAll ? (
            <button
              type="button"
              disabled={clearing || disabled}
              className="inline-flex items-center gap-1 text-[10px] font-medium normal-case tracking-normal text-slate-400 hover:text-red-700 disabled:opacity-40"
              onClick={(e) => {
                e.preventDefault();
                onClearAll();
              }}
            >
              {clearing ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
              Clear all
            </button>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {loading && !count ? (
          <div className="flex items-center gap-2 px-2 py-6 text-xs text-slate-500">
            <Loader2 className="size-3.5 animate-spin" />
            Loading…
          </div>
        ) : null}
        {!loading && !count ? (
          <p className="px-2 py-6 text-center text-xs text-slate-400">No saved scans yet</p>
        ) : null}
        <div className="max-h-[280px] overflow-y-auto">
          {rows.map((row) => {
            const active = String(activeId) === String(row.id);
            const deleting = String(deletingId) === String(row.id);
            return (
              <div
                key={row.id}
                className={cn(
                  'mb-0.5 flex items-center gap-1 rounded-md px-1 py-1',
                  active ? 'bg-emerald-50' : 'hover:bg-slate-50',
                  deleting && 'opacity-60',
                )}
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 rounded px-1.5 py-1 text-left"
                  onClick={() => onOpen?.(row)}
                >
                  <p className="truncate text-[12px] font-medium text-slate-800">
                    {row.original_filename || `Scan #${row.id}`}
                  </p>
                  <p className="truncate text-[11px] text-slate-500">
                    {formatWhen(row.created_at)} · {row.item_count} lines
                    <span
                      className={cn(
                        'ms-1.5 rounded px-1 py-px text-[9px] font-semibold capitalize',
                        statusTone[row.status] || statusTone.draft,
                      )}
                    >
                      {row.status || 'draft'}
                    </span>
                  </p>
                </button>
                {row.has_image && onViewImage ? (
                  <button
                    type="button"
                    className="rounded p-1 text-slate-400 hover:bg-white hover:text-slate-800"
                    aria-label="View invoice image"
                    onClick={() => onViewImage(row)}
                  >
                    <Eye className="size-3.5" />
                  </button>
                ) : null}
                {onDelete ? (
                  <button
                    type="button"
                    disabled={deleting}
                    className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                    aria-label={`Delete ${row.original_filename || `scan ${row.id}`}`}
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
