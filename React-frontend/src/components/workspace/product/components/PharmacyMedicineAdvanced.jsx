import { Input } from '@/components/ui/input';
import { PharmacyProductSection } from './PharmacyProductSection';

function QuietLabel({ children }) {
  return (
    <span className="mb-1 block text-[12px] font-medium text-slate-700">{children}</span>
  );
}

/**
 * Collapsed advanced pharmacy + catalog fields (manufacturer, HSN, Rx, barcodes, etc.)
 */
export function PharmacyMedicineAdvanced({ form, setField, disabled, brandSelect = null }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
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
          />
        </div>
        <div>
          <QuietLabel>Cost</QuietLabel>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={form.purchase_price ?? ''}
            onChange={(e) => setField('purchase_price', e.target.value)}
            disabled={disabled}
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
