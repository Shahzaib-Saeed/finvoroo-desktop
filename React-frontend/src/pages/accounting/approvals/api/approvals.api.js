import api from '@/lib/api';

export const approvalsApi = {
  inbox: (params) => api.get('/workspace/approvals/inbox', { params }),
  stats: () => api.get('/workspace/approvals/stats'),
  document: (type, id) => api.get(`/workspace/approvals/documents/${type}/${id}`),
  submit: (type, id, notes) =>
    api.post(`/workspace/approvals/documents/${type}/${id}/submit`, { notes: notes || undefined }),
  delegations: () => api.get('/workspace/approvals/delegations'),
  createDelegation: (payload) => api.post('/workspace/approvals/delegations', payload),
};

export const workflowsApi = {
  list: (params) => api.get('/workspace/workflows', { params }),
  templates: () => api.get('/workspace/workflows/templates'),
  show: (id) => api.get(`/workspace/workflows/${id}`),
  create: (payload) => api.post('/workspace/workflows', payload),
  update: (id, payload) => api.patch(`/workspace/workflows/${id}`, payload),
  remove: (id) => api.delete(`/workspace/workflows/${id}`),
  duplicate: (id, name) => api.post(`/workspace/workflows/${id}/duplicate`, { name }),
  fromTemplate: (payload) => api.post('/workspace/workflows/from-template', payload),
};

export const approvalActionsApi = {
  approve: (type, id, notes) =>
    api.post('/workspace/approval-workflow/approve', { type, id, notes: notes || undefined }),
  reject: (type, id, reason) =>
    api.post('/workspace/approval-workflow/reject', { type, id, reason: reason || undefined }),
  returnForRevision: (type, id, reason) =>
    api.post('/workspace/approval-workflow/return', { type, id, reason: reason || undefined }),
  cancel: (type, id, reason) =>
    api.post('/workspace/approval-workflow/cancel', { type, id, reason: reason || undefined }),
};
