import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Edit3,
  EllipsisVertical,
  ExternalLink,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardFooter,
  CardHeader,
  CardTable,
  CardToolbar,
} from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/PageHeader';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { productsApi } from '@/components/workspace/product/api/products.api';
import { useProductDialog } from '@/components/workspace/product/product-dialog-provider';
import { posApi } from '@/pages/accounting/pos/api/pos.api';
import { cn } from '@/lib/utils';
import { MedicineThumb } from '../components/MedicineThumb';
import { PHARMACY_COPY } from '../copy';

const SEARCH_DEBOUNCE_MS = 300;

function unwrapPage(res) {
  const rows = Array.isArray(res?.data?.data) ? res.data.data : [];
  const meta = res?.data?.meta || {};
  return {
    rows,
    page: Number(meta.current_page ?? 1),
    total: Number(meta.total ?? rows.length),
    lastPage: Number(meta.last_page ?? 1),
  };
}

function isAbortError(err) {
  return (
    err?.code === 'ERR_CANCELED' ||
    err?.name === 'CanceledError' ||
    err?.name === 'AbortError' ||
    err?.message === 'canceled'
  );
}

function money(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function stockClass(row) {
  const stock = Number(row.current_stock ?? row.quantity_on_hand ?? 0);
  const reorder = Number(row.reorder_level ?? 0);
  if (stock <= 0) return 'text-destructive font-semibold';
  if (reorder > 0 && stock <= reorder) return 'text-amber-600 font-semibold';
  return 'text-emerald-700 font-medium';
}

function imageSrc(row) {
  return (
    row.primary_image_url ||
    row.image_url ||
    row.thumbnail_url ||
    (typeof row.image === 'string' && row.image.startsWith('http') ? row.image : null) ||
    null
  );
}

const MedicineNameCell = memo(function MedicineNameCell({ row, onEdit }) {
  return (
    <button
      type="button"
      onClick={() => onEdit(row)}
      className="flex min-w-0 items-center gap-3 text-left"
    >
      <MedicineThumb src={imageSrc(row)} alt={row.name} size="sm" />
      <span className="min-w-0">
        <span className="line-clamp-2 font-medium text-foreground hover:text-primary">
          {row.name}
        </span>
        {row.sku ? (
          <span className="mt-0.5 block font-mono text-[11px] uppercase text-muted-foreground">
            {row.sku}
          </span>
        ) : null}
      </span>
    </button>
  );
});

const MedicineActionsCell = memo(function MedicineActionsCell({
  row,
  onEdit,
  onDelete,
}) {
  return (
    <div className="flex items-center justify-end gap-0.5">
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        title="Edit"
        onClick={() => onEdit(row)}
      >
        <Edit3 className="size-4" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" mode="icon" size="sm" className="size-8">
            <EllipsisVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => onEdit(row)}>
            <Edit3 className="size-4 mr-2" />
            Edit medicine
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => onDelete(row)}
          >
            <Trash2 className="size-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});

export function MedicinesPage() {
  const { id: companyId } = useParams();
  const productDialog = useProductDialog();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const abortRef = useRef(null);
  const hasLoadedOnce = useRef(false);
  const searchRef = useRef(search);
  const queryRef = useRef({ search, page, perPage });
  searchRef.current = search;
  queryRef.current = { search, page, perPage };

  const load = useCallback(async (overrides = {}) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const nextSearch = overrides.search ?? queryRef.current.search;
    const nextPage = overrides.page ?? queryRef.current.page;
    const nextPerPage = overrides.perPage ?? queryRef.current.perPage;

    setLoading(true);
    try {
      // POS catalog is tuned for 7k+ pharmacy SKUs: scoped stock, lighter payload.
      const res = await posApi.catalog(
        {
          search: nextSearch || undefined,
          per_page: Math.min(100, Math.max(1, nextPerPage)),
          page: nextPage,
          is_active: 1,
        },
        { signal: controller.signal },
      );
      if (controller.signal.aborted) return;

      const parsed = unwrapPage(res);
      setRows(parsed.rows);
      setTotal(parsed.total);
      setLastPage(parsed.lastPage);
      setPage(parsed.page || nextPage);
      hasLoadedOnce.current = true;
    } catch (err) {
      if (isAbortError(err) || controller.signal.aborted) return;
      toast.error('Could not load medicines');
      if (!hasLoadedOnce.current) setRows([]);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load({ search, page, perPage });
    return () => abortRef.current?.abort();
  }, [load, search, page, perPage]);

  useEffect(() => {
    const next = inputValue.trim();
    const delay = next === '' ? 0 : SEARCH_DEBOUNCE_MS;
    const t = setTimeout(() => {
      if (searchRef.current === next) return;
      setPage(1);
      setSearch(next);
    }, delay);
    return () => clearTimeout(t);
  }, [inputValue]);

  const openCreate = useCallback(() => {
    productDialog?.openCreate?.({
      skipTypePicker: true,
      type: 'inventory',
      onSuccess: () => load(),
    });
  }, [load, productDialog]);

  const openEdit = useCallback(
    (row) => {
      productDialog?.openEdit?.(row, { onSuccess: () => load() });
    },
    [load, productDialog],
  );

  const requestDelete = useCallback((row) => {
    setConfirmDelete(row);
  }, []);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await productsApi.delete(confirmDelete.id);
      toast.success('Medicine deleted');
      setConfirmDelete(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Medicine',
        cell: ({ row }) => (
          <MedicineNameCell row={row.original} onEdit={openEdit} />
        ),
        size: 280,
      },
      {
        id: 'generic',
        header: 'Generic / strength',
        cell: ({ row }) => {
          const pharmacy = row.original.pharmacy || {};
          const generic = pharmacy.generic_name || '—';
          const strength = pharmacy.strength_text;
          return (
            <div className="min-w-0">
              <div className="truncate text-sm text-foreground">{generic}</div>
              {strength ? (
                <div className="truncate text-xs text-muted-foreground">{strength}</div>
              ) : null}
            </div>
          );
        },
        size: 200,
      },
      {
        id: 'form',
        header: 'Form',
        cell: ({ row }) => {
          const form =
            row.original.pharmacy?.dosage_form?.name ||
            row.original.pharmacy?.dosage_form_name ||
            row.original.unit_label ||
            row.original.unit ||
            '—';
          return <span className="text-sm text-muted-foreground">{form}</span>;
        },
        size: 100,
      },
      {
        id: 'maker',
        header: 'Manufacturer',
        cell: ({ row }) => {
          const maker =
            row.original.pharmacy?.manufacturer?.name ||
            row.original.pharmacy?.manufacturer_name ||
            row.original.manufacturer ||
            '—';
          return <span className="block max-w-[140px] truncate text-sm">{maker}</span>;
        },
        size: 140,
      },
      {
        accessorKey: 'barcode',
        header: 'Barcode',
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.barcode || '—'}
          </span>
        ),
        size: 130,
      },
      {
        id: 'stock',
        header: 'Stock',
        cell: ({ row }) => {
          const stock = Number(
            row.original.current_stock ?? row.original.quantity_on_hand ?? 0,
          );
          return (
            <span className={cn('text-sm tabular-nums', stockClass(row.original))}>
              {Number.isFinite(stock) ? stock : '—'}
            </span>
          );
        },
        size: 80,
        meta: { headerClassName: 'text-right', cellClassName: 'text-right' },
      },
      {
        accessorKey: 'unit_price',
        header: 'Retail',
        cell: ({ row }) => (
          <span className="text-sm tabular-nums">{money(row.original.unit_price)}</span>
        ),
        size: 100,
        meta: { headerClassName: 'text-right', cellClassName: 'text-right' },
      },
      {
        accessorKey: 'mrp',
        header: 'MRP',
        cell: ({ row }) => (
          <span className="text-sm tabular-nums text-muted-foreground">
            {money(row.original.mrp)}
          </span>
        ),
        size: 100,
        meta: { headerClassName: 'text-right', cellClassName: 'text-right' },
      },
      {
        id: 'rx',
        header: 'Rx',
        cell: ({ row }) =>
          row.original.pharmacy?.prescription_required ? (
            <Badge
              variant="outline"
              className="rounded-full border-violet-200 bg-violet-50 text-[10px] text-violet-800"
            >
              Rx
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">OTC</span>
          ),
        size: 70,
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => (
          <MedicineActionsCell
            row={row.original}
            onEdit={openEdit}
            onDelete={requestDelete}
          />
        ),
        size: 90,
        meta: { headerClassName: 'text-right', cellClassName: 'text-right' },
      },
    ],
    [openEdit, requestDelete],
  );

  const table = useReactTable({
    data: rows,
    columns,
    pageCount: lastPage,
    state: {
      pagination: {
        pageIndex: page - 1,
        pageSize: perPage,
      },
    },
    onPaginationChange: (updater) => {
      const next =
        typeof updater === 'function'
          ? updater({
              pageIndex: page - 1,
              pageSize: perPage,
            })
          : updater;
      setPage(next.pageIndex + 1);
      setPerPage(Math.min(100, Math.max(1, next.pageSize)));
    },
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    getRowId: (row) => String(row.id),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={PHARMACY_COPY.products}
        subtitle="Search by barcode, brand, generic, or strength — same workspace catalog as Products."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to={`/workspace/${companyId}/accounting/products`}>
                <ExternalLink className="size-3.5 mr-1.5" />
                Full product tools
              </Link>
            </Button>
            <Button size="sm" variant="mono" onClick={openCreate}>
              <Plus className="size-4 mr-1" />
              New medicine
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader className="flex-col gap-3 border-b py-3 sm:flex-row sm:items-center sm:flex-nowrap">
          <div className="min-w-0">
            <div className="text-sm font-medium text-foreground">Catalogue</div>
            <p className="text-xs text-muted-foreground">
              {total.toLocaleString()} medicine
              {total === 1 ? '' : 's'}
              {search ? ` matching “${search}”` : ''}
            </p>
          </div>
          <CardToolbar className="w-full sm:ms-auto sm:w-auto">
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <div className="relative w-full sm:w-[280px]">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-9 pl-9 pr-9"
                  placeholder="Search medicines…"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  autoFocus
                />
                {inputValue ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 size-9"
                    onClick={() => setInputValue('')}
                  >
                    <X className="size-4" />
                  </Button>
                ) : null}
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-9 shrink-0"
                title="Refresh"
                disabled={loading}
                onClick={() => load()}
              >
                <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
              </Button>
            </div>
          </CardToolbar>
        </CardHeader>

        <DataGrid
          table={table}
          recordCount={total}
          isLoading={loading && !hasLoadedOnce.current}
          tableLayout={{
            cellBorder: true,
            rowBorder: true,
            headerBackground: true,
            headerBorder: true,
            columnsVisibility: false,
          }}
        >
          <CardTable>
            <ScrollArea>
              <DataGridTable />
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardTable>
          <CardFooter className="border-t">
            <DataGridPagination sizes={[25, 50, 100]} />
          </CardFooter>
        </DataGrid>
      </Card>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete medicine?"
        description={`Remove ${confirmDelete?.name || 'this medicine'}?`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
        isLoading={deleting}
      />
    </div>
  );
}
