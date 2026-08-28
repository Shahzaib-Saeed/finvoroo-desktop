import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { buildGeneralLedgerUrl } from '../report-drilldown';
import { cn } from '@/lib/utils';

/**
 * Clickable account label — opens General Ledger filtered to the account.
 */
export function ReportGeneralLedgerDrillLink({
  workspaceId,
  accountId,
  name,
  from,
  to,
  className,
  showIcon = true,
}) {
  const href = buildGeneralLedgerUrl(workspaceId, { accountId, from, to });

  if (!href || !accountId) {
    return <span className={className}>{name || '—'}</span>;
  }

  return (
    <Link
      to={href}
      className={cn(
        'inline-flex items-center gap-1 font-medium text-primary hover:underline underline-offset-2',
        className,
      )}
      title="View general ledger for this account"
      onClick={(e) => e.stopPropagation()}
    >
      <span>{name || '—'}</span>
      {showIcon ? <ChevronRight className="size-3.5 opacity-60 shrink-0" /> : null}
    </Link>
  );
}
