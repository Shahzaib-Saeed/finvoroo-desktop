import { ReportColumnVisibility } from "./ReportColumnVisibility";

export function ReportTableToolbar({
  columns,
  isColumnVisible,
  onToggle,
  onResetColumnWidths,
  children,
}) {
  if (!columns?.length) {
    return children ? (
      <div className="no-print flex flex-wrap items-center gap-1.5">{children}</div>
    ) : null;
  }

  return (
    <div className="no-print flex flex-wrap items-center gap-1.5">
      <ReportColumnVisibility
        columns={columns}
        isColumnVisible={isColumnVisible}
        onToggle={onToggle}
        onResetColumnWidths={onResetColumnWidths}
      />
      {children}
    </div>
  );
}
