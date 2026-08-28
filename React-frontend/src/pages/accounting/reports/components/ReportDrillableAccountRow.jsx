import { useNavigate } from 'react-router';
import { TableRow } from '@/components/ui/table';
import { buildAccountStatementUrl } from '../report-drilldown';
import { cn } from '@/lib/utils';

/**
 * Table row that navigates to the account statement when clicked.
 */
export function ReportDrillableAccountRow({
  workspaceId,
  accountId,
  from,
  to,
  className,
  children,
  ...props
}) {
  const navigate = useNavigate();
  const href = buildAccountStatementUrl(workspaceId, { accountId, from, to });
  const clickable = Boolean(href && accountId);

  const handleKeyDown = (event) => {
    if (!clickable) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      navigate(href);
    }
  };

  return (
    <TableRow
      {...props}
      className={cn(
        clickable &&
          "group/drill cursor-pointer transition-colors hover:bg-slate-100/80 print:cursor-auto print:hover:bg-transparent",
        className,
      )}
      title={clickable ? "View posted transactions for this account" : undefined}
      role={clickable ? "link" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? () => navigate(href) : undefined}
      onKeyDown={clickable ? handleKeyDown : undefined}
    >
      {children}
    </TableRow>
  );
}
