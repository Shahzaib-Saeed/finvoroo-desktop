import { useCallback, useEffect, useRef, useState } from 'react';
import { Clock3, FileImage, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { pharmacyApi } from '../api/pharmacy.api';
import { engineFromExtraction, formatOcrEngineName } from '../lib/ocr-engine-label';

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

function pageIdsForRow(row) {
  if (Array.isArray(row?.page_ids) && row.page_ids.length) return row.page_ids;
  return row?.id ? [row.id] : [];
}

const statusTone = {
  draft: 'bg-amber-50 text-amber-800 border-amber-200',
  reviewed: 'bg-sky-50 text-sky-800 border-sky-200',
  imported: 'bg-emerald-50 text-emerald-800 border-emerald-200',
};

function ScanPageThumb({ src, label, loading, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!src && !loading}
      className={cn(
        'group/thumb relative flex min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-200/90 bg-slate-100 shadow-sm transition-colors',
        'aspect-[3/4] max-h-[140px]',
        onClick && src && 'cursor-zoom-in hover:border-slate-300 hover:shadow-md',
        !src && !loading && 'cursor-default',
      )}
    >
      {loading ? (
        <span className="flex size-full items-center justify-center text-slate-400">
          <Loader2 className="size-5 animate-spin" />
        </span>
      ) : src ? (
        <img
          src={src}
          alt={label}
          className="size-full object-cover object-top transition-transform duration-200 group-hover/thumb:scale-[1.02]"
          loading="lazy"
        />
      ) : (
        <span className="flex size-full flex-col items-center justify-center gap-1.5 text-slate-400">
          <FileImage className="size-5 opacity-60" />
          <span className="text-[10px] font-medium">No image</span>
        </span>
      )}
      {label ? (
        <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/55 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
          {label}
        </span>
      ) : null}
    </button>
  );
}

