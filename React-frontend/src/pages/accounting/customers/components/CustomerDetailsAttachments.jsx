import { useCallback, useState } from 'react';
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
  Video,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DocumentAttachmentInlinePreview } from '@/components/accounting/DocumentAttachmentInlinePreview';
import { useDocumentAttachmentPreview } from '@/components/accounting/useDocumentAttachmentPreview';
import {
  downloadAttachmentFile,
  formatAttachmentSize,
  getAttachmentPreviewKind,
  getFileTypeLabel,
} from '@/components/accounting/document-attachments.lib';
import { customersApi } from '../api/customers.api';

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

export function CustomerDetailsAttachments({ customerId, attachments = [] }) {
  const [busyId, setBusyId] = useState(null);
  const { previewSavedAttachment, previewProps } = useDocumentAttachmentPreview();

  const handleDownload = useCallback(
    async (attachment) => {
      if (!customerId || !attachment?.id) return;
      setBusyId(attachment.id);
      try {
        await downloadAttachmentFile(
          customersApi,
          customerId,
          attachment,
          attachment.original_name,
        );
      } catch (err) {
        toast.error(err?.response?.data?.message || 'Could not download attachment');
      } finally {
        setBusyId(null);
      }
    },
    [customerId],
  );

  const handleView = useCallback(
    async (attachment) => {
      if (!customerId || !attachment?.id) return;
      await previewSavedAttachment(customersApi, customerId, attachment, () =>
        handleDownload(attachment),
      );
    },
    [customerId, previewSavedAttachment, handleDownload],
  );

  if (!attachments.length) {
    return (
      <Card className="shadow-none overflow-hidden">
        <CardContent className="px-4 py-12 text-center">
          <Paperclip className="size-8 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium text-foreground">No attachments yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Contracts, agreements, and other documents uploaded when creating or editing this
            customer will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-none overflow-hidden">
        <CardHeader className="px-4 pt-4 pb-3 border-b border-border/60">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Paperclip className="size-4 text-muted-foreground" />
            Attachments
            <Badge variant="secondary" className="font-normal">
              {attachments.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pt-4 pb-5 space-y-2">
          {attachments.map((attachment) => {
            const busy = busyId === attachment.id;
            const name = attachment.original_name || `File #${attachment.id}`;
            const canPreview =
              getAttachmentPreviewKind(attachment.mime_type, name) !== 'unsupported';

            return (
              <div
                key={attachment.id}
                className="flex items-start gap-3 rounded-lg border bg-card p-3 hover:bg-muted/30 transition-colors"
              >
                <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border bg-muted/40 text-muted-foreground">
                  <FileTypeIcon
                    mimeType={attachment.mime_type}
                    name={name}
                    className="size-5"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate" title={name}>
                    {name}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {formatAttachmentSize(attachment.file_size)}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-normal">
                      {getFileTypeLabel(attachment.mime_type, name)}
                    </Badge>
                    {attachment.created_at ? (
                      <span className="text-xs text-muted-foreground">
                        {attachment.created_at}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-0.5 shrink-0">
                  {canPreview ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      title="View in panel"
                      disabled={busy}
                      onClick={() => handleView(attachment)}
                    >
                      {busy ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    title="Download"
                    disabled={busy}
                    onClick={() => handleDownload(attachment)}
                  >
                    <Download className="size-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <DocumentAttachmentInlinePreview {...previewProps} />
    </>
  );
}
