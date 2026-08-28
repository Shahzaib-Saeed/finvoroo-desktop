import { useMemo } from 'react';
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
import { UnitPickerCell } from '@/components/workspace/product/components/UnitPickerCell';
import { defaultEnteredUnitForProduct, unitLabelForLine } from '@/lib/units';
import {
  calcLineSubtotal,
  calcLineTax,
  formatCurrency,
} from '../constants';

export function VendorCreditLinesTable({
  lines,
  products,
  taxRates,
  currency,
  lineTotals,
  loadingLines,
  readOnly,
  onUpdateLine,
  onAddLine,
  onRemoveLine,
}) {
  const disabled = readOnly;
  const hasBillLines = lines.some((line) => line.bill_line_id);
  const productsById = useMemo(() => {
    const map = {};
    (products || []).forEach((p) => {
      map[String(p.id)] = p;
    });
    return map;
  }, [products]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">
            {hasBillLines ? 'Returned items' : 'Credit line items'}
          </h3>
          <p className="text-xs text-muted-foreground">
            {hasBillLines
              ? 'Enter return quantities for items from the linked bill.'
              : 'Select a product or enter a description, quantity, and unit price.'}
          </p>
        </div>
        {!disabled && (
          <Button type="button" variant="outline" size="sm" onClick={onAddLine}>
            <Plus className="size-4 mr-1" /> Add line
          </Button>
        )}
      </div>

      {loadingLines ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Loading bill lines…</p>
      ) : (
      <div className="overflow-x-auto border rounded-md">
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="bg-muted/50">
              <th className="p-2 text-left min-w-[200px]">Product / description</th>
              <th className="p-2 text-center w-24">Qty</th>
              <th className="p-2 text-center w-28">Unit</th>
              <th className="p-2 text-center w-28">Unit price</th>
              <th className="p-2 text-left w-36">Tax rate</th>
              <th className="p-2 text-right w-28">Line amount</th>
              {!disabled && <th className="p-2 w-10" />}
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => {
              const subtotal = calcLineSubtotal(line);
              const tax = calcLineTax(line, taxRates);
              const lineTotal = subtotal + tax;
              const fromBill = !!line.bill_line_id;
              const maxReturnQty = fromBill ? Number(line.remaining_quantity) || undefined : undefined;

              return (
                <tr key={index} className="border-t align-top">
                  <td className="p-2 space-y-1">
                    {!fromBill && (
                      <Select
                        value={line.product_id || '_none'}
                        onValueChange={(v) => {
                          const product = v === '_none' ? null : productsById[v];
                          onUpdateLine(index, {
                            product_id: v === '_none' ? '' : v,
                            entered_unit: product
                              ? defaultEnteredUnitForProduct(product) || ''
                              : line.entered_unit,
                          });
                        }}
                        disabled={disabled}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Product (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">— Type description —</SelectItem>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={String(p.id)}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Input
                      className="h-8"
                      value={line.description}
                      onChange={(e) =>
                        onUpdateLine(index, { description: e.target.value })
                      }
                      placeholder="Item description"
                      disabled={disabled}
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      min="0"
                      step={fromBill ? 'any' : '0.01'}
                      max={maxReturnQty}
                      className="h-8 text-center tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      value={line.quantity}
                      onChange={(e) =>
                        onUpdateLine(index, { quantity: e.target.value })
                      }
                      placeholder={fromBill ? 'Return qty' : undefined}
                      disabled={disabled}
                    />
                    {fromBill && line.remaining_quantity !== '' && (
                      <p className="text-[10px] text-muted-foreground text-center mt-0.5">
                        max {Number(line.remaining_quantity).toLocaleString(undefined, {
                          maximumFractionDigits: 4,
                        })}
                      </p>
                    )}
                  </td>
                  <td className="p-2">
                    {fromBill ? (
                      <span className="text-[11px] text-muted-foreground truncate text-center block">
                        {unitLabelForLine(line, productsById[String(line.product_id)]) || '—'}
                      </span>
                    ) : (
                      <UnitPickerCell
                        line={line}
                        product={productsById[String(line.product_id)]}
                        onChange={(v) => onUpdateLine(index, { entered_unit: v })}
                        disabled={disabled}
                      />
                    )}
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      className="h-8 text-center tabular-nums"
                      value={line.unit_price}
                      onChange={(e) =>
                        onUpdateLine(index, { unit_price: e.target.value })
                      }
                      disabled={disabled}
                    />
                  </td>
                  <td className="p-2">
                    <Select
                      value={line.tax_rate_id || '_none'}
                      onValueChange={(v) =>
                        onUpdateLine(index, {
                          tax_rate_id: v === '_none' ? '' : v,
                        })
                      }
                      disabled={disabled || fromBill}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">None</SelectItem>
                        {taxRates.map((t) => (
                          <SelectItem key={t.id} value={String(t.id)}>
                            {t.name} ({t.rate}%)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-2 text-right tabular-nums font-medium pt-3">
                    {formatCurrency(lineTotal, currency)}
                  </td>
                  {!disabled && (
                    <td className="p-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive"
                        onClick={() => onRemoveLine(index)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t bg-muted/30">
              <td colSpan={disabled ? 5 : 5} className="p-2 text-right text-muted-foreground">
                Subtotal
              </td>
              <td className="p-2 text-right tabular-nums font-medium">
                {formatCurrency(lineTotals.subtotal, currency)}
              </td>
              {!disabled && <td />}
            </tr>
            <tr className="bg-muted/30">
              <td colSpan={disabled ? 5 : 5} className="p-2 text-right text-muted-foreground">
                Tax
              </td>
              <td className="p-2 text-right tabular-nums font-medium">
                {formatCurrency(lineTotals.tax, currency)}
              </td>
              {!disabled && <td />}
            </tr>
            <tr className="bg-muted/30 font-semibold">
              <td colSpan={disabled ? 5 : 5} className="p-2 text-right">
                Total ({currency})
              </td>
              <td className="p-2 text-right tabular-nums text-primary">
                {formatCurrency(lineTotals.total, currency)}
              </td>
              {!disabled && <td />}
            </tr>
          </tfoot>
        </table>
      </div>
      )}
    </div>
  );
}
