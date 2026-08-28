import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import {
  ArrowLeft,
  CheckCircle,
  ExternalLink,
  FileText,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { billsApi } from './api/bills.api';
import { BILL_STATUSES, STATUS_COLORS, APPROVAL_COLORS, formatCurrency } from './constants';
import { BillShowActions } from './components/BillShowActions';
import { BillDocument } from './components/BillDocument';
import { BillPrintDocument } from './components/BillPrintDocument';
import { BillPaymentOffcanvas } from '../bill-payments/components/BillPaymentOffcanvas';
import { DocumentAttachmentsReadOnly } from '@/components/accounting/DocumentAttachmentsSection';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { printBillDocument } from '@/lib/print-bill';
import { cn } from '@/lib/utils';
import { documentNumberLabel } from '@/pages/accounting/lib/documentNumber';
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

export function BillShowPage() {
  const { id: workspaceId, billId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const base = `/workspace/${workspaceId}/accounting/bills`;
  const jobOrderBase = `/workspace/${workspaceId}/accounting/job-orders`;
  const paymentBase = `/workspace/${workspaceId}/accounting/bill-payments`;
  const vendorBase = `/workspace/${workspaceId}/accounting/vendors`;
  const journalBase = `/workspace/${workspaceId}/accounting/journal`;

  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const load = () => {
    setLoading(true);
    billsApi
      .show(billId)
      .then((res) => setBill(res.data?.data || null))
      .catch((err) => {
        toast.error(err?.response?.data?.message || 'Failed to load bill');
        setBill(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [billId]);

  useEffect(() => {
    if (searchParams.get('pay') === '1' && bill) {
      setPaymentOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, bill, setSearchParams]);

  useEffect(() => {
    if (searchParams.get('print') !== '1' || !bill || loading) return;
    const t = window.setTimeout(() => printBillDocument(), 400);
    setSearchParams({}, { replace: true });
    return () => window.clearTimeout(t);
  }, [searchParams, bill, loading, setSearchParams]);

  const handleCancel = async () => {
    setActionLoading(true);
    try {
      const res = await billsApi.cancel(billId);
      toast.success(res.data?.message || 'Bill cancelled');
      setConfirmCancel(false);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not cancel bill');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      const res = await billsApi.destroy(billId);
      toast.success(res.data?.message || 'Bill deleted');
      navigate(base);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not delete bill');
    } finally {
      setActionLoading(false);
      setConfirmDelete(false);
    }
  };

  const handlePost = async () => {
    setPosting(true);
    try {
      const res = await billsApi.post(billId);
      toast.success(res.data?.message || 'Bill posted');
      setBill(res.data?.data || null);
      if (!res.data?.data) load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not post bill');
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <FileText className="size-12 text-muted-foreground" />
        <p className="text-muted-foreground">Bill not found</p>
        <Button asChild>
          <Link to={base}>
            <ArrowLeft className="size-4 mr-1" /> Back to Bills
          </Link>
        </Button>
      </div>
    );
  }

  const flags = bill.flags || {};
  const status = bill.status || 'draft';
  const approval = bill.approval_status || 'approved';
  const statusLabel = BILL_STATUSES.find((s) => s.value === status)?.label || status;
  const currency = bill.currency || 'USD';
  const payments = bill.payment_applications || [];
  const balanceDue = Number(bill.balance_due) || 0;

  return (
    <div className="space-y-4 w-full min-w-0 print:space-y-2">
      {bill.job_order?.id ? (
        <div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 print:hidden">
          <p className="text-sm text-violet-900">
            <span className="font-medium">Linked job order</span>{' '}
            <Link
              to={`${jobOrderBase}/${bill.job_order.id}`}
              className="inline-flex items-center gap-1 font-semibold text-violet-700 hover:underline"
            >
              {bill.job_order.job_number || `JO-${bill.job_order.id}`}
              <ExternalLink className="size-3.5" />
            </Link>
            {bill.job_order.title ? (
              <span className="text-violet-700/80"> — {bill.job_order.title}</span>
            ) : null}
          </p>
        </div>
      ) : null}

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link to={base} className="hover:text-foreground">
              Bills
            </Link>
            <span>/</span>
            <span>{bill.bill_number}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">Bill {bill.bill_number}</h1>
            <Badge
              variant="outline"
              className={cn(
                'rounded-full font-normal capitalize',
                STATUS_COLORS[status] || STATUS_COLORS.draft,
              )}
            >
              {statusLabel}
            </Badge>
            {approval !== 'approved' ? (
              <Badge
                variant="outline"
                className={cn(
                  'rounded-full font-normal capitalize',
                  APPROVAL_COLORS[approval],
                )}
              >
                {approval}
              </Badge>
            ) : null}
            {bill.is_posted ? (
              <Badge
                variant="outline"
                className="rounded-full font-normal border-emerald-200 bg-emerald-50 text-emerald-700"
              >
                Posted
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="rounded-full font-normal border-slate-200 bg-slate-50 text-slate-500"
              >
                Unposted
              </Badge>
            )}
          </div>
          {bill.vendor?.name ? (
            <p className="text-sm text-muted-foreground mt-0.5">
              {bill.vendor.id ? (
                <Link
                  to={`${vendorBase}/${bill.vendor.id}/edit`}
                  className="hover:text-foreground hover:underline"
                >
                  {bill.vendor.name}
                </Link>
              ) : (
                bill.vendor.name
              )}
            </p>
          ) : null}
        </div>

        <BillShowActions
          workspaceId={workspaceId}
          billId={billId}
          bill={bill}
          base={base}
          canEdit={flags.can_edit}
          canPost={flags.can_post}
          canRecordPayment={flags.can_record_payment}
          canCancel={flags.can_cancel}
          canDelete={flags.can_delete}
          onPost={handlePost}
          onRecordPayment={() => setPaymentOpen(true)}
          onCancel={() => setConfirmCancel(true)}
          onDelete={() => setConfirmDelete(true)}
          posting={posting}
          busy={actionLoading}
        />
      </div>

      {['open', 'partial'].includes(status) && balanceDue > 0 ? (
        <div
          className={cn(
            'rounded-lg border px-4 py-2.5 text-sm print:hidden',
            'flex flex-wrap items-center gap-2',
            'border-amber-200/80 bg-amber-50/50',
          )}
        >
          <span className="font-medium text-amber-900">Balance due:</span>
          <span className="font-semibold tabular-nums text-amber-800">
            {formatCurrency(balanceDue, currency)}
          </span>
          <span className="text-muted-foreground">— use Record payment when paid.</span>
        </div>
      ) : null}

      <div className="min-w-0 space-y-4">
        <div className="max-w-[800px] mx-auto w-full">
          <BillDocument bill={bill} workspaceId={workspaceId} />
          <BillPrintDocument bill={bill} />
        </div>

        {payments.length > 0 ? (
          <div className="max-w-[800px] mx-auto w-full border-t pt-4 print:hidden">
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
              Payments applied
            </p>
            <div className="space-y-2">
              {payments.map((p) => {
                const cash = Number(p.amount_applied) || 0;
                const discount = Number(p.settlement_discount) || 0;
                const hasDiscount = discount > 0.0001;
                return (
                  <div
                    key={p.id}
                    className="flex justify-between gap-3 text-sm p-2.5 rounded-lg border bg-emerald-50/50"
                  >
                    <span className="flex flex-col gap-0.5 min-w-0">
                      <span className="flex items-center gap-2">
                        <CheckCircle className="size-4 text-emerald-600 shrink-0" />
                        {p.bill_payment_id ? (
                          <Link
                            to={`${paymentBase}/${p.bill_payment_id}`}
                            className="font-medium hover:underline"
                          >
                            {documentNumberLabel(p.payment_number, p.payment_reference)}
                          </Link>
                        ) : (
                          <span>{documentNumberLabel(p.payment_number, p.payment_reference)}</span>
                        )}
                      </span>
                      {hasDiscount ? (
                        <span className="pl-6 text-[11px] text-muted-foreground">
                          Cash {formatCurrency(cash, currency)}
                          {' · '}
                          Settlement discount {formatCurrency(discount, currency)}
                        </span>
                      ) : null}
                    </span>
                    <span className="font-medium tabular-nums shrink-0 text-right">
                      {formatCurrency(hasDiscount ? cash + discount : cash, currency)}
                    </span>
                  </div>
                );
              })}
            </div>
            {Number(bill.settlement_discount_total) > 0.0001 ? (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Settlement discount on this bill:{' '}
                <span className="font-medium tabular-nums text-foreground">
                  {formatCurrency(bill.settlement_discount_total, currency)}
                </span>
                {' '}(write-off at payment — not cash paid)
              </p>
            ) : null}
          </div>
        ) : null}

        {(bill.journal_entry_id || bill.vendor?.id) && (
          <div className="max-w-[800px] mx-auto w-full border-t pt-4 print:hidden">
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
              Related
            </p>
            <div className="flex flex-wrap gap-2">
              {bill.vendor?.id ? (
                <Button variant="outline" size="sm" asChild>
                  <Link to={`${vendorBase}/${bill.vendor.id}/edit`}>Vendor</Link>
                </Button>
              ) : null}
              {bill.journal_entry_id ? (
                <Button variant="outline" size="sm" asChild>
                  <Link to={`${journalBase}/${bill.journal_entry_id}`}>
                    Journal #{bill.journal_entry_id}
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
        )}

        <div className="max-w-[800px] mx-auto w-full print:hidden mt-4">
          <DocumentAttachmentsReadOnly
            documentType="bill"
            documentId={bill.id}
            attachments={bill.attachments}
          />
        </div>
      </div>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel bill?</AlertDialogTitle>
            <AlertDialogDescription>
              Cancel this bill? Posted journal entries will be reversed and inventory adjusted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Keep bill</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={actionLoading}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {actionLoading ? 'Cancelling…' : 'Cancel bill'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete bill?"
        description={
          bill.is_posted
            ? `Permanently delete bill ${bill.bill_number}? The posted journal entry will be reversed and inventory adjusted.`
            : `Permanently delete bill ${bill.bill_number}? This cannot be undone.`
        }
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
        isLoading={actionLoading}
      />

      <BillPaymentOffcanvas
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        preselectBillId={billId}
        preselectVendorId={bill.vendor_id ? String(bill.vendor_id) : null}
        onSuccess={() => load()}
      />
    </div>
  );
}
