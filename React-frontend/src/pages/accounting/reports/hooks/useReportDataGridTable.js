import { useCallback, useMemo } from "react";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { usePersistedReportColumns } from "./usePersistedReportColumns";

/**
 * TanStack DataGrid reports: persisted visibility + column order + drag reorder.
 */
export function useReportDataGridTable(
  workspaceId,
  reportKey,
  columnMeta,
  buildAllColumns,
  data,
  options = {},
) {
  const {
    allColumns,
    visibleColumns,
    toggleColumn,
    isColumnVisible,
    reorderColumns,
  } = usePersistedReportColumns(workspaceId, reportKey, columnMeta);

  const columns = useMemo(() => {
    const built = buildAllColumns();
    const byId = new Map();
    for (const col of built) {
      const id = col.id ?? col.accessorKey;
      if (id) byId.set(id, { ...col, id });
    }
    return visibleColumns.map((meta) => byId.get(meta.id)).filter(Boolean);
  }, [visibleColumns, buildAllColumns]);

  const columnOrder = useMemo(
    () => visibleColumns.map((col) => col.id),
    [visibleColumns],
  );

  const table = useReactTable({
    data,
    columns,
    state: { columnOrder },
    getCoreRowModel: getCoreRowModel(),
    ...options,
  });

  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event;
      if (active?.id && over?.id) {
        reorderColumns(String(active.id), String(over.id));
      }
    },
    [reorderColumns],
  );

  return {
    table,
    allColumns,
    visibleColumns,
    toggleColumn,
    isColumnVisible,
    handleDragEnd,
  };
}
