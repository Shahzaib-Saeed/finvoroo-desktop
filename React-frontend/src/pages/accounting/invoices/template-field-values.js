/**
 * Settings custom fields (definition_id) store values in *_metadata_custom_fields.
 * Legacy template-only fields store values in template_custom by field_key.
 */

function metadataFieldValue(metadata, definitionId) {
  if (!metadata || definitionId == null) return undefined;
  const key = String(definitionId);
  if (Object.prototype.hasOwnProperty.call(metadata, key)) {
    return metadata[key];
  }
  if (Object.prototype.hasOwnProperty.call(metadata, definitionId)) {
    return metadata[definitionId];
  }
  return undefined;
}

export function getTemplateFieldValue(form, field, metadataKey = 'invoice_metadata_custom_fields') {
  if (field?.definition_id) {
    const metaVal = metadataFieldValue(form?.[metadataKey], field.definition_id);
    if (metaVal !== undefined) {
      return metaVal ?? '';
    }
    return form?.template_custom?.[field.field_key] ?? '';
  }
  return form?.template_custom?.[field.field_key] ?? '';
}

export function setTemplateFieldValue(
  field,
  value,
  { setTemplateCustom, setMetadataField, metadataKey } = {},
) {
  if (field?.definition_id && typeof setMetadataField === 'function') {
    setMetadataField(field.definition_id, value);
    if (field.field_key) {
      setTemplateCustom?.(field.field_key, value);
    }
    return;
  }
  setTemplateCustom?.(field.field_key, value);
}

export function templateFieldError(errors, field, metadataKey = 'invoice_metadata_custom_fields') {
  if (!errors || !field) return undefined;
  if (field.definition_id) {
    return (
      errors[`${metadataKey}.${field.definition_id}`] ||
      errors[`${metadataKey}.${String(field.definition_id)}`] ||
      errors[`template_custom.${field.field_key}`]
    );
  }
  return errors[`template_custom.${field.field_key}`];
}
