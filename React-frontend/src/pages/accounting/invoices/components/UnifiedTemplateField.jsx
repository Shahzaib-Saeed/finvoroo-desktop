import { InvoiceTemplateField } from './InvoiceTemplateField';
import {
  getTemplateFieldValue,
  setTemplateFieldValue,
  templateFieldError,
} from '../template-field-values';

export function UnifiedTemplateField({
  field,
  form,
  errors,
  setTemplateCustom,
  setMetadataField,
  metadataKey = 'invoice_metadata_custom_fields',
  addTemplateSelectOption,
  isEdit = false,
}) {
  const value = getTemplateFieldValue(form, field, metadataKey);
  const error = templateFieldError(errors, field, metadataKey);

  const canAddSelectOption =
    field?.field_type === 'select' &&
    field?.field_key &&
    typeof addTemplateSelectOption === 'function';

  return (
    <InvoiceTemplateField
      field={field}
      value={value}
      onChange={(v) =>
        setTemplateFieldValue(field, v, {
          setTemplateCustom,
          setMetadataField,
          metadataKey,
        })
      }
      onAddOption={
        canAddSelectOption
          ? (option) => addTemplateSelectOption(field, option)
          : undefined
      }
      error={error}
      isEdit={isEdit}
    />
  );
}
