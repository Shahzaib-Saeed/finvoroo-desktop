import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Download,
  Eye,
  File,
  FileImage,
  FileSpreadsheet,
  Loader2,
  Paperclip,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { jobOrdersApi } from '../api/job-orders.api';

function formatFileSize(bytes) {
  const size = Number(bytes) || 0;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function FileTypeIcon({ name }) {
  const extension = String(name || '').split('.').pop()?.toLowerCase();
  const className = 'size-4 shrink-0 text-slate-500';

  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(extension)) {
    return <FileImage className={className} />;
  }
  if (['xls', 'xlsx', 'csv'].includes(extension)) {
    return <FileSpreadsheet className={className} />;
  }
  return <File className={className} />;
}

function isImageAttachment(attachment) {
  if (String(attachment?.mime_type || '').startsWith('image/')) return true;
  const extension = String(attachment?.original_name || '').split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(extension);
}

async function attachmentRequestError(error, fallback) {
  let data = error?.response?.data;

  if (data instanceof Blob) {
    try {
      const text = await data.text();
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  return data?.message || error?.message || fallback;
}

export function JobOrderAttachmentPanel({ jobOrderId }) {
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const [previewingId, setPreviewingId] = useState(null);
  const [preview, setPreview] = useState(null);
  const fileCacheRef = useRef(new Map());

  const fetchFile = useCallback(async (attachment, previewMode = false) => {
    const cacheKey = `${jobOrderId}:${attachment.id}:${previewMode ? 'preview' : 'original'}`;
    const cached = fileCacheRef.current.get(cacheKey);
    if (cached) return cached;

    const request = (previewMode
      ? jobOrdersApi.previewAttachment(jobOrderId, attachment.id)
      : jobOrdersApi.downloadAttachment(jobOrderId, attachment.id))
      .then((res) => {
        if (!(res.data instanceof Blob) || res.data.size === 0) {
          throw new Error('The server returned an empty attachment.');
        }
        fileCacheRef.current.set(cacheKey, res.data);
        return res.data;
      })
      .catch((error) => {
        fileCacheRef.current.delete(cacheKey);
        throw error;
      });

    fileCacheRef.current.set(cacheKey, request);
    return request;
  }, [jobOrderId]);

  useEffect(() => {
    if (!jobOrderId) {
      setAttachments([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    jobOrdersApi
      .attachments(jobOrderId)
      .then((res) => {
        if (!cancelled) setAttachments(res.data?.data || []);
      })
      .catch(() => {
        if (!cancelled) setAttachments([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [jobOrderId]);

  useEffect(() => {
    attachments
      .filter(isImageAttachment)
      .slice(0, 4)
      .forEach((attachment) => {
        fetchFile(attachment, true).catch(() => {});
      });
  }, [attachments, fetchFile]);

  useEffect(() => {
    return () => {
      if (preview?.url) URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  const closePreview = () => setPreview(null);

  const viewImage = async (attachment) => {
    setPreviewingId(attachment.id);
    try {
      const blob = await fetchFile(attachment, true);
      setPreview({
        attachment,
        url: URL.createObjectURL(blob),
      });
    } catch (err) {
      toast.error(await attachmentRequestError(err, 'Could not open image preview'));
    } finally {
      setPreviewingId(null);
    }
  };

  const download = async (attachment) => {
    setDownloadingId(attachment.id);
    try {
      const blob = await fetchFile(attachment);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.original_name || 'attachment';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(await attachmentRequestError(err, 'Could not download attachment'));
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <Paperclip className="size-3.5 text-slate-400" />
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
            Attachments
          </h3>
        </div>
        {!loading && attachments.length > 0 ? (
          <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500">
            {attachments.length} {attachments.length === 1 ? 'file' : 'files'}
          </span>
        ) : null}
      </div>

      <div className="p-4 sm:p-5">
        {loading ? (
          <div className="flex items-center justify-center py-7 text-sm text-slate-400">
            <Loader2 className="mr-2 size-4 animate-spin" />
            Loading attachments…
          </div>
        ) : attachments.length === 0 ? (
          <div className="flex flex-col items-center py-7 text-center">
            <span className="flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400">
              <Paperclip className="size-4" />
            </span>
            <p className="mt-2 text-sm font-medium text-slate-600">No attachments</p>
            <p className="mt-0.5 text-xs text-slate-400">
              Files added while creating or editing this job will appear here.
            </p>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white">
                  <FileTypeIcon name={attachment.original_name} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {attachment.original_name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatFileSize(attachment.file_size)}
                    {attachment.created_at ? ` · ${attachment.created_at}` : ''}
                  </p>
                </div>
                {isImageAttachment(attachment) ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 shrink-0 gap-1.5 border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    disabled={previewingId === attachment.id}
                    onClick={() => viewImage(attachment)}
                  >
                    {previewingId === attachment.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Eye className="size-3.5" />
                    )}
                    View
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0 text-slate-500 hover:bg-white hover:text-blue-600"
                  disabled={downloadingId === attachment.id}
                  onClick={() => download(attachment)}
                  title="Download attachment"
                >
                  {downloadingId === attachment.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Download className="size-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={Boolean(preview)}
        onOpenChange={(open) => {
          if (!open) closePreview();
        }}
      >
        <DialogContent className="flex h-[92vh] w-[96vw] max-w-[1280px] flex-col overflow-hidden border-slate-200 bg-white p-0 shadow-2xl">
          <DialogHeader className="shrink-0 border-b border-slate-200 bg-white px-5 py-4 pr-14">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600">
                <FileImage className="size-4" />
              </span>
              <div className="min-w-0">
                <DialogTitle className="truncate text-sm font-semibold text-slate-950">
                  {preview?.attachment?.original_name || 'Image preview'}
                </DialogTitle>
                <p className="mt-0.5 text-xs text-slate-500">
                  {formatFileSize(preview?.attachment?.file_size)}
                  {preview?.attachment?.created_at
                    ? ` · Uploaded ${preview.attachment.created_at}`
                    : ''}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto bg-slate-50 p-4 sm:p-8">
            {preview?.url ? (
              <img
                src={preview.url}
                alt={preview.attachment?.original_name || 'Job order attachment'}
                className="max-h-full max-w-full rounded-lg bg-white object-contain shadow-lg ring-1 ring-slate-200"
              />
            ) : null}
          </div>

          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-3">
            <p className="text-xs text-slate-500">Previewing securely inside the job order.</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => preview?.attachment && download(preview.attachment)}
              disabled={downloadingId === preview?.attachment?.id}
            >
              {downloadingId === preview?.attachment?.id ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              Download
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
