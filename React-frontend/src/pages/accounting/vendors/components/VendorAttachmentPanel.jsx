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
import { vendorsApi } from '../api/vendors.api';

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

function fileExtension(name) {
  return String(name || '').split('.').pop()?.toLowerCase() || '';
}

function isImage(attachment) {
  return (
    String(attachment?.mime_type || '').startsWith('image/') ||
    IMAGE_EXTENSIONS.includes(fileExtension(attachment?.original_name))
  );
}

function formatFileSize(bytes) {
  const size = Number(bytes) || 0;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function AttachmentIcon({ attachment }) {
  const extension = fileExtension(attachment?.original_name);
  if (isImage(attachment)) return <FileImage className="size-4 text-blue-600" />;
  if (['xls', 'xlsx', 'csv'].includes(extension)) {
    return <FileSpreadsheet className="size-4 text-emerald-600" />;
  }
  return <File className="size-4 text-slate-500" />;
}

async function requestErrorMessage(error, fallback) {
  let data = error?.response?.data;
  if (data instanceof Blob) {
    try {
      data = JSON.parse(await data.text());
    } catch {
      data = null;
    }
  }
  return data?.message || error?.message || fallback;
}

export function VendorAttachmentPanel({ vendorId }) {
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [preview, setPreview] = useState(null);
  const fileCacheRef = useRef(new Map());

  const fetchFile = useCallback(async (attachment, previewMode = false) => {
    const cacheKey = `${vendorId}:${attachment.id}:${previewMode ? 'preview' : 'original'}`;
    const cached = fileCacheRef.current.get(cacheKey);
    if (cached) return cached;

    const request = (previewMode
      ? vendorsApi.previewAttachment(vendorId, attachment.id)
      : vendorsApi.downloadAttachment(vendorId, attachment.id))
      .then((res) => {
        if (!(res.data instanceof Blob) || res.data.size === 0) {
          throw new Error('The server returned an empty file.');
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
  }, [vendorId]);

  useEffect(() => {
    if (!vendorId) return undefined;
    let cancelled = false;
    setLoading(true);

    vendorsApi
      .listAttachments(vendorId)
      .then((res) => {
        if (!cancelled) setAttachments(res.data?.data || []);
      })
      .catch((error) => {
        if (!cancelled) {
          setAttachments([]);
          toast.error(error?.response?.data?.message || 'Could not load vendor attachments');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [vendorId]);

  useEffect(() => {
    attachments
      .filter(isImage)
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

  const openPreview = async (attachment) => {
    setBusyId(attachment.id);
    try {
      const blob = await fetchFile(attachment, true);
      setPreview({ attachment, url: URL.createObjectURL(blob) });
    } catch (error) {
      toast.error(await requestErrorMessage(error, 'Could not open attachment preview'));
    } finally {
      setBusyId(null);
    }
  };

  const download = async (attachment) => {
    setBusyId(attachment.id);
    try {
      const blob = await fetchFile(attachment);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.original_name || 'vendor-attachment';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(await requestErrorMessage(error, 'Could not download attachment'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Paperclip className="size-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Attachments</h3>
              <p className="text-xs text-slate-500">Vendor documents and supporting files</p>
            </div>
          </div>
          {!loading ? (
            <span className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
              {attachments.length} {attachments.length === 1 ? 'file' : 'files'}
            </span>
          ) : null}
        </div>

        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-sm text-slate-500">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Loading attachments…
            </div>
          ) : attachments.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center">
              <span className="flex size-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
                <Paperclip className="size-4" />
              </span>
              <p className="mt-2 text-sm font-semibold text-slate-700">No attachments</p>
              <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">
                Files uploaded while creating or editing this vendor will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 px-3 py-3 transition-colors hover:border-slate-300"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white">
                    <AttachmentIcon attachment={attachment} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {attachment.original_name}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatFileSize(attachment.file_size)}
                      {attachment.created_at ? ` · ${attachment.created_at}` : ''}
                    </p>
                  </div>
                  {isImage(attachment) ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 px-2.5 text-xs"
                      disabled={busyId === attachment.id}
                      onClick={() => openPreview(attachment)}
                    >
                      {busyId === attachment.id ? (
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
                    className="size-8 shrink-0 text-slate-500 hover:text-blue-600"
                    disabled={busyId === attachment.id}
                    onClick={() => download(attachment)}
                    title="Download attachment"
                  >
                    {busyId === attachment.id ? (
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
      </section>

      <Dialog open={Boolean(preview)} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="flex h-[92vh] w-[96vw] max-w-[1280px] flex-col overflow-hidden border-slate-200 bg-white p-0 shadow-2xl">
          <DialogHeader className="shrink-0 border-b border-slate-200 px-5 py-4 pr-14">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <FileImage className="size-4" />
              </span>
              <div className="min-w-0">
                <DialogTitle className="truncate text-sm font-semibold text-slate-950">
                  {preview?.attachment?.original_name || 'Attachment preview'}
                </DialogTitle>
                <p className="mt-0.5 text-xs text-slate-500">
                  {formatFileSize(preview?.attachment?.file_size)}
                </p>
              </div>
            </div>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-slate-50 p-4 sm:p-8">
            {preview?.url ? (
              <img
                src={preview.url}
                alt={preview.attachment?.original_name || 'Vendor attachment'}
                className="max-h-full max-w-full rounded-lg bg-white object-contain shadow-lg ring-1 ring-slate-200"
              />
            ) : null}
          </div>
          <div className="flex shrink-0 justify-end border-t border-slate-200 bg-white px-5 py-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => preview?.attachment && download(preview.attachment)}
            >
              <Download className="size-4" />
              Download
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
