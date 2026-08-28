import { formatCurrency, productTracksStock } from '../constants';
import { splitHighlightedSearchText } from '@/components/workspace/product/lib/product-picker';
import { formatStockForDisplay } from '@/lib/units';
import { cn } from '@/lib/utils';

function HighlightedProductName({ name, searchQuery }) {
  const parts = splitHighlightedSearchText(name, searchQuery);

  return (
    <p className="text-sm font-medium truncate leading-tight">
      {parts.map((part, index) =>
        part.match ? (
          <mark
            key={index}
            className="rounded-sm bg-amber-200/90 px-0.5 font-semibold text-amber-950 dark:bg-sky-400/35 dark:text-sky-50"
          >
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </p>
  );
}

export function ProductCommandPaletteItem({
  product,
  currency,
  currencySymbols,
  showStock = true,
  selected = false,
  compact = false,
  searchQuery = '',
}) {
  if (!product) return null;

  const tracks = productTracksStock(product);
  const stock = Number(
    product?.available_stock ?? product?.current_stock ?? product?.quantity_on_hand ?? 0,
  );
  const price = product.unit_price ?? product.selling_price;
  const barcode = String(product?.barcode || '').trim();
  const name = product.name || '';

  if (compact) {
    return <span className="truncate text-left text-xs">{name}</span>;
  }

  return (
    <div
      className={cn(
        'flex w-full min-w-0 items-start justify-between gap-3 py-0.5',
        selected && 'text-foreground',
      )}
    >
      <div className="min-w-0 flex-1">
        {searchQuery ? (
          <HighlightedProductName name={name} searchQuery={searchQuery} />
        ) : (
          <p className="text-sm font-medium truncate leading-tight">{name}</p>
        )}
        {barcode ? (
          <p className="mt-0.5 text-[11px] text-muted-foreground font-mono truncate">{barcode}</p>
        ) : null}
      </div>
      <div className="shrink-0 text-right text-[11px] leading-snug">
        {price != null && price !== '' ? (
          <p className="font-semibold tabular-nums text-foreground">
            {formatCurrency(price, currency, currencySymbols)}
          </p>
        ) : null}
        {showStock ? (
          <p
            className={cn(
              'tabular-nums',
              !tracks
                ? 'text-muted-foreground'
                : stock > 0
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-destructive',
            )}
          >
            {tracks ? `Stock ${formatStockForDisplay(stock, product)}` : 'Service'}
          </p>
        ) : null}
      </div>
    </div>
  );
}
