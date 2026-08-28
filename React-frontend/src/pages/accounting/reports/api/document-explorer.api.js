import api from '@/lib/api';

export const documentExplorerApi = {
  list: (params) => api.get('/workspace/reports/document-explorer', { params }),
  show: (docType, id) => api.get(`/workspace/reports/document-explorer/${docType}/${id}`),
};
