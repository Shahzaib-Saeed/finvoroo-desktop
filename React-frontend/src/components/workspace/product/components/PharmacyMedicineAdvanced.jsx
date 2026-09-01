import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTaxDialog } from '@/components/workspace/tax/tax-dialog-provider';
import { PharmacyProductSection } from './PharmacyProductSection';

const NEW_TAX = '__new_tax__';

const CONTROL =
  'h-9 w-full border-slate-200 bg-white shadow-sm focus-visible:border-slate-400 focus-visible:ring-slate-400/20';

function QuietLabel({ children }) {
  return (
    <span className="mb-1 block text-[12px] font-medium text-slate-700">{children}</span>
  );
}

/**
 * Collapsed advanced pharmacy + catalog fields (tax, MRP, brand, manufacturer, etc.)
 */
export function PharmacyMedicineAdvanced({
  form,
  setField,
  disabled,
  brandSelect = null,
  taxRates = [],
  onTaxCreated,
}) {
  const taxDialog = useTaxDialog();

  const openNewTax = () => {
    taxDialog.openCreate({
      onSuccess: (saved) => {
        if (saved?.id) {
          setField('tax_rate_id', String(saved.id));
          onTaxCreated?.(saved);
          toast.success(`Tax “${saved.name}” added`);
        }
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <div>
          <QuietLabel>Tax</QuietLabel>
          <Select
            value={form.tax_rate_id ? String(form.tax_rate_id) : '_none'}
            onValueChange={(v) => {
              if (v === NEW_TAX) {
                openNewTax();
                return;
              }
              setField('tax_rate_id', v === '_none' ? '' : v);
            }}
            disabled={disabled}
          >
            <SelectTrigger className={CONTROL}>
              <SelectValue placeholder="No tax" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NEW_TAX} className="font-medium text-primary">
                + New tax…
              </SelectItem>
              <SelectItem value="_none">No tax</SelectItem>
              {taxRates.map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>
                  {t.name}
                  {t.rate != null ? ` (${t.rate}%)` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <QuietLabel>MRP</QuietLabel>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={form.mrp ?? ''}
            onChange={(e) => setField('mrp', e.target.value)}
            placeholder="0.00"
            disabled={disabled}
            className={CONTROL}
          />
        </div>
        {brandSelect ? (
          <div>
            <QuietLabel>Brand</QuietLabel>
            {brandSelect}
          </div>
        ) : null}
        <div>
          <QuietLabel>SKU</QuietLabel>
          <Input
            value={form.sku || ''}
            onChange={(e) => setField('sku', e.target.value)}
            placeholder="Auto"
            disabled={disabled}
            className={CONTROL}
          />
        </div>
        <div>
          <QuietLabel>Reorder level</QuietLabel>
          <Input
            type="number"
            min={0}
            step="any"
            value={form.reorder_level ?? ''}
            onChange={(e) => setField('reorder_level', e.target.value)}
            disabled={disabled}
            className={CONTROL}
          />
        </div>
      </div>

      <PharmacyProductSection
        form={form}
        setField={setField}
        disabled={disabled}
        compact
        mode="advanced"
      />
    </div>
  );
}
