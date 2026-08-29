const ENGINE_NAMES = {
  gemini: 'Gemini',
  mistral: 'Mistral',
};

/** Display name for an OCR vendor id from the API (`gemini`, `mistral`). */
export function formatOcrEngineName(id) {
  const key = String(id || '').trim().toLowerCase();
  if (!key) return '';
  return ENGINE_NAMES[key] || key.charAt(0).toUpperCase() + key.slice(1);
}

/**
 * Prefer the engine that actually produced the rows. Archive rows store the
 * primary vendor separately from the final model, so the model name is the
 * most reliable signal when reopening a saved scan.
 */
export function engineFromExtraction(detail) {
  if (!detail) return null;
  const model = String(detail.model || '').toLowerCase();
  let provider = String(detail.provider || '').toLowerCase();
  if (model.includes('gemini')) provider = 'gemini';
  else if (model.includes('mistral')) provider = 'mistral';
  else if (detail.fallback_used && detail.fallback_provider) {
    const reason = String(detail.fallback_reason || '');
    if (reason === 'provider_unavailable' || reason === 'primary_unreadable') {
      provider = String(detail.fallback_provider).toLowerCase();
    }
  }
  if (!provider) return null;
  return {
    provider,
    model: detail.model || '',
    fallbackProvider: detail.fallback_provider || '',
    fallbackReason: detail.fallback_reason || '',
    correctedPages: detail.fallback_used ? 1 : 0,
    pages: 1,
  };
}

/** Structured 409 from parse-invoice when Mistral failed and Gemini needs a yes. */
export function parseOcrConsent(error) {
  const data = error?.response?.data || {};
  const errors = data.errors && typeof data.errors === 'object' ? data.errors : {};
  const status = Number(error?.response?.status || 0);
  const needsFallback =
    Boolean(errors.needs_fallback) || errors.code === 'ocr_fallback_consent';
  const fallbackProvider = String(errors.fallback_provider || (needsFallback ? 'gemini' : ''));
  return {
    message:
      data.message
      || error?.message
      || (status ? `Scan failed (HTTP ${status}).` : 'Could not scan this page.'),
    needsFallback,
    fallbackProvider,
    fallbackLabel: String(errors.fallback_label || formatOcrEngineName(fallbackProvider) || 'Gemini'),
    reasonCode: String(errors.reason_code || ''),
    issues: Array.isArray(errors.issues) ? errors.issues : [],
    primaryLines: Array.isArray(errors.primary_lines) ? errors.primary_lines : [],
    primaryItemCount: Number(errors.primary_item_count || 0),
  };
}
