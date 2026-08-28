import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { MetadataCustomFields } from '@/components/accounting/MetadataCustomFields';

export function PoDetailsSection({
  form,
  errors,
  onFieldChange,
  readOnly,
  customFieldDefinitions = [],
  onMetadataFieldChange,
  onAddMetadataSelectOption,
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold uppercase text-muted-foreground">Order details</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-sm">
            Order date <span className="text-destructive">*</span>
          </Label>
          <DatePicker
            value={form.order_date}
            onChange={(v) => onFieldChange('order_date', v)}
            allowClear={false}
            disabled={readOnly}
          />
          {errors.order_date && (
            <p className="text-xs text-destructive">{errors.order_date}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label className="text-sm">Expected delivery</Label>
          <DatePicker
            value={form.expected_delivery}
            onChange={(v) => onFieldChange('expected_delivery', v)}
            disabled={readOnly}
            placeholder="Optional"
          />
        </div>
      </div>
      {customFieldDefinitions.length > 0 && onMetadataFieldChange ? (
        <MetadataCustomFields
          variant="inline"
          definitions={customFieldDefinitions}
          values={form.purchase_order_metadata_custom_fields || {}}
          onChange={onMetadataFieldChange}
          onAddSelectOption={onAddMetadataSelectOption}
          errors={errors}
          errorsPrefix="purchase_order_metadata_custom_fields"
          readOnly={readOnly}
        />
      ) : null}
    </div>
  );
}
