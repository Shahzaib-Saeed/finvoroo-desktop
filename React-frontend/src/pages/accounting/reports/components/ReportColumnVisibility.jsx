import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isReportCustomFieldColumn } from "./ReportCustomFieldDisplay";

function ColumnCheckboxItem({ col, isColumnVisible, onToggle }) {
  return (
    <DropdownMenuCheckboxItem
      checked={isColumnVisible(col.id)}
      onSelect={(event) => event.preventDefault()}
      onCheckedChange={(checked) => onToggle(col.id, !!checked)}
    >
      {col.master_label || col.label || col.id}
    </DropdownMenuCheckboxItem>
  );
}

export function ReportColumnVisibility({
  columns,
  isColumnVisible,
  onToggle,
  trigger,
  onResetColumnWidths,
}) {
  const toggleable = columns.filter((col) => col.can_hide !== false);
  const standardColumns = toggleable.filter(
    (col) => !isReportCustomFieldColumn(col),
  );
  const customFieldColumns = toggleable.filter((col) =>
    isReportCustomFieldColumn(col),
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 rounded-sm border-slate-300 px-2.5 text-xs font-medium shadow-none"
          >
            <Settings2 className="size-3.5 text-slate-500" />
            Columns
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[220px] max-h-[360px] overflow-y-auto">
        <DropdownMenuLabel className="font-medium">Toggle columns</DropdownMenuLabel>
        {standardColumns.map((col) => (
          <ColumnCheckboxItem
            key={col.id}
            col={col}
            isColumnVisible={isColumnVisible}
            onToggle={onToggle}
          />
        ))}
        {customFieldColumns.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Custom fields
            </DropdownMenuLabel>
            {customFieldColumns.map((col) => (
              <ColumnCheckboxItem
                key={col.id}
                col={col}
                isColumnVisible={isColumnVisible}
                onToggle={onToggle}
              />
            ))}
          </>
        ) : null}
        {onResetColumnWidths ? (
          <>
            <DropdownMenuSeparator />
            <p className="px-2 py-1.5 text-[11px] leading-snug text-muted-foreground">
              Drag a column’s right edge to change width. Unused custom fields can be turned off above.
            </p>
            <DropdownMenuItem
              className="text-xs text-slate-600"
              onSelect={() => onResetColumnWidths()}
            >
              Reset column widths
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
