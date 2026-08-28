import { Pencil, FileText, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCustomerDialog } from '@/components/workspace/customer/customer-dialog-provider';

const NEW_CUSTOMER = '__sales_order_customer_new__';

export function SalesOrderBillToSection({
  form,
  errors,
  customers,
  canCreateCustomer,
  addressUnlocked,
  setAddressUnlocked,
  onCustomerChange,
  onAddressDisplayChange,
  isEdit,
  quotations = [],
  loadingQuotations = false,
  showQuotationPicker = false,
  setShowQuotationPicker,
  importingQuotation = false,
  importFromQuotation,
}) {
  const customerDialog = useCustomerDialog();

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-sm">
          Customer <span className="text-destructive">*</span>
        </Label>
        <Select
          value={form.customer_id ? String(form.customer_id) : undefined}
          onValueChange={(v) => {
            if (v === NEW_CUSTOMER) {
              customerDialog.openCreate({
                onSuccess: (c) => {
                  if (c?.id) onCustomerChange(String(c.id), c);
                },
              });
              return;
            }
            onCustomerChange(v);
          }}
        >
          <SelectTrigger className="h-10">
            <SelectValue placeholder="Select customer" />
          </SelectTrigger>
          <SelectContent>
            {canCreateCustomer && (
              <SelectItem value={NEW_CUSTOMER} className="text-primary font-medium">
                + Create customer…
              </SelectItem>
            )}
            {customers.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.customer_id && (
          <p className="text-xs text-destructive">{errors.customer_id}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Label className="text-sm mb-0">Address</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setAddressUnlocked((u) => !u)}
          >
            <Pencil className="size-3 mr-1" />
            {addressUnlocked ? 'Done' : 'Change'}
          </Button>
        </div>
        <Textarea
          rows={5}
          className="text-sm resize-y"
          value={form.address_display}
          onChange={(e) => onAddressDisplayChange(e.target.value)}
          disabled={!addressUnlocked}
          placeholder="Select a customer to load address"
        />
      </div>

      {!isEdit && form.customer_id && (
        <QuotationImportPanel
          quotations={quotations}
          loading={loadingQuotations}
          open={showQuotationPicker}
          onToggle={() => setShowQuotationPicker?.(!showQuotationPicker)}
          importing={importingQuotation}
          onImport={importFromQuotation}
        />
      )}
      {!isEdit && form.quotation_id && (
        <p className="text-xs text-violet-800 bg-violet-50 border border-violet-200 rounded-md px-3 py-2 mt-2">
          Saving will convert{' '}
          <span className="font-semibold">
            {quotations.find((q) => String(q.id) === String(form.quotation_id))?.quote_number ||
              `quotation #${form.quotation_id}`}
          </span>{' '}
          to this sales order.
        </p>
      )}
    </div>
  );
}

function QuotationImportPanel({
  quotations,
  loading,
  open,
  onToggle,
  importing,
  onImport,
}) {
  if (loading) {
    return (
      <div className="rounded-lg border bg-muted/20 px-3 py-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading quotations…
      </div>
    );
  }

  if (!quotations.length) return null;

  return (
    <div className="rounded-lg border bg-gradient-to-br from-primary/5 to-transparent">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-muted/30 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="size-4 text-primary shrink-0" />
          <span className="text-sm font-medium truncate">Import from a quotation</span>
          <span className="inline-flex items-center rounded-full bg-primary/15 text-primary px-2 py-0.5 text-[10px] font-semibold tabular-nums">
            {quotations.length}
          </span>
        </div>
        {open ? (
          <ChevronUp className="size-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="size-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2 border-t border-border/70">
          <p className="text-[11px] text-muted-foreground pt-2">
            Select a quotation to copy its lines into this sales order.
          </p>
          <ul className="space-y-1.5 list-none m-0 p-0 max-h-64 overflow-y-auto">
            {quotations.map((q) => (
              <li key={q.id}>
                <button
                  type="button"
                  disabled={importing}
                  onClick={() => onImport?.(String(q.id))}
                  className="w-full flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-left hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-60"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {q.quote_number || `Quotation #${q.id}`}
                      </span>
                      {q.status && (
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          {q.status}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {q.quote_date_display || q.quote_date || '—'}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold tabular-nums">
                      {q.total_formatted || q.total || '—'}
                    </div>
                    <div className="text-[10px] text-primary uppercase tracking-wide font-medium">
                      {importing ? 'Importing…' : 'Import →'}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
