import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ArrowDown, CheckCircle2, FilePlus2, Plus } from 'lucide-react';
import { StepCard } from './StepCard';
import { emptyStep } from '../constants';
import { moduleMeta } from '../utils';
import { Button } from '@/components/ui/button';

function TerminalNode({ title, subtitle, end }) {
  return (
    <div
      className={`mx-auto w-full max-w-xl rounded-2xl border px-4 py-3 text-center ${
        end
          ? 'border-zinc-800 bg-zinc-950 text-white dark:border-zinc-200 dark:bg-zinc-100 dark:text-zinc-950'
          : 'border-emerald-200 bg-emerald-50/80 dark:border-emerald-900 dark:bg-emerald-950/30'
      }`}
    >
      <div className="flex items-center justify-center gap-2 text-sm font-semibold">
        {end ? <CheckCircle2 className="size-4" /> : <FilePlus2 className="size-4" />}
        {title}
      </div>
      {subtitle ? <div className="mt-0.5 text-xs opacity-70">{subtitle}</div> : null}
    </div>
  );
}

function Arrow() {
  return (
    <div className="flex justify-center py-2 text-muted-foreground">
      <ArrowDown className="size-4" />
    </div>
  );
}

export function FlowCanvas({ form, onChange }) {
  const meta = moduleMeta(form.module);
  const steps = form.steps || [];
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const setSteps = (next) => onChange({ ...form, steps: next });

  const onDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = steps.findIndex((s) => s.id === active.id);
    const newIndex = steps.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    setSteps(arrayMove(steps, oldIndex, newIndex));
  };

  return (
    <div className="space-y-1">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold">Approval flow</h3>
          <p className="text-sm text-muted-foreground">
            Drag cards to reorder. Each card is one approval checkpoint.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setSteps([
              ...steps.map((s) => ({ ...s, expanded: false })),
              emptyStep({ name: `Approval ${steps.length + 1}`, expanded: true }),
            ])
          }
        >
          <Plus className="size-4 mr-1" />
          Add step
        </Button>
      </div>

      <TerminalNode title={meta.created} subtitle="Employee submits the document" />
      <Arrow />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="mx-auto w-full max-w-xl space-y-0">
            {steps.map((step, index) => (
              <div key={step.id}>
                <StepCard
                  step={step}
                  index={index}
                  total={steps.length}
                  onChange={(next) =>
                    setSteps(steps.map((s) => (s.id === step.id ? next : s)))
                  }
                  onDuplicate={() => {
                    const { id: _omit, ...rest } = step;
                    const copy = emptyStep({
                      ...rest,
                      name: `${step.name} (copy)`,
                      expanded: true,
                    });
                    const next = [...steps];
                    next.splice(index + 1, 0, copy);
                    setSteps(next.map((s, i) => ({ ...s, expanded: i === index + 1 })));
                  }}
                  onDelete={() => setSteps(steps.filter((s) => s.id !== step.id))}
                  onToggle={() =>
                    setSteps(
                      steps.map((s) =>
                        s.id === step.id ? { ...s, expanded: !s.expanded } : s,
                      ),
                    )
                  }
                />
                {index < steps.length - 1 ? <Arrow /> : null}
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Arrow />
      <TerminalNode end title={meta.posted} subtitle="Document moves forward after final approval" />
    </div>
  );
}
