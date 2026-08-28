import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  FileImage,
  ImagePlus,
  Loader2,
  Plus,
  ScanLine,
  Sparkles,
  X,
  XCircle,
  ZoomIn,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

/**
 * Invoice page upload.
 * - Default: centered card (empty upload or review-before-scan).
 * - toolbar: compact strip while the extraction table is open.
 */
export function InvoicePageQueue({
  pages = [],
  onPagesChange,
  onPreviewPage,
  disabled = false,
  scanAction = null,
  variant = 'card',
  className,
}) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const addFiles = useCallback(
    (fileList) => {
      if (!fileList?.length || disabled) return;
      const next = [...pages];
      for (const file of fileList) {
        if (!file.type?.startsWith('image/')) continue;
        next.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          file,
          previewUrl: URL.createObjectURL(file),
          status: 'pending',
          itemCount: 0,
          error: '',
        });
      }
      if (next.length !== pages.length) onPagesChange?.(next);
    },
    [disabled, onPagesChange, pages],
  );

  const removePage = (id) => {
    const target = pages.find((p) => p.id === id);
    if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
    onPagesChange?.(pages.filter((p) => p.id !== id));
  };

  const clearAll = (e) => {
    e?.stopPropagation?.();
    pages.forEach((page) => {
      if (page.previewUrl) URL.revokeObjectURL(page.previewUrl);
    });
    onPagesChange?.([]);
  };

  const openPicker = () => {
    if (!disabled) inputRef.current?.click();
  };

  const bindDrop = {
    onDragEnter: (e) => {
      e.preventDefault();
      if (!disabled) setDragging(true);
    },
    onDragOver: (e) => e.preventDefault(),
    onDragLeave: (e) => {
      e.preventDefault();
      if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false);
    },
    onDrop: (e) => {
      e.preventDefault();
      setDragging(false);
      addFiles(Array.from(e.dataTransfer?.files || []));
    },
  };

  const doneCount = pages.filter((p) => p.status === 'done').length;
  const pendingCount = pages.filter((p) => p.status === 'pending' || p.status === 'error').length;
  const hasPages = pages.length > 0;
  const isToolbar = variant === 'toolbar';

  return (
    <div className={cn('min-w-0', className)}>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          addFiles(Array.from(e.target.files || []));
          e.target.value = '';
        }}
      />

      {!hasPages && !isToolbar ? (
        <EmptyUploadCard
          dragging={dragging}
          disabled={disabled}
          onBrowse={openPicker}
          {...bindDrop}
        />
      ) : isToolbar ? (
        <ToolbarStrip
          pages={pages}
          doneCount={doneCount}
          pendingCount={pendingCount}
          disabled={disabled}
          dragging={dragging}
          scanAction={scanAction}
          onClearAll={clearAll}
          onBrowse={openPicker}
          onPreview={onPreviewPage}
          onRemove={removePage}
          {...bindDrop}
        />
      ) : (
        <ReviewCard
          pages={pages}
          pendingCount={pendingCount}
          disabled={disabled}
          dragging={dragging}
          scanAction={scanAction}
          onClearAll={clearAll}
          onBrowse={openPicker}
          onPreview={onPreviewPage}
          onRemove={removePage}
          {...bindDrop}
        />
      )}
    </div>
  );
}

function EmptyUploadCard({ dragging, disabled, onBrowse, ...dropHandlers }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-white shadow-sm transition-colors',
        dragging ? 'border-emerald-400 ring-4 ring-emerald-100' : 'border-slate-200',
      )}
      {...dropHandlers}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.28]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgb(148 163 184 / 0.2) 1px, transparent 0)',
          backgroundSize: '20px 20px',
        }}
      />

      <div className="relative flex flex-col items-center px-6 py-10 text-center sm:px-10 sm:py-11">
        <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-sm">
          <ScanLine className="size-6" />
        </div>

        <h2 className="mt-4 text-[17px] font-semibold tracking-tight text-slate-900">
          Upload supplier invoice
        </h2>
        <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-slate-500">
          Add photos of the bill. Extra pages of the same invoice are merged into one scan.
        </p>

        <div
          className={cn(
            'mt-5 flex w-full max-w-md flex-col items-center gap-2.5 rounded-xl border-2 border-dashed px-4 py-7 transition-colors',
            dragging
              ? 'border-emerald-400 bg-emerald-50/80'
              : 'border-slate-200 bg-slate-50/60 hover:border-emerald-300',
          )}
        >
          <ImagePlus className="size-7 text-slate-400" />
          <p className="text-[13px] font-medium text-slate-800">Drop pages here</p>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className="h-8 border-slate-300 bg-white px-3.5 text-[12px] font-medium hover:border-emerald-400 hover:text-emerald-900"
            onClick={onBrowse}
          >
            Browse files
          </Button>
        </div>

        <p className="mt-3.5 text-[11px] text-slate-400">
          JPEG · PNG · WebP · original quality · up to 20 MB
        </p>
      </div>
    </div>
  );
}

