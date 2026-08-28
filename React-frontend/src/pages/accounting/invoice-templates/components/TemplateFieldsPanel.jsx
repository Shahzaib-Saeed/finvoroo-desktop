import { useId } from 'react';
import { Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FIELD_TYPES, PLACEMENT_LABELS, PLACEMENT_EDITOR_VALUES, emptyFieldDraft } from '../constants';

export function TemplateFieldsPanel({ rows, onChange, onSave, saving }) {
  const updateRow = (index, patch) => {
    onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const removeRow = (index) => {
    onChange(rows.filter((_, i) => i !== index));
  };

  const addRow = () => {
    onChange([...rows, emptyFieldDraft()]);
  };

  const filledCount = rows.filter((r) => String(r.label || '').trim()).length;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Custom fields</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Define extra inputs on invoice create/edit form. This editor shows all fields directly.
          </p>
        </div>
        <Badge variant="secondary">{filledCount} rows</Badge>
      </div>

      <div className="space-y-3">
        {rows.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground text-sm">
            No custom fields yet. Click Add field to create one.
          </div>
        ) : (
          rows.map((row, index) => (
            <FieldRow
              key={index}
              index={index}
              row={row}
              onChange={(patch) => updateRow(index, patch)}
              onRemove={() => removeRow(index)}
            />
          ))
        )}
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="size-4" />
          Add field
        </Button>
        <Button type="button" size="sm" onClick={onSave} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save fields
        </Button>
      </div>
    </div>
  );
}

function FieldRow({ index, row, onChange, onRemove }) {
  const optionsId = useId();
  const showOptions = row.field_type === 'select';

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Field {index + 1}
        </p>
        <Button type="button" variant="ghost" size="icon" className="size-8 text-destructive" onClick={onRemove}>
          <Trash2 className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Label</p>
          <Input
            className="h-9 text-sm"
            value={row.label}
            onChange={(e) => onChange({ label: e.target.value })}
            placeholder="Label"
            maxLength={255}
          />
        </div>

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Placement</p>
          <Select value={row.placement} onValueChange={(v) => onChange({ placement: v })}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLACEMENT_EDITOR_VALUES.map((key) => (
                <SelectItem key={key} value={key}>
                  {PLACEMENT_LABELS[key] || key}
                </SelectItem>
              ))}
              {row.placement && !PLACEMENT_EDITOR_VALUES.includes(row.placement) ? (
                <SelectItem value={row.placement}>{row.placement} (legacy)</SelectItem>
              ) : null}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Field type</p>
          <Select value={row.field_type} onValueChange={(v) => onChange({ field_type: v })}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FIELD_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {showOptions ? (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Select options (one per line)</p>
          <Textarea
            id={optionsId}
            rows={3}
            className="text-sm min-h-[84px]"
            value={row.options_text}
            onChange={(e) => onChange({ options_text: e.target.value })}
            placeholder={'London\nNew York\nDubai'}
          />
        </div>
      ) : null}
    </div>
  );
}