function ScanHistoryCard({
  row,
  active,
  deleting,
  pageThumbs,
  thumbsLoading,
  onOpen,
  onViewImage,
  onDelete,
}) {
  const pageIds = pageIdsForRow(row);
  const multiPage = pageIds.length > 1 || (row.page_count || 0) > 1;
  const engineName = formatOcrEngineName(engineFromExtraction(row)?.provider);
  const title =
    row.original_filename ||
    (multiPage ? `Invoice · ${pageIds.length || row.page_count} pages` : `Scan #${row.id}`);

  const handleView = () => {
    if (row.has_image && onViewImage) onViewImage(row);
  };

  return (
    <article
      className={cn(
        'overflow-hidden rounded-xl border bg-white transition-colors',
        active ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-slate-200 hover:border-slate-300',
        deleting && 'opacity-60',
      )}
    >
      <div
        className={cn(
          'flex gap-2 bg-slate-50/80 p-2',
          multiPage ? 'grid grid-cols-2' : 'grid grid-cols-1',
        )}
      >
        {multiPage
          ? pageIds.map((pageId, index) => (
              <ScanPageThumb
                key={pageId}
                src={pageThumbs?.[pageId]}
                label={`Page ${index + 1}`}
                loading={thumbsLoading && !pageThumbs?.[pageId]}
                onClick={row.has_image ? handleView : undefined}
              />
            ))
          : (
              <ScanPageThumb
                src={pageThumbs?.[pageIds[0]]}
                label={null}
                loading={thumbsLoading && row.has_image && !pageThumbs?.[pageIds[0]]}
                onClick={row.has_image ? handleView : undefined}
              />
            )}
      </div>

      <div className="flex items-start gap-2 px-3 py-2.5">
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => onOpen?.(row)}
        >
          <p className="truncate text-[13px] font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
            {formatWhen(row.created_at)}
            <span className="mx-1 text-slate-300">·</span>
            {row.item_count} lines
            {multiPage ? (
              <>
                <span className="mx-1 text-slate-300">·</span>
                {pageIds.length || row.page_count} pages
              </>
            ) : null}
            {engineName ? (
              <>
                <span className="mx-1 text-slate-300">·</span>
                {engineName}
              </>
            ) : null}
          </p>
          <span
            className={cn(
              'mt-2 inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold capitalize',
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
            aria-label={`Delete ${title}`}
            className="mt-0.5 shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
            onClick={() => onDelete(row)}
          >
            {deleting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
          </button>
        ) : null}
      </div>
    </article>
  );
}

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
  const [open, setOpen] = useState(false);
  const [thumbsByPageId, setThumbsByPageId] = useState({});
  const [thumbsLoading, setThumbsLoading] = useState(false);
  const blobUrlsRef = useRef([]);

  const revokeAllThumbs = useCallback(() => {
    blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    blobUrlsRef.current = [];
    setThumbsByPageId({});
  }, []);

  useEffect(() => () => revokeAllThumbs(), [revokeAllThumbs]);

  useEffect(() => {
    if (!open) {
      revokeAllThumbs();
      return undefined;
    }

    let cancelled = false;
    const pageIds = rows.flatMap((row) => (row.has_image ? pageIdsForRow(row) : []));

    if (!pageIds.length) {
      setThumbsLoading(false);
      return undefined;
    }

    setThumbsLoading(true);

    (async () => {
      const next = {};
      const blobs = [];

      await Promise.all(
        pageIds.map(async (pageId) => {
          try {
            const res = await pharmacyApi.extractionImage(pageId);
            const blob = res.data;
            if (
              !(blob instanceof Blob) ||
              (blob.type &&
                !blob.type.startsWith('image/') &&
                blob.type !== 'application/octet-stream')
            ) {
              return;
            }
            const url = URL.createObjectURL(blob);
            blobs.push(url);
            next[pageId] = url;
          } catch {
            /* optional thumbnail */
          }
        }),
      );

      if (cancelled) {
        blobs.forEach((url) => URL.revokeObjectURL(url));
        return;
      }

      blobUrlsRef.current = blobs;
      setThumbsByPageId(next);
      setThumbsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, rows, revokeAllThumbs]);

  const handleOpen = (row) => {
    onOpen?.(row);
    setOpen(false);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        className="h-9 gap-1.5 border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-700 shadow-none hover:border-slate-300 hover:bg-slate-50"
        onClick={() => setOpen(true)}
      >
        <Clock3 className="size-3.5 text-slate-500" />
        History
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-slate-600">
          {count}
        </span>
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-[420px]"
          data-pharmacy-typing
        >
          <SheetHeader className="shrink-0 border-b border-slate-100 px-4 py-4 text-left">
            <div className="flex items-start justify-between gap-3 pe-8">
              <div>
                <SheetTitle className="text-base font-semibold text-slate-900">
                  Saved scans
                </SheetTitle>
                <SheetDescription className="mt-1 text-[12px] text-slate-500">
                  {count
                    ? `${count} saved scan${count === 1 ? '' : 's'} — tap to reopen`
                    : 'Previous invoice scans appear here'}
                </SheetDescription>
              </div>
              {count > 0 && onClearAll ? (
                <button
                  type="button"
                  disabled={clearing || disabled}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
                  onClick={() => onClearAll()}
                >
                  {clearing ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Trash2 className="size-3" />
                  )}
                  Clear all
                </button>
              ) : null}
            </div>
          </SheetHeader>

          <SheetBody className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            {loading && !count ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
                <Loader2 className="size-4 animate-spin" />
                Loading history…
              </div>
            ) : null}

            {!loading && !count ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <FileImage className="size-5" />
                </span>
                <p className="text-sm font-medium text-slate-600">No saved scans yet</p>
                <p className="max-w-[240px] text-[12px] text-slate-400">
                  Scanned supplier bills are saved here so you can reopen and review them later.
                </p>
              </div>
            ) : null}

            <div className="space-y-3">
              {rows.map((row) => (
                <ScanHistoryCard
                  key={row.id}
                  row={row}
                  active={String(activeId) === String(row.id)}
                  deleting={String(deletingId) === String(row.id)}
                  pageThumbs={thumbsByPageId}
                  thumbsLoading={thumbsLoading}
                  onOpen={handleOpen}
                  onViewImage={onViewImage}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </SheetBody>
        </SheetContent>
      </Sheet>
    </>
  );
}
