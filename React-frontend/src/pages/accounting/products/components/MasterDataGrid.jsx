import { useMemo, useState } from 'react';
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Ban,
  CheckCircle2,
  Edit3,
  EllipsisVertical,
  Plus,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import {
  DataGridTable,
  DataGridTableRowSelect,
  DataGridTableRowSelectAll,
} from '@/components/ui/data-grid-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { productsApi } from '@/components/workspace/product/api/products.api';

const BULK_API = {
  category: productsApi.bulkCategories,
  brand: productsApi.bulkBrands,
  unit: productsApi.bulkUnits,
};

const LABELS = {
  category: 'category',
  brand: 'brand',
  unit: 'unit',
};

function StatusBadge({ active }) {
  return active !== false ? (
    <Badge variant="outline" className="rounded-full bg-emerald-50 text-emerald-700 border-emerald-200">
      Active
    </Badge>
  ) : (
    <Badge variant="outline" className="rounded-full bg-muted text-muted-foreground">
      Inactive
    </Badge>
  );
}

function formatFactor(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return '';
  return Number.isInteger(v) ? String(v) : v.toString();
}

export function MasterDataGrid({
  kind,
  rows = [],
  onEdit,
  onDelete,
  onRefresh,
  emptyLabel,
  onAdd,
  addLabel,
  headerNote,
}) {
  const [rowSelection, setRowSelection] = useState({});
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const selectable = kind !== 'unit';
  const showStatus = kind !== 'unit';

  const selectedIds = useMemo(() => {
    return Object.keys(rowSelection)
      .filter((k) => rowSelection[k])
      .map((k) => Number(k))
      .filter((id) => Number.isFinite(id) && id > 0);
  }, [rowSelection]);

  const selectedCount = selectedIds.length;

  const runBulk = async (action) => {
    if (!selectedIds.length) return;
    setBulkBusy(true);
    try {
      const res = await BULK_API[kind]({ ids: selectedIds, action });
      toast.success(res.data?.message || 'Bulk action completed');
      setRowSelection({});
      onRefresh?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Bulk action failed');
    } finally {
      setBulkBusy(false);
      setConfirmBulkDelete(false);
    }
  };

  const columns = useMemo(() => {
    const cols = [
      {
        id: 'select',
        accessorKey: 'id',
        header: () => <DataGridTableRowSelectAll size="sm" />,
        cell: ({ row }) => <DataGridTableRowSelect row={row} size="sm" />,
        enableSorting: false,
        size: 44,
        meta: { cellClassName: 'ps-3' },
      },
    ];

    if (kind === 'unit') {
      cols.push(
        {
          id: 'unit',
          header: 'Unit',
          cell: ({ row }) => {
            const r = row.original;
            const isBuiltin = r.is_builtin || r.id == null;
            return (
              <div>
                <div className="font-medium">{r.label || r.name}</div>
                {!isBuiltin && r.conversion_label ? (
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {r.conversion_label}
                  </div>
                ) : null}
              </div>
            );
          },
          size: 200,
        },
        {
          id: 'conversion',
          header: 'Conversion',
          cell: ({ row }) => {
            const r = row.original;
            const hasConversion =
              r.base_unit_key &&
              Number(r.factor_to_base) > 0 &&
              r.base_unit_label &&
              r.base_unit_key !== r.key;
            return hasConversion ? (
              <span className="text-sm">
                <span className="font-medium">1 {r.label || r.name}</span>
                <span className="text-muted-foreground"> = </span>
                <span className="font-medium">
                  {formatFactor(r.factor_to_base)} {r.base_unit_label}
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                Base / standalone
              </span>
            );
          },
          size: 220,
        },
      );
    } else {
      cols.push({
        accessorKey: 'name',
        header: kind === 'category' ? 'Category' : 'Brand',
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
        size: 180,
      });
      if (kind === 'category') {
        cols.push({
          accessorKey: 'code',
          header: 'Code',
          cell: ({ row }) => (
            <span className="font-mono text-xs text-muted-foreground">{row.original.code || '—'}</span>
          ),
          size: 100,
        });
      }
      if (showStatus) {
        cols.push({
          id: 'status',
          header: 'Status',
          cell: ({ row }) => <StatusBadge active={row.original.is_active} />,
          size: 90,
        });
      }
    }

    cols.push({
      accessorKey: 'products_count',
      header: 'Products',
      cell: ({ row }) => (
        <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary tabular-nums">
          {row.original.products_count ?? 0}
        </span>
      ),
      size: 90,
    });

    cols.push({
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      enableSorting: false,
      cell: ({ row }) => {
        const canMutate = row.original.id != null;
        if (!canMutate) return <span className="text-xs text-muted-foreground">Built-in</span>;
        return (
          <div className="flex items-center justify-end gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              title="Edit"
              onClick={() => onEdit?.(row.original)}
            >
              <Edit3 className="size-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" mode="icon" size="sm" className="size-8">
                  <EllipsisVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit?.(row.original)}>
                  <Edit3 className="size-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => onDelete?.(row.original)}
                >
                  <Trash2 className="size-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
      size: 100,
    });

    return cols;
  }, [kind, onEdit, onDelete, showStatus]);

  const table = useReactTable({
    data: rows,
    columns,
    state: { rowSelection },
    enableRowSelection: (row) => row.original.id != null,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => (row.id != null ? String(row.id) : `builtin-${row.value ?? row.key ?? 'x'}`),
  });

  if (!rows?.length) {
    return (
      <div className={cn(headerNote && 'p-4 pt-3')}>
        {headerNote}
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground mb-3">{emptyLabel}</p>
          {onAdd && (
            <Button size="sm" onClick={onAdd}>
              <Plus className="size-4 mr-1" /> {addLabel}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-0', headerNote && 'p-4 pt-3')}>
      {headerNote}

      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-4 py-3 mb-3 mx-4 mt-3">
          <span className="text-sm font-medium">{selectedCount} selected</span>
          <div className="flex flex-wrap gap-2 ms-auto">
            {selectable && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={bulkBusy}
                  onClick={() => runBulk('activate')}
                >
                  <CheckCircle2 className="size-4 mr-1" />
                  Set active
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={bulkBusy}
                  onClick={() => runBulk('deactivate')}
                >
                  <Ban className="size-4 mr-1" />
                  Set inactive
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="destructive"
              disabled={bulkBusy}
              onClick={() => setConfirmBulkDelete(true)}
            >
              <Trash2 className="size-4 mr-1" />
              Delete selected
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setRowSelection({})}
              disabled={bulkBusy}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      <DataGrid
        table={table}
        recordCount={rows.length}
        tableLayout={{
          cellBorder: true,
          rowBorder: true,
          headerBackground: true,
          headerBorder: true,
          columnsVisibility: false,
        }}
      >
        <CardTable className="p-0">
          <ScrollArea>
            <DataGridTable />
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardTable>
      </DataGrid>

      <ConfirmDialog
        open={confirmBulkDelete}
        title={`Delete ${selectedCount} ${LABELS[kind]}(s)?`}
        description="Items in use by products may be skipped or marked inactive."
        confirmLabel="Delete all"
        confirmVariant="destructive"
        onConfirm={() => runBulk('delete')}
        onCancel={() => setConfirmBulkDelete(false)}
        isLoading={bulkBusy}
      />
    </div>
  );
}
