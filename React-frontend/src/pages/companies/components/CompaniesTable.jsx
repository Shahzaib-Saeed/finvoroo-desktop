import { useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from "@tanstack/react-table";
import {
  Ban,
  CheckCircle2,
  EllipsisVertical,
  ExternalLink,
  Pencil,
  Trash2,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardFooter, CardTable } from "@/components/ui/card";
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable, DataGridTableRowSelect, DataGridTableRowSelectAll } from "@/components/ui/data-grid-table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  CompanyStatusBadge,
  companyInitials,
  companyLocation,
  formatCompanyDate,
  isCompanyActive,
} from "./companies-ui";

export function CompaniesTable({
  rows,
  loading,
  isOwner,
  rowSelection,
  onRowSelectionChange,
  onOpen,
  onEdit,
  onToggleStatus,
  onDelete,
}) {
  const columns = useMemo(
    () => [
      ...(isOwner
        ? [
            {
              id: "select",
              accessorKey: "id",
              header: () => <DataGridTableRowSelectAll size="sm" />,
              cell: ({ row }) => <DataGridTableRowSelect row={row} size="sm" />,
              enableSorting: false,
              enableHiding: false,
              size: 44,
              meta: { cellClassName: "ps-3" },
            },
          ]
        : []),
      {
        accessorKey: "name",
        id: "name",
        header: ({ column }) => (
          <DataGridColumnHeader title="Company" column={column} />
        ),
        cell: ({ row }) => {
          const company = row.original;
          const active = isCompanyActive(company);
          return (
            <div className="flex items-center gap-3 min-w-0 py-0.5">
              <Avatar className="size-9 shrink-0">
                <AvatarFallback
                  className={cn(
                    "text-xs font-semibold",
                    active
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {companyInitials(company.name)}
                </AvatarFallback>
              </Avatar>
              <a
                href={company.url}
                onClick={() => onOpen?.(company)}
                className="block cursor-pointer hover:text-blue-600 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{company.name}</p>
                  <p className="text-xs text-muted-foreground capitalize truncate">
                    {company.type || "Business entity"}
                  </p>
                </div>
              </a>
            </div>
          );
        },
        size: 240,
      },
      {
        id: "contact",
        accessorFn: (row) => [row.email, row.phone].filter(Boolean).join(" "),
        header: ({ column }) => (
          <DataGridColumnHeader title="Contact" column={column} />
        ),
        cell: ({ row }) => {
          const company = row.original;
          if (!company.email && !company.phone) {
            return <span className="text-sm text-muted-foreground">—</span>;
          }
          return (
            <div className="min-w-0 space-y-0.5">
              {company.email ? (
                <p className="text-sm truncate">{company.email}</p>
              ) : null}
              {company.phone ? (
                <p className="text-xs text-muted-foreground truncate">
                  {company.phone}
                </p>
              ) : null}
            </div>
          );
        },
        size: 200,
      },
      {
        id: "location",
        accessorFn: (row) => companyLocation(row),
        header: ({ column }) => (
          <DataGridColumnHeader title="Location" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground truncate block max-w-[180px]">
            {companyLocation(row.original)}
          </span>
        ),
        size: 160,
      },
      {
        accessorKey: "currency",
        id: "currency",
        header: ({ column }) => (
          <DataGridColumnHeader title="Currency" column={column} />
        ),
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className="font-mono font-normal tabular-nums"
          >
            {row.original.currency || "USD"}
          </Badge>
        ),
        size: 100,
      },
      {
        accessorKey: "is_active",
        id: "is_active",
        header: ({ column }) => (
          <DataGridColumnHeader title="Status" column={column} />
        ),
        cell: ({ row }) => (
          <CompanyStatusBadge active={row.original.is_active} />
        ),
        size: 110,
      },
      {
        accessorKey: "created_at",
        id: "created_at",
        header: ({ column }) => (
          <DataGridColumnHeader title="Created" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground tabular-nums whitespace-nowrap">
            {formatCompanyDate(row.original.created_at)}
          </span>
        ),
        size: 120,
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const company = row.original;
          const active = isCompanyActive(company);
          return (
            <div className="flex items-center justify-end gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                title="Open workspace"
                disabled={!active}
                onClick={() => onOpen?.(company)}
              >
                <ExternalLink className="size-4" />
              </Button>
              {isOwner ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8">
                      <EllipsisVertical className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                      disabled={!active}
                      onClick={() => onOpen?.(company)}
                    >
                      <ExternalLink className="size-4 mr-2" />
                      Open workspace
                    </DropdownMenuItem>
                    {onEdit ? (
                      <DropdownMenuItem onClick={() => onEdit(company)}>
                        <Pencil className="size-4 mr-2" />
                        Edit details
                      </DropdownMenuItem>
                    ) : null}
                    {onToggleStatus ? (
                      <DropdownMenuItem
                        className={
                          active
                            ? "text-amber-700 focus:text-amber-700"
                            : "text-emerald-700 focus:text-emerald-700"
                        }
                        onClick={() => onToggleStatus(company)}
                      >
                        {active ? (
                          <>
                            <Ban className="size-4 mr-2" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="size-4 mr-2" />
                            Activate
                          </>
                        )}
                      </DropdownMenuItem>
                    ) : null}
                    {onDelete ? (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => onDelete(company)}
                        >
                          <Trash2 className="size-4 mr-2" />
                          Move to trash
                        </DropdownMenuItem>
                      </>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          );
        },
        size: 100,
        enableSorting: false,
      },
    ],
    [isOwner, onDelete, onEdit, onOpen, onToggleStatus],
  );

  const table = useReactTable({
    columns,
    data: rows,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 10 },
      sorting: [{ id: "name", desc: false }],
    },
    state: isOwner ? { rowSelection: rowSelection ?? {} } : undefined,
    enableRowSelection: isOwner,
    onRowSelectionChange: isOwner ? onRowSelectionChange : undefined,
    getRowId: (row) => String(row.id),
  });

  if (loading) {
    return (
      <div className="p-5 space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-md" />
        ))}
      </div>
    );
  }

  return (
    <DataGrid
      table={table}
      recordCount={rows.length}
      isLoading={loading}
      tableLayout={{
        cellBorder: true,
        rowBorder: true,
        headerBackground: true,
        headerBorder: true,
        stripped: true,
      }}
    >
      <CardTable>
        <ScrollArea>
          <DataGridTable />
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardTable>
      <CardFooter className="border-t px-5 py-3">
        <DataGridPagination sizes={[10, 15, 25, 50]} />
      </CardFooter>
    </DataGrid>
  );
}
