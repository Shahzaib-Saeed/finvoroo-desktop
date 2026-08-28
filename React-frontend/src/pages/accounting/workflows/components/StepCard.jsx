import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  GripVertical,
  Trash2,
} from 'lucide-react';
import { ApproverPicker } from './ApproverPicker';
import { FlowBadge, stepBadges } from './FlowBadges';
import { HelpTip } from './HelpTip';
import { APPROVAL_TYPES } from '../constants';
import { modeLabel, stepApproverLabel } from '../utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export function StepCard({
  step,
  index,
  total,
  onChange,
  onDuplicate,
  onDelete,
  onToggle,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: step.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
    zIndex: isDragging ? 5 : 0,
  };

  const badges = stepBadges(step);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-2xl border bg-background shadow-sm transition-shadow',
        isDragging && 'shadow-lg ring-2 ring-foreground/10',
        step.expanded && 'ring-1 ring-border',
      )}
    >
      <div className="flex items-start gap-2 p-3 sm:p-4">
        <button
          type="button"
          className="mt-1 cursor-grab active:cursor-grabbing rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>

        <button type="button" className="min-w-0 flex-1 text-left" onClick={onToggle}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-zinc-950 text-[11px] font-semibold text-white dark:bg-zinc-200 dark:text-zinc-950">
              {index + 1}
            </span>
            <span className="text-sm font-semibold">{step.name || 'Approval step'}</span>
            {index === total - 1 && <FlowBadge tone="owner">Final approval</FlowBadge>}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {badges.map((b) => (
              <FlowBadge key={b.label} tone={b.tone}>
                {b.label}
              </FlowBadge>
            ))}
            <span className="text-xs text-muted-foreground self-center ml-1">
              {stepApproverLabel(step)} · {modeLabel(step.mode)}
              {step.sla_hours ? ` · ${step.sla_hours}h SLA` : ''}
            </span>
          </div>
        </button>

        <div className="flex items-center gap-0.5">
          <Button type="button" size="icon" variant="ghost" onClick={onDuplicate} title="Duplicate">
            <Copy className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="text-destructive"
            disabled={total <= 1}
            onClick={onDelete}
            title="Delete"
          >
            <Trash2 className="size-4" />
          </Button>
          <Button type="button" size="icon" variant="ghost" onClick={onToggle}>
            {step.expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </Button>
        </div>
      </div>

      {step.expanded && (
        <div className="border-t px-4 pb-4 pt-4 space-y-4 sm:px-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Label>Step name</Label>
                <HelpTip>Shown to approvers in the inbox and notifications.</HelpTip>
              </div>
              <Input
                value={step.name}
                onChange={(e) => onChange({ ...step, name: e.target.value })}
                placeholder="e.g. Manager Approval"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Label>Approval type</Label>
                <HelpTip>Sequential means one person at a time. Parallel lets a group share the step.</HelpTip>
              </div>
              <Select value={step.mode} onValueChange={(v) => onChange({ ...step, mode: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPROVAL_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {APPROVAL_TYPES.find((t) => t.value === step.mode)?.hint}
              </p>
            </div>
          </div>

          <ApproverPicker step={step} onChange={onChange} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Label>Minimum amount for this approver</Label>
                <HelpTip>
                  Skip this step when the document amount is below this value. Leave 0 to always include it.
                </HelpTip>
              </div>
              <Input
                type="number"
                min="0"
                value={step.min_amount}
                onChange={(e) => onChange({ ...step, min_amount: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Label>SLA (hours)</Label>
                <HelpTip>Optional deadline before the step is marked overdue and escalated.</HelpTip>
              </div>
              <Input
                type="number"
                min="1"
                value={step.sla_hours}
                onChange={(e) => onChange({ ...step, sla_hours: e.target.value })}
                placeholder="e.g. 24"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
