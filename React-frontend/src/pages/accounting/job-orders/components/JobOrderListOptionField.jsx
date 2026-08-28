import { Label } from '@/components/ui/label';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import { QuickAddOptionControl } from '@/components/accounting/QuickAddOptionControl';
import { activeListOptions } from '../lib/job-order-list-options';

export function JobOrderListOptionField({
  label,
  value,
  onValueChange,
  options = [],
  error,
  onAddOption,
  placeholder = 'Select',
}) {
  const active = activeListOptions(options);

  return (
    <div className="space-y-2">
      <Label className="text-sm">{label}</Label>
      <QuickAddOptionControl
        label={label}
        onAddOption={
          typeof onAddOption === 'function'
            ? async (label) => {
                const created = await onAddOption(label);
                if (created?.value) {
                  onValueChange(created.value);
                  return true;
                }
                return false;
              }
            : undefined
        }
      >
        <SearchableCombobox
          value={value || ''}
          onValueChange={onValueChange}
          options={active.map((o) => ({ value: o.value, label: o.label }))}
          placeholder={placeholder}
          searchPlaceholder="Search…"
          triggerClassName="h-10 w-full"
        />
      </QuickAddOptionControl>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
