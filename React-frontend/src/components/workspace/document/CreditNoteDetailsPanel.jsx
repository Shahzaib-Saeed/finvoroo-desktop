import { useCallback, useEffect, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { creditNotesApi } from '@/pages/accounting/credit-notes/api/credit-notes.api';
import { formatCurrency, LIFECYCLE_COLORS } from '@/pages/accounting/credit-notes/constants';
import { InvoiceDrillLink } from '@/components/workspace/invoice/components/InvoiceDrillLink';
import { cn } from '@/lib/utils';

export function CreditNoteDetailsPanel({ creditNoteId, workspaceId }) {
  const [creditNote, setCreditNote] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCreditNote = useCallback(async () => {
    if (!creditNoteId) return;
    setLoading(true);
    try {
      const res = await creditNotesApi.show(creditNoteId);
      setCreditNote(res.data?.data || null);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load credit note');
      setCreditNote(null);
    } finally {
      setLoading(false);
    }
  }, [creditNoteId]);

  useEffect(() => {
    setCreditNote(null);
    fetchCreditNote();
  }, [fetchCreditNote]);

  if (!creditNoteId) return null;

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <Loader2 className="size-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!creditNote) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center gap-3 py-16 text-muted-foreground">
        <FileText className="size-10 opacity-50" />
        <p className="text-sm">Credit note not found</p>
      </div>
    );
  }

  const currency = creditNote.currency || 'USD';
  const lifecycle = creditNote.lifecycle_status || 'open';
  const remaining = Number(creditNote.remaining_amount) || 0;
  const hasLines = (creditNote.lines || []).length > 0;

  return (
    <ScrollArea className="flex-1 min-h-0">
      <div className="px-5 py-4">
        <div className="rounded-lg border bg-card shadow-sm p-4 sm:p-6 max-w-[900px] mx-auto">
          <div className="flex flex-col sm:flex-row sm:justify-between gap-4 mb-6 pb-4 border-b">
            <div>
              <h2 className="text-2xl font-bold text-amber-600 uppercase tracking-wide">
                Credit note
              </h2>
            </div>
            <div className="sm:text-right space-y-1">
              <p className="font-semibold text-lg">{creditNote.credit_note_number}</p>
              <p className="text-sm text-muted-foreground">
                {creditNote.credit_note_date_display || creditNote.credit_note_date}
              </p>
              <Badge
                variant="outline"
                className={cn('capitalize', LIFECYCLE_COLORS[lifecycle] || '')}
              >
                {creditNote.lifecycle_label || lifecycle.replace(/_/g, ' ')}
              </Badge>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-xs font-bold uppercase text-muted-foreground mb-2">Customer</h3>
              <p className="font-semibold">{creditNote.customer?.name || '—'}</p>
              {creditNote.invoice ? (
                <p className="text-sm text-muted-foreground mt-2">
                  Linked invoice:{' '}
                  <InvoiceDrillLink
                    invoiceId={creditNote.invoice.id}
                    workspaceId={workspaceId}
                  >
                    {creditNote.invoice.invoice_number}
                  </InvoiceDrillLink>
                </p>
              ) : null}
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase text-muted-foreground mb-2">Amounts</h3>
              <dl className="text-sm space-y-1">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Total</dt>
                  <dd className="font-semibold tabular-nums">
                    {formatCurrency(creditNote.total, currency)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Applied</dt>
                  <dd className="tabular-nums">
                    {formatCurrency(creditNote.amount_applied, currency)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 font-medium">
                  <dt>Remaining</dt>
                  <dd className="tabular-nums text-primary">
                    {formatCurrency(remaining, currency)}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {creditNote.reason ? (
            <p className="text-sm text-muted-foreground mb-6">
              <span className="font-medium text-foreground">Reason:</span> {creditNote.reason}
            </p>
          ) : null}

          {hasLines ? (
            <div className="overflow-x-auto border rounded-md">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="p-2 text-left">Description</th>
                    <th className="p-2 text-right">Qty</th>
                    <th className="p-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {creditNote.lines.map((line) => (
                    <tr key={line.id} className="border-t">
                      <td className="p-2">{line.description}</td>
                      <td className="p-2 text-right tabular-nums">{line.quantity}</td>
                      <td className="p-2 text-right tabular-nums font-medium">
                        {formatCurrency(line.amount, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>
    </ScrollArea>
  );
}
