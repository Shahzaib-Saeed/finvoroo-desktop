import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { NO_NUMBER_SPINNER } from '../constants';
import { cn } from '@/lib/utils';
import { invoiceFieldLabelClass } from './invoice-form-design';
import { Textarea } from '@/components/ui/textarea';
import { Check, Loader2, Plus, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function templateFieldPlaceholder(field) {
  const label = String(field?.label || 'value')
    .replace(/:$/, '')
    .trim();
  if (!label) return 'Enter value';
  return `Enter ${label.charAt(0).toLowerCase()}${label.slice(1)}`;
}

export function InvoiceTemplateField({ field, value, onChange, onAddOption, error, isEdit = false }) {
  const [addingOpen, setAddingOpen] = useState(false);
  const [newOption, setNewOption] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  const label = (
    <Label className={cn(invoiceFieldLabelClass, 'mb-1 block')}>
      {field.label}
      {field.is_required && <span className="text-destructive ml-0.5">*</span>}
    </Label>
  );

  if (field.field_type === 'textarea') {
    return (
      <div className="w-full">
        {label}
        <Textarea
          rows={2}
          className="text-sm min-h-[60px] placeholder:text-muted-foreground/70"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          required={field.is_required}
          placeholder={templateFieldPlaceholder(field)}
        />
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </div>
    );
  }

  if (field.field_type === 'select') {
    const optionValues = (field.options || []).map((opt) => String(opt));
    const normalizedOptions = optionValues.map((opt) => opt.trim().toLowerCase());
    const selectValue =
      value != null && String(value).trim() !== '' && optionValues.includes(String(value))
        ? String(value)
        : '_none';
    const showClearOption =
      !field.is_required && (isEdit || selectValue !== '_none');

    const handleAddOption = async () => {
      if (!onAddOption) return;
      const next = newOption.trim();
      if (!next) {
        setAddError('Enter an option value.');
        return;
      }
      if (normalizedOptions.includes(next.toLowerCase())) {
        setAddError('This option already exists.');
        return;
      }
      setAdding(true);
      setAddError('');
      const ok = await onAddOption(next);
      setAdding(false);
      if (ok) {
        onChange(next);
        setNewOption('');
        setAddingOpen(false);
      } else {
        setAddError('Could not save option. Try again.');
      }
    };

    const handleCancelAdd = () => {
      if (adding) return;
      setAddingOpen(false);
      setNewOption('');
      setAddError('');
    };

    return (
      <div className="w-full">
        {label}
        <div className="flex items-center gap-2">
          <Select
            value={selectValue}
            onValueChange={(v) => onChange(v === '_none' ? '' : v)}
          >
            <SelectTrigger className="h-10 text-sm">
              <SelectValue placeholder={templateFieldPlaceholder(field)} />
            </SelectTrigger>
            <SelectContent>
              {showClearOption ? (
                <SelectItem value="_none" className="text-muted-foreground">
                  — Clear selection —
                </SelectItem>
              ) : null}
              {optionValues.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {typeof onAddOption === 'function' ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={() => {
                if (addingOpen) {
                  handleCancelAdd();
                } else {
                  setAddingOpen(true);
                  setAddError('');
                }
              }}
              title={addingOpen ? 'Close quick add' : `Add option for ${field.label}`}
            >
              {addingOpen ? <X className="size-4" /> : <Plus className="size-4" />}
            </Button>
          ) : null}
        </div>
        {addingOpen && typeof onAddOption === 'function' ? (
          <div className="mt-2 flex items-start gap-2">
            <Input
              className="h-8 text-xs"
              value={newOption}
              onChange={(e) => {
                setNewOption(e.target.value);
                if (addError) setAddError('');
              }}
              placeholder={`Add ${field.label} option`}
              disabled={adding}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddOption();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  handleCancelAdd();
                }
              }}
            />
            <Button
              type="button"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={handleAddOption}
              disabled={adding}
              title="Save option"
            >
              {adding ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            </Button>
          </div>
        ) : null}
        {addError ? <p className="text-xs text-destructive mt-1">{addError}</p> : null}
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </div>
    );
  }

  if (field.field_type === 'number') {
    return (
      <div className="w-full">
        {label}
        <Input
          type="number"
          step="any"
          className={cn('h-10 text-sm tabular-nums placeholder:text-muted-foreground/70', NO_NUMBER_SPINNER)}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          required={field.is_required}
          placeholder={templateFieldPlaceholder(field)}
        />
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </div>
    );
  }

  if (field.field_type === 'date') {
    return (
      <div className="w-full">
        {label}
        <DatePicker
          value={value ?? ''}
          onChange={onChange}
          placeholder={field.label || 'Pick a date'}
          allowClear={!field.is_required}
        />
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </div>
    );
  }

  return (
    <div className="w-full">
      {label}
      <Input
        className="h-10 text-sm placeholder:text-muted-foreground/70"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        required={field.is_required}
        placeholder={templateFieldPlaceholder(field)}
      />
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}

