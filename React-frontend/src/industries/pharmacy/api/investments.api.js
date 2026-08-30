import api from '@/lib/api';

/**
 * Investor profit sharing.
 *
 * Note the split between `calculate` and `createDistribution`: the first is a
 * read that shows what a period would pay, the second commits that figure as a
 * record. Loading a screen must never move money, so the preview deliberately
 * has no write behind it.
 */
export const investmentsApi = {
  // Investors
  listInvestors: (params) => api.get('/workspace/investors', { params }),
  getInvestor: (id) => api.get(`/workspace/investors/${id}`),
  createInvestor: (data) => api.post('/workspace/investors', data),
  updateInvestor: (id, data) => api.put(`/workspace/investors/${id}`, data),
  deleteInvestor: (id) => api.delete(`/workspace/investors/${id}`),

  // Investment contracts
  listInvestments: (params) => api.get('/workspace/investments', { params }),
  getInvestment: (id) => api.get(`/workspace/investments/${id}`),
  createInvestment: (data) => api.post('/workspace/investments', data),
  updateInvestment: (id, data) => api.put(`/workspace/investments/${id}`, data),
  deleteInvestment: (id) => api.delete(`/workspace/investments/${id}`),

  /** Read-only preview — writes nothing. */
  calculate: (investmentId, params) =>
    api.get(`/workspace/investments/${investmentId}/calculate`, { params }),

  /** Capital contribution or return. */
  recordCapital: (investmentId, data) =>
    api.post(`/workspace/investments/${investmentId}/capital`, data),

  // Distributions — draft → reviewed → posted
  listDistributions: (params) => api.get('/workspace/investment-distributions', { params }),
  getDistribution: (id) => api.get(`/workspace/investment-distributions/${id}`),
  createDistribution: (data) => api.post('/workspace/investment-distributions', data),
  recalculateDistribution: (id) =>
    api.post(`/workspace/investment-distributions/${id}/recalculate`),
  reviewDistribution: (id) => api.post(`/workspace/investment-distributions/${id}/review`),
  postDistribution: (id) => api.post(`/workspace/investment-distributions/${id}/post`),
  cancelDistribution: (id, data) =>
    api.post(`/workspace/investment-distributions/${id}/cancel`, data),
  payDistribution: (id, data) =>
    api.post(`/workspace/investment-distributions/${id}/payment`, data),

  // Reports
  statement: (params) => api.get('/workspace/investment-reports/statement', { params }),
  summary: () => api.get('/workspace/investment-reports/summary'),
  segmentReport: (params) => api.get('/workspace/investment-reports/segment', { params }),

  // Shared-expense allocation
  listAllocationRules: () => api.get('/workspace/expense-allocation-rules'),
  saveAllocationRule: (data) => api.post('/workspace/expense-allocation-rules', data),
  deleteAllocationRule: (id) => api.delete(`/workspace/expense-allocation-rules/${id}`),
};
