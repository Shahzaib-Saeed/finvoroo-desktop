import { DocumentDrillLink } from "@/components/workspace/invoice/components/DocumentDrillLink";
import { buildJournalLineSourceUrl } from "../report-drilldown";
import { cn } from "@/lib/utils";

/**
 * Clickable reference that opens the source document (invoice, bill, payment, etc.).
 * Does not link to the journal entry when a source document is known.
 */
export function ReportJournalSourceDrillLink({
  workspaceId,
  row,
  label,
  className,
}) {
  const href = buildJournalLineSourceUrl(workspaceId, row);
  const text = label ?? "—";

  if (!href) {
    return <span className={className}>{text}</span>;
  }

  return (
    <DocumentDrillLink
      workspaceId={workspaceId}
      href={href}
      row={row}
      navigateToPage
      className={cn(
        "font-mono text-xs text-primary hover:underline underline-offset-2",
        className,
      )}
      title="View source transaction"
    >
      {text}
    </DocumentDrillLink>
  );
}
