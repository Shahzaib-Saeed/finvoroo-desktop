import api from '@/lib/api';

export const invoiceTemplatesApi = {
  formOptions: () => api.get('/workspace/invoice-templates/form-options'),
  list: (params) => api.get('/workspace/invoice-templates', { params }),
  show: (id) => api.get(`/workspace/invoice-templates/${id}`),
  create: (data) => api.post('/workspace/invoice-templates', data),
  update: (id, data) => api.put(`/workspace/invoice-templates/${id}`, data),
  destroy: (id) => api.delete(`/workspace/invoice-templates/${id}`),
  setDefault: (id) => api.post(`/workspace/invoice-templates/${id}/default`),
  updateFormLayout: (id, data) =>
    api.put(`/workspace/invoice-templates/${id}/form-layout`, data),
  updateLineColumns: (id, data) =>
    api.put(`/workspace/invoice-templates/${id}/line-columns`, data),
  updateFooter: (id, data) =>
    api.put(`/workspace/invoice-templates/${id}/footer`, data),
  updateFields: (id, data) =>
    api.put(`/workspace/invoice-templates/${id}/fields`, data),
  updateFieldPlacements: (id, data) =>
    api.put(`/workspace/invoice-templates/${id}/field-placements`, data),
  addFieldOption: (id, fieldKey, data) =>
    api.post(`/workspace/invoice-templates/${id}/fields/${encodeURIComponent(fieldKey)}/options`, data),
};
