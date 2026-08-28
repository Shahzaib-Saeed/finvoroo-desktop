import { useCallback, useRef, useState } from 'react';
import { FileImage, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

export function InvoiceUploadDropzone({
  file,
  previewUrl,
  onFile,
  disabled = false,
  className,
  compact = false,
}) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const pick = useCallback(
    (next) => {
      if (!next || disabled) return;
      if (!next.type?.startsWith('image/')) return;
      onFile?.(next);
    },
    [disabled, onFile],
  );

  return (
    <div className={cn(compact ? 'min-w-0 flex-1' : 'space-y-2', className)}>
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer?.files?.[0];
          pick(f);
        }}
        className={cn(
          'cursor-pointer border border-dashed transition-colors',
          compact
            ? 'flex h-14 items-center gap-3 rounded-xl border-slate-200 bg-slate-50/80 px-3'
            : 'flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-md border-gray-300 bg-white px-4 py-6 text-center',
          dragging && 'border-sky-400 bg-sky-50/70',
          disabled && 'pointer-events-none opacity-60',
        )}
      >
        {previewUrl ? (
          <div className={cn('flex min-w-0 items-center gap-3', !compact && 'flex-col')}>
            <img
              src={previewUrl}
              alt="Invoice preview"
              className={cn(
                'rounded border border-slate-200 object-contain bg-white',
                compact ? 'h-10 w-10 shrink-0' : 'max-h-48 max-w-full',
              )}
              onClick={(e) => e.stopPropagation()}
            />
            {compact ? (
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-medium text-slate-800">
                  {file?.name || 'Invoice selected'}
                </p>
                <p className="text-[11px] text-slate-500">Click to change image</p>
              </div>
            ) : null}
          </div>
        ) : (
          <>
            <Upload className={cn('shrink-0 text-slate-400', compact ? 'size-5' : 'size-6')} />
            <div className={cn(compact ? 'min-w-0 text-left' : '')}>
              <div className={cn('text-slate-700', compact ? 'truncate text-sm font-medium' : 'text-sm')}>
                {compact ? 'Drop invoice image or browse' : 'Drag & drop invoice image, or click to browse'}
              </div>
              <div className="text-[11px] text-slate-500">JPEG, PNG, WebP, GIF · max 10 MB</div>
            </div>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            const f = e.target.files?.[0];
            pick(f);
            e.target.value = '';
          }}
        />
      </div>
      {!compact && file ? (
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <FileImage className="size-3.5 shrink-0" />
          <span className="truncate">{file.name}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            Change
          </Button>
        </div>
      ) : null}
    </div>
  );
}
