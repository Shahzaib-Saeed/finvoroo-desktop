import { useMemo, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Calculator,
  Calendar,
  ChevronRight,
  GripVertical,
  Hash,
  Plus,
  Search,
  Type,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { BUILDER_COPY } from '../../lib/report-business-copy';

const TYPE_META = {
  money: {
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/70',
    label: 'Currency',
    Icon: Calculator,
  },
  number: {
    dot: 'bg-sky-500',
    badge: 'bg-sky-50 text-sky-700 border-sky-200/70',
    label: 'Number',
    Icon: Hash,
  },
  date: {
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-800 border-amber-200/70',
    label: 'Date',
    Icon: Calendar,
  },
  datetime: {
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-800 border-amber-200/70',
    label: 'Date',
    Icon: Calendar,
  },
  boolean: {
    dot: 'bg-violet-500',
    badge: 'bg-violet-50 text-violet-700 border-violet-200/70',
    label: 'Yes / No',
    Icon: Type,
  },
  string: {
    dot: 'bg-slate-400',
    badge: 'bg-slate-50 text-slate-600 border-slate-200/80',
    label: 'Text',
    Icon: Type,
  },
};

function typeMeta(type) {
  return TYPE_META[type] || TYPE_META.string;
}

/**
 * Searchable, grouped field picker with drag & drop: available fields
 * can be dragged onto the preview grid or clicked to add. Selected
 * columns are drag-reorderable in place.
 */
export function FieldExplorer({ datasetLabel, fields, selectedKeys, onChange, onBack }) {
  const [query, setQuery] = useState('');

  const selectedFields = selectedKeys.map((key) => fields.find((f) => f.key === key)).filter(Boolean);

  const availableFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return fields.filter((f) => !selectedKeys.includes(f.key) && (!q || f.label.toLowerCase().includes(q)));
  }, [fields, selectedKeys, query]);

  const grouped = useMemo(() => {
    return availableFiltered.reduce((acc, f) => {
      const group = f.group || 'Other';
      (acc[group] ||= []).push(f);
      return acc;
    }, {});
  }, [availableFiltered]);

  const addField = (key) => onChange([...selectedKeys, key]);
  const removeField = (key) => onChange(selectedKeys.filter((k) => k !== key));

  return (
    <div className="flex h-full flex-col bg-[#F8FAFC]">
      <div className="border-b border-slate-200/80 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
            title="Change data source"
          >
            <ChevronRight className="size-3.5 rotate-180" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{datasetLabel}</p>
            <p className="text-[11px] text-slate-500">Data source</p>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200/80 bg-white px-4 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={BUILDER_COPY.fieldSearchPlaceholder}
            className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="border-b border-slate-200/70 px-4 py-3.5">
          <div className="mb-2.5 flex items-center justify-between px-0.5">
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Active layout
            </h4>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-blue-700">
              {selectedFields.length}
            </span>
          </div>

          {selectedFields.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 px-3 py-5 text-center">
              <p className="text-xs font-medium text-slate-600">No columns yet</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                {BUILDER_COPY.previewEmptyDescription}
              </p>
            </div>
          ) : (
            <SortableContext items={selectedKeys.map((k) => `col:${k}`)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-1.5">
                {selectedFields.map((field, index) => (
                  <SelectedFieldRow
                    key={field.key}
                    field={field}
                    index={index}
                    onRemove={() => removeField(field.key)}
                  />
                ))}
              </div>
            </SortableContext>
          )}
        </div>

        <div className="px-4 py-3.5">
          <h4 className="mb-2 px-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Available fields
          </h4>
          {Object.keys(grouped).length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-white px-3 py-5 text-center text-xs text-slate-400">
              {query ? `No fields match “${query}”.` : 'All fields have been added.'}
            </p>
          ) : (
            Object.entries(grouped).map(([group, groupFields]) => (
              <FieldGroupSection key={group} group={group} fields={groupFields} onAdd={addField} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function FieldGroupSection({ group, fields, onAdd }) {
  const [open, setOpen] = useState(true);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mb-2">
      <CollapsibleTrigger className="flex w-full items-center gap-1.5 rounded-lg px-1.5 py-1.5 text-left transition hover:bg-white/80">
        <ChevronRight className={cn('size-3.5 text-slate-400 transition-transform', open && 'rotate-90')} />
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">{group}</span>
        <span className="ml-auto text-[10px] font-medium tabular-nums text-slate-400">{fields.length}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-0.5 flex flex-col gap-0.5 pb-1">
          {fields.map((field) => (
            <AvailableFieldRow key={field.key} field={field} onAdd={() => onAdd(field.key)} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function AvailableFieldRow({ field, onAdd }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `avail:${field.key}` });
  const meta = typeMeta(field.type);

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onAdd}
      className={cn(
        'group flex cursor-grab items-center gap-2.5 rounded-xl border border-transparent bg-transparent px-2.5 py-2 text-left text-sm text-slate-600 transition-all active:cursor-grabbing',
        'hover:border-slate-200 hover:bg-white hover:text-slate-900 hover:shadow-sm',
        isDragging && 'opacity-40',
      )}
      {...attributes}
      {...listeners}
    >
      <span className={cn('size-1.5 shrink-0 rounded-full', meta.dot)} />
      <span className="min-w-0 flex-1 truncate font-medium">{field.label}</span>
      <Plus className="size-3.5 shrink-0 text-blue-500 opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}

function SelectedFieldRow({ field, index, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `col:${field.key}`,
  });
  const meta = typeMeta(field.type);
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.9 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group rounded-xl border border-slate-200/90 bg-white px-2.5 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition',
        isDragging && 'border-blue-300 shadow-md ring-2 ring-blue-100',
      )}
    >
      <div className="flex items-start gap-1.5">
        <button
          type="button"
          className="mt-0.5 inline-flex size-6 shrink-0 cursor-grab items-center justify-center rounded-md text-slate-300 transition hover:bg-slate-100 hover:text-slate-500 active:cursor-grabbing touch-none"
          {...attributes}
          {...listeners}
          aria-label={`Drag ${field.label}`}
        >
          <GripVertical className="size-3.5" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-slate-800">{field.label}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1">
                <span
                  className={cn(
                    'inline-flex items-center rounded-md border px-1.5 py-px text-[10px] font-medium',
                    meta.badge,
                  )}
                >
                  {meta.label}
                </span>
                {index === 0 ? (
                  <span className="inline-flex items-center rounded-md border border-blue-200/70 bg-blue-50 px-1.5 py-px text-[10px] font-medium text-blue-700">
                    Pinned
                  </span>
                ) : null}
                {field.is_calculated ? (
                  <span className="inline-flex items-center rounded-md border border-violet-200/70 bg-violet-50 px-1.5 py-px text-[10px] font-medium text-violet-700">
                    Calculated
                  </span>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={onRemove}
              className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-slate-300 opacity-70 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
              aria-label={`Remove ${field.label}`}
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
