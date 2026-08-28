import { useEffect } from 'react';
import { Download, FileText, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getAttachmentPreviewKind } from './document-attachments.lib';

/**
 * In-page attachment preview overlay (no new browser tab).
 * Supports images, PDFs, and plain text. Other types show a download prompt.
 */
export function DocumentAttachmentInlinePreview({
  open,
  onClose,
  title,
  blobUrl = null,
  mimeType = '',
  filename = '',
  textContent = null,
  loading = false,
  error = null,
  onDownload,
}) {
  const previewKind = getAttachmentPreviewKind(mimeType, filename || title);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Attachment preview'}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-[1px]"
        aria-label="Close preview"
        onClick={onClose}
      />

      <div className="relative z-[101] flex w-full max-w-5xl max-h-[min(92dvh,900px)] flex-col overflow-hidden rounded-xl border bg-background shadow-2xl">
        <div className="flex items-center gap-3 border-b px-4 py-3 shrink-0">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{title || filename || 'Attachment'}</p>
            {filename && filename !== title ? (
              <p className="text-xs text-muted-foreground truncate">{filename}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {onDownload ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8"
                title="Download"
                onClick={onDownload}
                disabled={loading}
              >
                <Download className="size-4" />
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              title="Close preview"
              onClick={onClose}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto bg-muted/20">
          {loading ? (
            <div className="flex h-[min(70dvh,640px)] items-center justify-center">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex h-[min(50dvh,420px)] flex-col items-center justify-center gap-3 px-6 text-center">
              <FileText className="size-10 text-muted-foreground/60" />
              <p className="text-sm text-destructive">{error}</p>
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          ) : previewKind === 'image' && blobUrl ? (
            <div className="flex min-h-[min(70dvh,640px)] items-center justify-center p-4">
              <img
                src={blobUrl}
                alt={title || filename || 'Attachment preview'}
                className="max-h-[min(68dvh,620px)] max-w-full rounded-md object-contain shadow-sm"
              />
            </div>
          ) : previewKind === 'pdf' && blobUrl ? (
            <iframe
              title={title || filename || 'PDF preview'}
              src={blobUrl}
              className="h-[min(70dvh,640px)] w-full border-0 bg-white"
            />
          ) : previewKind === 'text' && textContent != null ? (
            <pre
              className={cn(
                'm-0 min-h-[min(50dvh,420px)] p-4 text-xs sm:text-sm',
                'whitespace-pre-wrap break-words font-mono text-foreground',
              )}
            >
              {textContent}
            </pre>
          ) : (
            <div className="flex h-[min(50dvh,420px)] flex-col items-center justify-center gap-3 px-6 text-center">
              <FileText className="size-10 text-muted-foreground/60" />
              <div>
                <p className="text-sm font-medium">Preview not available</p>
                <p className="text-xs text-muted-foreground mt-1">
                  This file type cannot be previewed here. Download it to open on your device.
                </p>
              </div>
              {onDownload ? (
                <Button type="button" variant="mono" size="sm" onClick={onDownload}>
                  <Download className="size-4 mr-1.5" />
                  Download file
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
