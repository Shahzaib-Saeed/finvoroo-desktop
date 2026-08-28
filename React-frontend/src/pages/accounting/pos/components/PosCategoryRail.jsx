import { cn } from '@/lib/utils';
import { POS_RAIL_FILTERS } from '../constants';

export function PosCategoryRail({
  railFilter,
  onRailFilter,
  categories,
  categoryId,
  onCategory,
  brands,
  brandId,
  onBrand,
}) {
  return (
    <aside className="flex w-[13.5rem] shrink-0 flex-col border-r border-foreground/10 bg-muted/20">
      <div className="border-b border-foreground/8 px-3 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Browse
        </p>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto px-2 py-3">
        <div className="space-y-1">
          {POS_RAIL_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                onRailFilter(f.id);
                onCategory('');
              }}
              className={cn(
                'flex h-11 w-full items-center rounded-xl px-3 text-left text-sm font-medium transition-colors',
                railFilter === f.id && !categoryId
                  ? 'bg-foreground text-background'
                  : 'text-foreground/80 hover:bg-foreground/5',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div>
          <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Categories
          </p>
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => onCategory('')}
              className={cn(
                'flex h-10 w-full items-center rounded-xl px-3 text-left text-sm transition-colors',
                !categoryId
                  ? 'bg-foreground/8 font-medium'
                  : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground',
              )}
            >
              All categories
            </button>
            {(categories || []).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onCategory(String(c.id));
                  onRailFilter('all');
                }}
                className={cn(
                  'flex h-10 w-full items-center rounded-xl px-3 text-left text-sm transition-colors',
                  String(categoryId) === String(c.id)
                    ? 'bg-foreground text-background font-medium'
                    : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground',
                )}
              >
                <span className="truncate">{c.name}</span>
              </button>
            ))}
          </div>
        </div>

        {(brands || []).length > 0 && (
          <div>
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Brands
            </p>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => onBrand('')}
                className={cn(
                  'flex h-10 w-full items-center rounded-xl px-3 text-left text-sm transition-colors',
                  !brandId
                    ? 'bg-foreground/8 font-medium'
                    : 'text-muted-foreground hover:bg-foreground/5',
                )}
              >
                All brands
              </button>
              {brands.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onBrand(String(b.id))}
                  className={cn(
                    'flex h-10 w-full items-center rounded-xl px-3 text-left text-sm transition-colors',
                    String(brandId) === String(b.id)
                      ? 'bg-foreground text-background font-medium'
                      : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground',
                  )}
                >
                  <span className="truncate">{b.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
