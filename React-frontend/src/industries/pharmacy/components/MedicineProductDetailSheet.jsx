import { Building2, Layers, ShoppingBag, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { MedicineThumb } from './MedicineThumb';
import { resolveProductImage } from '../lib/upload-medicine-image';
import { getMedicinePricing } from '../lib/pharmacy-pricing';

export { getMedicinePricing } from '../lib/pharmacy-pricing';

function formatMoney(v, empty = '—') {
  const n = Number(v);
  if (!Number.isFinite(n)) return empty;
  return `Rs.${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function productManufacturer(row) {
  return (
    row?.pharmacy?.manufacturer?.name ||
    row?.pharmacy?.manufacturer_name ||
    row?.manufacturer?.name ||
    row?.manufacturer_name ||
    null
  );
}

function productStock(row) {
  if (row?.current_stock != null && row.current_stock !== '') return row.current_stock;
  if (row?.stock_qty != null && row.stock_qty !== '') return row.stock_qty;
  if (row?.qty_on_hand != null && row.qty_on_hand !== '') return row.qty_on_hand;
  return 0;
}

function Stat({ label, value, sub, className }) {
  return (
    <div className={cn('rounded-xl border border-border/80 bg-card px-3 py-2.5 shadow-xs', className)}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-base font-semibold tabular-nums text-foreground">{value}</p>
      {sub ? <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

export function MedicineProductDetailSheet({ open, onOpenChange, product, onConfirm }) {
  if (!product) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full p-0 sm:max-w-[420px]" />
      </Sheet>
    );
  }

  const image = resolveProductImage(product);
  const generic = product.pharmacy?.generic_name;
  const strength = product.pharmacy?.strength_text;
  const manufacturer = productManufacturer(product);
  const stock = productStock(product);
  const pricing = getMedicinePricing(product);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-l border-border bg-background p-0 sm:max-w-[420px] duration-200 data-[state=closed]:duration-150"
      >
        <div className="relative overflow-hidden border-b border-border bg-gradient-to-br from-slate-50 via-background to-emerald-50/40 px-5 pb-5 pt-6">
          <div className="flex justify-center">
            <MedicineThumb src={image} alt={product.name} size="xl" className="size-28 rounded-2xl shadow-md ring-2 ring-white" />
          </div>
          <SheetHeader className="mt-4 space-y-2 text-center sm:text-center">
            <SheetTitle className="text-lg font-semibold leading-snug tracking-tight">
              {product.name}
            </SheetTitle>
            {(generic || strength) && (
              <p className="text-sm text-muted-foreground">
                {[generic, strength].filter(Boolean).join(' · ')}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              {product.sku ? (
                <Badge variant="outline" className="font-normal">
                  {product.sku}
                </Badge>
              ) : null}
              <Badge variant="secondary" className="font-normal tabular-nums">
                Stock {stock}
              </Badge>
            </div>
          </SheetHeader>
        </div>

        <SheetBody className="flex-1 space-y-4 overflow-auto px-5 py-4">
          <div className="grid grid-cols-2 gap-2.5">
            <Stat label="Pack price" value={formatMoney(pricing.packPrice)} sub="MRP / retail pack" />
            <Stat
              label="Unit price"
              value={formatMoney(pricing.unitPrice)}
              sub={`Per unit · pack ${pricing.packCount}`}
            />
            <Stat label="Purchase cost" value={formatMoney(pricing.packPurchase)} sub="Per pack cost" />
            <Stat
              label="Unit cost"
              value={formatMoney(pricing.unitPurchase)}
              sub={`Per unit · pack ${pricing.packCount}`}
            />
            <Stat label="Pack size" value={String(pricing.packSize)} sub="Units per pack" />
          </div>

          <div className="space-y-2 rounded-xl border border-border/80 bg-muted/20 p-3">
            <div className="flex items-start gap-2.5 text-sm">
              <Building2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Manufacturer
                </p>
                <p className="mt-0.5 font-medium text-foreground">{manufacturer || '—'}</p>
              </div>
            </div>
            {product.barcode ? (
              <div className="flex items-start gap-2.5 border-t border-border/60 pt-2 text-sm">
                <Tag className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Barcode
                  </p>
                  <p className="mt-0.5 font-mono text-xs">{product.barcode}</p>
                </div>
              </div>
            ) : null}
            <div className="flex items-start gap-2.5 border-t border-border/60 pt-2 text-sm">
              <Layers className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Form / pack
                </p>
                <p className="mt-0.5 text-foreground">
                  {[product.pharmacy?.dosage_form, pricing.packSize].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>
            </div>
          </div>
        </SheetBody>

        <SheetFooter className="shrink-0 border-t border-border bg-background/95 px-5 py-4 backdrop-blur-sm">
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            className="w-full gap-2 sm:w-auto"
            onClick={() => {
              onConfirm?.(product);
              onOpenChange(false);
            }}
          >
            <ShoppingBag className="size-4" />
            Add to receive
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
