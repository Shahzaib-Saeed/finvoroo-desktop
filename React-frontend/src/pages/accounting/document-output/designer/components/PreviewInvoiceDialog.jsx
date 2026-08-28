import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { documentOutputApi, unwrapDoc } from '@/pages/accounting/document-output/api/document-output.api';
import { invoicesApi } from '@/pages/accounting/invoices/api/invoices.api';
import { useDocumentDesignerStore } from '../store/useDocumentDesignerStore';
import { TemplateRenderer } from './TemplateRenderer';

/**
 * "Preview Invoice" — renders a REAL invoice (real customer, number,
 * dates, line items, discounts, VAT, totals, notes, footer, company
 * info) through the exact same server-side CanvasHtmlRenderer pipeline
 * that PDF/print will eventually use. Never a placeholder/sample-box
 * preview — this is the mechanism that lets a user trust what they're
 * about to save.
 */
export function PreviewInvoiceDialog({ open, onOpenChange, documentType = 'invoice' }) {
  const toConfig = useDocumentDesignerStore((s) => s.toConfig);
  const [invoices, setInvoices] = React.useState([]);
  const [invoiceId, setInvoiceId] = React.useState(null);
  const [renderModel, setRenderModel] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    invoicesApi
      .list({ per_page: 25, sort: '-invoice_date' })
      .then((res) => {
        const data = res?.data?.data;
        const rows = Array.isArray(data) ? data : (data?.data ?? []);
        setInvoices(rows);
        if (!invoiceId && rows.length) setInvoiceId(rows[0].id);
      })
      .catch(() => setInvoices([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  React.useEffect(() => {
    if (!open || !invoiceId) return;
    setLoading(true);
    documentOutputApi
      .previewWithConfig(documentType, invoiceId, toConfig())
      .then((res) => setRenderModel(unwrapDoc(res)))
      .catch((e) => toast.error(e?.response?.data?.message || 'Failed to render preview'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, invoiceId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] max-w-5xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b px-5 py-3">
          <div className="flex items-center justify-between gap-4">
            <DialogTitle>{documentType === 'pos_receipt' ? 'Preview Receipt' : 'Preview Invoice'}</DialogTitle>
            <Select value={invoiceId ? String(invoiceId) : undefined} onValueChange={(v) => setInvoiceId(Number(v))}>
              <SelectTrigger className="h-8 w-64 text-xs">
                <SelectValue placeholder="Select an invoice" />
              </SelectTrigger>
              <SelectContent>
                {invoices.map((inv) => (
                  <SelectItem key={inv.id} value={String(inv.id)}>
                    {inv.number || inv.invoice_number || `#${inv.id}`} — {inv.customer?.name || inv.customer_name || ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-auto bg-muted/40 p-6">
          {loading ? (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Rendering…
            </div>
          ) : (
            <TemplateRenderer renderModel={renderModel} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
