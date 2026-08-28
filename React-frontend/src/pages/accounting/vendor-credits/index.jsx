import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useParams } from "react-router";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from "@tanstack/react-table";
import { arrayMove } from "@dnd-kit/sortable";
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  Eye,
  EllipsisVertical,
  Filter,
  Loader2,
  Settings2,
  X,
  Calendar as CalendarIcon,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { vendorCreditsApi } from "./api/vendor-credits.api";
import {
  formatCurrency,
  STATUS_COLORS,
  APPROVAL_COLORS,
  VC_STATUSES,
} from "./constants";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
  CardTable,
  CardToolbar,
} from "@/components/ui/card";
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridColumnVisibility } from "@/components/ui/data-grid-column-visibility";
import { DataGridTableDnd } from "@/components/ui/data-grid-table-dnd";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useDataGridColumnPreferences } from "@/hooks/use-data-grid-column-preferences";
import { VendorCreditCreateDialog } from "./components/VendorCreditCreateDialog";
import { VendorCreditEditDialog } from "./components/VendorCreditEditDialog";

const DEFAULT_COLUMN_ORDER = [
  "credit_date",
  "credit_number",
  "vendor",
  "total",
  "remaining",
  "status",
  "approval_status",
  "actions",
];

const DEFAULT_SORTING = [{ id: "credit_date", desc: true }];

