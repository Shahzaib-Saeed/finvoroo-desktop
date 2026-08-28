import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { buildAccountStatementUrl } from '../report-drilldown';
import { cn } from '@/lib/utils';

/**
 * Clickable account label — opens account statement for the report period.
 */
export function ReportAccountDrillLink({
  workspaceId,
  accountId,
  code,
  name,
  from,
  to,
  className,
  showIcon = true,
  children,
}) {
  const href = buildAccountStatementUrl(workspaceId, { accountId, from, to });

  if (!href || !accountId) {
    return <span className={className}>{children ?? name ?? '—'}</span>;
  }

  return (
    <Link
      to={href}
      className={cn(
        'inline-flex items-center gap-1 font-medium text-primary hover:underline underline-offset-2',
        className,
      )}
      title="View posted transactions for this account"
      onClick={(e) => e.stopPropagation()}
    >
      {children ?? <span>{name || '—'}</span>}
      {showIcon ? <ChevronRight className="size-3.5 opacity-60 shrink-0" /> : null}
    </Link>
  );
}
