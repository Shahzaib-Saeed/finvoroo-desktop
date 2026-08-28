import api from '@/lib/api';

export const documentConversionsApi = {
  preview: ({ sourceType, sourceId, target }) =>
    api.get('/workspace/document-conversions/preview', {
      params: {
        source_type: sourceType,
        source_id: sourceId,
        target,
      },
    }),
};

