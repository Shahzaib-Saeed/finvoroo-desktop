import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { MetadataCustomFields } from '@/components/accounting/MetadataCustomFields';
import { QUOTATION_STATUSES } from '../constants';

export function QuotationDetailsSection({
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
      <h3 className="text-xs font-bold uppercase tracking-wide text-foreground">
        Quotation details
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">
            Quote date <span className="text-destructive">*</span>
          </Label>
          <DatePicker
            value={form.quote_date}
            onChange={(v) => onFieldChange('quote_date', v)}
            placeholder="Pick quote date"
            allowClear={false}
            disabled={readOnly}
          />
          {errors.quote_date && (
            <p className="text-xs text-destructive">{errors.quote_date}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Expiry date</Label>
          <DatePicker
            value={form.expiry_date}
            onChange={(v) => onFieldChange('expiry_date', v)}
            placeholder="Pick expiry date"
            disabled={readOnly}
          />
        </div>
        <div className="space-y-1 sm:col-span-2 sm:max-w-xs">
          <Label className="text-xs">Status</Label>
          <Select
            value={form.status || 'draft'}
            onValueChange={(v) => onFieldChange('status', v)}
            disabled={readOnly}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUOTATION_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {customFieldDefinitions.length > 0 && onMetadataFieldChange ? (
        <MetadataCustomFields
          variant="inline"
          definitions={customFieldDefinitions}
          values={form.quotation_metadata_custom_fields || {}}
          onChange={onMetadataFieldChange}
          onAddSelectOption={onAddMetadataSelectOption}
          errors={errors}
          errorsPrefix="quotation_metadata_custom_fields"
          readOnly={readOnly}
        />
      ) : null}
    </div>
  );
}
