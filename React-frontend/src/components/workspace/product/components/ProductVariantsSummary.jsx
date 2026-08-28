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
    <div
      className={cn(
        'rounded-xl border px-3.5 py-3 transition-colors',
        enabled ? 'border-primary/25 bg-primary/[0.03]' : 'border-border/70 bg-background',
      )}
    >
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/40 text-muted-foreground">
          <Layers className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">Variants</p>
            {enabled && rows.length > 0 ? (
              <Badge variant="secondary" className="text-[10px] font-normal tabular-nums">
                {activeCount}/{rows.length} SKUs
              </Badge>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
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
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/50 pt-3">
          <p className="text-[11px] text-muted-foreground">
            Child SKUs inherit units, accounts, and costing from this product.
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="shrink-0 h-8"
            disabled={disabled}
            onClick={onManage}
          >
            Manage variants
            <ChevronRight className="size-3.5 ms-0.5" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
