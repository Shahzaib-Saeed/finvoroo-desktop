import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Edit3, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { vendorCreditsApi } from './api/vendor-credits.api';
import { formatCurrency, STATUS_COLORS, APPROVAL_COLORS } from './constants';
import { PageHeader } from '@/components/ui/PageHeader';
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
import { cn } from '@/lib/utils';
import { VendorCreditEditDialog } from './components/VendorCreditEditDialog';

export function VendorCreditShowPage() {
  const { id: workspaceId, vendorCreditId } = useParams();
  const navigate = useNavigate();
  const base = `/workspace/${workspaceId}/accounting/vendor-credits`;
  const billsBase = `/workspace/${workspaceId}/accounting/bills`;

  const [credit, setCredit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    vendorCreditsApi
      .show(vendorCreditId)
      .then((res) => setCredit(res.data?.data || null))
      .catch((err) => {
        toast.error(err?.response?.data?.message || 'Failed to load vendor credit');
        setCredit(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [vendorCreditId]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await vendorCreditsApi.delete(vendorCreditId);
      toast.success('Vendor credit deleted');
      navigate(base);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not delete vendor credit');
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

  if (!credit) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground mb-4">Vendor credit not found</p>
        <Button asChild>
          <Link to={base}>Back to vendor credits</Link>
        </Button>
      </div>
    );
  }

  const currency = credit.currency || credit.bill?.currency || 'USD';
  const flags = credit.flags || {};
  const status = credit.status || 'draft';
  const approval = credit.approval_status || 'approved';
  const remaining = Number(credit.remaining_amount) || 0;

  return (
    <div className="space-y-6 w-full min-w-0 max-w-4xl mx-auto">
      <PageHeader
        title={credit.credit_number}
        subtitle={credit.vendor?.name}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={base}>
                <ArrowLeft className="size-4 mr-1" /> Back
              </Link>
            </Button>
            {flags.can_edit && (
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Edit3 className="size-4 mr-1" /> Edit
              </Button>
            )}
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

      <div className="rounded-lg border bg-card shadow-sm p-5 space-y-5">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className={cn('capitalize', STATUS_COLORS[status] || '')}>
            {status}
          </Badge>
          <Badge variant="outline" className={cn('capitalize', APPROVAL_COLORS[approval] || '')}>
            {approval}
          </Badge>
          {credit.is_posted && (
            <Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50">
              Posted
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Vendor</p>
            <p className="font-medium">{credit.vendor?.name || '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Credit date</p>
            <p className="font-medium">
              {credit.credit_date_display || credit.credit_date || '—'}
            </p>
          </div>
          {credit.bill && (
            <div>
              <p className="text-muted-foreground">Linked bill</p>
              <Link
                to={`${billsBase}/${credit.bill.id}`}
                className="font-medium text-primary hover:underline"
              >
                {credit.bill.bill_number}
              </Link>
            </div>
          )}
          <div>
            <p className="text-muted-foreground">Remaining</p>
            <p className="font-medium tabular-nums">
              {formatCurrency(remaining, currency)}
            </p>
          </div>
        </div>

        {credit.reason && (
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <span className="text-muted-foreground">Reason: </span>
            {credit.reason}
          </div>
        )}

        <div>
          <h3 className="font-medium mb-3">Line items</h3>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left font-medium px-3 py-2">Description</th>
                  <th className="text-right font-medium px-3 py-2">Qty</th>
                  <th className="text-right font-medium px-3 py-2">Price</th>
                  <th className="text-right font-medium px-3 py-2">Tax</th>
                  <th className="text-right font-medium px-3 py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(credit.lines || []).map((line) => (
                  <tr key={line.id} className="border-b last:border-0">
                    <td className="px-3 py-2">{line.description}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{line.quantity}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatCurrency(line.unit_price, currency)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatCurrency(line.tax_amount, currency)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">
                      {formatCurrency(line.amount, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/30">
                  <td colSpan={4} className="px-3 py-2 text-right text-muted-foreground">
                    Subtotal
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium">
                    {formatCurrency(credit.subtotal, currency)}
                  </td>
                </tr>
                <tr className="bg-muted/30">
                  <td colSpan={4} className="px-3 py-2 text-right text-muted-foreground">
                    Tax
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium">
                    {formatCurrency(credit.tax_amount, currency)}
                  </td>
                </tr>
                <tr className="bg-muted/30 font-semibold">
                  <td colSpan={4} className="px-3 py-2 text-right">
                    Total ({currency})
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-primary">
                    {formatCurrency(credit.total, currency)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete vendor credit?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {credit.credit_number}.{' '}
              {Number(credit.amount_applied || 0) > 0.001
                ? "This debit note has been applied to one or more bills — deleting it will also remove those vendor-credit application records and restore the affected bill(s)' outstanding balances. "
                : null}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <VendorCreditEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        vendorCreditId={vendorCreditId}
        onSuccess={() => load()}
      />
    </div>
  );
}
