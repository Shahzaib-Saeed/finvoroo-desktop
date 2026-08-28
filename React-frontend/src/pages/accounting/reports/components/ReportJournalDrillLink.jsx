import { Link } from 'react-router';
import { buildJournalEntryUrl } from '../report-drilldown';
import { cn } from '@/lib/utils';

/**
 * Clickable journal reference — opens the source journal entry.
 */
export function ReportJournalDrillLink({ workspaceId, journalEntryId, label, className }) {
  const href = buildJournalEntryUrl(workspaceId, journalEntryId);
  const text = label || (journalEntryId ? `#${journalEntryId}` : '—');

  if (!href) {
    return <span className={className}>{text}</span>;
  }

  return (
    <Link
      to={href}
      className={cn(
        'font-mono text-xs text-primary hover:underline underline-offset-2',
        className,
      )}
      title="View source journal entry"
    >
      {text}
    </Link>
  );
}
