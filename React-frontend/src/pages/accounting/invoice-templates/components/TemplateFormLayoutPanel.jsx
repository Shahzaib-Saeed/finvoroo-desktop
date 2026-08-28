import { useId, useState } from 'react';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Loader2, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SYSTEM_SLOT_LABELS } from '../constants';

function slotId(slot, index) {
  if (slot.kind === 'system') return `system:${slot.key}:${index}`;
  return `custom:${slot.field_key}:${index}`;
}

function SortableLayoutRow({ slot, label, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: slot._id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
  };

  const isSystem = slot.kind === 'system';

  return (
    <tr ref={setNodeRef} style={style} className="border-t bg-card">
      <td className="w-10 px-2 py-2 text-center">
        <button
          type="button"
          className="inline-flex text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
      </td>
      <td className="px-3 py-2">
        <span className="font-medium text-sm">{label}</span>
        <Badge variant={isSystem ? 'secondary' : 'primary'} className="ml-2 text-[10px]">
          {isSystem ? 'Core' : 'Custom'}
        </Badge>
      </td>
      <td className="w-12 px-2 py-2 text-end">
        {isSystem ? (
          <span className="text-muted-foreground text-xs">—</span>
        ) : (
          <Button type="button" variant="ghost" size="icon" className="size-7 text-destructive" onClick={onRemove}>
            <X className="size-4" />
          </Button>
        )}
      </td>
    </tr>
  );
}

export function TemplateFormLayoutPanel({ slots, savedFields, onChange, onSave, saving }) {
  const dndId = useId();
  const [addKey, setAddKey] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const rows = slots.map((slot, index) => ({
    ...slot,
    _id: slotId(slot, index),
  }));

  const labelForSlot = (slot) => {
    if (slot.kind === 'system') {
      return SYSTEM_SLOT_LABELS[slot.key] || slot.key;
    }
    const saved = savedFields.find((f) => f.field_key === slot.field_key);
    return saved?.label || slot.field_key;
  };

  const layoutCustomKeys = new Set(
    slots.filter((s) => s.kind === 'custom').map((s) => s.field_key),
  );

  const availableToAdd = savedFields.filter(
    (f) => String(f.label || '').trim() && !layoutCustomKeys.has(f.field_key),
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = rows.findIndex((r) => r._id === active.id);
    const newIndex = rows.findIndex((r) => r._id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(rows, oldIndex, newIndex).map(({ _id, ...slot }) => slot);
    onChange(reordered);
  };

  const addCustomField = (fieldKey) => {
    if (!fieldKey) return;
    if (layoutCustomKeys.has(fieldKey)) {
      toast.error('That field is already in the layout.');
      return;
    }
    onChange([...slots, { kind: 'custom', field_key: fieldKey, width: 'full' }]);
    setAddKey('');
  };

  const removeCustom = (fieldKey) => {
    onChange(slots.filter((s) => !(s.kind === 'custom' && s.field_key === fieldKey)));
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Invoice form layout</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Reorder core fields and custom fields in the Invoice Details column. Invoice date and due date
          stay on the left; payment terms and custom fields follow on the right.
        </p>
      </div>

      <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="rounded-xl border overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="w-10" />
                <th className="text-left font-medium px-3 py-2">Field</th>
                <th className="w-12" />
              </tr>
            </thead>
            <SortableContext items={rows.map((r) => r._id)} strategy={verticalListSortingStrategy}>
              <tbody>
                {rows.map((slot) => (
                  <SortableLayoutRow
                    key={slot._id}
                    slot={slot}
                    label={labelForSlot(slot)}
                    onRemove={() => removeCustom(slot.field_key)}
                  />
                ))}
              </tbody>
            </SortableContext>
          </table>
        </div>
      </DndContext>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={addKey || undefined} onValueChange={(v) => addCustomField(v)}>
          <SelectTrigger className="h-9 w-full max-w-xs text-sm">
            <SelectValue placeholder="+ Add custom field to this column…" />
          </SelectTrigger>
          <SelectContent>
            {availableToAdd.map((f) => (
              <SelectItem key={f.field_key} value={f.field_key}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">Drag rows to reorder. Preview updates live.</span>
      </div>

      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={onSave} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save form layout
        </Button>
      </div>
    </div>
  );
}
