import { Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  calcLineAmount,
  calcLineTax,
  formatCurrency,
} from '../constants';

export function CreditNoteLinesTable({
  lines,
  baseCurrency,
  lineTotals,
  loadingLines,
  readOnly,
  financialLocked,
  onUpdateLine,
  onAddLine,
  onRemoveLine,
}) {
  const disabled = readOnly || financialLocked;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Returned items</h3>
        {!disabled && (
          <Button type="button" variant="outline" size="sm" onClick={onAddLine}>
            <Plus className="size-4 mr-1" /> Add line
          </Button>
        )}
      </div>

      {loadingLines ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Loading invoice lines…</p>
      ) : (
        <div className="overflow-x-auto border rounded-md">
          <table className="w-full text-sm min-w-[880px]">
            <thead>
              <tr className="bg-muted/50">
                <th className="p-2 text-left">Description</th>
                <th className="p-2 text-center w-20">Orig qty</th>
                <th className="p-2 text-center w-24">Already returned</th>
                <th className="p-2 text-center w-20">Available</th>
                <th className="p-2 text-center w-24">Return qty</th>
                <th className="p-2 text-center w-24">Orig price</th>
                <th className="p-2 text-center w-24">Credit price</th>
                <th className="p-2 text-center w-16">Tax</th>
                <th className="p-2 text-right w-24">Line total</th>
                {!disabled && <th className="p-2 w-10" />}
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => {
                const fromInvoice = !!line.invoice_line_id;
                const lineAmount = calcLineAmount(line);
                const lineTax = calcLineTax(line);
                const maxReturnQty = fromInvoice ? Number(line.remaining_quantity) || undefined : undefined;
                const origPrice =
                  line._orig_unit_price != null
                    ? Number(line._orig_unit_price)
                    : Number(line.unit_price) || 0;

                return (
                  <tr key={index} className="border-t align-top">
                    <td className="p-2">
                      <Input
                        className="h-8"
                        value={line.description}
                        onChange={(e) =>
                          onUpdateLine(index, { description: e.target.value })
                        }
                        placeholder="Description"
                        disabled={disabled}
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        className="h-8 text-center tabular-nums bg-muted"
                        value={line.original_quantity}
                        disabled
                        readOnly
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        className="h-8 text-center tabular-nums bg-muted"
                        value={fromInvoice ? line.returned_quantity : ''}
                        disabled
                        readOnly
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        className="h-8 text-center tabular-nums bg-muted"
                        value={fromInvoice ? line.remaining_quantity : ''}
                        disabled
                        readOnly
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max={maxReturnQty}
                        className="h-8 text-center tabular-nums"
                        value={line.quantity}
                        onChange={(e) =>
                          onUpdateLine(index, { quantity: e.target.value })
                        }
                        disabled={disabled}
                      />
                      {fromInvoice && line.entered_unit && (
                        <div className="mt-1 flex justify-center">
                          <Badge
                            variant="secondary"
                            appearance="outline"
                            size="sm"
                            className="font-normal text-muted-foreground"
                          >
                            in {line.entered_unit}
                          </Badge>
                        </div>
                      )}
                    </td>
                    <td className="p-2">
                      <Input
                        className="h-8 text-center tabular-nums bg-muted"
                        value={fromInvoice ? origPrice : ''}
                        disabled
                        readOnly
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        className="h-8 text-center tabular-nums"
                        value={line.unit_price}
                        onChange={(e) =>
                          onUpdateLine(index, { unit_price: e.target.value })
                        }
                        disabled={disabled}
                      />
                    </td>
                    <td className="p-2 text-center text-xs text-muted-foreground">
                      {line.tax_rate > 0 ? `${line.tax_rate}%` : '—'}
                    </td>
                    <td className="p-2 text-right tabular-nums font-medium">
                      {formatCurrency(lineAmount + lineTax, baseCurrency)}
                    </td>
                    {!disabled && (
                      <td className="p-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive"
                          onClick={() => onRemoveLine(index)}
                          disabled={lines.length <= 1 && !line.description}
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
                <td colSpan={8} className="p-2 text-right text-muted-foreground">
                  Subtotal / Tax / Total
                </td>
                <td className="p-2 text-right tabular-nums font-semibold">
                  {formatCurrency(lineTotals.subtotal, baseCurrency)}
                  <span className="text-muted-foreground font-normal mx-1">/</span>
                  {formatCurrency(lineTotals.tax, baseCurrency)}
                  <span className="text-muted-foreground font-normal mx-1">/</span>
                  {formatCurrency(lineTotals.total, baseCurrency)}
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
