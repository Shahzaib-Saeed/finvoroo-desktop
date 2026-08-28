import { FlowBadge } from './FlowBadges';
import { estimatedHours, formRulesSummary, moduleMeta, stepApproverLabel } from '../utils';

export function WorkflowSummary({ form }) {
  const meta = moduleMeta(form.module);
  const hours = estimatedHours(form);

  return (
    <div className="rounded-2xl border bg-background p-4 space-y-3">
      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Workflow</div>
        <div className="mt-1 text-base font-semibold">{form.name || 'Untitled workflow'}</div>
      </div>
      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Document</div>
        <div className="mt-1 text-sm">{meta.label}</div>
      </div>
      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Runs when</div>
        <div className="mt-1 text-sm">{formRulesSummary(form)}</div>
      </div>
      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Approvers</div>
        <div className="space-y-1.5">
          {(form.steps || []).map((step, i) => (
            <div key={step.id} className="flex items-center gap-2 text-sm">
              <span className="flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">
                {i + 1}
              </span>
              <span className="font-medium">{stepApproverLabel(step)}</span>
              <span className="text-muted-foreground truncate">{step.name}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 pt-1">
        <FlowBadge tone={form.is_active ? 'manager' : 'muted'}>
          {form.is_active ? 'Active' : 'Inactive'}
        </FlowBadge>
        {hours > 0 && <FlowBadge tone="sla">Est. {hours}h</FlowBadge>}
        <FlowBadge tone="muted">Priority {form.priority}</FlowBadge>
      </div>
    </div>
  );
}
