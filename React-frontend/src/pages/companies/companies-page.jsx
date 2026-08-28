import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, LayoutGrid, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { companiesApi, TRASH_RETENTION_DAYS } from "./api/companies.api";
import { accountApi } from "./api/account.api";
import { CompanyEditSheet } from "./components/CompanyEditSheet";
import { CompanyDeleteDialog } from "./components/CompanyDeleteDialog";
import { CompanyBulkDeleteDialog } from "./components/CompanyBulkDeleteDialog";
import { CompanyForceDeleteDialog } from "./components/CompanyForceDeleteDialog";
import { CompanyEmptyTrashDialog } from "./components/CompanyEmptyTrashDialog";
import { CompaniesTable } from "./components/CompaniesTable";
import { CompaniesTrashTable } from "./components/CompaniesTrashTable";
import { BulkActionBar } from "@/components/common/bulk-action-bar";
import {
  CompanySummaryStats,
  PlanLimitBanner,
  isCompanyActive,
} from "./components/companies-ui";
import { Container } from "@/components/common/container";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardToolbar } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "inactive", label: "Inactive" },
];

const VIEW_TABS = [
  { id: "active", label: "Active companies" },
  { id: "trash", label: "Trash" },
];

export function CompaniesPage() {
  const navigate = useNavigate();
  const { user, hydrate, setActiveCompany, clearActiveCompany, activeCompany } =
    useAuthStore();
  const isOwner = (user?.role ?? "") === "company_owner";

  const [view, setView] = useState("active");
  const [rows, setRows] = useState([]);
  const [trashRows, setTrashRows] = useState([]);
  const [accountOverview, setAccountOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trashLoading, setTrashLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editCompanyId, setEditCompanyId] = useState(null);
  const [toggleTarget, setToggleTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [forceDeleteTarget, setForceDeleteTarget] = useState(null);
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [emptyTrashOpen, setEmptyTrashOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [rowSelection, setRowSelection] = useState({});
  const [toggling, setToggling] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const loadActive = useCallback(async () => {
    const companiesRes = await companiesApi.list();
    setRows(
      Array.isArray(companiesRes.data?.data) ? companiesRes.data.data : [],
    );
  }, []);

  const loadTrash = useCallback(async () => {
    if (!isOwner) {
      setTrashRows([]);
      return;
    }
    setTrashLoading(true);
    try {
      const res = await companiesApi.listTrash();
      setTrashRows(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load trash");
      setTrashRows([]);
    } finally {
      setTrashLoading(false);
    }
  }, [isOwner]);

  const load = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);

      try {
        await loadActive();

        if (isOwner) {
          const [overviewRes] = await Promise.all([
            accountApi.overview().catch(() => null),
            loadTrash(),
          ]);
          setAccountOverview(overviewRes?.data?.data ?? null);
        }
      } catch (err) {
        toast.error(err?.response?.data?.message || "Failed to load companies");
        setRows([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isOwner, loadActive, loadTrash],
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (view === "trash" && isOwner) {
      loadTrash();
    }
  }, [view, isOwner, loadTrash]);

  const refreshAuthCompanies = useCallback(async () => {
    try {
      await hydrate();
    } catch {
      // non-blocking
    }
  }, [hydrate]);

  const filteredRows = useMemo(() => {
    let list = rows;
    if (statusFilter === "active") {
      list = list.filter(isCompanyActive);
    } else if (statusFilter === "inactive") {
      list = list.filter((r) => !isCompanyActive(r));
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((company) =>
        [
          company.name,
          company.email,
          company.phone,
          company.city,
          company.country,
          company.type,
        ]
          .filter(Boolean)
          .some((part) => String(part).toLowerCase().includes(q)),
      );
    }
    return list;
  }, [rows, statusFilter, search]);

  const filteredTrashRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return trashRows;
    return trashRows.filter((company) =>
      [company.name, company.email, company.city, company.country, company.type]
        .filter(Boolean)
        .some((part) => String(part).toLowerCase().includes(q)),
    );
  }, [trashRows, search]);

  const selectedCompanies = useMemo(() => {
    return Object.keys(rowSelection)
      .filter((key) => rowSelection[key])
      .map((id) => filteredRows.find((r) => String(r.id) === id))
      .filter(Boolean);
  }, [rowSelection, filteredRows]);

  const handleOpenWorkspace = useCallback(
    (company) => {
      if (!isCompanyActive(company)) {
        toast.error("Activate this company before opening its workspace.");
        return;
      }
      setActiveCompany(company);
      navigate(`/workspace/${company.id}`);
    },
    [navigate, setActiveCompany],
  );

  const handleToggleStatus = async () => {
    if (!toggleTarget) return;
    setToggling(true);
    try {
      const res = await companiesApi.toggleStatus(toggleTarget.id);
      const active = res.data?.data?.is_active;
      toast.success(
        active
          ? `"${toggleTarget.name}" activated`
          : `"${toggleTarget.name}" deactivated`,
      );
      setToggleTarget(null);
      await load(true);
      await refreshAuthCompanies();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Could not update company status",
      );
    } finally {
      setToggling(false);
    }
  };

  const handleCompanyDeleted = useCallback(
    async (company) => {
      toast.success(
        `"${company.name}" moved to trash. It will be permanently deleted in ${TRASH_RETENTION_DAYS} days unless restored.`,
      );
      if (String(activeCompany?.id) === String(company.id)) {
        clearActiveCompany();
      }
      setRowSelection({});
      await load(true);
      await refreshAuthCompanies();
    },
    [activeCompany?.id, clearActiveCompany, load, refreshAuthCompanies],
  );

  const handleBulkDeleteComplete = useCallback(
    async ({ succeeded, failed }) => {
      if (succeeded.length) {
        toast.success(
          `Moved ${succeeded.length} ${succeeded.length === 1 ? "company" : "companies"} to trash.`,
        );
        if (succeeded.some((c) => String(activeCompany?.id) === String(c.id))) {
          clearActiveCompany();
        }
      }
      if (failed.length && !succeeded.length) {
        toast.error("No companies could be moved to trash.");
      } else if (failed.length) {
        toast.warning(
          `${failed.length} companies could not be moved to trash.`,
        );
      }
      if (!failed.length) {
        setBulkDeleteOpen(false);
        setRowSelection({});
      }
      if (succeeded.length) {
        await load(true);
        await refreshAuthCompanies();
      }
    },
    [activeCompany?.id, clearActiveCompany, load, refreshAuthCompanies],
  );

  const handleRestore = async () => {
    if (!restoreTarget) return;
    setRestoring(true);
    try {
      await companiesApi.restore(restoreTarget.id);
      toast.success(`"${restoreTarget.name}" restored successfully.`);
      setRestoreTarget(null);
      await load(true);
      await refreshAuthCompanies();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not restore company");
    } finally {
      setRestoring(false);
    }
  };

  const handleForceDeleted = useCallback(
    async (company) => {
      toast.success(
        `"${company.name}" and all related data were permanently deleted.`,
      );
      await load(true);
      await refreshAuthCompanies();
    },
    [load, refreshAuthCompanies],
  );

  const handleTrashEmptied = useCallback(
    async (result) => {
      const count = result?.purged_count ?? 0;
      if (count > 0) {
        toast.success(
          `Trash emptied. ${count} ${count === 1 ? "company" : "companies"} permanently deleted.`,
        );
      } else {
        toast.info("Trash is already empty.");
      }
      await load(true);
      await refreshAuthCompanies();
    },
    [load, refreshAuthCompanies],
  );

  const canCreate =
    isOwner && (accountOverview?.usage?.can_create_company ?? true);

  const showEmptyState =
    !loading && rows.length === 0 && trashRows.length === 0;
  const showNoResults =
    !loading &&
    view === "active" &&
    rows.length > 0 &&
    filteredRows.length === 0;
  const showTrashNoResults =
    !trashLoading &&
    view === "trash" &&
    trashRows.length > 0 &&
    filteredTrashRows.length === 0;

  return (
    <Fragment>
      <Container>
        <PageHeader
          title="Companies"
          subtitle="Manage legal entities, contact details, activation status, and workspace access"
          className="pt-2"
        />
      </Container>

      <Container className="space-y-5 pb-8">
        {isOwner && accountOverview ? (
          <PlanLimitBanner
            usage={accountOverview.usage}
            account={accountOverview.account}
          />
        ) : null}

        {isOwner ? (
          <div className="flex flex-wrap items-center gap-2">
            {VIEW_TABS.map((tab) => {
              const isTrash = tab.id === "trash";
              const isActive = view === tab.id;

              return (
              <Button
                key={tab.id}
                type="button"
                size="sm"
                variant={
                  isTrash
                    ? isActive
                      ? "destructive"
                      : "outline"
                    : isActive
                      ? "secondary"
                      : "outline"
                }
                className={cn(
                  "h-8",
                  isTrash &&
                    !isActive &&
                    "border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/60",
                )}
                onClick={() => {
                  setView(tab.id);
                  setSearch("");
                  setRowSelection({});
                }}
              >
                {isTrash ? (
                  <Trash2 className="size-3.5 mr-1.5" />
                ) : (
                  <LayoutGrid className="size-3.5 mr-1.5" />
                )}
                {tab.label}
                {isTrash && trashRows.length > 0 ? (
                  <span
                    className={cn(
                      "ml-1.5 rounded-full px-1.5 py-0 text-xs font-medium",
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-destructive/10 text-destructive",
                    )}
                  >
                    {trashRows.length}
                  </span>
                ) : null}
              </Button>
              );
            })}
          </div>
        ) : null}

        {view === "trash" && isOwner ? (
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="border-b py-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between w-full">
                <div className="space-y-1">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Trash2 className="size-4 text-muted-foreground" />
                    Company trash
                  </CardTitle>
                  <p className="text-xs text-muted-foreground max-w-2xl">
                    Deleted companies stay here for {TRASH_RETENTION_DAYS} days.
                    Restore them anytime, or permanently delete individual
                    companies. After {TRASH_RETENTION_DAYS} days, they are
                    automatically removed along with all transactions and
                    records.
                  </p>
                </div>
                <CardToolbar className="w-full lg:w-auto flex-col sm:flex-row gap-2 sm:items-center">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search trash..."
                      className="pl-9 h-9"
                    />
                  </div>
                  {trashRows.length > 0 ? (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="h-9"
                      onClick={() => setEmptyTrashOpen(true)}
                    >
                      Empty trash
                    </Button>
                  ) : null}
                </CardToolbar>
              </div>
            </CardHeader>

            {showTrashNoResults ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                No trashed companies match your search.
              </div>
            ) : (
              <CompaniesTrashTable
                rows={filteredTrashRows}
                loading={trashLoading}
                onRestore={(c) => setRestoreTarget(c)}
                onForceDelete={(c) => setForceDeleteTarget(c)}
              />
            )}
          </Card>
        ) : showEmptyState ? (
          <Card className="border-border/60 shadow-sm">
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <div className="size-14 rounded-xl bg-muted flex items-center justify-center mb-4">
                <Building2 className="size-7 text-muted-foreground" />
              </div>
              <p className="text-base font-semibold">No companies yet</p>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-md">
                {isOwner
                  ? "Create your first company to unlock accounting workspaces, invoicing, inventory, and reporting."
                  : "You are not assigned to any companies yet. Contact your account owner."}
              </p>
              {isOwner ? (
                <div className="flex gap-2 mt-6">
                  <Button asChild>
                    <Link to="/companies/create">
                      <Plus className="size-4" />
                      Create company
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/dashboard">Account dashboard</Link>
                  </Button>
                </div>
              ) : null}
            </div>
          </Card>
        ) : (
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="border-b py-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between w-full">
                <div className="space-y-1">
                  <CardTitle className="text-base font-semibold">
                    All companies
                  </CardTitle>
                  <CompanySummaryStats rows={rows} loading={loading} />
                </div>
                <CardToolbar className="w-full lg:w-auto flex-col sm:flex-row gap-2 sm:items-center">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search companies..."
                      className="pl-9 h-9"
                    />
                  </div>
                  <div className="flex items-center gap-1 rounded-lg border border-border/60 p-0.5 bg-muted/30">
                    {STATUS_FILTERS.map((f) => (
                      <Button
                        key={f.id}
                        type="button"
                        size="sm"
                        variant={statusFilter === f.id ? "secondary" : "ghost"}
                        className="h-7 px-3 text-xs font-medium"
                        onClick={() => setStatusFilter(f.id)}
                      >
                        {f.label}
                      </Button>
                    ))}
                  </div>
                </CardToolbar>
              </div>
              {!loading && filteredRows.length !== rows.length ? (
                <p className="text-xs text-muted-foreground pt-1">
                  Showing {filteredRows.length} of {rows.length} companies
                </p>
              ) : null}
            </CardHeader>

            {isOwner && selectedCompanies.length > 0 ? (
              <div className="px-5 pb-4">
                <BulkActionBar
                  count={selectedCompanies.length}
                  onClear={() => setRowSelection({})}
                  onDelete={() => setBulkDeleteOpen(true)}
                  deleteLabel="Move to trash"
                />
              </div>
            ) : null}

            {showNoResults ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                No companies match your search or filter.
              </div>
            ) : (
              <CompaniesTable
                rows={filteredRows}
                loading={loading}
                isOwner={isOwner}
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
                onOpen={handleOpenWorkspace}
                onEdit={isOwner ? (c) => setEditCompanyId(c.id) : undefined}
                onToggleStatus={isOwner ? (c) => setToggleTarget(c) : undefined}
                onDelete={isOwner ? (c) => setDeleteTarget(c) : undefined}
              />
            )}
          </Card>
        )}
      </Container>

      <CompanyEditSheet
        companyId={editCompanyId}
        open={Boolean(editCompanyId)}
        onOpenChange={(open) => {
          if (!open) setEditCompanyId(null);
        }}
        onSaved={async () => {
          await load(true);
          await refreshAuthCompanies();
        }}
      />

      <AlertDialog
        open={Boolean(toggleTarget)}
        onOpenChange={() => !toggling && setToggleTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleTarget && isCompanyActive(toggleTarget)
                ? "Deactivate company?"
                : "Activate company?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleTarget && isCompanyActive(toggleTarget) ? (
                <>
                  &ldquo;{toggleTarget.name}&rdquo; will be hidden from login
                  and workspace selection until you activate it again.
                </>
              ) : (
                <>
                  &ldquo;{toggleTarget?.name}&rdquo; will become available again
                  for you and your team.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={toggling}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleStatus} disabled={toggling}>
              {toggling
                ? "Saving..."
                : toggleTarget && isCompanyActive(toggleTarget)
                  ? "Deactivate"
                  : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(restoreTarget)}
        onOpenChange={() => !restoring && setRestoreTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore company?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{restoreTarget?.name}&rdquo; will be restored and
              reactivated. All business data will remain intact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoring}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore} disabled={restoring}>
              {restoring ? "Restoring..." : "Restore"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CompanyDeleteDialog
        company={deleteTarget}
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onDeleted={handleCompanyDeleted}
      />

      <CompanyBulkDeleteDialog
        companies={selectedCompanies}
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        onComplete={handleBulkDeleteComplete}
      />

      <CompanyForceDeleteDialog
        company={forceDeleteTarget}
        open={Boolean(forceDeleteTarget)}
        onOpenChange={(open) => {
          if (!open) setForceDeleteTarget(null);
        }}
        onDeleted={handleForceDeleted}
      />

      <CompanyEmptyTrashDialog
        count={trashRows.length}
        open={emptyTrashOpen}
        onOpenChange={setEmptyTrashOpen}
        onEmptied={handleTrashEmptied}
      />
    </Fragment>
  );
}
