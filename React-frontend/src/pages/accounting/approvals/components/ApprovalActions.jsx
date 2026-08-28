import { useState } from 'react';
import { Check, Loader2, RotateCcw, X } from 'lucide-react';
import { toast } from 'sonner';
import { approvalActionsApi } from '../api/approvals.api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCan } from '@/hooks/use-can';

export function ApprovalActions({
  type,
  recordId,
  status,
  onUpdated,
  compact,
  showReturn = true,
}) {
  const canApprove = useCan('approvals.approve');
  const [loading, setLoading] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [notes, setNotes] = useState('');
  const current = status || 'approved';

  if (current !== 'pending' || !canApprove) return null;

  const open = (action) => {
    setNotes('');
    setDialog(action);
  };

  const confirm = async () => {
    if (!dialog) return;
    setLoading(dialog);
    try {
      const res =
        dialog === 'approve'
          ? await approvalActionsApi.approve(type, recordId, notes)
          : dialog === 'return'
            ? await approvalActionsApi.returnForRevision(type, recordId, notes)
            : await approvalActionsApi.reject(type, recordId, notes);
      toast.success(res.data?.message || 'Done');
      setDialog(null);
      onUpdated?.(res.data?.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || `Could not ${dialog} record`);
    } finally {
      setLoading(null);
    }
  };

  const size = compact ? 'icon' : 'sm';

  return (
    <>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          size={size}
          variant="mono"
          disabled={!!loading}
          onClick={() => open('approve')}
          title="Approve"
        >
          {loading === 'approve' ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          {!compact && <span className="ml-1">Approve</span>}
        </Button>
        <Button
          type="button"
          size={size}
          variant="outline"
          className="text-destructive border-destructive/30"
          disabled={!!loading}
          onClick={() => open('reject')}
          title="Reject"
        >
          {loading === 'reject' ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
          {!compact && <span className="ml-1">Reject</span>}
        </Button>
        {showReturn && (
          <Button
            type="button"
            size={size}
            variant="outline"
            disabled={!!loading}
            onClick={() => open('return')}
            title="Return for revision"
          >
            {loading === 'return' ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RotateCcw className="size-4" />
            )}
            {!compact && <span className="ml-1">Return</span>}
          </Button>
        )}
      </div>

      <Dialog open={!!dialog} onOpenChange={(openState) => !openState && setDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialog === 'approve' ? 'Approve document' : dialog === 'return' ? 'Return for revision' : 'Reject document'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="approval-notes">Notes</Label>
            <Textarea
              id="approval-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={dialog === 'approve' ? 'Optional approval notes' : 'Reason (optional)'}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button type="button" variant="mono" disabled={!!loading} onClick={confirm}>
              {loading ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
