import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import {
  Edit3,
  Link2,
  Loader2,
  Printer,
  Trash2,
  Banknote,
  Receipt,
} from 'lucide-react';
import { toast } from 'sonner';
import { paymentsApi } from './api/payments.api';
import { formatCurrency, resolveDepositAccountLabel } from './constants';
import { documentNumberLabel } from '@/pages/accounting/lib/documentNumber';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { ApplyUnappliedDialog } from './components/ApplyUnappliedDialog';
import { PaymentEditSheet } from './components/PaymentEditSheet';
import { LinkToAccountDialog } from './components/LinkToAccountDialog';
import { PaymentReceiptDocument } from './components/PaymentReceiptDocument';
import { printPaymentReceiptDocument } from '@/lib/print-payment-receipt';
import { cn } from '@/lib/utils';

export function PaymentShowPage() {
  const { id: workspaceId, paymentId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const base = `/workspace/${workspaceId}/accounting/payments`;

  const [payment, setPayment] = useState(null);
  const [depositAccounts, setDepositAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([paymentsApi.show(paymentId), paymentsApi.formOptions()])
      .then(([showRes, optRes]) => {
        setPayment(showRes.data?.data || null);
        setDepositAccounts(optRes.data?.data?.deposit_accounts || []);
      })
      .catch((err) => {
        toast.error(err?.response?.data?.message || 'Failed to load payment');
        setPayment(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [paymentId]);

  useEffect(() => {
    if (searchParams.get('apply') === '1' && payment?.flags?.can_apply_unapplied) {
      setApplyOpen(true);
    }
  }, [payment, searchParams]);

  useEffect(() => {
    if (searchParams.get('print') === '1' && payment && !loading) {
      const t = setTimeout(() => printPaymentReceiptDocument(), 400);
      return () => clearTimeout(t);
    }
  }, [payment, loading, searchParams]);

  const depositAccountLabel = useMemo(
    () => resolveDepositAccountLabel(depositAccounts, payment?.deposit_account_id),
    [depositAccounts, payment?.deposit_account_id],
  );

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await paymentsApi.delete(paymentId);
      toast.success('Payment deleted');
      navigate(base);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not delete payment');
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Receipt className="size-12 text-muted-foreground" />
        <p className="text-muted-foreground">Receipt not found</p>
        <Button asChild>
          <Link to={base}>Back to receipts</Link>
        </Button>
      </div>
    );
  }

  const currency = payment.currency || 'USD';
  const flags = payment.flags || {};
  const unapplied = Number(payment.unapplied_amount) || 0;

  return (
    <div className="space-y-4 w-full min-w-0 print:space-y-2">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link to={base} className="hover:text-foreground">
              Receipts
            </Link>
            <span>/</span>
            <span>{documentNumberLabel(payment.receipt_number)}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">
              Receipt {documentNumberLabel(payment.receipt_number)}
            </h1>
            {payment.is_posted ? (
              <Badge
                variant="outline"
                className="rounded-full font-normal text-emerald-700 border-emerald-200 bg-emerald-50"
              >
                Posted
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="rounded-full font-normal text-amber-700 border-amber-200 bg-amber-50"
              >
                Unposted
              </Badge>
            )}
            {unapplied > 0.001 ? (
              <Badge
                variant="outline"
                className="rounded-full font-normal text-amber-800 border-amber-200 bg-amber-50"
              >
                Prepaid
              </Badge>
            ) : null}
          </div>
          {payment.customer?.name ? (
            <p className="text-sm text-muted-foreground mt-0.5">{payment.customer.name}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => printPaymentReceiptDocument()}>
            <Printer className="size-4 mr-1" /> Print
          </Button>
          {flags.can_apply_unapplied ? (
            <Button variant="outline" size="sm" onClick={() => setApplyOpen(true)}>
              <Banknote className="size-4 mr-1" /> Apply to invoices
            </Button>
          ) : null}
          {flags.can_link_to_account ? (
            <Button variant="outline" size="sm" onClick={() => setLinkOpen(true)}>
              <Link2 className="size-4 mr-1" /> Link to account
            </Button>
          ) : null}
          {flags.can_edit ? (
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Edit3 className="size-4 mr-1" /> Edit
            </Button>
          ) : null}
          {flags.can_delete ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="size-4 mr-1" /> Delete
            </Button>
          ) : null}
        </div>
      </div>

      {unapplied > 0.001 ? (
        <div
          className={cn(
            'rounded-lg border px-4 py-2.5 text-sm print:hidden',
            'flex flex-wrap items-center justify-between gap-3',
            'border-amber-200/80 bg-amber-50/50',
          )}
        >
          <p>
            <span className="font-medium text-amber-900">Prepaid balance:</span>{' '}
            <span className="font-semibold tabular-nums text-amber-800">
              {formatCurrency(unapplied, currency)}
            </span>{' '}
            <span className="text-muted-foreground">not yet applied to an invoice.</span>
          </p>
          {flags.can_apply_unapplied ? (
            <Button size="sm" variant="outline" onClick={() => setApplyOpen(true)}>
              Apply now
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="max-w-[800px] mx-auto w-full min-w-0">
        <PaymentReceiptDocument
          payment={payment}
          workspaceId={workspaceId}
          depositAccountLabel={depositAccountLabel}
        />
      </div>

      <ApplyUnappliedDialog
        open={applyOpen}
        onOpenChange={setApplyOpen}
        paymentId={paymentId}
        onSuccess={(updated) => {
          if (updated) setPayment(updated);
          else load();
        }}
      />

      <LinkToAccountDialog
        open={linkOpen}
        onOpenChange={setLinkOpen}
        paymentId={paymentId}
        depositAccounts={depositAccounts}
        onSuccess={(updated) => {
          if (updated) setPayment(updated);
          else load();
        }}
      />

      <PaymentEditSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        workspaceId={workspaceId}
        editPaymentId={editOpen ? paymentId : null}
        onSuccess={() => {
          setEditOpen(false);
          load();
        }}
      />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete payment?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete receipt {payment.receipt_number}? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="size-4 mr-1 animate-spin" /> Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
