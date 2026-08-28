import api from '@/lib/api';

export const settingsApi = {
  get: () => api.get('/workspace/accounting/settings'),
  // PHP does not parse multipart bodies on PUT — use POST (backend accepts both).
  updateProfile: (data) => {
    if (data instanceof FormData) {
      return api.post('/workspace/accounting/settings/profile', data);
    }
    return api.put('/workspace/accounting/settings/profile', data);
  },
  /** Logo-only upload (multipart). Returns { company, logo_url }. */
  uploadLogo: (file) => {
    const fd = new FormData();
    fd.append('logo', file);
    return api.post('/workspace/accounting/settings/logo', fd);
  },
  updateOpeningBalance: (data) => api.put('/workspace/accounting/settings/opening-balance', data),
  updateInventoryModel: (data) => api.put('/workspace/accounting/settings/inventory-model', data),
  updateApprovalModules: (data) => api.put('/workspace/accounting/settings/approval-modules', data),
  updateAutoPost: (data) => api.put('/workspace/accounting/settings/auto-post', data),
  updateOfflineSync: (data) => api.put('/workspace/accounting/settings/offline-sync', data),
  updateInvoiceBillingMode: (data) =>
    api.put('/workspace/accounting/settings/invoice-billing-mode', data),
  updateFullChartOfAccounts: (data) =>
    api.put('/workspace/accounting/settings/full-chart-of-accounts', data),
  updateWorkspaceNavigation: (data) =>
    api.put('/workspace/accounting/settings/workspace-navigation', data),
  updatePosMenu: (data) => api.put('/workspace/accounting/settings/pos-menu', data),
  updateDocumentFooter: (data) =>
    api.put('/workspace/accounting/settings/document-footer', data),
};
