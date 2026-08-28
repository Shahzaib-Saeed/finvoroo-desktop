import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import { defaultEnteredUnitForProduct, resolveEnteredUnit, unitLabelForLine } from '@/lib/units';
import { cn } from '@/lib/utils';

/**
 * Shared unit-selector cell for a document line: shows a searchable dropdown of the
 * product's configured units when it has more than one, otherwise a plain read-only
 * label (never renders a picker for a single-unit product — no extra clutter).
 *
 * Mirrors the LINE_COL.UNIT cell in InvoiceLinesGrid.jsx (the reference implementation
 * for Invoices/Bills) so every document type shares the exact same interaction model —
 * same default-unit resolution, same "only show a picker when there's a real choice"
 * rule — without each bespoke line table reimplementing it.
 *
 * @param {object} props
 * @param {object} props.line - the document line (needs entered_unit / quantity_basis for resolveEnteredUnit)
 * @param {object} props.product - the selected product (needs qty_conversion.family_units)
 * @param {(unitKey: string) => void} props.onChange
 */
export function UnitPickerCell({ line, product, onChange, className, triggerClassName, disabled }) {
  const familyUnits = product?.qty_conversion?.family_units ?? [];
  const showPicker = familyUnits.length > 1;

  if (!showPicker) {
    return (
      <span className={cn('text-[11px] text-muted-foreground truncate text-center block', className)}>
        {unitLabelForLine(line, product) || '—'}
      </span>
    );
  }

  const unitOptions = familyUnits.map((u) => ({
    value: u.unit_key,
    label: u.is_storage ? `${u.label} (base)` : u.label,
  }));
  const selectedUnit =
    resolveEnteredUnit(line, product) ||
    defaultEnteredUnitForProduct(product) ||
    familyUnits[0]?.unit_key ||
    '';

  return (
    <div className={className}>
      <SearchableCombobox
        value={selectedUnit}
        onValueChange={onChange}
        options={unitOptions}
        placeholder="Unit"
        searchPlaceholder="Search unit…"
        disabled={disabled}
        triggerClassName={cn('h-8 text-xs border-0 shadow-none bg-transparent', triggerClassName)}
        contentClassName="min-w-[140px]"
      />
    </div>
  );
}
