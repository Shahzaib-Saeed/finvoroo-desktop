import { useMemo } from 'react';
import {
  Loader2,
  MapPin,
  Package,
  Save,
  Truck,
  Warehouse,
} from 'lucide-react';
import { SourceDocumentBanner } from '@/components/accounting/SourceDocumentBanner';
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
import { DatePicker } from '@/components/ui/date-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { deliveryLineTotals } from '../constants';
import { cn } from '@/lib/utils';
import { DeliveryNoteLinesTable } from './DeliveryNoteLinesTable';

function SummaryPill({ label, value, accent }) {
  return (
    <div
      className={cn(
        'rounded-md border px-3 py-2 min-w-[100px]',
        accent ? 'border-sky-200/80 bg-sky-50/80' : 'border-border/80 bg-muted/25',
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          'text-lg font-bold tabular-nums leading-tight',
          accent ? 'text-sky-700' : 'text-foreground',
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function DeliveryNoteForm({
  form,
  setField,
  setLine,
  errors,
  saving,
  loadingLookups,
  loadingSource,
  conversionSource,
  warehouses,
  workspaceId,
  onSubmit,
  onCancel,
  readOnly = false,
}) {
  const totals = useMemo(() => deliveryLineTotals(form.lines), [form.lines]);

  const fillLineRemaining = (index) => {
    const line = form.lines[index];
    const remaining = line?.quantity_remaining || line?.order_quantity;
    if (remaining != null && remaining !== '') {
      setLine(index, { quantity_delivered: String(remaining) });
    }
  };

  const fillAllRemaining = () => {
    (form.lines || []).forEach((line, index) => {
      const remaining = line?.quantity_remaining || line?.order_quantity;
      if (remaining != null && remaining !== '') {
        setLine(index, { quantity_delivered: String(remaining) });
      }
    });
  };

  if (loadingLookups || loadingSource) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <Loader2 className="size-8 animate-spin text-sky-600" />
        <p className="text-sm">Loading delivery details…</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {conversionSource ? (
        <SourceDocumentBanner
          source={conversionSource}
          workspaceId={workspaceId}
          accent="blue"
          warnings={[
            'Adjust quantities below, then save as draft. Confirm from the detail page to post inventory.',
          ]}
        />
      ) : null}

      <div className="flex flex-wrap gap-3">
        <SummaryPill label="Line items" value={totals.rowCount} />
        <SummaryPill label="Units to ship" value={totals.totalQty.toLocaleString()} accent />
        <SummaryPill label="Lines with qty" value={totals.lineCount} />
      </div>

      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/25 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Truck className="size-4 text-sky-600 shrink-0" />
            <span>Shipment details</span>
          </div>
          <Badge variant="outline" className="h-6 text-[11px] font-medium capitalize">
            Draft on save
          </Badge>
        </div>

        <div className="p-4 lg:p-5 grid gap-5 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-5">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
                <Truck className="size-3.5" /> Shipment
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Delivery date</Label>
                  <DatePicker
                    value={form.delivery_date}
                    onChange={(v) => setField('delivery_date', v || '')}
                    disabled={readOnly}
                  />
                  {errors.delivery_date ? (
                    <p className="text-xs text-destructive">{errors.delivery_date}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Warehouse className="size-3.5 text-muted-foreground" />
                    Ship from warehouse
                  </Label>
                  <Select
                    value={form.warehouse_id || 'none'}
                    onValueChange={(v) => setField('warehouse_id', v === 'none' ? '' : v)}
                    disabled={readOnly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Default warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Default warehouse</SelectItem>
                      {warehouses.map((w) => (
                        <SelectItem key={w.id} value={String(w.id)}>
                          {w.name}
                          {w.code ? ` (${w.code})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
                <MapPin className="size-3.5" /> Ship to
              </h3>
              <Textarea
                rows={3}
                value={form.shipping_address}
                onChange={(e) => setField('shipping_address', e.target.value)}
                disabled={readOnly}
                placeholder="Customer shipping address"
                className="resize-none bg-muted/20"
              />
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="rounded-lg border bg-muted/15 p-3.5 h-full">
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2.5">
                Notes
              </h3>
              <Textarea
                rows={5}
                value={form.notes}
                onChange={(e) => setField('notes', e.target.value)}
                disabled={readOnly}
                placeholder="Packing instructions, carrier reference, delivery window…"
                className="resize-none bg-background min-h-[120px]"
              />
            </div>
          </div>
        </div>
      </div>

      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="min-h-0 border-b bg-muted/20 py-3 px-4 flex flex-row items-center justify-between gap-3 space-y-0">
          <div className="flex items-center gap-2">
            <Package className="size-4 text-sky-600 shrink-0" />
            <CardTitle className="text-sm font-semibold">Items to deliver</CardTitle>
          </div>
          {!readOnly && (form.lines || []).length > 0 ? (
            <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={fillAllRemaining}>
              Fill all remaining
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="p-0">
          <DeliveryNoteLinesTable
            lines={form.lines || []}
            readOnly={readOnly}
            errors={errors}
            onQtyChange={(index, value) => setLine(index, { quantity_delivered: value })}
            onFillRemaining={fillLineRemaining}
          />
          {(form.lines || []).length > 0 ? (
            <div className="flex items-center justify-end gap-3 border-t border-border bg-muted/25 px-4 py-2.5 text-sm">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Total units this shipment
              </span>
              <span className="text-base font-bold tabular-nums text-sky-700">
                {totals.totalQty.toLocaleString(undefined, { maximumFractionDigits: 4 })}
              </span>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {!readOnly ? (
        <div className="sticky bottom-0 z-10 -mx-1 px-1 py-3 bg-background/95 backdrop-blur border-t flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground hidden sm:block">
            Saves as <span className="font-medium text-foreground">draft</span> — confirm later to
            update stock.
          </p>
          <div className="flex gap-2 ml-auto">
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="min-w-[160px]">
              {saving ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <Save className="size-4 mr-2" />
              )}
              Save delivery note
            </Button>
          </div>
        </div>
      ) : null}
    </form>
  );
}
