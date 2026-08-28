import { ArrowDown, CheckCircle2, FilePlus2, Sparkles } from 'lucide-react';
import { FlowBadge, stepBadges } from './FlowBadges';
import { estimatedHours, formRulesSummary, moduleMeta, stepApproverLabel } from '../utils';
import { cn } from '@/lib/utils';

function Node({ title, subtitle, icon: Icon, tone = 'default', badges = [] }) {
  return (
    <div
      className={cn(
        'w-full max-w-[280px] rounded-xl border px-4 py-3 shadow-sm transition-all',
        tone === 'start' && 'border-emerald-200 bg-emerald-50/80 dark:border-emerald-900 dark:bg-emerald-950/30',
        tone === 'end' && 'border-zinc-300 bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950',
        tone === 'step' && 'border-border bg-background',
        tone === 'pending' && 'border-dashed border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20',
      )}
    >
      <div className="flex items-start gap-2.5">
        {Icon ? (
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-background/80 border">
            <Icon className="size-3.5" />
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold leading-snug">{title}</div>
          {subtitle ? <div className="mt-0.5 text-xs opacity-70">{subtitle}</div> : null}
          {badges.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {badges.map((b) => (
                <FlowBadge key={b.label} tone={b.tone}>
                  {b.label}
                </FlowBadge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Connector() {
  return (
    <div className="flex flex-col items-center py-1 text-muted-foreground">
      <div className="h-3 w-px bg-border" />
      <ArrowDown className="size-3.5" />
      <div className="h-1 w-px bg-border" />
    </div>
  );
}

export function LivePreview({ form, className }) {
  const meta = moduleMeta(form.module);
  const hours = estimatedHours(form);

  return (
    <aside className={cn('rounded-2xl border bg-muted/20 p-4 lg:p-5', className)}>
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="size-4 text-foreground" />
        <div>
          <div className="text-sm font-semibold">Live preview</div>
          <div className="text-xs text-muted-foreground">Updates as you edit</div>
        </div>
      </div>

      <div className="mb-4 rounded-xl border bg-background px-3 py-2.5 text-xs">
        <div className="font-medium text-foreground">{form.name || 'Untitled workflow'}</div>
        <div className="mt-1 text-muted-foreground">Runs when: {formRulesSummary(form)}</div>
        {hours > 0 && <div className="mt-1 text-muted-foreground">Est. approval time: {hours} hours</div>}
      </div>

      <div className="flex flex-col items-center">
        <Node tone="start" icon={FilePlus2} title={meta.created} subtitle="Employee submits document" />
        <Connector />
        <Node tone="pending" title="Pending approval" subtitle="Waiting in Approvals inbox" />
        {(form.steps || []).map((step) => (
          <div key={step.id} className="flex w-full flex-col items-center">
            <Connector />
            <Node
              tone="step"
              title={step.name || stepApproverLabel(step)}
              subtitle={stepApproverLabel(step)}
              badges={stepBadges(step)}
            />
          </div>
        ))}
        <Connector />
        <Node tone="end" icon={CheckCircle2} title={meta.posted} subtitle="Final approval complete" />
      </div>
    </aside>
  );
}
