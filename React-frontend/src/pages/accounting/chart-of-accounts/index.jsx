import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Ban,
  CheckCircle2,
  EllipsisVertical,
  Filter,
  Hash,
  Layers,
  Loader2,
  Pencil,
  Search,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { arrayMove } from "@dnd-kit/sortable";
import { toast } from "sonner";
import api from "@/lib/api";
import { chartOfAccountsApi } from "./api/chart-of-accounts.api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Card,
  CardFooter,
  CardHeader,
  CardTable,
  CardTitle,
  CardToolbar,
} from "@/components/ui/card";
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridColumnVisibility } from "@/components/ui/data-grid-column-visibility";
import {
  DataGridTableRowSelect,
  DataGridTableRowSelectAll,
} from "@/components/ui/data-grid-table";
import { DataGridTableDnd } from "@/components/ui/data-grid-table-dnd";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { cn } from "@/lib/utils";
import {
  formatCurrencyAmount,
  getWorkspaceDefaultCurrency,
  resolveCurrencyCode,
} from "@/lib/currency";
import { useAuthStore } from "@/store/authStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateAccountDialog } from "@/components/workspace/create-account-dialog";
import { CreateAccountTypeDialog } from "@/components/workspace/create-account-type-dialog";

const TYPE_FILTERS = [
  { value: "all", label: "All Types" },
  { value: "ASSET", label: "Asset" },
  { value: "LIABILITY", label: "Liability" },
  { value: "EQUITY", label: "Equity" },
  { value: "REVENUE", label: "Revenue" },
  { value: "EXPENSE", label: "Expense" },
];

const TYPE_BADGE = {
  ASSET:
    "text-blue-700 border-blue-200 bg-blue-50 dark:text-blue-300 dark:border-blue-900/50 dark:bg-blue-950/40",
  LIABILITY:
    "text-red-700 border-red-200 bg-red-50 dark:text-red-300 dark:border-red-900/50 dark:bg-red-950/40",
  EQUITY:
    "text-purple-700 border-purple-200 bg-purple-50 dark:text-purple-300 dark:border-purple-900/50 dark:bg-purple-950/40",
  REVENUE:
    "text-emerald-700 border-emerald-200 bg-emerald-50 dark:text-emerald-300 dark:border-emerald-900/50 dark:bg-emerald-950/40",
  EXPENSE:
    "text-orange-700 border-orange-200 bg-orange-50 dark:text-orange-300 dark:border-orange-900/50 dark:bg-orange-950/40",
};

const POSITIVE_BADGE =
  "text-emerald-700 border-emerald-200 bg-emerald-50 dark:text-emerald-300 dark:border-emerald-900/50 dark:bg-emerald-950/40";

const MUTED_BADGE = "text-muted-foreground border-border bg-muted/50";

/** Avatar colors per account type (Revenue uses success/emerald). */
const TYPE_AVATAR = {
  ASSET:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50",
  LIABILITY:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/50",
  EQUITY:
    "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/50",
  REVENUE:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50",
  EXPENSE:
    "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900/50",
};

function getAccountInitials(name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) return "—";
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  const first = words[0][0] || "";
  const last = words[words.length - 1][0] || "";
  return `${first}${last}`.toUpperCase();
}

function AccountInitialsAvatar({ name, accountTypeCode }) {
  return (
    <div
      className={cn(
        "size-8 rounded-lg border flex items-center justify-center shrink-0 text-[11px] font-semibold uppercase leading-none",
        TYPE_AVATAR[accountTypeCode] ||
          "bg-muted text-muted-foreground border-border",
      )}
      aria-hidden
    >
      {getAccountInitials(name)}
    </div>
  );
}

const DEFAULT_COLUMN_ORDER = [
  "select",
  "account",
  "account_subtype",
  "description",
  "current_balance",
  "is_postable",
  "is_active",
  "actions",
];

function formatBalance(val, currency) {
  if (val === null || val === undefined) return "—";
  const n = parseFloat(val);
  if (isNaN(n)) return "—";
  return formatCurrencyAmount(
    n,
    resolveCurrencyCode(null, currency, getWorkspaceDefaultCurrency()),
  );
}

