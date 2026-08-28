import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { deliveryNotesApi } from './api/delivery-notes.api';
import { DELIVERY_NOTE_STATUSES } from './constants';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { DeliveryNoteShowActions } from './components/DeliveryNoteShowActions';
import { DeliveryNoteShowDetail } from './components/DeliveryNoteShowDetail';
import { DocumentActionConfirmDialog } from '../components/DocumentActionConfirmDialog';
import {
  confirmDeleteMessage,
  confirmDeliveryNoteCancelMessage,
  confirmDeliveryNoteConfirmMessage,
} from '../components/document-confirm-messages';

export function DeliveryNoteShowPage() {
  const { id: workspaceId, deliveryNoteId } = useParams();
  const navigate = useNavigate();
  const base = `/workspace/${workspaceId}/accounting/delivery-notes`;

  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = () => {
    setLoading(true);
    deliveryNotesApi
      .show(deliveryNoteId)
      .then((res) => setNote(res.data?.data || null))
      .catch((err) => {
        toast.error(err?.response?.data?.message || 'Failed to load delivery note');
        setNote(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [deliveryNoteId]);

  const closeConfirm = () => {
    if (!actionLoading) setConfirmAction(null);
  };

  const confirmMessage = useMemo(() => {
    if (!confirmAction || !note) return null;
    const num = note.dn_number;
    switch (confirmAction) {
      case 'delete':
        return confirmDeleteMessage('delivery note', num);
      case 'confirm':
        return confirmDeliveryNoteConfirmMessage(num);
      case 'cancel':
        return confirmDeliveryNoteCancelMessage(num);
      default:
        return null;
    }
  }, [confirmAction, note]);

  const runConfirmedAction = async () => {
    if (!confirmAction) return;

    setActionLoading(true);
    try {
      if (confirmAction === 'delete') {
        await deliveryNotesApi.delete(deliveryNoteId);
        toast.success('Delivery note deleted');
        navigate(base);
        return;
      }
      if (confirmAction === 'confirm') {
        const res = await deliveryNotesApi.confirm(deliveryNoteId);
        setNote(res.data?.data || note);
        toast.success(res.data?.message || 'Delivery note confirmed');
      }
      if (confirmAction === 'cancel') {
        const res = await deliveryNotesApi.cancel(deliveryNoteId);
        setNote(res.data?.data || note);
        toast.success(res.data?.message || 'Delivery note cancelled');
      }
      setConfirmAction(null);
    } catch (err) {
      const messages = {
        delete: 'Could not delete delivery note',
        confirm: 'Could not confirm delivery note',
        cancel: 'Could not cancel delivery note',
      };
      toast.error(err?.response?.data?.message || messages[confirmAction]);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-muted-foreground">
        <Loader2 className="size-8 animate-spin text-sky-600" />
        <p className="text-sm">Loading delivery note…</p>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground mb-4">Delivery note not found</p>
        <Button asChild>
          <Link to={base}>Back to delivery notes</Link>
        </Button>
      </div>
    );
  }

  const status = note.status || 'draft';
  const statusLabel =
    DELIVERY_NOTE_STATUSES.find((s) => s.value === status)?.label || status;
  const flags = note.flags || {};

  return (
    <div className="space-y-6 w-full min-w-0 print:space-y-4">
      <div className="print:hidden">
        <PageHeader
          title={note.dn_number}
          subtitle={`${note.customer?.name || 'Delivery'} · ${statusLabel}`}
          actions={
            <DeliveryNoteShowActions
              base={base}
              canConfirm={flags.can_confirm === true}
              canCancel={flags.can_cancel === true}
              canDelete={flags.can_delete === true}
              onConfirm={() => setConfirmAction('confirm')}
              onCancel={() => setConfirmAction('cancel')}
              onDelete={() => setConfirmAction('delete')}
              busy={actionLoading}
            />
          }
        />
      </div>

      <DeliveryNoteShowDetail note={note} workspaceId={workspaceId} />

      <DocumentActionConfirmDialog
        open={!!confirmAction}
        message={confirmMessage}
        isLoading={actionLoading}
        onConfirm={runConfirmedAction}
        onCancel={closeConfirm}
      />
    </div>
  );
}
