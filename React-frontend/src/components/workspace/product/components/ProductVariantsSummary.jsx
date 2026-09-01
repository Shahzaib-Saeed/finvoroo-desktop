import { ChevronRight, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * Compact variants row for the product sheet — matrix opens in a secondary panel.
 */
export function ProductVariantsSummary({
  enabled,
  onEnabledChange,
  form,
  disabled = false,
  onManage,
}) {
  const attrs = form.variant_matrix_attributes || [];
  const rows = form.variants || [];
  const activeCount = rows.filter(
    (r) => (r.lifecycle_status || 'active') === 'active',
  ).length;
  const defaultRow = rows.find((r) => r.is_default_variant);
  const attrCount = attrs.filter((a) => (a.values || []).length > 0).length;

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
          Variants
        </h3>
      </div>

      <div className={cn('px-4 py-3 transition-colors', enabled && 'bg-emerald-50/20')}>
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500">
            <Layers className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-slate-900">Product variants</p>
              {enabled && rows.length > 0 ? (
                <Badge variant="secondary" className="text-[10px] font-normal tabular-nums">
                  {activeCount}/{rows.length} SKUs
                </Badge>
              ) : null}
            </div>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {!enabled
                ? 'Optional — Color, Size, and custom attributes'
                : rows.length
                  ? [
                      attrCount ? `${attrCount} attribute${attrCount === 1 ? '' : 's'}` : null,
                      defaultRow?.variant_label
                        ? `Default ${defaultRow.variant_label}`
                        : 'No default set',
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  : 'Enabled — open manager to build combinations'}
            </p>
          </div>
          <Switch
            checked={!!enabled}
            onCheckedChange={onEnabledChange}
            disabled={disabled}
          />
        </div>

        {enabled ? (
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <p className="text-[11px] text-slate-500">
              Child SKUs inherit units, accounts, and costing from this product.
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 shrink-0 border-slate-200"
              disabled={disabled}
              onClick={onManage}
            >
              Manage variants
              <ChevronRight className="ms-0.5 size-3.5" />
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