export function VendorCreditsPage() {
  const { id: workspaceId } = useParams();
  const base = `/workspace/${workspaceId}/accounting/vendor-credits`;

  const columnPrefsKey = `erp:vendor-credits:columns:${workspaceId ?? "default"}`;
  const {
    columnOrder,
    setColumnOrder,
    columnVisibility,
    setColumnVisibility,
    sorting,
    setSorting,
    columnPinning,
    setColumnPinning,
  } = useDataGridColumnPreferences(columnPrefsKey, DEFAULT_COLUMN_ORDER, {
    defaultSorting: DEFAULT_SORTING,
  });

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [canCreate, setCanCreate] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 50,
    total: 0,
    lastPage: 1,
  });
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    dateFrom: "",
    dateTo: "",
  });

  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchInput.trim() }));
      setPagination((p) => ({ ...p, page: 1 }));
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, per_page: pagination.perPage };
      if (filters.search) params.search = filters.search;
      if (filters.status && filters.status !== "all") params.status = filters.status;
      if (filters.dateFrom) params.date_from = filters.dateFrom;
      if (filters.dateTo) params.date_to = filters.dateTo;

      const res = await vendorCreditsApi.list(params);
      const items = res.data?.data ?? [];
      const meta = res.data?.meta ?? {};
      setRows(Array.isArray(items) ? items : []);
      setPagination((p) => ({
        ...p,
        total: meta.total ?? items.length,
        lastPage: meta.last_page ?? 1,
      }));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load debit notes");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.perPage, filters]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  useEffect(() => {
    vendorCreditsApi
      .formOptions()
      .then((res) => setCanCreate(!!res.data?.data?.can_create))
      .catch(() => {});
  }, []);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setIsDeleting(true);
    try {
      await vendorCreditsApi.delete(confirmDelete.id);
      toast.success("Debit note deleted");
      setConfirmDelete(null);
      fetchRows();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not delete debit note");
    } finally {
      setIsDeleting(false);
    }
  };

  const resetFilters = () => {
    setFilters({ search: "", status: "all", dateFrom: "", dateTo: "" });
    setSearchInput("");
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setColumnOrder((order) => {
        const oldIndex = order.indexOf(active.id);
        const newIndex = order.indexOf(over.id);
        if (oldIndex < 0 || newIndex < 0) return order;
        return arrayMove(order, oldIndex, newIndex);
      });
    }
  }, []);

  const columns = useMemo(
    () => [
      {
        id: "credit_date",
        accessorKey: "credit_date",
        header: ({ column }) => (
          <DataGridColumnHeader title="Date" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.credit_date_display || row.original.credit_date || "—"}
          </span>
        ),
        size: 110,
        enableSorting: true,
        enableHiding: true,
        enableResizing: true,
        meta: {
          headerTitle: "Date",
          skeleton: <Skeleton className="h-5 w-20" />,
        },
      },
      {
        id: "credit_number",
        accessorKey: "credit_number",
        header: ({ column }) => (
          <DataGridColumnHeader title="Debit Note #" column={column} />
        ),
        cell: ({ row }) => (
          <Link
            to={`${base}/${row.original.id}`}
            className="font-medium font-mono text-sm text-primary hover:underline"
          >
            {row.original.credit_number || '—'}
          </Link>
        ),
        size: 140,
        enableSorting: true,
        enableHiding: false,
        enableResizing: true,
        meta: {
          headerTitle: "Debit Note #",
          skeleton: <Skeleton className="h-5 w-24" />,
        },
      },
      {
        id: "vendor",
        accessorFn: (row) => row.vendor?.name || "",
        header: ({ column }) => (
          <DataGridColumnHeader title="Vendor" column={column} />
        ),
        cell: ({ row }) => (
          <span className="font-medium text-sm truncate">
            {row.original.vendor?.name || "—"}
          </span>
        ),
        size: 200,
        enableSorting: true,
        enableHiding: true,
        enableResizing: true,
        meta: {
          headerTitle: "Vendor",
          skeleton: <Skeleton className="h-5 w-28" />,
        },
      },
      {
        id: "total",
        accessorKey: "total",
        header: ({ column }) => (
          <DataGridColumnHeader title="Amount" column={column} />
        ),
        cell: ({ row }) => (
          <span className="font-medium text-sm tabular-nums">
            {formatCurrency(row.original.total, row.original.currency)}
          </span>
        ),
        size: 120,
        enableSorting: true,
        enableHiding: true,
        enableResizing: true,
        meta: {
          headerTitle: "Amount",
          cellClassName: "text-end",
          skeleton: <Skeleton className="h-5 w-16 ms-auto" />,
        },
      },
      {
        id: "remaining",
        accessorKey: "remaining_amount",
        header: ({ column }) => (
          <DataGridColumnHeader title="Remaining" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-sm tabular-nums">
            {formatCurrency(row.original.remaining_amount, row.original.currency)}
          </span>
        ),
        size: 120,
        enableSorting: true,
        enableHiding: true,
        enableResizing: true,
        meta: {
          headerTitle: "Remaining",
          cellClassName: "text-end",
          skeleton: <Skeleton className="h-5 w-16 ms-auto" />,
        },
      },
      {
        id: "status",
        accessorKey: "status",
        header: ({ column }) => (
          <DataGridColumnHeader title="Status" column={column} />
        ),
        cell: ({ row }) => {
          const s = row.original.status || "draft";
          return (
            <Badge
              variant="outline"
              className={cn("capitalize", STATUS_COLORS[s] || "")}
            >
              {s}
            </Badge>
          );
        },
        size: 110,
        enableSorting: true,
        enableHiding: true,
        enableResizing: false,
        meta: {
          headerTitle: "Status",
          skeleton: <Skeleton className="h-6 w-16" />,
        },
      },
      {
        id: "approval_status",
        accessorKey: "approval_status",
        header: ({ column }) => (
          <DataGridColumnHeader title="Approval" column={column} />
        ),
        cell: ({ row }) => {
          const s = row.original.approval_status || "approved";
          return (
            <Badge
              variant="outline"
              className={cn("capitalize", APPROVAL_COLORS[s] || "")}
            >
              {s}
            </Badge>
          );
        },
        size: 110,
        enableSorting: true,
        enableHiding: true,
        enableResizing: false,
        meta: {
          headerTitle: "Approval",
          skeleton: <Skeleton className="h-6 w-16" />,
        },
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        enableSorting: false,
        enableHiding: false,
        enableResizing: false,
        cell: ({ row }) => {
          const vc = row.original;
          const canEdit = vc.flags?.can_edit !== false;
          const canDelete = vc.flags?.can_delete !== false;
          return (
            <div className="flex items-center justify-end gap-0.5">
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                title="View debit note"
                asChild
              >
                <Link to={`${base}/${vc.id}`}>
                  <Eye className="size-4" />
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    mode="icon"
                    size="sm"
                    className="size-8"
                    title="More actions"
                  >
                    <EllipsisVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem asChild>
                    <Link to={`${base}/${vc.id}`}>
                      <Eye className="size-4 mr-2" /> View
                    </Link>
                  </DropdownMenuItem>
                  {canEdit && (
                    <DropdownMenuItem onClick={() => setEditId(vc.id)}>
                      <Edit3 className="size-4 mr-2" /> Edit
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setConfirmDelete(vc)}
                      >
                        <Trash2 className="size-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
        size: 88,
        meta: { headerTitle: "Actions" },
      },
    ],
    [base],
  );

  const table = useReactTable({
    columns,
    data: rows,
    pageCount: pagination.lastPage,
    state: {
      pagination: {
        pageIndex: pagination.page - 1,
        pageSize: pagination.perPage,
      },
      sorting,
      columnOrder,
      columnVisibility,
      columnPinning,
    },
    onSortingChange: setSorting,
    onColumnOrderChange: setColumnOrder,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnPinningChange: setColumnPinning,
    onPaginationChange: (updater) => {
      const newState =
        typeof updater === "function"
          ? updater({
              pageIndex: pagination.page - 1,
              pageSize: pagination.perPage,
            })
          : updater;
      setPagination((p) => ({
        ...p,
        page: newState.pageIndex + 1,
        perPage: newState.pageSize,
      }));
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    getRowId: (row) => String(row.id),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Debit notes"
        subtitle="Record supplier credits (debit notes) for returns and adjustments; apply them when paying bills."
        actions={
          canCreate && (
            <Button size="sm" variant="mono" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4 mr-1" /> Create debit note
            </Button>
          )
        }
      />

      <Card>
        <CardHeader className="py-3 border-b flex-col items-stretch gap-3">
          <div className="flex items-center justify-between gap-2 w-full">
            <CardTitle className="text-base font-semibold">All debit notes</CardTitle>
            <DataGridColumnVisibility
              table={table}
              trigger={
                <Button variant="outline" size="sm" className="h-9">
                  <Settings2 className="size-4" />
                  Columns
                </Button>
              }
            />
          </div>
          <CardToolbar className="w-full flex-col xl:flex-row gap-3 p-0 border-0 min-h-0">
            <div className="relative flex-1 min-w-0 sm:max-w-md">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search debit note # or vendor…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="h-9 pl-9 pr-9"
              />
              {searchInput ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 size-9"
                  onClick={() => {
                    setSearchInput("");
                    setFilters((f) => ({ ...f, search: "" }));
                  }}
                >
                  <X className="size-4" />
                </Button>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-9 w-40 justify-start text-left font-normal",
                      !filters.dateFrom && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateFrom
                      ? format(new Date(filters.dateFrom), "dd/MM/yyyy")
                      : "From date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={
                      filters.dateFrom ? new Date(filters.dateFrom) : undefined
                    }
                    onSelect={(date) => {
                      setFilters((f) => ({
                        ...f,
                        dateFrom: date ? format(date, "yyyy-MM-dd") : "",
                      }));
                      setPagination((p) => ({ ...p, page: 1 }));
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-9 w-40 justify-start text-left font-normal",
                      !filters.dateTo && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateTo
                      ? format(new Date(filters.dateTo), "dd/MM/yyyy")
                      : "To date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={
                      filters.dateTo ? new Date(filters.dateTo) : undefined
                    }
                    onSelect={(date) => {
                      setFilters((f) => ({
                        ...f,
                        dateTo: date ? format(date, "yyyy-MM-dd") : "",
                      }));
                      setPagination((p) => ({ ...p, page: 1 }));
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Select
                value={filters.status}
                onValueChange={(val) => {
                  setFilters((f) => ({ ...f, status: val }));
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
              >
                <SelectTrigger className="w-36 h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {VC_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-9"
                      onClick={resetFilters}
                      title="Reset filters"
                    >
                      <Filter className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Reset filters to default values</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardToolbar>
        </CardHeader>

        <DataGrid
          table={table}
          recordCount={pagination.total}
          isLoading={loading}
          tableLayout={{
            cellBorder: true,
            rowBorder: true,
            headerBackground: true,
            headerBorder: true,
            columnsVisibility: true,
            columnsResizable: true,
            columnsPinnable: true,
            columnsMovable: true,
            columnsDraggable: true,
          }}
        >
          <CardTable>
            <ScrollArea>
              <DataGridTableDnd handleDragEnd={handleDragEnd} />
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardTable>

          <CardFooter className="border-t">
            <DataGridPagination sizes={[15, 50, 1000]} />
          </CardFooter>
        </DataGrid>
      </Card>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(v) => {
          if (!v) setConfirmDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete debit note?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <strong>{confirmDelete?.credit_number}</strong>.
              {confirmDelete?.is_posted
                ? " Its journal entry will be reversed automatically."
                : null}{" "}
              {Number(confirmDelete?.amount_applied || 0) > 0.001
                ? "This debit note has been applied to one or more bills — deleting it will also remove those vendor-credit application records and restore the affected bill(s)' outstanding balances. "
                : null}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="size-4 mr-1 animate-spin" /> Deleting…
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <VendorCreditCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={fetchRows}
      />

      <VendorCreditEditDialog
        open={editId != null}
        onOpenChange={(open) => {
          if (!open) setEditId(null);
        }}
        vendorCreditId={editId}
        onSuccess={fetchRows}
      />
    </div>
  );
}
