import { useCallback } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import {
  horizontalListSortingStrategy,
  SortableContext,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { reportType } from "./report-typography";

function SortableHeaderCell({ col, className, justify = "start", children }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: col.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
    position: "relative",
    zIndex: isDragging ? 2 : 0,
  };

  return (
    <th ref={setNodeRef} style={style} className={className}>
      <div
        className={cn(
          "flex items-center gap-0.5 min-w-0",
          justify === "center" && "justify-center",
          justify === "end" && "justify-end",
        )}
      >
        <button
          type="button"
          className="no-print inline-flex shrink-0 items-center justify-center size-5 rounded hover:bg-neutral-100 cursor-grab active:cursor-grabbing touch-none"
          {...attributes}
          {...listeners}
          aria-label={`Drag ${col.label} column`}
        >
          <GripVertical className="size-3 opacity-40" aria-hidden="true" />
        </button>
        <span className="min-w-0">{children}</span>
      </div>
    </th>
  );
}

export function ReportDraggableTableHead({
  columns,
  onReorder,
  renderLabel,
  isRightAligned = () => false,
  isCenterAligned = () => false,
  getExtraClassName = () => "",
}) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 120, tolerance: 6 },
    }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event;
      if (active?.id && over?.id) {
        onReorder(String(active.id), String(over.id));
      }
    },
    [onReorder],
  );

  const row = (
    <SortableContext
      items={columns.map((col) => col.id)}
      strategy={horizontalListSortingStrategy}
    >
      <tr className={cn("border-b border-border text-left", reportType.tableHead)}>
        {columns.map((col) => {
          const center = isCenterAligned(col);
          const right = isRightAligned(col);
          const className = cn(
            "px-1 py-2 align-bottom",
            center ? "text-center" : "",
            right ? "text-right" : "",
            getExtraClassName(col),
          );

          return (
            <SortableHeaderCell
              key={col.id}
              col={col}
              className={className}
              justify={center ? "center" : right ? "end" : "start"}
            >
              {renderLabel(col)}
            </SortableHeaderCell>
          );
        })}
      </tr>
    </SortableContext>
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToHorizontalAxis]}
      onDragEnd={handleDragEnd}
      // Portal a11y nodes to body — DndContext injects <div>s that are invalid inside <thead>.
      accessibility={{
        container:
          typeof document !== "undefined" ? document.body : undefined,
      }}
    >
      {row}
    </DndContext>
  );
}
