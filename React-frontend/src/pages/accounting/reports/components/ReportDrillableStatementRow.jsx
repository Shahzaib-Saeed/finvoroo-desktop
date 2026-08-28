import { useNavigate } from "react-router";
import { buildAccountStatementUrl } from "../report-drilldown";
import { cn } from "@/lib/utils";

/**
 * Flex/grid statement row — entire row navigates to the account statement.
 */
export function ReportDrillableStatementRow({
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
    <div
      {...props}
      className={cn(
        className,
        clickable &&
          "group/drill cursor-pointer rounded-sm transition-colors hover:bg-slate-100/80 print:cursor-auto print:hover:bg-transparent",
      )}
      title={
        clickable ? "View posted transactions for this account" : undefined
      }
      role={clickable ? "link" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? () => navigate(href) : undefined}
      onKeyDown={clickable ? handleKeyDown : undefined}
    >
      {children}
    </div>
  );
}
