import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchAttachmentBlobUrl,
  fetchAttachmentTextContent,
  getAttachmentPreviewKind,
} from './document-attachments.lib';

export function useDocumentAttachmentPreview() {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewMimeType, setPreviewMimeType] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewText, setPreviewText] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [previewDownload, setPreviewDownload] = useState(null);
  const previewUrlRef = useRef(null);

  const revokePreviewUrl = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
    setPreviewText(null);
  }, []);

  const closePreview = useCallback(() => {
    setPreviewOpen(false);
    setPreviewTitle('');
    setPreviewMimeType('');
    setPreviewError(null);
    setPreviewDownload(null);
    revokePreviewUrl();
  }, [revokePreviewUrl]);

  useEffect(() => () => revokePreviewUrl(), [revokePreviewUrl]);

  const openPreview = useCallback(
    async ({ title, mimeType, load, onDownload }) => {
      revokePreviewUrl();
      setPreviewTitle(title || 'Attachment');
      setPreviewMimeType(mimeType || '');
      setPreviewDownload(onDownload || null);
      setPreviewOpen(true);
      setPreviewLoading(true);
      setPreviewError(null);

      try {
        await load({
          setUrl: (url) => {
            previewUrlRef.current = url;
            setPreviewUrl(url);
          },
          setText: setPreviewText,
        });
      } catch (err) {
        setPreviewError(
          err?.response?.data?.message || err?.message || 'Could not load attachment preview',
        );
      } finally {
        setPreviewLoading(false);
      }
    },
    [revokePreviewUrl],
  );

  const previewSavedAttachment = useCallback(
    async (attachmentsApi, documentId, attachment, onDownload) => {
      if (!attachmentsApi || !documentId || !attachment?.id) return;

      const name = attachment.original_name || `File #${attachment.id}`;
      const mimeType = attachment.mime_type || '';
      const kind = getAttachmentPreviewKind(mimeType, name);

      await openPreview({
        title: name,
        mimeType,
        onDownload,
        load: async ({ setUrl, setText }) => {
          if (kind === 'text') {
            setText(await fetchAttachmentTextContent(attachmentsApi, documentId, attachment));
            return;
          }
          setUrl(await fetchAttachmentBlobUrl(attachmentsApi, documentId, attachment));
        },
      });
    },
    [openPreview],
  );

  const previewLocalFile = useCallback(
    async (file, onDownload) => {
      if (!(file instanceof File)) return;

      const name = file.name || 'Attachment';
      const mimeType = file.type || '';
      const kind = getAttachmentPreviewKind(mimeType, name);

      await openPreview({
        title: name,
        mimeType,
        onDownload,
        load: async ({ setUrl, setText }) => {
          if (kind === 'text') {
            setText(await file.text());
            return;
          }
          setUrl(URL.createObjectURL(file));
        },
      });
    },
    [openPreview],
  );

  return {
    previewOpen,
    closePreview,
    previewSavedAttachment,
    previewLocalFile,
    previewProps: {
      open: previewOpen,
      onClose: closePreview,
      title: previewTitle,
      filename: previewTitle,
      blobUrl: previewUrl,
      mimeType: previewMimeType,
      textContent: previewText,
      loading: previewLoading,
      error: previewError,
      onDownload: previewDownload || undefined,
    },
  };
}
