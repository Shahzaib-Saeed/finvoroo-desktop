'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ChevronRight, Layers3 } from 'lucide-react';
import { RiCheckboxCircleFill } from '@remixicon/react';
import { cn } from '@/lib/utils';
import { Button, ButtonArrow } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  buildGroupedProductPickerOptions,
  productSelectedLineLabel,
  productVariantDisplayLabel,
  strictProductPickerFilter,
} from '@/components/workspace/product/lib/product-picker';
import { ProductCommandPaletteItem } from '@/pages/accounting/invoices/components/ProductCommandPaletteItem';
import { formatCurrency, productTracksStock } from '@/pages/accounting/invoices/constants';
import { formatStockForDisplay } from '@/lib/units';

function buildSearchTerms(option) {
  return [option.label, option.value, option.keywords]
    .filter(Boolean)
    .map(String);
}

function optionMatchesSearch(option, search) {
  const q = String(search || '').trim();
  if (!q) return true;
  const terms = buildSearchTerms(option);
  return strictProductPickerFilter(option.value, q, terms) > 0;
}

function variantMatchesSearch(variant, familyLabel, search) {
  const q = String(search || '').trim();
  if (!q) return true;
  const terms = [
    productVariantDisplayLabel(variant),
    variant.name,
    variant.sku,
    variant.barcode,
    variant.variant_label,
    familyLabel,
    ...(variant.search_aliases || []),
  ].filter(Boolean);
  return strictProductPickerFilter(String(variant.id), q, terms) > 0;
}

function isTypeaheadKey(e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return false;
  if (e.key.length !== 1) return false;
  return /[\p{L}\p{N}\-_./]/u.test(e.key);
}

function FamilyRow({ option, selected, searchQuery }) {
  return (
    <div className="flex w-full min-w-0 items-center gap-2 py-0.5">
      <div className="min-w-0 flex-1">
        <ProductCommandPaletteItem
          product={{ name: option.label, type: 'product' }}
          showStock={false}
          selected={selected}
          searchQuery={searchQuery}
        />
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {option.variantCount} variant{option.variantCount === 1 ? '' : 's'} · Enter / → to open
        </p>
      </div>
      <div className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
        <Layers3 className="size-3" />
        Variants
        <ChevronRight className="size-3" />
      </div>
    </div>
  );
}

