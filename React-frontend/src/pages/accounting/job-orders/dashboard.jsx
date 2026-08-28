import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useJobOrderDashboard } from './hooks/useJobOrderDashboard';
import { jobOrdersApi } from './api/job-orders.api';
import { JobOrdersListTable } from './components/JobOrdersListTable';
import { JobOrderFormDialog } from './components/JobOrderFormDialog';
import { JobOrderViewDialog } from './components/JobOrderViewDialog';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

const CORE_KPI_KEYS = ['open_jobs', 'in_progress', 'completed', 'delayed'];

function DashboardSkeleton() {
  return (
    <div className="grid gap-4 animate-pulse">
      <div className="mb-6 grid grid-cols-2 gap-5 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-32 rounded-xl border-0 bg-white shadow-sm"
          />
        ))}
      </div>
      <div className="h-112 rounded-xl border border-[#E2E8F0] bg-muted/40" />
    </div>
  );
}

export function JobOrdersDashboardPage() {
  const { data, loading, reload } = useJobOrderDashboard();

  // Modal open/close state + the job the user last clicked (View, Edit, or
  // Delete). Only one of these is ever open at a time; switching from one
  // modal to another (e.g. "Edit" inside the View modal) closes the first
  // and opens the next with the same selectedJob.
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [canCreate, setCanCreate] = useState(false);

  useEffect(() => {
    jobOrdersApi
      .formOptions()
      .then((res) => setCanCreate(!!res.data?.data?.can_create))
      .catch(() => {});
  }, []);

  // Bumped after every successful create/update/delete so JobOrdersListTable
  // re-runs its fetch; combined with reload() (the KPI/analytics hook) this
  // is the "re-run both fetchers" refresh the dashboard needs after any
  // mutation, with no page reload.
  const [refreshToken, setRefreshToken] = useState(0);
  const refreshAll = useCallback(() => {
    reload();
    setRefreshToken((t) => t + 1);
  }, [reload]);

  const openView = useCallback((job) => {
    setSelectedJob(job);
    setIsViewOpen(true);
  }, []);
  const openEdit = useCallback((job) => {
    setSelectedJob(job);
    setIsViewOpen(false);
    setIsEditOpen(true);
  }, []);
  const openDelete = useCallback((job) => {
    setSelectedJob(job);
    setIsViewOpen(false);
    setIsDeleteOpen(true);
  }, []);

  const handleCreateSuccess = useCallback(() => {
    setIsCreateOpen(false);
    refreshAll();
  }, [refreshAll]);

  const handleEditSuccess = useCallback(() => {
    setIsEditOpen(false);
    setSelectedJob(null);
    refreshAll();
  }, [refreshAll]);

  const handleConfirmDelete = useCallback(async () => {
    if (!selectedJob) return;
    setIsDeleting(true);
    try {
      await jobOrdersApi.delete(selectedJob.id);
      toast.success('Job order deleted');
      setIsDeleteOpen(false);
      setSelectedJob(null);
      refreshAll();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not delete job order');
    } finally {
      setIsDeleting(false);
    }
  }, [selectedJob, refreshAll]);

  const coreKpis = useMemo(
    () => (data?.kpis || []).filter((kpi) => CORE_KPI_KEYS.includes(kpi.key)),
    [data?.kpis],
  );
  const deleteBlockers = selectedJob?.flags?.delete_blockers || [];
  const deleteBlocked = deleteBlockers.length > 0;

  if (loading && !data) {
    return (
      <div className="w-full min-w-0">
        <PageHeader title="Jobs" subtitle="Open work and deadlines at a glance." />
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="grid gap-4 pb-6 w-full min-w-0">
      <PageHeader
        title="Jobs"
        subtitle="Overview, priorities, and your full job list in one place."
        actions={
          canCreate && (
            <Button size="sm" variant="mono" onClick={() => setIsCreateOpen(true)}>
              <Plus className="size-4 mr-1" /> New job
            </Button>
          )
        }
      />

      <JobOrdersListTable
        summaryKpis={coreKpis}
        onView={openView}
        onEdit={openEdit}
        onDelete={openDelete}
        refreshSignal={refreshToken}
      />

      <JobOrderFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        mode="create"
        onSuccess={handleCreateSuccess}
      />

      <JobOrderFormDialog
        open={isEditOpen}
        onOpenChange={(next) => {
          setIsEditOpen(next);
          if (!next) setSelectedJob(null);
        }}
        mode="edit"
        jobOrderId={selectedJob?.id}
        onSuccess={handleEditSuccess}
      />

      <JobOrderViewDialog
        open={isViewOpen}
        onOpenChange={(next) => {
          setIsViewOpen(next);
          if (!next) setSelectedJob(null);
        }}
        jobOrderId={selectedJob?.id}
        onEdit={openEdit}
        onDelete={openDelete}
      />

      <ConfirmDialog
        open={isDeleteOpen}
        title={deleteBlocked ? 'Job order cannot be deleted' : 'Delete job order?'}
        description={
          deleteBlocked ? (
            <span className="block space-y-2">
              <span className="block">
                {selectedJob?.flags?.delete_blocker_message ||
                  'This job order has linked documents.'}
              </span>
              <span className="block rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                {deleteBlockers.map((item) => (
                  <span key={item.type} className="block font-medium">
                    {item.label}: {item.count}
                  </span>
                ))}
              </span>
              <span className="block">
                Open the linked documents and remove their job-order link before deleting.
              </span>
            </span>
          ) : (
            `Delete ${selectedJob?.job_number || 'this job'}? This cannot be undone.`
          )
        }
        confirmLabel={deleteBlocked ? 'Delete unavailable' : 'Delete'}
        confirmVariant="destructive"
        confirmDisabled={deleteBlocked}
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          if (isDeleting) return;
          setIsDeleteOpen(false);
          setSelectedJob(null);
        }}
      />
    </div>
  );
}
