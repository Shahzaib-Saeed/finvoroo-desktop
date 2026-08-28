import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Download,
  Eye,
  FileArchive,
  FileSpreadsheet,
  FileText,
  Headphones,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  RefreshCw,
  TriangleAlert,
  Upload,
  Video,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  AlertToolbar,
} from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { formatBytes, useFileUpload } from '@/hooks/use-file-upload';
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_MAX_FILES,
  ATTACHMENT_MAX_SIZE,
  downloadAttachmentFile,
  downloadPendingFile,
  formatAttachmentSize,
  getFileTypeLabel,
  isAllowedAttachmentFile,
} from './document-attachments.lib';
import { DocumentAttachmentInlinePreview } from './DocumentAttachmentInlinePreview';
import { useDocumentAttachmentPreview } from './useDocumentAttachmentPreview';

function FileTypeIcon({ mimeType, name, className }) {
  const type = (mimeType || '').toLowerCase();
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
    return <ImageIcon className={className} />;
  }
  if (type.startsWith('video/')) return <Video className={className} />;
  if (type.startsWith('audio/')) return <Headphones className={className} />;
  if (type.includes('pdf') || ext === 'pdf') return <FileText className={className} />;
  if (['xls', 'xlsx'].includes(ext) || type.includes('sheet')) {
    return <FileSpreadsheet className={className} />;
  }
  if (['zip', 'rar'].includes(ext)) return <FileArchive className={className} />;
  return <FileText className={className} />;
}

/**
 * Attachments panel for invoices and bills (progress upload UI).
 * - Create mode: queues files locally; parent uploads after document save.
 * - Edit mode: uploads immediately when documentId is set.
 */
