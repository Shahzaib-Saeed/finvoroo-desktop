import { Link } from 'react-router-dom';
import { AlertTriangle, Clock3, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Workspace trial / expired banner.
 * @param {{ entitlement?: object|null, className?: string }} props
 */
export function TrialStatusBanner({ entitlement, className }) {
  if (!entitlement) return null;

  const status = entitlement.status;
  const isTrial = entitlement.is_trial;
  const canMutate = entitlement.can_mutate !== false;
  const days = entitlement.days_remaining;

  if (status === 'expired' || entitlement.reason === 'trial_expired' || !canMutate) {
    if (status === 'active' && canMutate) return null;

    const readOnly =
      !canMutate ||
      status === 'expired' ||
      status === 'suspended' ||
      status === 'cancelled' ||
      status === 'past_due';

    if (!readOnly) return null;

    return (
      <div
        className={cn(
          'flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
          className,
        )}
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-foreground">Your free trial has ended.</p>
            <p className="text-xs text-muted-foreground">
              This workspace is read-only. Your data is safe — choose a plan to continue creating
              and editing records.
            </p>
          </div>
        </div>
        <Button size="sm" asChild className="shrink-0">
          <Link to="/help">Choose a Plan</Link>
        </Button>
      </div>
    );
  }

  if (!isTrial && status !== 'trialing') return null;

  const urgent = typeof days === 'number' && days <= 3;
  const label =
    typeof days === 'number'
      ? days <= 0
        ? 'Expires today'
        : days === 1
          ? '1 day remaining'
          : `${days} days remaining`
      : 'Trial active';

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
        urgent
          ? 'border-orange-500/30 bg-orange-500/10'
          : 'border-primary/20 bg-primary/5',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {urgent ? (
          <Clock3 className="mt-0.5 size-5 shrink-0 text-orange-600" />
        ) : (
          <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" />
        )}
        <div>
          <p className="text-sm font-semibold text-foreground">14-Day Free Trial</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
      <Button size="sm" variant="outline" asChild className="shrink-0">
        <Link to="/help">View plans</Link>
      </Button>
    </div>
  );
}