function ReviewCard({
  pages,
  pendingCount,
  disabled,
  dragging,
  scanAction,
  onClearAll,
  onBrowse,
  onPreview,
  onRemove,
  ...dropHandlers
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
        <div>
          <p className="text-[13px] font-semibold text-slate-900">Review invoice pages</p>
          <p className="mt-0.5 text-[12px] text-slate-500">
            {pages.length} page{pages.length === 1 ? '' : 's'} added · click a photo to zoom
          </p>
        </div>
        <button
          type="button"
          disabled={disabled}
          className="shrink-0 text-[12px] font-medium text-slate-400 hover:text-red-700 disabled:opacity-40"
          onClick={onClearAll}
        >
          Clear all
        </button>
      </div>

      <div
        className={cn(
          'flex flex-wrap items-start justify-center gap-3 px-4 py-4 sm:gap-4 sm:px-5 sm:py-5',
          dragging && 'bg-emerald-50/50',
        )}
        {...dropHandlers}
      >
        {pages.map((page, index) => (
          <PageThumb
            key={page.id}
            page={page}
            index={index}
            size="lg"
            disabled={disabled}
            onPreview={() => onPreview?.(index)}
            onRemove={() => onRemove(page.id)}
          />
        ))}

        <AddPageTile disabled={disabled} dragging={dragging} size="lg" onClick={onBrowse} />
      </div>

      <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-4 sm:px-5">
        <div className="mx-auto flex max-w-md flex-col items-center gap-2.5">
          {scanAction}
          <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Sparkles className="size-3 text-emerald-600" />
            {pendingCount > 0
              ? 'Gemini will extract every line item for you to review'
              : 'All pages scanned — review the table below'}
          </p>
        </div>
      </div>
    </div>
  );
}

