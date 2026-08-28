import { useRef, useState } from 'react';
import {
  Download,
  File,
  FileImage,
  FileSpreadsheet,
  Loader2,
  Paperclip,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { cn } from '@/lib/utils';

const ACCEPTED_FILES =
  '.pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.xls,.xlsx,.csv,.txt';

function formatFileSize(bytes) {
  const size = Number(bytes) || 0;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function FileTypeIcon({ name, className }) {
  const extension = String(name || '').split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(extension)) {
    return <FileImage className={className} />;
  }
  if (['xls', 'xlsx', 'csv'].includes(extension)) {
    return <FileSpreadsheet className={className} />;
  }
  return <File className={className} />;
}

export function JobOrderAttachments({
  attachments = [],
  pendingFiles = [],
  busyId,
  onAddFiles,
  onRemovePending,
  onDelete,
  onDownload,
}) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = useState(null);

  const addFiles = (files) => {
    if (files?.length) onAddFiles(files);
  };

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700">
          <Paperclip className="size-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-950">Attachments</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
            Add photos, plans, quotations, spreadsheets, or supporting documents.
          </p>
        </div>
      </div>

      <button
        type="button"
        className={cn(
          'flex w-full flex-col items-center justify-center rounded-xl border border-dashed bg-white px-5 py-7 text-center transition-colors',
          dragging
            ? 'border-blue-500 ring-2 ring-blue-100'
            : 'border-slate-300 hover:border-slate-400',
        )}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          event.preventDefault();
          if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          addFiles(event.dataTransfer.files);
        }}
      >
        <span className="mb-3 flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-blue-600 shadow-sm">
          <UploadCloud className="size-5" />
        </span>
        <span className="text-sm font-semibold text-slate-900">
          Drop files here or browse
        </span>
        <span className="mt-1 text-xs text-slate-500">
          PDF, images, Word, Excel, CSV or TXT · 30 MB maximum
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_FILES}
        className="hidden"
        onChange={(event) => {
          addFiles(event.target.files);
          event.target.value = '';
        }}
      />

      {attachments.length || pendingFiles.length ? (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
            >
              <FileTypeIcon
                name={attachment.original_name}
                className="size-4 shrink-0 text-slate-500"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">
                  {attachment.original_name}
                </p>
                <p className="text-xs text-slate-500">
                  {formatFileSize(attachment.file_size)}
                  {attachment.created_at ? ` · ${attachment.created_at}` : ''}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 text-slate-500 hover:bg-white hover:text-slate-950"
                disabled={busyId === attachment.id}
                onClick={() => onDownload(attachment)}
                title="Download attachment"
              >
                {busyId === attachment.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 text-slate-400 hover:bg-white hover:text-red-600"
                disabled={busyId === attachment.id}
                onClick={() => setAttachmentToDelete(attachment)}
                title="Delete attachment"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}

          {pendingFiles.map((file, index) => (
            <div
              key={`${file.name}-${file.size}-${index}`}
              className="flex items-center gap-3 rounded-xl border border-blue-200 bg-white px-3 py-2.5"
            >
              <FileTypeIcon name={file.name} className="size-4 shrink-0 text-blue-600" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{file.name}</p>
                <p className="text-xs text-blue-600">
                  {formatFileSize(file.size)} · Uploads when you save the job
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 text-slate-400 hover:bg-white hover:text-slate-950"
                onClick={() => onRemovePending(index)}
                title="Remove selected file"
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(attachmentToDelete)}
        title="Remove attachment?"
        description={
          attachmentToDelete
            ? `${attachmentToDelete.original_name} will be permanently removed from this job order.`
            : ''
        }
        confirmLabel="Remove file"
        isLoading={busyId === attachmentToDelete?.id}
        onConfirm={async () => {
          await onDelete(attachmentToDelete.id);
          setAttachmentToDelete(null);
        }}
        onCancel={() => setAttachmentToDelete(null)}
      />
    </section>
  );
}
