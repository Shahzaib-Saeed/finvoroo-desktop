import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { NO_NUMBER_SPINNER, calcLineTotals, formatCurrency } from '../constants';
import { cn } from '@/lib/utils';
import { useProductDialog } from '@/components/workspace/product/product-dialog-provider';
import {
  INVOICE_LINE_AMOUNT_INPUT,
  INVOICE_LINE_ROW_H,
  invoiceLineColStyle,
  invoiceLineThClass,
} from './invoice-line-column-layout';
import { LINE_COL } from '../invoice-template-constants';

const SECTION_COLS = [
  { key: LINE_COL.PRODUCT, label: 'Product' },
  { key: LINE_COL.DESCRIPTION, label: 'Description' },
  { key: LINE_COL.QUANTITY, label: 'Qty' },
  { key: LINE_COL.RATE, label: 'Rate' },
  { key: LINE_COL.DISCOUNT_FIXED, label: 'Disc $' },
  { key: LINE_COL.DISCOUNT_PERCENT, label: 'Disc %' },
  { key: LINE_COL.TAX, label: 'Tax' },
  { key: LINE_COL.NET_TOTAL, label: 'Net total' },
  { key: LINE_COL.FINAL_TOTAL, label: 'Total' },
  { key: LINE_COL.ACTIONS, label: '' },
];

export function InvoiceLinesSection({
  lines,
  products,
  taxRates,
  taxRatesById,
  currency,
  onAddLine,
  onRemoveLine,
  onUpdateLine,
  onUpdateLineDiscountFixed,
  onUpdateLineDiscountPercent,
  onUpdateLineNetTotal,
  onSelectProduct,
}) {
  const productDialog = useProductDialog();
  const cols = SECTION_COLS;

  const handleProductChange = (index, value) => {
    if (value === '__new_product__') {
      productDialog.openCreate({
        onSuccess: (created) => {
          if (created?.id) onSelectProduct?.(index, String(created.id));
        },
      });
      return;
    }
    onSelectProduct?.(index, value);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Line items</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Add products, discounts, taxes, and adjust totals inline.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onAddLine}>
          <Plus className="size-4 mr-1" />
          Add line
        </Button>
      </div>

      <div className="rounded-lg border bg-background overflow-hidden">
        <table className="w-full text-xs border-collapse table-fixed">
          <colgroup>
            {cols.map((col) => (
              <col key={col.key} style={invoiceLineColStyle(col.key, cols)} />
            ))}
          </colgroup>
          <thead>
            <tr className="border-b bg-muted/30">
              {cols.map((col) => (
                <th key={col.key} className={invoiceLineThClass(col.key)}>
                  {col.key === LINE_COL.ACTIONS ? (
                    <span className="sr-only">Actions</span>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => {
              const { total } = calcLineTotals(line, taxRatesById);
              return (
                <tr key={index} className="border-b last:border-0 hover:bg-muted/15">
                  <td className="p-0">
                    <Select
                      value={line.product_id || '_none'}
                      onValueChange={(v) =>
                        handleProductChange(index, v === '_none' ? '' : v)
                      }
                    >
                      <SelectTrigger className="h-8 w-full text-xs border-0 shadow-none rounded-none">
                        <SelectValue placeholder="Product" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">— Custom —</SelectItem>
                        <SelectItem value="__new_product__" className="text-primary font-medium">
                          + New product…
                        </SelectItem>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-0">
                    <Input
                      className="h-8 w-full text-xs border-0 shadow-none rounded-none px-1.5"
                      value={line.description}
                      onChange={(e) => onUpdateLine(index, 'description', e.target.value)}
                      placeholder="e.g. iPhone 15 Pro Max 256GB Blue — grade 10/10"
                    />
                  </td>
                  <td className="p-0">
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      className={cn(INVOICE_LINE_ROW_H, INVOICE_LINE_AMOUNT_INPUT, NO_NUMBER_SPINNER, 'border-0 shadow-none rounded-none text-center')}
                      value={line.quantity}
                      onChange={(e) => onUpdateLine(index, 'quantity', e.target.value)}
                    />
                  </td>
                  <td className="p-0">
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      className={cn(INVOICE_LINE_ROW_H, INVOICE_LINE_AMOUNT_INPUT, NO_NUMBER_SPINNER, 'border-0 shadow-none rounded-none')}
                      value={line.unit_price}
                      onChange={(e) => onUpdateLine(index, 'unit_price', e.target.value)}
                    />
                  </td>
                  <td className="p-0">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      className={cn(INVOICE_LINE_ROW_H, INVOICE_LINE_AMOUNT_INPUT, NO_NUMBER_SPINNER, 'border-0 shadow-none rounded-none')}
                      value={line.discount_fixed ?? ''}
                      onChange={(e) => onUpdateLineDiscountFixed(index, e.target.value)}
                      placeholder="0"
                    />
                  </td>
                  <td className="p-0">
                    <div className={cn('relative', INVOICE_LINE_ROW_H)}>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        className={cn(INVOICE_LINE_ROW_H, 'pr-6', INVOICE_LINE_AMOUNT_INPUT, NO_NUMBER_SPINNER, 'border-0 shadow-none rounded-none')}
                        value={line.discount_percent ?? ''}
                        onChange={(e) => onUpdateLineDiscountPercent(index, e.target.value)}
                        placeholder="0"
                      />
                      <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                        %
                      </span>
                    </div>
                  </td>
                  <td className="p-0">
                    <Select
                      value={line.tax_rate_id || '_none'}
                      onValueChange={(v) =>
                        onUpdateLine(index, 'tax_rate_id', v === '_none' ? '' : v)
                      }
                    >
                      <SelectTrigger className="h-8 w-full text-xs border-0 shadow-none rounded-none">
                        <SelectValue placeholder="No tax" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">No tax</SelectItem>
                        {taxRates.map((t) => (
                          <SelectItem key={t.id} value={String(t.id)}>
                            {t.name} ({t.rate}%)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-0">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      className={cn(INVOICE_LINE_ROW_H, INVOICE_LINE_AMOUNT_INPUT, NO_NUMBER_SPINNER, 'border-0 shadow-none rounded-none font-medium')}
                      value={line.net_total ?? ''}
                      onChange={(e) => onUpdateLineNetTotal(index, e.target.value)}
                      placeholder="0.00"
                    />
                  </td>
                  <td className={cn(INVOICE_LINE_ROW_H, 'text-right font-semibold tabular-nums text-primary px-1 truncate')}>
                    {formatCurrency(total, currency)}
                  </td>
                  <td className="p-0">
                    <div className={cn(INVOICE_LINE_ROW_H, 'flex items-center justify-center')}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => onRemoveLine(index)}
                        disabled={lines.length <= 1}
                      >
                        <Trash2 className="size-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