function ToolbarStrip({
  pages,
  doneCount,
  pendingCount,
  disabled,
  dragging,
  scanAction,
  onClearAll,
  onBrowse,
  onPreview,
  onRemove,
  ...dropHandlers
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400">
            Pages
          </span>
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-slate-700">
            {pages.length}
          </span>
          {doneCount > 0 ? (
            <span className="text-[11px] tabular-nums text-emerald-700">{doneCount} done</span>
          ) : null}
          {pendingCount > 0 && doneCount > 0 ? (
            <span className="text-[11px] tabular-nums text-amber-700">{pendingCount} pending</span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={disabled}
            className="text-[11px] font-medium text-slate-400 hover:text-red-700 disabled:opacity-40"
            onClick={onClearAll}
          >
            Clear
          </button>
          {scanAction}
        </div>
      </div>

      <div
        className="flex items-center gap-2 overflow-x-auto px-3 py-2.5"
        {...dropHandlers}
      >
        {pages.map((page, index) => (
          <PageThumb
            key={page.id}
            page={page}
            index={index}
            size="sm"
            disabled={disabled}
            onPreview={() => onPreview?.(index)}
            onRemove={() => onRemove(page.id)}
          />
        ))}
        <AddPageTile disabled={disabled} dragging={dragging} size="sm" onClick={onBrowse} />
      </div>
    </div>
  );
}

function AddPageTile({ disabled, dragging, size, onClick }) {
  const lg = size === 'lg';

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 bg-slate-50/80 text-slate-500 transition-colors',
        lg ? 'h-[128px] w-[96px]' : 'h-[72px] w-[56px]',
        !disabled && 'hover:border-emerald-400 hover:bg-emerald-50/60 hover:text-emerald-800',
        dragging && 'border-emerald-400 bg-emerald-50 text-emerald-800',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <Plus className={lg ? 'size-4' : 'size-3.5'} />
      <span className={cn('font-medium', lg ? 'text-[10px]' : 'text-[9px]')}>Add</span>
    </button>
  );
}

function PageThumb({ page, index, disabled, onPreview, onRemove, size = 'sm' }) {
  const [src, setSrc] = useState(page.previewUrl || '');
  const recoveredUrlRef = useRef('');
  const lg = size === 'lg';

  useEffect(() => {
    setSrc(page.previewUrl || '');
  }, [page.previewUrl]);

  useEffect(() => {
    return () => {
      if (recoveredUrlRef.current) URL.revokeObjectURL(recoveredUrlRef.current);
    };
  }, []);

  const recoverFromFile = () => {
    if (recoveredUrlRef.current || !(page.file instanceof Blob)) return;
    recoveredUrlRef.current = URL.createObjectURL(page.file);
    setSrc(recoveredUrlRef.current);
  };

  return (
    <div
      className={cn(
        'group relative shrink-0 overflow-hidden rounded-lg border bg-white shadow-sm',
        lg ? 'h-[128px] w-[96px]' : 'h-[72px] w-[56px]',
        page.status === 'done' && 'border-emerald-300',
        page.status === 'scanning' && 'border-emerald-500 ring-2 ring-emerald-200',
        page.status === 'error' && 'border-red-300',
        page.status === 'pending' && 'border-slate-200',
      )}
    >
      <button
        type="button"
        className="absolute inset-0"
        onClick={onPreview}
        aria-label={`View page ${index + 1}`}
      >
        {src ? (
          <img
            src={src}
            alt=""
            className="h-full w-full bg-white object-contain object-center"
            onError={recoverFromFile}
          />
        ) : (
          <span className="flex h-full items-center justify-center bg-slate-100">
            <FileImage className="size-5 text-slate-400" />
          </span>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-slate-950/0 text-white opacity-0 transition-colors group-hover:bg-slate-950/35 group-hover:opacity-100">
          <ZoomIn className="size-4" />
        </span>
      </button>

      <span
        className={cn(
          'pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-slate-900/80 to-transparent px-1.5 text-white',
          lg ? 'h-6 text-[10px]' : 'h-5 text-[9px]',
        )}
      >
        <span className="font-semibold tabular-nums">P{index + 1}</span>
        <span>
          {page.status === 'scanning' ? (
            <Loader2 className="size-3 animate-spin" />
          ) : page.status === 'done' ? (
            <CheckCircle2 className="size-3 text-emerald-300" />
          ) : page.status === 'error' ? (
            <XCircle className="size-3 text-red-300" />
          ) : (
            <span className="font-medium text-white/75">ready</span>
          )}
        </span>
      </span>

      {page.status !== 'scanning' && !disabled ? (
        <button
          type="button"
          className="absolute top-1 right-1 z-10 rounded-full bg-slate-900/70 p-0.5 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove page ${index + 1}`}
        >
          <X className="size-3" />
        </button>
      ) : null}
    </div>
  );
}

export function revokeInvoicePages(pages) {
  for (const page of pages || []) {
    if (page.previewUrl) URL.revokeObjectURL(page.previewUrl);
  }
}

/** Primary scan button used in the review card footer. */
export function InvoiceScanButton({
  pending,
  scanning,
  progress,
  scanned,
  disabled,
  onScan,
  onCancel,
  className,
}) {
  if (scanning) {
    return (
      <div className={cn('flex w-full max-w-sm items-center gap-2', className)}>
        <Button
          type="button"
          disabled
          className="h-10 flex-1 bg-emerald-700 text-sm font-semibold opacity-90"
        >
          <Loader2 className="size-4 me-2 animate-spin" />
          Scanning {progress.current}/{progress.total}…
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" className="h-10 px-4" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    );
  }

  if (!pending) return null;

  const label =
    scanned && pending
      ? `Scan ${pending} more page${pending === 1 ? '' : 's'}`
      : `Scan ${pending} page${pending === 1 ? '' : 's'}`;

  return (
    <Button
      type="button"
      disabled={disabled || pending < 1}
      className={cn(
        'h-10 w-full max-w-sm bg-emerald-700 text-sm font-semibold shadow-sm hover:bg-emerald-800',
        className,
      )}
      onClick={onScan}
    >
      <ScanLine className="size-4 me-2" />
      {label}
    </Button>
  );
}
