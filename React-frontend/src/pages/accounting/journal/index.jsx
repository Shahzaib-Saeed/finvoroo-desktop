import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
} from "@tanstack/react-table";
import {
  Edit3,
  Eye,
  EllipsisVertical,
  Filter,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { journalsApi } from "./api/journals.api";
import { formatCurrency, STATUS_COLORS, TYPE_COLORS } from "./constants";
import {
  getJournalPrimarySource,
  getJournalReferenceHref,
  getJournalDisplayReference,
  getJournalEditGuidance,
  getJournalEditBlockedMessage,
} from "./journal-source-links";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardFooter,
  CardHeader,
  CardTable,
  CardToolbar,
} from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatDateTime, getUserTimezone } from "@/lib/format-datetime";
import { cn } from "@/lib/utils";

function formatJournalListDateTime(iso) {
  if (!iso) return "—";
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return String(iso);
    return new Intl.DateTimeFormat(undefined, {
      timeZone: getUserTimezone(),
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  } catch {
    return formatDateTime(iso);
  }
}

function entryDateDiffersFromCreated(createdIso, entryDateYmd) {
  if (!createdIso || !entryDateYmd) return false;
  try {
    const createdDay = new Intl.DateTimeFormat("en-CA", {
      timeZone: getUserTimezone(),
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(createdIso));
    return createdDay !== String(entryDateYmd).slice(0, 10);
  } catch {
    return false;
  }
}

export function JournalEntriesPage() {
  const { id: workspaceId } = useParams();
  const base = `/workspace/${workspaceId}/accounting/journal`;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  // Only `can_create` is a page-level (per-user) permission fetched from
  // formOptions. Per-row edit / delete permissions come from `entry.flags`
  // on each row — the backend Resource already composes ledger integrity
  // (JournalEntryLedgerGuard) with the user's ACL into a single source of
  // truth. We must NOT re-AND with a second permission source here.
  const [canCreate, setCanCreate] = useState(false);
  const [journalTypes, setJournalTypes] = useState([]);
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
    type: "all",
    date_from: "",
    date_to: "",
    visibility: "active",
  });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    journalsApi
      .formOptions()
      .then((res) => {
        const data = res.data?.data || {};
        setCanCreate(!!data.can_create);
        setJournalTypes(data.journal_types || []);
      })
      .catch(() => {});
  }, []);

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
      if (filters.status && filters.status !== "all")
        params.status = filters.status;
      if (filters.type && filters.type !== "all") params.type = filters.type;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      params.visibility = filters.visibility || "active";

      const res = await journalsApi.list(params);
      const items = res.data?.data ?? [];
      const meta = res.data?.meta ?? {};
      setRows(Array.isArray(items) ? items : []);
      setPagination((p) => ({
        ...p,
        total: meta.total ?? items.length,
        lastPage: meta.last_page ?? 1,
      }));
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to load journal entries",
      );
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.perPage, filters]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setIsDeleting(true);
    try {
      const res = await journalsApi.destroy(confirmDelete.id);
      toast.success(res.data?.message || "Journal entry deleted");
      setConfirmDelete(null);
      fetchRows();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not delete entry");
    } finally {
      setIsDeleting(false);
    }
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      status: "all",
      type: "all",
      date_from: "",
      date_to: "",
      visibility: "active",
    });
    setSearchInput("");
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: "date",
        header: "Date",
        enableSorting: false,
        cell: ({ row }) => {
          const entry = row.original;
          const createdIso = entry.created_at_iso || entry.created_at;
          const entryDate = entry.entry_date || entry.date;

          if (createdIso) {
            const showEntryDate = entryDateDiffersFromCreated(
              createdIso,
              entryDate,
            );
            return (
              <div className="min-w-[160px] py-0.5">
                <div className="text-sm font-medium tabular-nums whitespace-nowrap">
                  {formatJournalListDateTime(createdIso)}
                </div>
                {showEntryDate && entryDate ? (
                  <div className="text-xs text-muted-foreground mt-0.5 whitespace-nowrap">
                    Entry date: {entry.date || entryDate}
                  </div>
                ) : null}
              </div>
            );
          }

          return (
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {entryDate || "—"}
            </span>
          );
        },
        size: 168,
      },
      {
        accessorKey: "reference",
        header: "Reference",
        cell: ({ row }) => {
          const entry = row.original;
          const journalHref = `${base}/${entry.id}`;
          const href = getJournalReferenceHref(entry, workspaceId, journalHref);
          const ref = getJournalDisplayReference(entry);
          const internalRef = entry.reference || entry.journal_number;
          const showInternal = internalRef && ref !== internalRef;
          return (
            <Link
              to={href}
              className="text-sm font-medium text-primary hover:text-primary/80 hover:underline font-mono"
              title={
                showInternal
                  ? `Open source document (${internalRef})`
                  : href !== journalHref
                    ? "Open source document"
                    : "View journal entry"
              }
            >
              {ref}
            </Link>
          );
        },
        size: 140,
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground truncate max-w-[220px] block">
            {row.original.description || "—"}
          </span>
        ),
        size: 220,
      },
      {
        accessorKey: "type",
        header: "Type",
        meta: {
          headerClassName: "text-center",
          cellClassName: "text-center",
        },
        cell: ({ row }) => {
          const entry = row.original;
          const t = entry.type || "general";
          const primary = getJournalPrimarySource(entry, workspaceId);
          const badge = (
            <Badge
              variant="outline"
              className={cn("capitalize rounded-full", TYPE_COLORS[t] || "")}
            >
              {entry.type_label || t.replace(/_/g, " ")}
            </Badge>
          );

          if (primary) {
            return (
              <Link
                to={primary.href}
                title={`Open ${primary.shortLabel}`}
                className="inline-flex"
              >
                {badge}
              </Link>
            );
          }

          return badge;
        },
        size: 130,
      },
      {
        accessorKey: "total_debit",
        header: () => <span className="block text-right w-full">Debit</span>,
        cell: ({ row }) => (
          <span className="text-sm tabular-nums block text-right font-medium">
            {formatCurrency(row.original.total_debit, row.original.currency)}
          </span>
        ),
        size: 120,
      },
      {
        accessorKey: "total_credit",
        header: () => <span className="block text-right w-full">Credit</span>,
        cell: ({ row }) => (
          <span className="text-sm tabular-nums block text-right font-medium">
            {formatCurrency(row.original.total_credit, row.original.currency)}
          </span>
        ),
        size: 120,
      },
      {
        accessorKey: "status",
        header: "Status",
        meta: {
          headerClassName: "text-center",
          cellClassName: "text-center",
        },
        cell: ({ row }) => {
          const entry = row.original;
          const s = entry.status || "draft";
          return (
            <div className="flex flex-col items-center gap-1 py-0.5">
              <div className="flex items-center gap-1">
                <Badge
                  variant="outline"
                  className={cn("capitalize rounded-full", STATUS_COLORS[s] || "")}
                >
                  {s}
                </Badge>
                {entry.is_archived ? (
                  <Badge
                    variant="outline"
                    className="rounded-full text-slate-600 border-slate-300 bg-slate-100 dark:text-slate-300 dark:border-slate-700 dark:bg-slate-800/50"
                    title={
                      [
                        entry.deleted_source_number
                          ? `Original document: ${entry.deleted_source_number}`
                          : null,
                        entry.deleted_by_name
                          ? `Deleted by: ${entry.deleted_by_name}`
                          : null,
                        entry.deleted_at ? `Deleted on: ${entry.deleted_at}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Source document was deleted"
                    }
                  >
                    Archived
                  </Badge>
                ) : null}
              </div>
              {entry.is_archived ? (
                <div className="text-[11px] text-muted-foreground text-center leading-tight max-w-[160px]">
                  {entry.deleted_source_number
                    ? `Doc ${entry.deleted_source_number} deleted`
                    : "Source document deleted"}
                  {entry.deleted_by_name ? ` by ${entry.deleted_by_name}` : ""}
                  {entry.deleted_at ? ` on ${entry.deleted_at}` : ""}
                </div>
              ) : null}
            </div>
          );
        },
        size: 160,
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        meta: {
          headerClassName: "text-center",
          cellClassName: "text-center",
        },
        cell: ({ row }) => {
          const entry = row.original;
          // Per-row permissions come exclusively from the server-computed
          // `flags` (JournalEntryLedgerGuard + user ACL, composed in
          // JournalEntryResource). Do NOT re-AND with any client-side
          // permission source — that would duplicate the authority.
          const flags = entry.flags || {};
          const canEdit = flags.can_edit === true;
          const canDelete = flags.can_delete === true;
          const editGuidance = getJournalEditGuidance(entry, workspaceId);
          const blockedMessage = getJournalEditBlockedMessage(entry);
          const hasMenu =
            canEdit ||
            canDelete ||
            editGuidance.length > 0 ||
            !!blockedMessage;

          return (
            <div className="flex justify-center">
              <div className="inline-grid grid-cols-[2rem_2rem] items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  asChild
                  title="View journal entry"
                >
                  <Link to={`${base}/${entry.id}`}>
                    <Eye className="size-4" />
                  </Link>
                </Button>
                {hasMenu ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        mode="icon"
                        size="sm"
                        className="size-8"
                      >
                        <EllipsisVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-60">
                      {!canEdit && blockedMessage ? (
                        <div className="px-2 py-2 text-xs leading-relaxed text-muted-foreground border-b mb-1">
                          {blockedMessage}
                        </div>
                      ) : null}
                      {canEdit ? (
                        <DropdownMenuItem asChild>
                          <Link to={`${base}/${entry.id}/edit`}>
                            <Edit3 className="size-4 mr-2" /> Edit journal entry
                          </Link>
                        </DropdownMenuItem>
                      ) : null}
                      {editGuidance.map((link) => {
                        const Icon = link.icon;
                        return (
                          <DropdownMenuItem key={`${link.kind}-${link.id || link.href}`} asChild>
                            <Link to={link.href}>
                              <Icon className="size-4 mr-2" /> {link.label}
                            </Link>
                          </DropdownMenuItem>
                        );
                      })}
                      {canDelete ? (
                        <>
                          {(canEdit || editGuidance.length > 0 || blockedMessage) && (
                            <DropdownMenuSeparator />
                          )}
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setConfirmDelete(entry)}
                          >
                            <Trash2 className="size-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <span className="size-8 shrink-0" aria-hidden="true" />
                )}
              </div>
            </div>
          );
        },
        size: 100,
      },
    ],
    [base, workspaceId],
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
    },
    manualPagination: true,
    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function"
          ? updater({
              pageIndex: pagination.page - 1,
              pageSize: pagination.perPage,
            })
          : updater;
      setPagination((p) => ({
        ...p,
        page: (next.pageIndex ?? 0) + 1,
        perPage: next.pageSize ?? p.perPage,
      }));
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => String(row.id),
  });

  return (
    <div className="space-y-6 w-full min-w-0">
      <PageHeader
        title="Journal entries"
        subtitle="General ledger journal entries — view, post, and link back to source documents."
        actions={
          canCreate ? (
            <Button size="sm" variant="mono" asChild>
              <Link to={`${base}/create`}>
                <Plus className="size-4 mr-1" /> New entry
              </Link>
            </Button>
          ) : null
        }
      />

      <Card>
        <CardHeader className="py-3 border-b">
          <CardToolbar className="w-full flex-col xl:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search reference or description…"
                className="h-9 pl-9 pr-9"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
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
              <Select
                value={filters.visibility}
                onValueChange={(v) => {
                  setFilters((f) => ({ ...f, visibility: v }));
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
              >
                <SelectTrigger className="w-32 h-9">
                  <SelectValue placeholder="Visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived/Deleted</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.status}
                onValueChange={(v) => {
                  setFilters((f) => ({ ...f, status: v }));
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
              >
                <SelectTrigger className="w-36 h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="posted">Posted</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.type}
                onValueChange={(v) => {
                  setFilters((f) => ({ ...f, type: v }));
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
              >
                <SelectTrigger className="w-40 h-9">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {journalTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <DatePicker
                placeholder="From"
                className="w-[200px]"
                value={filters.date_from}
                onChange={(v) => {
                  setFilters((f) => ({ ...f, date_from: v || "" }));
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
              />
              <DatePicker
                placeholder="To"
                className="w-[200px]"
                value={filters.date_to}
                onChange={(v) => {
                  setFilters((f) => ({ ...f, date_to: v || "" }));
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
              />
              <Button
                variant="outline"
                size="icon"
                className="size-9"
                onClick={resetFilters}
                title="Reset filters"
              >
                <Filter className="size-4" />
              </Button>
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
            <DataGridPagination sizes={[15, 25, 50, 100]} />
          </CardFooter>
        </DataGrid>
      </Card>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete journal entry?"
        description={
          confirmDelete
            ? confirmDelete.is_empty_opening_balance
              ? `Delete empty entry ${confirmDelete.reference || `#${confirmDelete.id}`}? It has no amounts and is safe to remove.`
              : confirmDelete.is_customer_opening_balance
                ? `Delete ${confirmDelete.reference || `#${confirmDelete.id}`}? This removes the GL entry and clears the opening balance on the customer record.`
                : confirmDelete.is_posted
                  ? `Delete posted entry ${confirmDelete.reference || `#${confirmDelete.id}`}? Account balances will be updated.`
                  : `Delete draft entry ${confirmDelete.reference || `#${confirmDelete.id}`}? This cannot be undone.`
            : "This cannot be undone."
        }
        confirmLabel="Delete"
        confirmVariant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />

    </div>
  );
}
