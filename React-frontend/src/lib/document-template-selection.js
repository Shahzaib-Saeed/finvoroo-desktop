/** Resolve which layout template id should drive the form UI. */
export function resolveActiveTemplateId({
  formTemplateId,
  documentTemplateId,
  defaultTemplateId,
  isEdit,
}) {
  if (formTemplateId != null && String(formTemplateId).trim() !== '') {
    return String(formTemplateId);
  }
  if (isEdit && documentTemplateId != null && String(documentTemplateId).trim() !== '') {
    return String(documentTemplateId);
  }
  if (defaultTemplateId != null && String(defaultTemplateId).trim() !== '') {
    return String(defaultTemplateId);
  }
  return '';
}

export function findTemplateById(templates, templateId) {
  if (!templateId || !Array.isArray(templates) || templates.length === 0) return null;
  return templates.find((t) => String(t.id) === String(templateId)) || null;
}
