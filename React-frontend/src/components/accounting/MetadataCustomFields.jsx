import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import { QuickAddOptionControl } from '@/components/accounting/QuickAddOptionControl';
import { parseDefinitionOptions } from '@/components/accounting/custom-fields-lib';
import { cn } from '@/lib/utils';

const TYPE_LABELS = {
  text: 'Text',
  textarea: 'Long text',
  number: 'Number',
  date: 'Date',
  dropdown: 'Select',
  radio: 'Select',
  checkbox: 'Yes / No',
};

/**
 * Renders company-defined metadata fields (customer, product, job order, etc.).
 * @param {string} errorsPrefix - e.g. `job_metadata_custom_fields` for nested API errors
 * @param {(defId: string|number, option: string) => Promise<boolean>} [onAddSelectOption]
 */
export function MetadataCustomFields({
  definitions,
  values,
  onChange,
  errors = {},
  errorsPrefix = '',
  className,
  variant = 'card',
  readOnly = false,
  onAddSelectOption,
}) {
  if (!definitions?.length) return null;

  const inline = variant === 'inline' || variant === 'embedded';
  const embedded = variant === 'embedded';

  const errKey = (id) => {
    const base = errorsPrefix ? `${errorsPrefix}.${id}` : id;
    return errors[base] || errors[id] || errors[`${errorsPrefix}.${id}`];
  };

  const renderControl = (def, id, value) => {
    if (def.type === 'textarea') {
      return (
        <Textarea
          rows={inline ? 2 : 3}
          value={value}
          onChange={(e) => onChange(id, e.target.value)}
          className={cn('resize-y', inline ? 'text-sm min-h-[72px]' : 'bg-background min-h-[72px]')}
          placeholder={inline ? undefined : `Enter ${def.label.toLowerCase()}`}
          disabled={readOnly}
        />
      );
    }
    if (def.type === 'number') {
      return (
        <Input
          type="number"
          step="any"
          value={value}
          onChange={(e) => onChange(id, e.target.value)}
          className={cn(inline ? 'h-10' : 'bg-background h-10 tabular-nums')}
          placeholder={inline ? undefined : '0'}
          disabled={readOnly}
        />
      );
    }
    if (def.type === 'date') {
      return (
        <DatePicker
          value={value ? String(value).slice(0, 10) : ''}
          onChange={(v) => onChange(id, v || '')}
          placeholder="Pick date"
          disabled={readOnly}
        />
      );
    }
    if (def.type === 'dropdown' || def.type === 'radio') {
      const options = parseDefinitionOptions(def);
      const canAdd = !readOnly && typeof onAddSelectOption === 'function';

      return (
        <QuickAddOptionControl
          label={def.label}
          disabled={readOnly}
          onAddOption={
            canAdd
              ? async (option) => {
                  const ok = await onAddSelectOption(id, option);
                  if (ok) onChange(id, option);
                  return ok;
                }
              : undefined
          }
        >
          <SearchableCombobox
            value={value}
            onValueChange={(v) => onChange(id, v === '_none' ? '' : v)}
            options={options.map((opt) => ({ value: opt, label: opt }))}
            placeholder="Select"
            searchPlaceholder="Search…"
            allowNone
            noneValue="_none"
            noneLabel="—"
            triggerClassName="h-10"
            disabled={readOnly}
          />
        </QuickAddOptionControl>
      );
    }
    if (def.type === 'checkbox') {
      return (
        <div className="flex items-center gap-2 pt-0.5">
          <Checkbox
            id={`meta-cb-${id}`}
            checked={value === '1' || value === 1 || value === true}
            onCheckedChange={(checked) => onChange(id, checked ? '1' : '0')}
            disabled={readOnly}
          />
          <label htmlFor={`meta-cb-${id}`} className="text-sm text-muted-foreground cursor-pointer">
            Yes
          </label>
        </div>
      );
    }
    return (
      <Input
        value={value}
        onChange={(e) => onChange(id, e.target.value)}
        className="h-10"
        placeholder={inline ? undefined : `Enter ${def.label.toLowerCase()}`}
        disabled={readOnly}
      />
    );
  };

  const fields = definitions.map((def) => {
        const id = String(def.id);
        const value = values[id] ?? '';
        const error = errKey(id);
        const isWide = def.type === 'textarea';
        const typeHint = TYPE_LABELS[def.type] || def.type;

        if (inline) {
          return (
            <div
              key={id}
              className={cn(
                embedded ? 'space-y-1.5 min-w-0' : 'space-y-1',
                isWide ? (embedded ? 'sm:col-span-2 lg:col-span-3' : 'sm:col-span-2') : '',
              )}
            >
              <Label className="text-sm">
                {def.label}
                {def.is_required ? <span className="text-destructive ml-0.5">*</span> : null}
              </Label>
              {renderControl(def, id, value)}
              {error ? <p className="text-xs text-destructive">{error}</p> : null}
            </div>
          );
        }

        return (
          <div
            key={id}
            className={cn(
              'rounded-lg border bg-muted/20 p-3.5 space-y-2',
              isWide ? 'sm:col-span-2' : '',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <Label className="text-sm font-medium leading-snug">
                {def.label}
                {def.is_required ? <span className="text-destructive ml-0.5">*</span> : null}
              </Label>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground shrink-0">
                {typeHint}
              </span>
            </div>
            {renderControl(def, id, value)}
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </div>
        );
      });

  if (embedded) {
    return <>{fields}</>;
  }

  return (
    <div
      className={cn(
        inline ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'grid gap-4 sm:grid-cols-2',
        className,
      )}
    >
      {fields}
    </div>
  );
}
