import api from '@/lib/api';

export const approvalApi = {
  approve: (type, id, notes) =>
    api.post('/workspace/approval-workflow/approve', { type, id, notes: notes || undefined }),
  reject: (type, id, notes) =>
    api.post('/workspace/approval-workflow/reject', { type, id, notes: notes || undefined }),
};