export function DocumentAttachmentsPanel({
  title = 'Attachments',
  description = `Upload PDFs, images, or office documents (max ${formatAttachmentSize(ATTACHMENT_MAX_SIZE)} each).`,
  documentId = null,
  attachmentsApi = null,
  existingAttachments = [],
  pendingFiles = [],
  onPendingFilesChange,
  onAttachmentsChange,
  readOnly = false,
  disabled = false,
  maxFiles = ATTACHMENT_MAX_FILES,
  maxSize = ATTACHMENT_MAX_SIZE,
  compact = false,
  className,
}) {
  const [savedAttachments, setSavedAttachments] = useState(existingAttachments);
  const [busyId, setBusyId] = useState(null);
  const [uploadSessions, setUploadSessions] = useState({});
  const [pendingPreviews, setPendingPreviews] = useState({});
  const previewUrlsRef = useRef([]);
  const singleFileMode = maxFiles === 1;
  const {
    previewSavedAttachment,
    previewLocalFile,
    previewProps,
  } = useDocumentAttachmentPreview();

  useEffect(() => {
    setSavedAttachments((prev) => {
      if (prev === existingAttachments) return prev;
      if (prev.length === 0 && existingAttachments.length === 0) return prev;
      if (
        prev.length === existingAttachments.length &&
        prev.every((item, index) => item.id === existingAttachments[index]?.id)
      ) {
        return prev;
      }
      return existingAttachments;
    });
  }, [existingAttachments]);

  useEffect(() => {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    const next = {};
    const urls = [];
    pendingFiles.forEach((file, index) => {
      if (!file?.type?.startsWith('image/')) return;
      const key = `pending-${file.name}-${file.size}-${index}`;
      const url = URL.createObjectURL(file);
      next[key] = url;
      urls.push(url);
    });
    previewUrlsRef.current = urls;
    setPendingPreviews(next);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [pendingFiles]);

  const totalCount = savedAttachments.length + pendingFiles.length;
  const atLimit = totalCount >= maxFiles;

  const syncSaved = useCallback(
    (next) => {
      setSavedAttachments(next);
      onAttachmentsChange?.(next);
    },
    [onAttachmentsChange],
  );

  const uploadFileToServer = useCallback(
    async (file, sessionId) => {
      if (!documentId || !attachmentsApi) return null;

      if (singleFileMode && savedAttachments.length > 0) {
        for (const existing of savedAttachments) {
          await attachmentsApi.deleteAttachment(documentId, existing.id);
        }
        syncSaved([]);
      }

      const formData = new FormData();
      formData.append('file', file);

      const res = await attachmentsApi.uploadAttachment(documentId, formData, {
        onUploadProgress: (event) => {
          const total = event.total || file.size || 1;
          const progress = Math.min(100, Math.round((event.loaded * 100) / total));
          setUploadSessions((prev) => ({
            ...prev,
            [sessionId]: { progress, status: 'uploading', error: null },
          }));
        },
      });

      setUploadSessions((prev) => ({
        ...prev,
        [sessionId]: { progress: 100, status: 'completed', error: null },
      }));

      return res.data?.data || null;
    },
    [attachmentsApi, documentId, savedAttachments, singleFileMode, syncSaved],
  );

  const handleFilesAdded = useCallback(
    async (added) => {
      const rawFiles = added.map((item) => item.file).filter((f) => f instanceof File);
      if (!rawFiles.length) return;

      const allowedFiles = rawFiles.filter(isAllowedAttachmentFile);
      if (allowedFiles.length < rawFiles.length) {
        toast.error('Some files were skipped. Allowed: PDF, images, Word, Excel, CSV, and text.');
      }
      if (!allowedFiles.length) return;

      if (documentId && attachmentsApi) {
        let successCount = 0;
        for (let i = 0; i < allowedFiles.length; i += 1) {
          const file = allowedFiles[i];
          const sessionId = added[i]?.id || `upload-${Date.now()}-${i}`;
          setUploadSessions((prev) => ({
            ...prev,
            [sessionId]: { progress: 0, status: 'uploading', error: null },
          }));

          try {
            const uploaded = await uploadFileToServer(file, sessionId);
            if (uploaded) {
              successCount += 1;
              setSavedAttachments((prev) => {
                const next = singleFileMode ? [uploaded] : [uploaded, ...prev];
                onAttachmentsChange?.(next);
                return next;
              });
              if (singleFileMode) break;
            }
            setUploadSessions((prev) => {
              const next = { ...prev };
              delete next[sessionId];
              return next;
            });
          } catch (err) {
            setUploadSessions((prev) => ({
              ...prev,
              [sessionId]: {
                progress: 0,
                status: 'error',
                error: err?.response?.data?.message || 'Upload failed. Please try again.',
                file,
              },
            }));
            toast.error(err?.response?.data?.message || `Failed to upload ${file.name}`);
          }
        }
        if (successCount > 0) {
          toast.success(successCount > 1 ? `${successCount} attachments uploaded` : 'Attachment uploaded');
        }
        return;
      }

      if (singleFileMode) {
        onPendingFilesChange?.([allowedFiles[0]]);
        return;
      }

      const merged = [...pendingFiles];
      allowedFiles.forEach((file) => {
        const duplicate = merged.some((f) => f.name === file.name && f.size === file.size);
        if (!duplicate && merged.length < maxFiles) merged.push(file);
      });
      onPendingFilesChange?.(merged);
    },
    [
      attachmentsApi,
      documentId,
      maxFiles,
      onAttachmentsChange,
      onPendingFilesChange,
      pendingFiles,
      singleFileMode,
      uploadFileToServer,
    ],
  );

  const [uploadState, uploadActions] = useFileUpload({
    maxFiles,
    maxSize,
    accept: ATTACHMENT_ACCEPT,
    multiple: maxFiles > 1,
    onFilesAdded: handleFilesAdded,
  });

  const removePending = useCallback(
    (index) => {
      onPendingFilesChange?.(pendingFiles.filter((_, i) => i !== index));
    },
    [onPendingFilesChange, pendingFiles],
  );

  const removeSaved = useCallback(
    async (attachment) => {
      if (!documentId || !attachmentsApi) return;
      setBusyId(attachment.id);
      try {
        await attachmentsApi.deleteAttachment(documentId, attachment.id);
        syncSaved(savedAttachments.filter((a) => a.id !== attachment.id));
        toast.success('Attachment removed');
      } catch (err) {
        toast.error(err?.response?.data?.message || 'Could not remove attachment');
      } finally {
        setBusyId(null);
      }
    },
    [attachmentsApi, documentId, savedAttachments, syncSaved],
  );

  const downloadSaved = useCallback(
    async (attachment) => {
      if (!documentId || !attachmentsApi) return;
      setBusyId(attachment.id);
      try {
        await downloadAttachmentFile(attachmentsApi, documentId, attachment);
      } catch (err) {
        toast.error(err?.response?.data?.message || 'Could not download attachment');
      } finally {
        setBusyId(null);
      }
    },
    [attachmentsApi, documentId],
  );

  const viewSaved = useCallback(
    async (attachment) => {
      if (!documentId || !attachmentsApi) return;
      await previewSavedAttachment(attachmentsApi, documentId, attachment, () =>
        downloadSaved(attachment),
      );
    },
    [attachmentsApi, documentId, previewSavedAttachment, downloadSaved],
  );

  const viewPending = useCallback(
    async (file) => {
      if (!(file instanceof File)) return;
      await previewLocalFile(file, () => downloadPendingFile(file));
    },
    [previewLocalFile],
  );

  const retryUpload = useCallback(
    async (sessionId) => {
      const session = uploadSessions[sessionId];
      if (!session?.file) return;
      setUploadSessions((prev) => ({
        ...prev,
        [sessionId]: { progress: 0, status: 'uploading', error: null, file: session.file },
      }));
      try {
        const uploaded = await uploadFileToServer(session.file, sessionId);
        if (uploaded) {
          const next = singleFileMode ? [uploaded] : [uploaded, ...savedAttachments];
          syncSaved(next);
          toast.success('Attachment uploaded');
        }
        setUploadSessions((prev) => {
          const next = { ...prev };
          delete next[sessionId];
          return next;
        });
      } catch (err) {
        setUploadSessions((prev) => ({
          ...prev,
          [sessionId]: {
            progress: 0,
            status: 'error',
            error: err?.response?.data?.message || 'Upload failed. Please try again.',
            file: session.file,
          },
        }));
      }
    },
    [savedAttachments, singleFileMode, syncSaved, uploadFileToServer, uploadSessions],
  );

  const clearAll = useCallback(async () => {
    if (readOnly || disabled) return;

    if (pendingFiles.length) {
      onPendingFilesChange?.([]);
    }

    if (documentId && attachmentsApi && savedAttachments.length) {
      try {
        for (const attachment of savedAttachments) {
          await attachmentsApi.deleteAttachment(documentId, attachment.id);
        }
        syncSaved([]);
        toast.success('Attachment removed');
      } catch (err) {
        toast.error(err?.response?.data?.message || 'Could not remove attachments');
      }
    }

    setUploadSessions({});
  }, [
    attachmentsApi,
    disabled,
    documentId,
    onPendingFilesChange,
    pendingFiles.length,
    readOnly,
    savedAttachments,
    syncSaved,
  ]);

  const showDropZone = !readOnly && !disabled && !atLimit;

  const fileItems = useMemo(() => {
    const items = [];

    Object.entries(uploadSessions).forEach(([sessionId, session]) => {
      if (!session.file) return;
      items.push({
        id: sessionId,
        name: session.file.name,
        size: session.file.size,
        mimeType: session.file.type,
        preview: null,
        status: session.status,
        progress: session.progress,
        error: session.error,
        meta: null,
        busy: session.status === 'uploading',
        onView: session.status === 'completed' ? () => viewPending(session.file) : null,
        onDownload: session.status === 'completed' ? () => downloadPendingFile(session.file) : null,
        onRemove: readOnly ? null : () => {
          setUploadSessions((prev) => {
            const next = { ...prev };
            delete next[sessionId];
            return next;
          });
        },
        onRetry: session.status === 'error' ? () => retryUpload(sessionId) : null,
      });
    });

    pendingFiles.forEach((file, index) => {
      items.push({
        id: `pending-${file.name}-${file.size}-${index}`,
        name: file.name,
        size: file.size,
        mimeType: file.type,
        preview: pendingPreviews[`pending-${file.name}-${file.size}-${index}`] || null,
        status: 'queued',
        progress: 100,
        error: null,
        meta: 'Uploads when you save',
        busy: false,
        onView: () => viewPending(file),
        onDownload: () => downloadPendingFile(file),
        onRemove: readOnly ? null : () => removePending(index),
        onRetry: null,
      });
    });

    (documentId ? savedAttachments : existingAttachments).forEach((attachment) => {
      items.push({
        id: `saved-${attachment.id}`,
        name: attachment.original_name,
        size: attachment.file_size,
        mimeType: attachment.mime_type,
        preview: null,
        status: 'completed',
        progress: 100,
        error: null,
        meta: attachment.created_at || 'Uploaded',
        busy: busyId === attachment.id,
        onView: documentId && attachmentsApi ? () => viewSaved(attachment) : null,
        onDownload: documentId && attachmentsApi ? () => downloadSaved(attachment) : null,
        onRemove:
          !readOnly && documentId && attachmentsApi ? () => removeSaved(attachment) : null,
        onRetry: null,
      });
    });

    return items;
  }, [
    attachmentsApi,
    busyId,
    documentId,
    downloadSaved,
    existingAttachments,
    pendingFiles,
    readOnly,
    removePending,
    removeSaved,
    retryUpload,
    savedAttachments,
    pendingPreviews,
    uploadSessions,
    viewSaved,
    viewPending,
  ]);

  const completedCount = fileItems.filter((f) => f.status === 'completed' || f.status === 'queued').length;
  const errorCount = fileItems.filter((f) => f.status === 'error').length;
  const uploadingCount = fileItems.filter((f) => f.status === 'uploading').length;

  return (
    <>
    <div
      className={cn(
        'rounded-xl border border-foreground/[0.14] bg-card overflow-hidden flex flex-col shadow-[0_1px_2px_rgba(15,23,42,0.05)]',
        className,
      )}
    >
      <div
        className={cn(
          'flex items-start justify-between gap-3 border-b border-foreground/[0.09] bg-muted/40',
          compact ? 'px-3 py-3' : 'px-4 sm:px-5 py-4',
        )}
      >
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={cn(
              'flex shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground ring-1 ring-foreground/10',
              compact ? 'size-8' : 'size-9',
            )}
          >
            <Paperclip className={compact ? 'size-3.5' : 'size-4'} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">{title}</h3>
            {!compact ? (
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            ) : null}
          </div>
        </div>
        {!singleFileMode ? (
          <span className="text-xs text-muted-foreground whitespace-nowrap pt-1">
            {totalCount}/{maxFiles}
          </span>
        ) : null}
      </div>

      <div className={cn('space-y-3 flex-1 flex flex-col min-h-0', compact ? 'p-3' : 'p-4 sm:p-5 space-y-4')}>
        {showDropZone && (
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') uploadActions.openFileDialog();
            }}
            onDragEnter={uploadActions.handleDragEnter}
            onDragLeave={uploadActions.handleDragLeave}
            onDragOver={uploadActions.handleDragOver}
            onDrop={uploadActions.handleDrop}
            className={cn(
              'relative rounded-lg border border-dashed text-center transition-colors cursor-pointer',
              compact ? 'p-4' : 'p-6 sm:p-8',
              uploadState.isDragging
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50',
            )}
          >
            <input
              ref={uploadActions.inputRef}
              {...uploadActions.getInputProps()}
              className="sr-only"
            />

            <div className={cn('flex flex-col items-center', compact ? 'gap-2' : 'gap-4')}>
              <div
                className={cn(
                  'flex items-center justify-center rounded-full',
                  compact ? 'size-10' : 'size-14',
                  uploadState.isDragging ? 'bg-primary/10' : 'bg-muted',
                )}
              >
                <Upload
                  className={cn(
                    compact ? 'size-4' : 'size-6',
                    uploadState.isDragging ? 'text-primary' : 'text-muted-foreground',
                  )}
                />
              </div>

              <div className="space-y-1">
                {!compact ? (
                  <h4 className="text-base font-semibold">
                    {singleFileMode ? 'Upload attachment' : 'Upload your files'}
                  </h4>
                ) : null}
                <p className={cn('text-muted-foreground', compact ? 'text-xs' : 'text-sm')}>
                  {compact
                    ? `Drop file or browse · max ${formatBytes(maxSize)}`
                    : `Drag and drop ${singleFileMode ? 'a file' : 'files'} here or click to browse`}
                </p>
                {!compact ? (
                  <p className="text-xs text-muted-foreground">
                    {singleFileMode
                      ? `One file up to ${formatBytes(maxSize)}`
                      : `Up to ${maxFiles} files, ${formatBytes(maxSize)} each`}
                  </p>
                ) : null}
              </div>

              <Button
                type="button"
                size="sm"
                variant={compact ? 'outline' : 'default'}
                onClick={uploadActions.openFileDialog}
              >
                <Upload className="size-4 mr-1.5" />
                {singleFileMode ? 'Select file' : 'Select files'}
              </Button>
            </div>
          </div>
        )}

        {atLimit && !readOnly && singleFileMode && !showDropZone && (
          <p className="text-xs text-muted-foreground text-center">
            One attachment added. Remove it below to upload a different file.
          </p>
        )}

        {fileItems.length > 0 && (
          <>
            <div className={cn('flex items-center justify-between gap-3', compact && 'hidden')}>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-medium">Files</h4>
                {completedCount > 0 && (
                  <Badge size="sm" variant="success" appearance="light">
                    Ready: {completedCount}
                  </Badge>
                )}
                {uploadingCount > 0 && (
                  <Badge size="sm" variant="secondary">
                    Uploading: {uploadingCount}
                  </Badge>
                )}
                {errorCount > 0 && (
                  <Badge size="sm" variant="destructive" appearance="light">
                    Failed: {errorCount}
                  </Badge>
                )}
              </div>

              {!readOnly && fileItems.length > 0 ? (
                <Button type="button" onClick={clearAll} variant="outline" size="sm">
                  Clear all
                </Button>
              ) : null}
            </div>

            <div className="space-y-2">
              {fileItems.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    'rounded-lg border border-border bg-card',
                    compact ? 'p-3' : 'p-4',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0">
                      {item.preview && item.mimeType?.startsWith('image/') ? (
                        <img
                          src={item.preview}
                          alt={item.name}
                          className="size-12 rounded-lg border object-cover"
                        />
                      ) : (
                        <div className="flex size-12 items-center justify-center rounded-lg border text-muted-foreground">
                          <FileTypeIcon mimeType={item.mimeType} name={item.name} className="size-5" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate" title={item.name}>
                            {item.name}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {formatAttachmentSize(item.size)}
                            </span>
                            <Badge variant="secondary" className="text-[10px]">
                              {getFileTypeLabel(item.mimeType, item.name)}
                            </Badge>
                            {item.meta ? (
                              <span className="text-xs text-muted-foreground">{item.meta}</span>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex items-center gap-0.5 shrink-0">
                          {item.onView ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              disabled={item.busy}
                              onClick={item.onView}
                              title="View in panel"
                            >
                              {item.busy ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <Eye className="size-4" />
                              )}
                            </Button>
                          ) : null}
                          {item.onDownload ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              disabled={item.busy}
                              onClick={item.onDownload}
                              title="Download"
                            >
                              <Download className="size-4" />
                            </Button>
                          ) : null}
                          {item.onRemove ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-destructive"
                              disabled={item.busy}
                              onClick={item.onRemove}
                              title="Remove"
                            >
                              <X className="size-4" />
                            </Button>
                          ) : null}
                        </div>
                      </div>

                      {item.status === 'uploading' && (
                        <div className="mt-3 space-y-1">
                          <Progress value={item.progress} className="h-1.5" />
                          <p className="text-xs text-muted-foreground tabular-nums">
                            Uploading… {item.progress}%
                          </p>
                        </div>
                      )}

                      {item.status === 'error' && item.error && (
                        <Alert variant="destructive" appearance="light" className="mt-3 px-2 py-2">
                          <AlertIcon>
                            <TriangleAlert className="size-4" />
                          </AlertIcon>
                          <AlertTitle className="text-xs font-medium">{item.error}</AlertTitle>
                          {item.onRetry ? (
                            <AlertToolbar>
                              <Button
                                type="button"
                                onClick={item.onRetry}
                                variant="ghost"
                                size="icon"
                                className="size-7"
                                title="Retry"
                              >
                                <RefreshCw className="size-3.5" />
                              </Button>
                            </AlertToolbar>
                          ) : null}
                        </Alert>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {!fileItems.length && !showDropZone && (
          <p className="text-sm text-muted-foreground text-center py-4">No attachments yet.</p>
        )}

        {uploadState.errors?.length > 0 && (
          <Alert variant="destructive" appearance="light">
            <AlertIcon>
              <TriangleAlert />
            </AlertIcon>
            <AlertContent>
              <AlertTitle>File upload error</AlertTitle>
              <AlertDescription>
                {uploadState.errors.map((error, index) => (
                  <p key={index}>{error}</p>
                ))}
              </AlertDescription>
            </AlertContent>
          </Alert>
        )}
      </div>
    </div>
    <DocumentAttachmentInlinePreview {...previewProps} />
    </>
  );
}
