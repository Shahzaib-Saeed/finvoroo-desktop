export const ATTACHMENT_MAX_SIZE = 30 * 1024 * 1024;
export const ATTACHMENT_MAX_FILES = 20;

export const ATTACHMENT_ACCEPT =
  '.pdf,application/pdf,.jpg,.jpeg,.png,.webp,.gif,image/*,.doc,.docx,.xls,.xlsx,.csv,.txt';

/** @returns {boolean} */
export function isAllowedAttachmentFile(file) {
  if (!(file instanceof File)) return false;
  const name = (file.name || '').toLowerCase();
  const ext = name.includes('.') ? name.split('.').pop() : '';
  const allowedExt = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt'];
  if (ext && allowedExt.includes(ext)) return true;
  const mime = (file.type || '').toLowerCase();
  if (mime === 'application/pdf') return true;
  if (mime.startsWith('image/')) return true;
  if (mime.includes('word') || mime.includes('excel') || mime.includes('spreadsheet')) return true;
  if (mime.startsWith('text/')) return true;
  return false;
}

export function formatAttachmentSize(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** i;
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function attachmentFileIcon(mimeType, name = '') {
  const mime = (mimeType || '').toLowerCase();
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
    return 'image';
  }
  if (mime === 'application/pdf' || ext === 'pdf') {
    return 'pdf';
  }
  if (['doc', 'docx', 'txt', 'csv'].includes(ext)) {
    return 'doc';
  }
  if (['xls', 'xlsx'].includes(ext)) {
    return 'sheet';
  }
  return 'file';
}

export async function uploadPendingAttachments(api, documentId, files) {
  if (!documentId || !files?.length) return [];
  const uploaded = [];
  for (const file of files) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.uploadAttachment(documentId, formData);
    if (res.data?.data) uploaded.push(res.data.data);
  }
  return uploaded;
}

function blobFromAttachmentResponse(res, attachment) {
  return new Blob([res.data], {
    type: res.headers['content-type'] || attachment?.mime_type || 'application/octet-stream',
  });
}

export function getAttachmentPreviewKind(mimeType = '', name = '') {
  const mime = (mimeType || '').toLowerCase();
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
    return 'image';
  }
  if (mime.includes('pdf') || ext === 'pdf') {
    return 'pdf';
  }
  if (mime.startsWith('text/') || ['txt', 'csv'].includes(ext)) {
    return 'text';
  }
  return 'unsupported';
}

export async function fetchAttachmentBlobUrl(api, documentId, attachment) {
  const res = await api.downloadAttachment(documentId, attachment.id);
  const blob = blobFromAttachmentResponse(res, attachment);
  return URL.createObjectURL(blob);
}

export async function fetchAttachmentTextContent(api, documentId, attachment) {
  const res = await api.downloadAttachment(documentId, attachment.id);
  const blob = blobFromAttachmentResponse(res, attachment);
  return blob.text();
}

export async function downloadAttachmentFile(api, documentId, attachment, filename) {
  const res = await api.downloadAttachment(documentId, attachment.id);
  const blob = blobFromAttachmentResponse(res, attachment);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || attachment.original_name || 'attachment';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function viewAttachmentFile(api, documentId, attachment) {
  const res = await api.downloadAttachment(documentId, attachment.id);
  const blob = blobFromAttachmentResponse(res, attachment);
  const url = window.URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
}

export function viewPendingFile(file) {
  const url = window.URL.createObjectURL(file);
  window.open(url, '_blank', 'noopener,noreferrer');
  setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
}

export function downloadPendingFile(file) {
  const url = window.URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name || 'attachment';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export function getFileTypeLabel(mimeType = '', name = '') {
  const type = (mimeType || '').toLowerCase();
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (type.startsWith('image/')) return 'Image';
  if (type.startsWith('video/')) return 'Video';
  if (type.startsWith('audio/')) return 'Audio';
  if (type.includes('pdf') || ext === 'pdf') return 'PDF';
  if (type.includes('word') || ['doc', 'docx'].includes(ext)) return 'Word';
  if (type.includes('excel') || type.includes('sheet') || ['xls', 'xlsx'].includes(ext)) return 'Excel';
  if (type.includes('zip') || ['zip', 'rar'].includes(ext)) return 'Archive';
  if (type.includes('json') || ext === 'json') return 'JSON';
  if (type.includes('text') || ext === 'txt') return 'Text';
  return 'File';
}
