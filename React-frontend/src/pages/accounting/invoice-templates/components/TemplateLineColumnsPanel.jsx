import { useId } from 'react';
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
import { Eye, EyeOff, GripVertical, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { LINE_COL_DEFAULT_LABELS } from '../constants';

function SortableColumnRow({ row, onChange }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.key,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.92 : 1,
  };

  const visible = row.visible !== false;
  const defaultLabel = LINE_COL_DEFAULT_LABELS[row.key] || row.key;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative flex items-center gap-3 bg-white px-3 py-2.5 transition-colors dark:bg-card',
        visible ? 'bg-neutral-50 dark:bg-neutral-900/40' : 'opacity-70',
        isDragging && 'z-10 bg-white shadow-md ring-1 ring-neutral-300 opacity-100 dark:bg-card dark:ring-neutral-600',
        'hover:bg-neutral-50/90 dark:hover:bg-neutral-900/30',
      )}
    >
      {visible ? (
        <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-neutral-900 dark:bg-white" />
      ) : null}

      <button
        type="button"
        className="inline-flex shrink-0 cursor-grab rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 active:cursor-grabbing dark:hover:bg-neutral-800"
        title="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3.5" />
      </button>

      <div className="min-w-0 w-[30%] shrink-0">
        <p className="truncate text-[13px] font-semibold text-foreground">{defaultLabel}</p>
        <p className="mt-0.5 flex items-center gap-1 text-[10px] text-neutral-500">
          {visible ? (
            <>
              <Eye className="size-3" /> Visible
            </>
          ) : (
            <>
              <EyeOff className="size-3" /> Hidden
            </>
          )}
        </p>
      </div>

      <div className="min-w-0 flex-1">
        <Input
          className="h-8 border-neutral-300 bg-white text-[13px] shadow-none dark:border-neutral-600"
          value={row.label}
          onChange={(e) => onChange({ label: e.target.value })}
          maxLength={120}
          placeholder={defaultLabel}
          disabled={!visible}
        />
      </div>

      <Switch
        checked={visible}
        onCheckedChange={(checked) => onChange({ visible: Boolean(checked) })}
        aria-label={`Toggle ${defaultLabel} column`}
        className="shrink-0"
      />
    </div>
  );
}

export function TemplateLineColumnsPanel({ columns, onChange, onSave, saving }) {
  const dndId = useId();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = columns.findIndex((c) => c.key === active.id);
    const newIndex = columns.findIndex((c) => c.key === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onChange(arrayMove(columns, oldIndex, newIndex));
  };

  const updateColumn = (key, patch) => {
    onChange(columns.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  };

  const visibleCount = columns.filter((c) => c.visible !== false).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Line item columns</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Rename headers, toggle visibility, and drag to set order.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-muted/80 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            {visibleCount}/{columns.length} visible
          </span>
          <Button type="button" size="sm" variant="mono" className="h-8" onClick={onSave} disabled={saving}>
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Save
          </Button>
        </div>
      </div>

      <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={columns.map((c) => c.key)} strategy={verticalListSortingStrategy}>
          <div className="overflow-hidden rounded-lg border border-neutral-300 divide-y divide-neutral-200 dark:border-neutral-600 dark:divide-neutral-700">
            {columns.map((row) => (
              <SortableColumnRow
                key={row.key}
                row={row}
                onChange={(patch) => updateColumn(row.key, patch)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
