import api from '@/lib/api';

export const documentOutputApi = {
  layouts: (params) => api.get('/workspace/document-output/layouts', { params }),
  createLayout: (data) => api.post('/workspace/document-output/layouts', data),
  updateLayout: (id, data) => api.put(`/workspace/document-output/layouts/${id}`, data),
  deleteLayout: (id) => api.delete(`/workspace/document-output/layouts/${id}`),
  duplicateLayout: (id) => api.post(`/workspace/document-output/layouts/${id}/duplicate`),
  versions: (id) => api.get(`/workspace/document-output/layouts/${id}/versions`),
  restoreVersion: (id, versionId) =>
    api.post(`/workspace/document-output/layouts/${id}/versions/${versionId}/restore`),
  uploadAsset: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/workspace/document-output/assets', fd);
  },
  fieldCatalog: () => api.get('/workspace/document-output/field-catalog'),
  preferences: () => api.get('/workspace/document-output/preferences'),
  updatePreferences: (data) => api.put('/workspace/document-output/preferences', data),
  preview: (type, id, data = {}) =>
    api.post(`/workspace/document-output/documents/${type}/${id}/preview`, data),
  previewWithConfig: (type, id, config) =>
    api.post(`/workspace/document-output/documents/${type}/${id}/preview-config`, { config }),
  render: (type, id, data = {}, config = {}) =>
    api.post(`/workspace/document-output/documents/${type}/${id}/render`, data, config),
  snapshot: (type, id) =>
    api.get(`/workspace/document-output/documents/${type}/${id}/snapshot`),
};

export function unwrapDoc(res) {
  return res?.data?.data ?? res?.data ?? null;
}

/** Open browser print for HTML returned by the browser adapter. */
export function printHtmlDocument(html) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    window.print();
    return;
  }
  doc.open();
  doc.write(html || '<html><body><p>Nothing to print.</p></body></html>');
  doc.close();
  const cleanup = () => {
    try {
      document.body.removeChild(iframe);
    } catch {
      /* ignore */
    }
  };
  const doPrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      setTimeout(cleanup, 1500);
    }
  };
  // Wait for images (logo) so premium layout prints with branding.
  const imgs = Array.from(doc.images || []);
  if (imgs.length === 0) {
    setTimeout(doPrint, 200);
    return;
  }
  let remaining = imgs.length;
  const done = () => {
    remaining -= 1;
    if (remaining <= 0) setTimeout(doPrint, 80);
  };
  imgs.forEach((img) => {
    if (img.complete) done();
    else {
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
    }
  });
  setTimeout(doPrint, 2500); // safety
}

export function downloadBase64File(base64, filename, contentType) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: contentType || 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'document.bin';
  a.click();
  URL.revokeObjectURL(url);
}