// ─── Edit Account Dialog ─────────────────────────────────────────────────────
function EditAccountDialog({ account, onClose, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [subtypeOptions, setSubtypeOptions] = useState([]);
  const [form, setForm] = useState({
    account_number: account.account_number || "",
    name: account.name || "",
    coa2_subtype_id: String(account.coa2_subtype_id || ""),
    description: account.description || "",
    is_active: account.is_active ?? true,
    is_postable: account.is_postable ?? true,
  });
  const [errors, setErrors] = useState({});

  // Inline "Change code" panel — a separate action from the Account Number
  // field above it. That field + Save Changes still creates a new account
  // when the code differs (unchanged behaviour). This panel instead renames
  // THIS account's code in place via a dedicated endpoint, immediately (not
  // tied to Save Changes), so both ways to change a code live in one dialog.
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(account.account_number || "");
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState("");
  const [currentCode, setCurrentCode] = useState(account.account_number || "");

  const loadSubtypes = useCallback(async () => {
    try {
      const res = await api.get("/workspace/coa-subtypes");
      setSubtypeOptions(res.data.data?.options || []);
    } catch {}
  }, []);

  useEffect(() => {
    loadSubtypes();
  }, [loadSubtypes]);

  const set = (field, val) => {
    setForm((f) => ({ ...f, [field]: val }));
    setErrors((e) => {
      const n = { ...e };
      delete n[field];
      return n;
    });
  };

  const handleRenameCode = async () => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === currentCode) return;
    setRenaming(true);
    setRenameError("");
    try {
      const res = await api.patch(`/workspace/chart-of-accounts/${account.id}/code`, {
        account_number: trimmed,
      });
      toast.success(res.data?.message || "Account code updated.");
      setCurrentCode(trimmed);
      set("account_number", trimmed);
      setRenameOpen(false);
      onSaved?.();
    } catch (err) {
      setRenameError(
        err?.response?.data?.errors?.account_number?.[0] ||
          err?.response?.data?.message ||
          "Failed to change account code.",
      );
    } finally {
      setRenaming(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const res = await api.put(`/workspace/chart-of-accounts/${account.id}`, {
        account_number: form.account_number,
        name: form.name,
        coa2_subtype_id: parseInt(form.coa2_subtype_id),
        description: form.description || undefined,
        is_active: form.is_active,
        is_postable: form.is_postable,
      });
      toast.success(res.data?.message || "Account updated.");
      onSaved?.();
      onClose();
    } catch (err) {
      const errs = err?.response?.data?.errors || {};
      setErrors(errs);
      toast.error(err?.response?.data?.message || "Failed to update account.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Account</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <form
            id="edit-account-form"
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label>
                    Account Number <span className="text-destructive">*</span>
                  </Label>
                  <button
                    type="button"
                    onClick={() => {
                      setRenameValue(currentCode);
                      setRenameError("");
                      setRenameOpen((o) => !o);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <Hash className="size-3" />
                    Change code
                  </button>
                </div>
                <Input
                  value={form.account_number}
                  onChange={(e) => set("account_number", e.target.value)}
                  placeholder="e.g. 1000"
                />
                <p className="text-xs text-muted-foreground">
                  Editing this and saving creates a new account with the new number — the original stays as-is. Use
                  "Change code" above to rename this same account instead.
                </p>
                {errors.account_number && (
                  <p className="text-xs text-destructive">
                    {errors.account_number[0]}
                  </p>
                )}
                {renameOpen && (
                  <div className="mt-2 rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
                    <p className="text-xs font-medium">
                      Rename this account's code — same account, no duplicate created.
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => {
                          setRenameValue(e.target.value);
                          setRenameError("");
                        }}
                        className="h-8 text-sm"
                        placeholder="e.g. 1000"
                      />
                      <Button
                        type="button"
                        size="sm"
                        className="shrink-0"
                        onClick={handleRenameCode}
                        disabled={renaming || !renameValue.trim() || renameValue.trim() === currentCode}
                      >
                        {renaming && <Loader2 className="size-3.5 animate-spin" />}
                        Apply
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="shrink-0"
                        onClick={() => setRenameOpen(false)}
                        disabled={renaming}
                      >
                        Cancel
                      </Button>
                    </div>
                    {renameError && <p className="text-xs text-destructive">{renameError}</p>}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>
                  Account Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. Cash"
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name[0]}</p>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>
                Account Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.coa2_subtype_id}
                onValueChange={(v) => set("coa2_subtype_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type…" />
                </SelectTrigger>
                <SelectContent>
                  {subtypeOptions.map((opt) =>
                    opt.type === "group" ? (
                      <div
                        key={`grp-${opt.label}`}
                        className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                      >
                        {opt.label}
                      </div>
                    ) : (
                      <SelectItem key={opt.id} value={String(opt.id)}>
                        {opt.label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
              {errors.coa2_subtype_id && (
                <p className="text-xs text-destructive">
                  {errors.coa2_subtype_id[0]}
                </p>
              )}
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-xs text-muted-foreground">
                  Account is available for use
                </p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => set("is_active", v)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Allow Posting</p>
                <p className="text-xs text-muted-foreground">
                  Allow journal entries to post to this account
                </p>
              </div>
              <Switch
                checked={form.is_postable}
                onCheckedChange={(v) => set("is_postable", v)}
              />
            </div>
          </form>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-account-form"
            disabled={saving}
            className="gap-1.5"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Account Types Sheet ──────────────────────────────────────────────────────
function AccountTypesSheet() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mainTypes, setMainTypes] = useState([]);
  const [options, setOptions] = useState([]);
  const [customSubtypes, setCustomSubtypes] = useState([]);

  const loadTypes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/workspace/coa-subtypes");
      setMainTypes(res.data.data?.main_types || []);
      setOptions(res.data.data?.options || []);
      setCustomSubtypes(res.data.data?.custom_subtypes || []);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) loadTypes();
  }, [open, loadTypes]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Layers className="size-4" />
          Account Types
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="space-y-1 border-b border-border px-6 py-5 pe-12 text-left">
          <SheetTitle className="text-lg font-semibold">Account Types</SheetTitle>
          <SheetDescription>
            Subtypes grouped by main category. System types are built-in; custom
            types can be added for your chart of accounts.
          </SheetDescription>
        </SheetHeader>

        <div className="border-b border-border px-6 py-3">
          <CreateAccountTypeDialog onCreated={loadTypes} />
        </div>

        <SheetBody className="min-h-0 flex-1 px-6 py-4">
          <ScrollArea className="h-[calc(100vh-11.5rem)]">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : mainTypes.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 py-14 text-center">
                <Layers className="mb-3 size-8 text-muted-foreground/60" />
                <p className="text-sm font-medium text-foreground">
                  No account types found
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Create a custom type to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-4 pr-3">
                {mainTypes.map((mt) => {
                  const typeOptions = options.filter(
                    (o) => o.type !== "group" && o.group === mt.name,
                  );
                  return (
                    <div
                      key={mt.id}
                      className="overflow-hidden rounded-xl border border-border bg-card shadow-xs"
                    >
                      <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-4 py-3">
                        <div
                          className={cn(
                            "flex size-9 shrink-0 items-center justify-center rounded-lg border text-[11px] font-semibold uppercase leading-none",
                            TYPE_AVATAR[mt.code] ||
                              "bg-muted text-muted-foreground border-border",
                          )}
                        >
                          {(mt.code || mt.name || "—").slice(0, 2)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {mt.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {mt.code}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "shrink-0 font-normal",
                            TYPE_BADGE[mt.code] || MUTED_BADGE,
                          )}
                        >
                          {typeOptions.length}{" "}
                          {typeOptions.length === 1 ? "type" : "types"}
                        </Badge>
                      </div>
                      <div className="divide-y divide-border">
                        {typeOptions.length === 0 ? (
                          <p className="px-4 py-4 text-sm text-muted-foreground">
                            No subtypes defined for this category.
                          </p>
                        ) : (
                          typeOptions.map((o) => {
                            const custom = customSubtypes.find(
                              (c) => c.id === o.id,
                            );
                            return (
                              <div
                                key={o.id}
                                className="flex items-center justify-between gap-3 px-4 py-3"
                              >
                                <span className="min-w-0 truncate text-sm text-foreground">
                                  {o.label}
                                </span>
                                {custom ? (
                                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                                    {custom.accounts_count ?? 0}{" "}
                                    {(custom.accounts_count ?? 0) === 1
                                      ? "account"
                                      : "accounts"}
                                  </span>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "shrink-0 font-normal",
                                      MUTED_BADGE,
                                    )}
                                  >
                                    System
                                  </Badge>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function ChartOfAccountsPage() {
  const activeCompany = useAuthStore((s) => s.activeCompany);
  const companyCurrency = resolveCurrencyCode(
    null,
    activeCompany?.currency,
    getWorkspaceDefaultCurrency(),
  );
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 100,
    total: 0,
    lastPage: 1,
  });
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    type: "all",
    status: "all",
  });
  const [rowSelection, setRowSelection] = useState({});
  const [bulkBusy, setBulkBusy] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [editAccount, setEditAccount] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [sorting, setSorting] = useState([{ id: "account", desc: false }]);
  const [columnOrder, setColumnOrder] = useState(DEFAULT_COLUMN_ORDER);
  const [canCreate, setCanCreate] = useState(false);

  useEffect(() => {
    chartOfAccountsApi
      .formOptions()
      .then((res) => setCanCreate(!!res.data?.data?.can_create))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchInput.trim() }));
      setPagination((p) => ({ ...p, page: 1 }));
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        per_page: pagination.perPage,
        page: pagination.page,
      };
      if (filters.search) params.search = filters.search;
      if (filters.type !== "all") params.type = filters.type;
      if (filters.status === "active") params.is_active = 1;
      if (filters.status === "inactive") params.is_active = 0;

      const res = await chartOfAccountsApi.list(params);
      const payload = res.data;
      const items = payload?.data ?? [];
      const meta = payload?.meta ?? {};
      setAccounts(Array.isArray(items) ? items : []);
      setPagination((p) => ({
        ...p,
        total: meta.total ?? items.length,
        lastPage: meta.last_page ?? 1,
      }));
    } catch (err) {
      setAccounts([]);
      toast.error(err?.response?.data?.message || "Failed to load accounts");
    } finally {
      setLoading(false);
    }
  }, [
    pagination.page,
    pagination.perPage,
    filters.search,
    filters.type,
    filters.status,
  ]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const selectedIds = useMemo(
    () =>
      Object.keys(rowSelection)
        .filter((k) => rowSelection[k])
        .map((k) => Number(k))
        .filter((id) => Number.isFinite(id) && id > 0),
    [rowSelection],
  );

  const selectedCount = selectedIds.length;

  const runBulk = async (action) => {
    if (!selectedIds.length) return;
    setBulkBusy(true);
    try {
      const res = await chartOfAccountsApi.bulk({ ids: selectedIds, action });
      toast.success(res.data?.message || "Bulk action completed");
      setRowSelection({});
      fetchAccounts();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Bulk action failed");
    } finally {
      setBulkBusy(false);
    }
  };

  const handleToggleStatus = async (acc, nextActive) => {
    setTogglingId(acc.id);
    try {
      const res = await chartOfAccountsApi.toggleStatus(acc.id, nextActive);
      toast.success(
        res.data?.message ||
          (nextActive ? "Account activated" : "Account deactivated"),
      );
      fetchAccounts();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update status");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = useCallback(
    async (acc) => {
      setDeletingId(acc.id);
      setConfirmDelete(null);
      try {
        await chartOfAccountsApi.delete(acc.id);
        toast.success("Account deleted.");
        fetchAccounts();
      } catch (err) {
        toast.error(
          err?.response?.data?.message || "Failed to delete account.",
        );
      } finally {
        setDeletingId(null);
      }
    },
    [fetchAccounts],
  );

  const resetFilters = () => {
    setSearchInput("");
    setFilters({ search: "", type: "all", status: "all" });
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
        id: "select",
        accessorKey: "id",
        header: () => <DataGridTableRowSelectAll size="sm" />,
        cell: ({ row }) => <DataGridTableRowSelect row={row} size="sm" />,
        enableSorting: false,
        enableHiding: false,
        enableResizing: false,
        size: 44,
        meta: { cellClassName: "ps-3", headerTitle: "Select" },
      },
      {
        id: "account",
        accessorFn: (row) => `${row.account_number} ${row.name}`,
        header: ({ column }) => (
          <DataGridColumnHeader title="Account" visibility column={column} />
        ),
        cell: ({ row }) => {
          const acc = row.original;
          return (
            <div className="flex items-center gap-3 min-w-0">
              <AccountInitialsAvatar
                name={acc.name}
                accountTypeCode={acc.account_type_code}
              />
              <div className="space-y-px min-w-0">
                <button
                  type="button"
                  onClick={() => setEditAccount(acc)}
                  className="font-semibold text-sm tabular-nums text-foreground hover:text-primary transition-colors truncate block text-left"
                >
                  {acc.account_number || "—"}
                </button>
                <div className="text-xs text-muted-foreground truncate">
                  {acc.name || "—"}
                </div>
              </div>
            </div>
          );
        },
        size: 260,
        enableSorting: true,
        enableHiding: false,
        enableResizing: true,
        meta: { headerTitle: "Account" },
      },
      {
        accessorKey: "account_subtype",
        id: "account_subtype",
        header: ({ column }) => (
          <DataGridColumnHeader title="Type" visibility column={column} />
        ),
        cell: ({ row }) => {
          const code = row.original.account_type_code;
          return (
            <Badge
              variant="outline"
              className={cn(
                "rounded-full font-normal capitalize",
                TYPE_BADGE[code] || MUTED_BADGE,
              )}
            >
              {row.original.account_subtype || row.original.account_type || "—"}
            </Badge>
          );
        },
        size: 160,
        enableSorting: true,
        enableHiding: true,
        enableResizing: true,
        meta: { headerTitle: "Type" },
      },
      {
        accessorKey: "description",
        id: "description",
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Description"
            visibility
            column={column}
          />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground truncate block max-w-xs">
            {row.original.description || "—"}
          </span>
        ),
        size: 200,
        enableSorting: false,
        enableHiding: true,
        enableResizing: true,
        meta: { headerTitle: "Description" },
      },
      {
        accessorKey: "current_balance",
        id: "current_balance",
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Balance"
            visibility
            column={column}
          />
        ),
        cell: ({ row }) => {
          const balance = parseFloat(row.original.current_balance);
          return (
            <span
              className={cn(
                "text-sm tabular-nums font-medium block text-end",
                !isNaN(balance) && balance !== 0
                  ? "text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {formatBalance(row.original.current_balance, companyCurrency)}
            </span>
          );
        },
        size: 130,
        enableSorting: true,
        enableHiding: true,
        enableResizing: true,
        meta: { headerTitle: "Balance", cellClassName: "text-end" },
      },
      {
        accessorKey: "is_postable",
        id: "is_postable",
        header: ({ column }) => (
          <DataGridColumnHeader title="Postable" visibility column={column} />
        ),
        cell: ({ row }) =>
          row.original.is_postable ? (
            <Badge
              variant="outline"
              className={cn("rounded-full font-normal", POSITIVE_BADGE)}
            >
              Yes
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className={cn("rounded-full font-normal", MUTED_BADGE)}
            >
              No
            </Badge>
          ),
        size: 100,
        enableSorting: true,
        enableHiding: true,
        enableResizing: false,
        meta: {
          headerTitle: "Postable",
          headerClassName: "text-center",
          cellClassName: "text-center",
        },
      },
      {
        accessorKey: "is_active",
        id: "is_active",
        header: ({ column }) => (
          <DataGridColumnHeader title="Status" visibility column={column} />
        ),
        cell: ({ row }) =>
          row.original.is_active ? (
            <Badge
              variant="outline"
              className={cn("rounded-full font-normal capitalize", POSITIVE_BADGE)}
            >
              Active
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className={cn("rounded-full font-normal capitalize", MUTED_BADGE)}
            >
              Inactive
            </Badge>
          ),
        size: 110,
        enableSorting: true,
        enableHiding: true,
        enableResizing: false,
        meta: {
          headerTitle: "Status",
          headerClassName: "text-center",
          cellClassName: "text-center",
        },
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        enableSorting: false,
        enableHiding: false,
        enableResizing: false,
        cell: ({ row }) => {
          const acc = row.original;
          const isDeleting = deletingId === acc.id;
          const isToggling = togglingId === acc.id;
          return (
            <div className="flex items-center justify-end gap-0.5">
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                title="Edit account"
                onClick={() => setEditAccount(acc)}
              >
                <Pencil className="size-4" />
              </Button>
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
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => setEditAccount(acc)}>
                    <Pencil className="size-4 mr-2" /> Edit
                  </DropdownMenuItem>
                  {acc.is_active ? (
                    <DropdownMenuItem
                      disabled={isToggling}
                      onClick={() => handleToggleStatus(acc, false)}
                    >
                      <Ban className="size-4 mr-2" /> Deactivate
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      disabled={isToggling}
                      onClick={() => handleToggleStatus(acc, true)}
                    >
                      <CheckCircle2 className="size-4 mr-2" /> Activate
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    disabled={isDeleting}
                    onClick={() => setConfirmDelete(acc)}
                  >
                    {isDeleting ? (
                      <Loader2 className="size-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="size-4 mr-2" />
                    )}
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
        size: 88,
        meta: { headerTitle: "Actions" },
      },
    ],
    [companyCurrency, deletingId, togglingId],
  );

  const table = useReactTable({
    columns,
    data: accounts,
    pageCount: pagination.lastPage,
    state: {
      pagination: {
        pageIndex: pagination.page - 1,
        pageSize: pagination.perPage,
      },
      rowSelection,
      sorting,
      columnOrder,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnOrderChange: setColumnOrder,
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
        page: next.pageIndex + 1,
        perPage: next.pageSize,
      }));
      setRowSelection({});
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    getRowId: (row) => String(row.id),
  });

  return (
    <div className="space-y-6 w-full min-w-0">
      <PageHeader
        title="Chart of Accounts"
        subtitle="Manage GL accounts, types, and posting status for your company."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <AccountTypesSheet />
            {canCreate && <CreateAccountDialog onCreated={fetchAccounts} />}
          </div>
        }
      />

      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-4 py-3">
          <span className="text-sm font-medium">{selectedCount} selected</span>
          <div className="flex flex-wrap gap-2 ms-auto">
            <Button
              size="sm"
              variant="outline"
              disabled={bulkBusy}
              onClick={() => runBulk("activate")}
            >
              <CheckCircle2 className="size-4 mr-1" />
              Activate
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={bulkBusy}
              onClick={() => runBulk("deactivate")}
            >
              <Ban className="size-4 mr-1" />
              Deactivate
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

      <Card>
        <CardHeader className="py-3 border-b flex-col items-stretch gap-3">
          <div className="flex flex-col items-stretch justify-between gap-3 w-full sm:flex-row sm:items-center">
            <CardTitle className="text-base font-semibold flex flex-wrap items-center gap-2 shrink-0">
              All accounts
              <span className="text-xs font-normal text-muted-foreground">
                Balances in {companyCurrency}
              </span>
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
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
          </div>
          <CardToolbar className="w-full flex-col sm:flex-row gap-3 p-0 border-0 min-h-0">
            <div className="relative flex-1 min-w-0 sm:max-w-md">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search by name or account ID…"
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
              <Select
                value={filters.type}
                onValueChange={(val) => {
                  setFilters((f) => ({ ...f, type: val }));
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
              >
                <SelectTrigger className="w-36 h-9">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_FILTERS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.status}
                onValueChange={(val) => {
                  setFilters((f) => ({ ...f, status: val }));
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
              >
                <SelectTrigger className="w-32 h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
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
            <DataGridPagination sizes={[15, 25, 50, 100]} />
          </CardFooter>
        </DataGrid>
      </Card>

      {editAccount && (
        <EditAccountDialog
          account={editAccount}
          onClose={() => setEditAccount(null)}
          onSaved={fetchAccounts}
        />
      )}

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(v) => {
          if (!v) setConfirmDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <strong>{confirmDelete?.name}</strong> (
              {confirmDelete?.account_number}). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => handleDelete(confirmDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
