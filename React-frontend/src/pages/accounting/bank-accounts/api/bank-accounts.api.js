import api from '@/lib/api';

export const bankAccountsApi = {
    list: (params) => api.get('/workspace/bank-accounts', { params }),
    show: (id) => api.get(`/workspace/bank-accounts/${id}`),
    create: (data) => api.post('/workspace/bank-accounts', data),
    update: (id, data) => api.put(`/workspace/bank-accounts/${id}`, data),
    delete: (id) => api.delete(`/workspace/bank-accounts/${id}`),
    formOptions: () => api.get('/workspace/bank-accounts/form-options'),
    transactions: (id, params) => api.get(`/workspace/bank-accounts/${id}/transactions`, { params }),
};