function VariantRow({
  product,
  currency,
  currencySymbols,
  showStock,
  selected,
  searchQuery,
}) {
  const tracks = productTracksStock(product);
  const stock = Number(
    product?.available_stock ?? product?.current_stock ?? product?.quantity_on_hand ?? 0,
  );
  const price = product.unit_price ?? product.selling_price;
  const label = productVariantDisplayLabel(product);

  return (
    <div className="flex w-full min-w-0 items-start justify-between gap-3 py-0.5">
      <div className="min-w-0 flex-1">
        <ProductCommandPaletteItem
          product={{ ...product, name: label }}
          currency={currency}
          currencySymbols={currencySymbols}
          showStock={false}
          selected={selected}
          searchQuery={searchQuery}
        />
        {product.sku ? (
          <p className="mt-0.5 text-[11px] font-mono text-muted-foreground truncate">
            {product.sku}
          </p>
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

/**
 * Document-line product picker with keyboard-first drill-down:
 * ↓/Enter/type → open · ↑↓ → move · Enter/→ → variants · ←/Esc → back · Enter → select SKU
 */
export function ProductLinePicker({
  value,
  onValueChange,
  products = [],
  currency,
  currencySymbols,
  showStock = true,
  placeholder = 'Product / service',
  searchPlaceholder = 'Search by name, SKU, or barcode…',
  disabled = false,
  triggerClassName,
  contentClassName,
  actionItems = [],
  renderOptionTrailing,
  triggerProps = {},
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [drillFamilyValue, setDrillFamilyValue] = useState(null);
  const contentRef = useRef(null);
  const listRef = useRef(null);

  const options = useMemo(
    () => buildGroupedProductPickerOptions(products),
    [products],
  );

  const productsById = useMemo(() => {
    const map = new Map();
    for (const p of products || []) map.set(String(p.id), p);
    return map;
  }, [products]);

  const normalizedValue = value != null && value !== '' ? String(value) : '';
  const selectedProduct = normalizedValue
    ? productsById.get(normalizedValue)
    : null;

  const drillFamily = useMemo(
    () =>
      options.find((o) => o.kind === 'family' && o.value === drillFamilyValue) ||
      null,
    [options, drillFamilyValue],
  );

  const filteredOptions = useMemo(
    () => options.filter((option) => optionMatchesSearch(option, searchQuery)),
    [options, searchQuery],
  );

  const filteredVariants = useMemo(() => {
    if (!drillFamily) return [];
    return drillFamily.variants.filter((variant) =>
      variantMatchesSearch(variant, drillFamily.label, searchQuery),
    );
  }, [drillFamily, searchQuery]);

  const inVariantStep = Boolean(drillFamily);

  const focusSearchInput = () => {
    requestAnimationFrame(() => {
      const input = contentRef.current?.querySelector('[cmdk-input]');
      if (input instanceof HTMLElement) input.focus();
    });
  };

  const goBackToProducts = () => {
    setDrillFamilyValue(null);
    setSearchQuery('');
    focusSearchInput();
  };

  const handleOpenChange = (next) => {
    setOpen(next);
    if (!next) {
      setSearchQuery('');
      setDrillFamilyValue(null);
    } else {
      focusSearchInput();
    }
  };

  const selectSku = (productId) => {
    if (!productId) return;
    onValueChange(String(productId));
    handleOpenChange(false);
  };

  const openFamily = (familyValue) => {
    setDrillFamilyValue(familyValue);
    setSearchQuery('');
    focusSearchInput();
  };

  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setDrillFamilyValue(null);
    }
  }, [open]);

  // Auto-drill when typing a unique variant match (e.g. "27" → Coils variants).
  useEffect(() => {
    if (!open || drillFamilyValue) return;
    const q = searchQuery.trim();
    if (q.length < 2) return;

    const familyHits = options.filter(
      (o) => o.kind === 'family' && optionMatchesSearch(o, q),
    );
    if (familyHits.length !== 1) return;

    const family = familyHits[0];
    const variantHits = family.variants.filter((v) =>
      variantMatchesSearch(v, family.label, q),
    );
    const parentOnly =
      String(family.label || '')
        .toLowerCase()
        .startsWith(q.toLowerCase()) &&
      variantHits.length === family.variants.length;
    if (parentOnly) return;
    if (variantHits.length > 0) {
      setDrillFamilyValue(family.value);
    }
  }, [open, searchQuery, options, drillFamilyValue]);

  const getHighlightedItemValue = () => {
    const el =
      listRef.current?.querySelector('[cmdk-item][data-selected="true"]') ||
      listRef.current?.querySelector('[data-slot="command-item"][data-selected="true"]');
    return (
      el?.getAttribute('data-value') ||
      el?.dataset?.value ||
      el?.getAttribute('value') ||
      null
    );
  };

  const handleListKeyDown = (e) => {
    // Backspace (empty search): variants → products. Esc still closes the dropdown.
    if (e.key === 'Backspace' && inVariantStep && !searchQuery) {
      e.preventDefault();
      e.stopPropagation();
      goBackToProducts();
      return;
    }

    // ← back to products (when search is empty so typing isn't fighting).
    if (e.key === 'ArrowLeft' && inVariantStep && !searchQuery) {
      e.preventDefault();
      e.stopPropagation();
      goBackToProducts();
      return;
    }

    // → open variants for the highlighted family row.
    if (e.key === 'ArrowRight' && !inVariantStep) {
      const highlighted = getHighlightedItemValue();
      const family = options.find(
        (o) => o.kind === 'family' && o.value === highlighted,
      );
      if (family) {
        e.preventDefault();
        e.stopPropagation();
        openFamily(family.value);
      }
    }
  };

  const { onKeyDown: triggerOnKeyDown, ...restTriggerProps } = triggerProps;

  const handleTriggerKeyDown = (e) => {
    if (disabled) {
      triggerOnKeyDown?.(e);
      return;
    }

    // While open, let cmdk handle keys (focus is in the popover).
    if (open) {
      triggerOnKeyDown?.(e);
      return;
    }

    // Ctrl/Cmd+Z → open product list (keyboard shortcut for power users).
    if ((e.ctrlKey || e.metaKey) && !e.altKey && String(e.key).toLowerCase() === 'z') {
      e.preventDefault();
      e.stopPropagation();
      handleOpenChange(true);
      return;
    }

    // Open picker for keyboard users — don't let the line grid steal Enter.
    if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      handleOpenChange(true);
      return;
    }

    // Type to open + search immediately.
    if (isTypeaheadKey(e)) {
      e.preventDefault();
      e.stopPropagation();
      setSearchQuery(e.key);
      setOpen(true);
      focusSearchInput();
      return;
    }

    triggerOnKeyDown?.(e);
  };

  const displayLabel = selectedProduct
    ? productSelectedLineLabel(selectedProduct)
    : '';

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          mode="input"
          placeholder={!displayLabel}
          aria-expanded={open}
          aria-haspopup="listbox"
          disabled={disabled}
          className={cn('w-full justify-between font-normal', triggerClassName)}
          {...restTriggerProps}
          onKeyDown={handleTriggerKeyDown}
        >
          <span
            className={cn(
              'flex min-w-0 flex-1 items-center text-left',
              !displayLabel && 'text-muted-foreground',
            )}
          >
            {selectedProduct ? (
              <ProductCommandPaletteItem
                product={{ ...selectedProduct, name: displayLabel }}
                currency={currency}
                currencySymbols={currencySymbols}
                showStock={showStock}
                compact
              />
            ) : (
              placeholder
            )}
          </span>
          <ButtonArrow />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        ref={contentRef}
        className={cn(
          'w-[min(28rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] p-0 overflow-hidden',
          contentClassName,
        )}
        align="start"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          focusSearchInput();
        }}
        onCloseAutoFocus={(e) => {
          // Keep focus on the trigger so the line-grid can continue keyboard nav.
          e.preventDefault();
          const row = restTriggerProps['data-row'];
          const col = restTriggerProps['data-col'];
          if (row == null || col == null) return;
          const trigger = document.querySelector(
            `[data-enter-nav="1"][data-row="${row}"][data-col="${col}"]`,
          );
          if (trigger instanceof HTMLElement) trigger.focus();
        }}
        onKeyDown={handleListKeyDown}
      >
        <Command
          key={inVariantStep ? `variants:${drillFamilyValue}` : 'products'}
          shouldFilter={false}
          className="max-h-[min(380px,70vh)]"
        >
          {inVariantStep ? (
            <div className="flex items-center gap-1 border-b px-2 py-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 shrink-0 gap-1 px-2 text-xs"
                onClick={goBackToProducts}
                tabIndex={-1}
              >
                <ArrowLeft className="size-3.5" />
                Products
                <span className="text-muted-foreground font-normal">(⌫)</span>
              </Button>
              <div className="min-w-0 flex-1 px-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Select variant
                </p>
                <p className="truncate text-sm font-semibold leading-tight">
                  {drillFamily.label}
                </p>
              </div>
            </div>
          ) : (
            <div className="border-b px-3 py-1.5 text-[10px] text-muted-foreground">
              Ctrl+Z open · ↑↓ move · Enter select · → variants · ⌫ back · Esc close
            </div>
          )}

          <CommandInput
            placeholder={
              inVariantStep
                ? `Type variant (e.g. 27)…`
                : searchPlaceholder
            }
            value={searchQuery}
            onValueChange={setSearchQuery}
          />

          <CommandList ref={listRef} className="max-h-[min(300px,50vh)]">
            <CommandEmpty>
              {inVariantStep ? 'No matching variants.' : 'No products found.'}
            </CommandEmpty>

            {!inVariantStep && actionItems.length > 0 ? (
              <>
                <CommandGroup>
                  {actionItems.map((item) => (
                    <CommandItem
                      key={`action-${item.value}`}
                      value={String(item.value)}
                      keywords={buildSearchTerms(item)}
                      className={item.className}
                      onSelect={() => {
                        item.onSelect?.();
                        if (item.closeOnSelect !== false) {
                          handleOpenChange(false);
                        }
                      }}
                    >
                      <span className="truncate">{item.label}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            ) : null}

            {inVariantStep ? (
              <CommandGroup heading="Variants · Enter to select">
                {filteredVariants.map((variant) => {
                  const selected = String(variant.id) === normalizedValue;
                  return (
                    <CommandItem
                      key={variant.id}
                      value={String(variant.id)}
                      keywords={[
                        productVariantDisplayLabel(variant),
                        variant.name,
                        variant.sku,
                        variant.barcode,
                        drillFamily.label,
                      ].filter(Boolean)}
                      className={cn(
                        'w-full group rounded-md py-2',
                        'data-[selected=true]:bg-sky-50 data-[selected=true]:text-foreground',
                        'dark:data-[selected=true]:bg-sky-950/50',
                      )}
                      onSelect={() => selectSku(variant.id)}
                    >
                      <div className="flex w-full min-w-0 items-center gap-2">
                        <span className="flex min-w-0 flex-1">
                          <VariantRow
                            product={variant}
                            currency={currency}
                            currencySymbols={currencySymbols}
                            showStock={showStock}
                            selected={selected}
                            searchQuery={searchQuery}
                          />
                        </span>
                        {renderOptionTrailing?.(
                          {
                            value: String(variant.id),
                            label: productVariantDisplayLabel(variant),
                            product: variant,
                            kind: 'variant',
                          },
                          selected,
                        )}
                        {selected ? (
                          <RiCheckboxCircleFill className="size-4 shrink-0 text-primary" />
                        ) : null}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ) : (
              <CommandGroup>
                {filteredOptions.map((option) => {
                  if (option.kind === 'family') {
                    const selected =
                      selectedProduct &&
                      String(selectedProduct.variant_parent_id) ===
                        String(option.parentId);
                    return (
                      <CommandItem
                        key={option.value}
                        value={option.value}
                        data-value={option.value}
                        keywords={buildSearchTerms(option)}
                        className={cn(
                          'w-full group rounded-md py-2',
                          'data-[selected=true]:bg-sky-50 data-[selected=true]:text-foreground',
                          'dark:data-[selected=true]:bg-sky-950/50',
                        )}
                        onSelect={() => openFamily(option.value)}
                      >
                        <FamilyRow
                          option={option}
                          selected={selected}
                          searchQuery={searchQuery}
                        />
                      </CommandItem>
                    );
                  }

                  const selected = String(option.value) === normalizedValue;
                  return (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      data-value={option.value}
                      keywords={buildSearchTerms(option)}
                      className={cn(
                        'w-full group rounded-md py-2',
                        'data-[selected=true]:bg-sky-50 data-[selected=true]:text-foreground',
                        'dark:data-[selected=true]:bg-sky-950/50',
                      )}
                      onSelect={() => selectSku(option.value)}
                    >
                      <div className="flex w-full min-w-0 items-center gap-2">
                        <span className="flex min-w-0 flex-1">
                          <ProductCommandPaletteItem
                            product={option.product}
                            currency={currency}
                            currencySymbols={currencySymbols}
                            showStock={showStock}
                            selected={selected}
                            searchQuery={searchQuery}
                          />
                        </span>
                        {renderOptionTrailing?.(option, selected)}
                        {selected ? (
                          <RiCheckboxCircleFill className="size-4 shrink-0 text-primary" />
                        ) : null}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
