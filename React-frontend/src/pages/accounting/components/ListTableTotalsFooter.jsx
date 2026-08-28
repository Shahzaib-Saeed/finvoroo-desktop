import { useDataGrid } from "@/components/ui/data-grid";
import {
  DataGridTableFoot,
  DataGridTableFooterCell,
  DataGridTableFooterRow,
} from "@/components/ui/data-grid-table";

/**
 * Table footer row aligned to list columns — shows total amount & balance due.
 *
 * @param {object} props
 * @param {{ total_amount: number, balance_due: number, count: number, currency?: string|null }} props.summary
 * @param {(amount: number, currency?: string|null) => string} props.formatCurrency
 * @param {string} [props.labelColumnId='customer'] — column id for the "Total (N)" label
 * @param {string} [props.totalLabel='Total']
 */
export function ListTableTotalsFooter({
  summary,
  formatCurrency,
  labelColumnId = "customer",
  totalLabel = "Total",
}) {
  const { table } = useDataGrid();
  const columns = table.getVisibleFlatColumns();

  if (!summary.count && summary.total_amount <= 0 && summary.balance_due <= 0) {
    return null;
  }

  return (
    <DataGridTableFoot>
      <DataGridTableFooterRow>
        {columns.map((column) => {
          const id = column.id;
          let content = null;
          let className = "";

          if (id === labelColumnId) {
            content = (
              <span className="inline-flex items-baseline gap-1.5">
                <span className="font-semibold text-foreground">{totalLabel}</span>
                {summary.count > 0 ? (
                  <span className="text-xs font-normal text-muted-foreground">
                    ({summary.count})
                  </span>
                ) : null}
              </span>
            );
          } else if (id === "total" || id === "opening_balance") {
            content = formatCurrency(summary.total_amount, summary.currency);
            className = "text-end font-bold tabular-nums text-foreground";
          } else if (id === "balance_due" || id === "current_balance") {
            content = formatCurrency(summary.balance_due, summary.currency);
            className = "text-end font-semibold tabular-nums text-foreground";
          }

          return (
            <DataGridTableFooterCell
              key={id}
              column={column}
              className={className}
            >
              {content}
            </DataGridTableFooterCell>
          );
        })}
      </DataGridTableFooterRow>
    </DataGridTableFoot>
  );
}
