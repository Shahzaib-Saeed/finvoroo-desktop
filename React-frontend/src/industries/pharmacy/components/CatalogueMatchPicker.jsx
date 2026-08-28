import { Check, CircleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ItemNameSearchCell } from './ItemNameSearchCell';

export function productToPickerOption(p) {
  if (!p) return null;
  const id = p.id ?? p.value;
  if (id == null || id === '') return null;
  return {
    value: String(id),
    label: p.name || p.label || `Product #${id}`,
    image_url: p.image_url || p.thumbnail_url || p.primary_image_url || p.image || '',
    generic: p.pharmacy?.generic_name || p.generic || '',
    strength: p.pharmacy?.strength_text || p.strength || '',
    sku: p.sku || p.code || '',
    pack_size: p.pharmacy?.pack_size || p.unit || p.pack_size || '',
    purchase_price: p.purchase_price ?? p.cost_price ?? null,
    mrp: p.mrp ?? null,
    unit_price: p.unit_price ?? p.selling_price ?? null,
    tax_rate_id: p.tax_rate_id ?? null,
    tax_rate: p.tax_rate ?? null,
    keywords: [p.sku, p.barcode, p.pharmacy?.generic_name, p.pharmacy?.strength_text, p.generic]
      .filter(Boolean)
      .join(' ')
      .toLowerCase(),
  };
}

/**
 * OCR review row linker — uses the same full medicine lookup sheet as Create Purchase.
 */
export function CatalogueMatchPicker({
  rowIndex = 0,
  value,
  selectedLabel = '',
  selectedImage = '',
  disabled = false,
  needsVerify = false,
  onSelect,
  onClear,
  onConfirm,
}) {
  const linked = Boolean(value);
  const confirmed = linked && !needsVerify;

  return (
    <div
      className={cn(
        'rounded-lg border p-1.5',
        confirmed && 'border-emerald-300 bg-emerald-50/80',
        needsVerify && 'border-red-400 bg-red-50',
        !linked && 'border-red-500 bg-red-50',
      )}
    >
      <div className="mb-1.5 flex items-center gap-1 px-0.5">
        {confirmed ? (
          <Check className="size-3.5 shrink-0 text-emerald-700" />
        ) : (
          <CircleAlert className="size-3.5 shrink-0 text-red-600" />
        )}
        <span
          className={cn(
            'text-[10px] font-bold uppercase tracking-wide',
            confirmed ? 'text-emerald-800' : 'text-red-700',
          )}
        >
          {linked ? (needsVerify ? 'Verify link' : 'Linked · tap to change') : 'Not linked'}
        </span>
      </div>

      <ItemNameSearchCell
        rowIndex={rowIndex}
        selectedLabel={selectedLabel}
        selectedProductId={value || ''}
        selectedImage={selectedImage}
        selectedSub=""
        linked={confirmed}
        needsMatch={!linked || needsVerify}
        blockZeroStock={false}
        disabled={disabled}
        placeholder="Type medicine name…"
        className="min-w-0"
        onSelect={(product) => {
          const opt = productToPickerOption(product);
          if (opt) onSelect?.(opt);
        }}
      />

      {linked && onClear ? (
        <button
          type="button"
          className="mt-1 px-0.5 text-[10px] font-medium text-red-700 hover:underline"
          disabled={disabled}
          onClick={onClear}
        >
          Clear link
        </button>
      ) : null}

      {needsVerify ? (
        <div className="mt-1.5 flex items-center gap-1.5">
          <p className="min-w-0 flex-1 text-[10px] font-medium leading-snug text-red-700">
            Auto pick — confirm it&apos;s correct
          </p>
          <Button
            type="button"
            size="sm"
            className="h-7 shrink-0 bg-red-600 px-2 text-[11px] hover:bg-red-700"
            disabled={disabled}
            onClick={() => onConfirm?.()}
          >
            Confirm
          </Button>
        </div>
      ) : null}

      {!linked ? (
        <p className="mt-1 px-0.5 text-[10px] font-medium leading-snug text-red-700">
          Type to search · F4 opens medicine list
        </p>
      ) : null}
    </div>
  );
}
