import api from '@/lib/api';

export const pharmacyApi = {
  dashboard: () => api.get('/workspace/pharmacy/dashboard'),
  settings: () => api.get('/workspace/pharmacy/settings'),
  updateSettings: (data) => api.put('/workspace/pharmacy/settings', data),
  dosageForms: () => api.get('/workspace/pharmacy/dosage-forms'),
  createDosageForm: (data) => api.post('/workspace/pharmacy/dosage-forms', data),
  manufacturers: () => api.get('/workspace/pharmacy/manufacturers'),
  createManufacturer: (data) => api.post('/workspace/pharmacy/manufacturers', data),
  expiryReport: (params) =>
    api.get('/workspace/pharmacy/expiry-report', { params }),
  productBatches: (productId) =>
    api.get(`/workspace/pharmacy/products/${productId}/batches`),
  /** Bulk, company-wide batch/expiry snapshot — offline cache seed (pharmacy-batch-store.js). */
  batchesIndex: (params) => api.get('/workspace/pharmacy/batches/index', { params }),
  purchaseHistory: (productId) =>
    api.get(`/workspace/pharmacy/products/${productId}/purchase-history`),
  /** Parse-only Gemini vision — never posts a bill. */
  parseInvoice: (formData) =>
    api.post('/workspace/pharmacy/parse-invoice', formData, {
      timeout: 120000,
    }),
  /** Whole-invoice total check across every scanned page of one invoice. */
  reconcileInvoice: (extractionIds) =>
    api.post(
      '/workspace/pharmacy/reconcile-invoice',
      { extraction_ids: extractionIds },
      { timeout: 180000 },
    ),
  extractionHistory: (params) =>
    api.get('/workspace/pharmacy/invoice-extractions', { params }),
  getExtraction: (id) => api.get(`/workspace/pharmacy/invoice-extractions/${id}`),
  extractionImage: (id) =>
    api.get(`/workspace/pharmacy/invoice-extractions/${id}/image`, {
      responseType: 'blob',
      skipCacheBust: true,
    }),
  updateExtraction: (id, data) =>
    api.patch(`/workspace/pharmacy/invoice-extractions/${id}`, data),
  deleteExtraction: (id) =>
    api.delete(`/workspace/pharmacy/invoice-extractions/${id}`),
  deleteAllExtractions: () =>
    api.delete('/workspace/pharmacy/invoice-extractions'),
  loosePurchaseContext: () => api.get('/workspace/pharmacy/loose-purchase/context'),
  storeLoosePurchase: (data) => api.post('/workspace/pharmacy/loose-purchase', data),
  looseSaleReturnContext: () => api.get('/workspace/pharmacy/loose-sale-return/context'),
  storeLooseSaleReturn: (data) => api.post('/workspace/pharmacy/loose-sale-return', data),
  /** Save supplier bill line → catalog links learned from receive posting. */
  rememberSupplierProductAliases: (data) =>
    api.post('/workspace/pharmacy/supplier-product-aliases/remember', data),
};
