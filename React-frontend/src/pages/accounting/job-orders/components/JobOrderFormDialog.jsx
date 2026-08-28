import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BriefcaseBusiness } from 'lucide-react';
import { JobOrderForm } from './JobOrderForm';
import { useJobOrderForm } from '../hooks/useJobOrderForm';

/**
 * Create/Edit job order form rendered inside a Dialog instead of a separate
 * page. Reuses the exact same useJobOrderForm hook + JobOrderForm component
 * the old create.jsx/edit.jsx pages used — only the success/cancel behavior
 * differs (close the dialog + let the caller refresh, instead of navigate()).
 *
 * Mounted only while `open` so useJobOrderForm resets to a clean slate each
 * time it's opened (new create, or edit for a different job).
 */
function JobOrderFormDialogContent({ mode, jobOrderId, onCancel, onSuccess }) {
  const formProps = useJobOrderForm({
    mode,
    jobOrderId,
    onSuccess,
  });

  return (
    <JobOrderForm {...formProps} onSubmit={formProps.handleSubmit} onCancel={onCancel} />
  );
}

export function JobOrderFormDialog({ open, onOpenChange, mode = 'create', jobOrderId, onSuccess }) {
  const isEdit = mode === 'edit';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/*
        Wider modal (5xl ≈ 1024px) so the two-column form doesn't cram fields.
        The overlay override drops `backdrop-blur-sm` — that blur is the main
        cause of the sluggish open/close feel on lower-end GPUs — and lightens
        the dim from 40% to 25% so the page behind stays readable.
      */}
      <DialogContent
        className="flex h-[94vh] max-h-[94vh] w-[98vw] max-w-[1400px]! flex-col gap-0 overflow-hidden border-slate-200 bg-white p-0 text-slate-950 shadow-2xl"
        overlayClassName="bg-slate-950/35 backdrop-blur-[2px]"
      >
        <DialogHeader className="shrink-0 border-b border-slate-200 bg-white px-6 py-5 sm:px-8">
          <div className="flex items-start gap-3.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <BriefcaseBusiness className="size-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg font-semibold tracking-tight text-slate-950">
                {isEdit ? 'Edit job order' : 'Create job order'}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-slate-500">
                {isEdit
                  ? 'Keep the job brief, schedule, ownership, and supporting files up to date.'
                  : 'Create a clear work brief, assign ownership, and attach supporting files.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogBody className="min-h-0 flex-1 overflow-y-auto bg-white px-6 py-6 sm:px-8">
          {open ? (
            <JobOrderFormDialogContent
              key={isEdit ? `edit-${jobOrderId}` : 'create'}
              mode={mode}
              jobOrderId={jobOrderId}
              onCancel={() => onOpenChange(false)}
              onSuccess={onSuccess}
            />
          ) : null}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
