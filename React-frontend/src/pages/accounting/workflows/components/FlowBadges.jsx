import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const TONES = {
  sequential: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200',
  parallel: 'border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-200',
  owner: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
  manager: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200',
  finance: 'border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200',
  sla: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200',
  high: 'border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-200',
  muted: 'border-border bg-muted/60 text-muted-foreground',
};

export function FlowBadge({ tone = 'muted', children, className }) {
  return (
    <Badge
      variant="outline"
      className={cn('font-medium rounded-md px-2 py-0.5 text-[11px]', TONES[tone] || TONES.muted, className)}
    >
      {children}
    </Badge>
  );
}

export function stepBadges(step) {
  const badges = [];
  if (step.mode === 'parallel_any') badges.push({ tone: 'parallel', label: 'Anyone' });
  else if (step.mode === 'parallel_all') badges.push({ tone: 'parallel', label: 'Everyone' });
  else badges.push({ tone: 'sequential', label: 'Sequential' });

  if (step.assignee_type === 'owner') badges.push({ tone: 'owner', label: 'Owner' });
  else if ((step.roles || []).includes('manager')) badges.push({ tone: 'manager', label: 'Manager' });
  else if ((step.roles || []).includes('accountant')) badges.push({ tone: 'finance', label: 'Finance' });

  if (Number(step.min_amount) > 0) badges.push({ tone: 'high', label: `≥ ${Number(step.min_amount).toLocaleString()}` });
  if (step.sla_hours) badges.push({ tone: 'sla', label: `SLA ${step.sla_hours}h` });
  return badges;
}
