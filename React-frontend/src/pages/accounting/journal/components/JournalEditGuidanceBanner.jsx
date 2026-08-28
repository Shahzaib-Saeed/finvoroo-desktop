import { ExternalLink, Info } from 'lucide-react';
import { Link } from 'react-router';
import { getJournalEditBlockedMessage, getJournalEditGuidance } from '../journal-source-links';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Explains why a journal cannot be edited inline and links to the correct screen.
 */
export function JournalEditGuidanceBanner({ entry, workspaceId, className }) {
  const guidance = getJournalEditGuidance(entry, workspaceId);
  const message = getJournalEditBlockedMessage(entry);
  const flags = entry?.flags || {};
  const canEdit = flags.can_edit === true;

  if (canEdit && guidance.length === 0) {
    return null;
  }

  if (!message && guidance.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-4 dark:border-amber-900/50 dark:bg-amber-950/20',
        className,
      )}
    >
      <div className="flex gap-3">
        <Info className="size-5 shrink-0 text-amber-700 dark:text-amber-400 mt-0.5" />
        <div className="min-w-0 flex-1 space-y-3">
          {message ? (
            <p className="text-sm leading-relaxed text-amber-950 dark:text-amber-100">{message}</p>
          ) : null}
          {guidance.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {guidance.map((link) => {
                const Icon = link.icon;
                return (
                  <Button key={`${link.kind}-${link.id || link.href}`} variant="outline" size="sm" asChild>
                    <Link to={link.href}>
                      <Icon className="size-4 mr-1.5" />
                      {link.label}
                      <ExternalLink className="size-3.5 ml-1.5 opacity-60" />
                    </Link>
                  </Button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
