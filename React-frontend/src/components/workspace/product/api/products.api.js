import api from '@/lib/api';

export const productsApi = {
  list: (params, config = {}) => api.get('/workspace/products', { params, ...config }),
  show: (id) => api.get(`/workspace/products/${id}`),
  details: (id) => api.get(`/workspace/products/${id}/details`),
  create: (data) => api.post('/workspace/products', data),
  update: (id, data) => {
    if (data instanceof FormData) {
      data.append('_method', 'PUT');
      return api.post(`/workspace/products/${id}`, data);
    }
    return api.put(`/workspace/products/${id}`, data);
  },
  delete: (id) => api.delete(`/workspace/products/${id}`),
  bulk: (data) => api.post('/workspace/products/bulk', data),
  formOptions: () => api.get('/workspace/products/form-options'),

  listCategories: () => api.get('/workspace/product-categories'),
  createCategory: (data) => api.post('/workspace/product-categories', data),
  updateCategory: (id, data) => api.put(`/workspace/product-categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/workspace/product-categories/${id}`),

  listBrands: () => api.get('/workspace/product-brands'),
  createBrand: (data) => api.post('/workspace/product-brands', data),
  updateBrand: (id, data) => api.put(`/workspace/product-brands/${id}`, data),
  deleteBrand: (id) => api.delete(`/workspace/product-brands/${id}`),

  listUnits: () => api.get('/workspace/product-units'),
  createUnit: (data) => api.post('/workspace/product-units', data),
  updateUnit: (id, data) => api.put(`/workspace/product-units/${id}`, data),
  deleteUnit: (id) => api.delete(`/workspace/product-units/${id}`),

  listAttributes: (params) => api.get('/workspace/product-attributes', { params }),
  createAttribute: (data) => api.post('/workspace/product-attributes', data),
  updateAttribute: (id, data) => api.put(`/workspace/product-attributes/${id}`, data),
  deleteAttribute: (id) => api.delete(`/workspace/product-attributes/${id}`),
  createAttributeValue: (attributeId, data) =>
    api.post(`/workspace/product-attributes/${attributeId}/values`, data),
  updateAttributeValue: (attributeId, valueId, data) =>
    api.put(`/workspace/product-attributes/${attributeId}/values/${valueId}`, data),
  deleteAttributeValue: (attributeId, valueId) =>
    api.delete(`/workspace/product-attributes/${attributeId}/values/${valueId}`),

  // A product's alternate units (Pair, Dozen, Box, Carton, ...) — unlimited, each with
  // its own factor to the product's base unit.
  unitFamilyOptions: (unit) =>
    api.get('/workspace/products/unit-family-options', { params: { unit } }),
  getUnitConversions: (id) => api.get(`/workspace/products/${id}/unit-conversions`),

  listCustomFieldDefinitions: (params) =>
    api.get('/workspace/product-custom-fields', { params: { per_page: 100, ...params } }),

  // Product Master hub — one read-only, paginated endpoint per tab.
  master: {
    header: (id) => api.get(`/workspace/products/${id}/master/header`),
    warehouseStock: (id) => api.get(`/workspace/products/${id}/master/warehouse-stock`),
    movements: (id, params) => api.get(`/workspace/products/${id}/master/movements`, { params }),
    purchases: (id, params) => api.get(`/workspace/products/${id}/master/purchases`, { params }),
    sales: (id, params) => api.get(`/workspace/products/${id}/master/sales`, { params }),
    vendorCredits: (id, params) => api.get(`/workspace/products/${id}/master/vendor-credits`, { params }),
    customerReturns: (id, params) => api.get(`/workspace/products/${id}/master/customer-returns`, { params }),
    transfers: (id, params) => api.get(`/workspace/products/${id}/master/transfers`, { params }),
    adjustments: (id, params) => api.get(`/workspace/products/${id}/master/adjustments`, { params }),
    production: (id, params) => api.get(`/workspace/products/${id}/master/production`, { params }),
    accounting: (id, params) => api.get(`/workspace/products/${id}/master/accounting`, { params }),
    costLayers: (id, params) => api.get(`/workspace/products/${id}/master/cost-layers`, { params }),
    audit: (id, params) => api.get(`/workspace/products/${id}/master/audit`, { params }),
    relatedSummary: (id) => api.get(`/workspace/products/${id}/master/related-summary`),
  },
};
