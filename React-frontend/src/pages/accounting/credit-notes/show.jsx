import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  ArrowLeft,
  Edit3,
  Loader2,
  Printer,
  Trash2,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { creditNotesApi } from './api/credit-notes.api';
import { formatCurrency } from './constants';
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
import { ManageCreditNoteDialog } from './components/ManageCreditNoteDialog';
import { CreditNoteTransactionTicket } from './components/CreditNoteTransactionTicket';

export function CreditNoteShowPage() {
  const { id: workspaceId, creditNoteId } = useParams();
  const navigate = useNavigate();
  const base = `/workspace/${workspaceId}/accounting/credit-notes`;
  const invoiceBase = `/workspace/${workspaceId}/accounting/invoices`;

  const [creditNote, setCreditNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  const load = () => {
    setLoading(true);
    creditNotesApi
      .show(creditNoteId)
      .then((res) => setCreditNote(res.data?.data || null))
      .catch((err) => {
        toast.error(err?.response?.data?.message || 'Failed to load credit note');
        setCreditNote(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [creditNoteId]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await creditNotesApi.delete(creditNoteId);
      toast.success('Credit note deleted');
      navigate(base);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not delete credit note');
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!creditNote) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground mb-4">Credit note not found</p>
        <Button asChild>
          <Link to={base}>Back to credit notes</Link>
        </Button>
      </div>
    );
  }

  const currency = creditNote.currency || 'USD';
  const flags = creditNote.flags || {};
  const remaining = Number(creditNote.remaining_amount) || 0;

  return (
    <div className="min-h-full w-full min-w-0 bg-[#F8FAFC]">
      <div className="mx-auto w-full max-w-5xl space-y-5 px-6 py-6 md:px-8 print:max-w-none print:bg-white print:px-0 print:py-0">
        <div className="print:hidden">
          <PageHeader
            title={creditNote.credit_note_number}
            subtitle={creditNote.customer?.name}
            actions={
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link to={base}>
                    <ArrowLeft className="size-4 mr-1" /> Back
                  </Link>
                </Button>
                {flags.can_manage && (
                  <Button variant="outline" size="sm" onClick={() => setManageOpen(true)}>
                    <Wallet className="size-4 mr-1" /> Manage credit
                  </Button>
                )}
                {flags.can_edit && (
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`${base}/${creditNoteId}/edit`}>
                      <Edit3 className="size-4 mr-1" /> Edit
                    </Link>
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                  <Printer className="size-4 mr-1" /> Print
                </Button>
                {flags.can_delete && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Trash2 className="size-4 mr-1" /> Delete
                  </Button>
                )}
              </div>
            }
          />
        </div>

        {remaining > 0.001 && flags.can_manage && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-teal-200 bg-teal-50/60 p-4 print:hidden dark:bg-teal-950/20">
            <p className="text-sm">
              <strong>Remaining credit:</strong>{' '}
              {formatCurrency(remaining, currency)} available to apply or refund.
            </p>
            <Button size="sm" variant="outline" onClick={() => setManageOpen(true)}>
              Manage credit
            </Button>
          </div>
        )}

        <CreditNoteTransactionTicket
          creditNote={creditNote}
          currency={currency}
          invoiceBase={invoiceBase}
        />

        {(creditNote.applications || []).length > 0 && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-3 sm:px-6">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Applied to invoices
              </h3>
            </div>
            <ul className="divide-y divide-slate-100">
              {creditNote.applications.map((app) => (
                <li
                  key={app.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 sm:px-6"
                >
                  <div className="min-w-0">
                    {app.invoice_id ? (
                      <Link
                        to={`${invoiceBase}/${app.invoice_id}`}
                        className="text-sm font-medium text-blue-600 hover:underline"
                      >
                        {app.invoice_number || `Invoice #${app.invoice_id}`}
                      </Link>
                    ) : (
                      <span className="text-sm text-slate-500">—</span>
                    )}
                    <p className="mt-0.5 text-xs text-slate-500">{app.created_at || '—'}</p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums text-slate-800">
                    {formatCurrency(app.amount_applied, currency)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        <ManageCreditNoteDialog
          open={manageOpen}
          onOpenChange={setManageOpen}
          creditNoteId={creditNoteId}
          onSuccess={(updated) => {
            if (updated) setCreditNote(updated);
            else load();
          }}
        />

        <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete credit note?</AlertDialogTitle>
              <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
