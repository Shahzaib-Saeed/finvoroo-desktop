import { CheckCircle2, CircleDot, MessageSquare, RotateCcw, Send, XCircle } from 'lucide-react';
import { formatDateTime } from '@/lib/format-datetime';
import { cn } from '@/lib/utils';

const ICONS = {
  submit: Send,
  approved: CheckCircle2,
  approve: CheckCircle2,
  level_approved: CircleDot,
  rejected: XCircle,
  reject: XCircle,
  returned: RotateCcw,
  return: RotateCcw,
  cancelled: XCircle,
  escalate: CircleDot,
  comment: MessageSquare,
};

export function ApprovalTimeline({ actions = [], className }) {
  if (!actions?.length) {
    return (
      <div className={cn('rounded-lg border border-dashed p-4 text-sm text-muted-foreground', className)}>
        No approval activity yet.
      </div>
    );
  }

  return (
    <ol className={cn('relative space-y-3', className)}>
      {actions.map((action) => {
        const Icon = ICONS[action.action] || CircleDot;
        return (
          <li key={action.id} className="relative pl-9">
            <span className="absolute left-0 top-1 size-7 rounded-full border bg-background flex items-center justify-center">
              <Icon className="size-3.5" />
            </span>
            <div className="rounded-lg border px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-medium capitalize">{String(action.action).replaceAll('_', ' ')}</div>
                <div className="text-xs text-muted-foreground">
                  {formatDateTime(action.created_at)}
                </div>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {action.actor_name || 'System'}
                {action.notes ? ` · ${action.notes}` : ''}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
