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
import { SALES_ORDER_STATUSES } from '../constants';

export function SalesOrderDetailsSection({
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-sm">
            Order date <span className="text-destructive">*</span>
          </Label>
          <DatePicker
            value={form.order_date}
            onChange={(v) => onFieldChange('order_date', v)}
            placeholder="Pick order date"
            allowClear={false}
            disabled={readOnly}
          />
          {errors.order_date && (
            <p className="text-xs text-destructive">{errors.order_date}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label className="text-sm">Ship date</Label>
          <DatePicker
            value={form.ship_date}
            onChange={(v) => onFieldChange('ship_date', v)}
            placeholder="Pick ship date"
            disabled={readOnly}
          />
        </div>
        <div className="space-y-1 sm:col-span-2 sm:max-w-xs">
          <Label className="text-sm">Status</Label>
          <Select
            value={form.status || 'draft'}
            onValueChange={(v) => onFieldChange('status', v)}
            disabled={readOnly}
          >
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SALES_ORDER_STATUSES.map((s) => (
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
          values={form.sales_order_metadata_custom_fields || {}}
          onChange={onMetadataFieldChange}
          onAddSelectOption={onAddMetadataSelectOption}
          errors={errors}
          errorsPrefix="sales_order_metadata_custom_fields"
          readOnly={readOnly}
        />
      ) : null}
    </div>
  );
}
