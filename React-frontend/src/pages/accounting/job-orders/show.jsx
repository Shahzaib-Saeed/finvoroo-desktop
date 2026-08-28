import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Briefcase, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { jobOrdersApi } from './api/job-orders.api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { JobOrderShowActions } from './components/JobOrderShowActions';
import { JobOrderBoardingPass } from './components/JobOrderBoardingPass';
import { JobOrderAttachmentPanel } from './components/JobOrderAttachmentPanel';

export function JobOrderShowPage() {
  const { id: workspaceId, jobOrderId } = useParams();
  const navigate = useNavigate();
  const base = `/workspace/${workspaceId}/accounting/job-orders`;
  const plByJobReport = `/workspace/${workspaceId}/accounting/reports/profit-loss-by-job`;

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback((options = {}) => {
    const { silent = false } = options;
    if (!silent) setLoading(true);
    jobOrdersApi
      .show(jobOrderId)
      .then((res) => setJob(res.data?.data || null))
      .catch((err) => {
        toast.error(err?.response?.data?.message || 'Failed to load job order');
        setJob(null);
      })
      .finally(() => {
        if (!silent) setLoading(false);
      });
  }, [jobOrderId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await jobOrdersApi.delete(jobOrderId);
      toast.success('Job order deleted');
      navigate(base);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not delete job order');
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 px-4">
        <div className="size-14 rounded-2xl bg-muted flex items-center justify-center">
          <Briefcase className="size-7 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">Job order not found</p>
        <Button asChild variant="outline">
          <Link to={base}>
            <ArrowLeft className="size-4 mr-1" /> Back to job orders
          </Link>
        </Button>
      </div>
    );
  }

  const status = job.status || 'scheduled';
  const flags = job.flags || {};
  const canDelete = flags.can_delete === true;
  const deleteBlockers = flags.delete_blockers || [];
  const canEdit = flags.can_edit !== false && status !== 'cancelled';
  const statusLabel = job.status_label || status;
  const subtitle = [job.title, job.customer?.name, statusLabel].filter(Boolean).join(' · ');

  const recordPaths = {
    invoiceCreate: `/workspace/${workspaceId}/accounting/invoices/create?job_order_id=${jobOrderId}`,
    expenseCreate: `/workspace/${workspaceId}/accounting/journal/create?job_order_id=${jobOrderId}`,
    billCreate: `/workspace/${workspaceId}/accounting/bills/create?job_order_id=${jobOrderId}`,
  };

  return (
    <div className="space-y-6 w-full min-w-0 print:space-y-4">
      <div className="print:hidden" data-jo-noprint>
        <nav className="text-sm text-muted-foreground mb-3 flex flex-wrap items-center gap-1.5">
          <Link to={base} className="hover:text-foreground transition-colors">
            Job orders
          </Link>
          <span aria-hidden>/</span>
          <span className="text-foreground font-medium">{job.job_number}</span>
        </nav>
        <PageHeader
          title={job.job_number}
          subtitle={subtitle}
          actions={
            <JobOrderShowActions
              base={base}
              plByJobReport={plByJobReport}
              jobOrderId={jobOrderId}
              canEdit={canEdit}
              canDelete={canDelete}
              paths={recordPaths}
              onDelete={() => setConfirmDelete(true)}
              deleting={deleting}
            />
          }
        />
      </div>

      {/* Printable job document summary */}
      <JobOrderBoardingPass job={job} />
      <div className="print:hidden" data-jo-noprint>
        <JobOrderAttachmentPanel jobOrderId={job.id} />
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {canDelete ? 'Delete job order?' : 'Job order cannot be deleted'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {canDelete ? (
                <>Delete {job.job_number}? This cannot be undone.</>
              ) : (
                <span className="block space-y-2">
                  <span className="block">
                    {flags.delete_blocker_message || 'This job order has linked documents.'}
                  </span>
                  <span className="block rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                    {deleteBlockers.map((item) => (
                      <span key={item.type} className="block font-medium">
                        {item.label}: {item.count}
                      </span>
                    ))}
                  </span>
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            {canDelete ? (
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            ) : null}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
