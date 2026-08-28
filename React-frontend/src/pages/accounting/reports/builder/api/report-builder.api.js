import api from '@/lib/api';

/**
 * Visual Report Builder (Phase 3). Saved-report CRUD (create/update/
 * duplicate/archive/share/favorite) is NOT here — it's reportCenterApi
 * (Phase 2), reused as-is. This client only covers dataset discovery,
 * draft preview, and saved-definition run/export.
 */
export const reportBuilderApi = {
  datasets: () => api.get('/workspace/reports/builder/datasets'),

  preview: (datasetKey, definition, page = 1, perPage = 50) =>
    api.post('/workspace/reports/builder/preview', {
      dataset_key: datasetKey,
      definition,
      page,
      per_page: perPage,
    }),

  run: (definitionId, page = 1, perPage = 50, { from, to } = {}) =>
    api.post(`/workspace/reports/builder/definitions/${definitionId}/run`, {
      page,
      per_page: perPage,
      ...(from && to ? { from, to } : {}),
    }),

  /** Bearer-token auth means a plain <a href> can't carry the download's auth headers — fetch as a blob instead. */
  export: (definitionId, format, { from, to } = {}) =>
    api.get(`/workspace/reports/builder/definitions/${definitionId}/export`, {
      params: {
        format,
        ...(from && to ? { from, to } : {}),
      },
      responseType: 'blob',
    }),
};

const EXPORT_EXTENSIONS = { csv: 'csv', pdf: 'pdf', xlsx: 'xlsx' };

export function downloadReportExport(blob, reportName, format) {
  const ext = EXPORT_EXTENSIONS[format] || format;
  const safeName = (reportName || 'report').replace(/[^a-zA-Z0-9_-]+/g, '-');
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeName}.${ext}`;
  a.click();
  window.URL.revokeObjectURL(url);
}
