import { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, ImagePlus, Loader2, Plus, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { productsApi } from '../api/products.api';
import {
  VARIANT_HARD_LIMIT,
  VARIANT_SOFT_LIMIT,
  commercialFieldsFromVariant,
  generateVariantCombinations,
  mergeVariantRows,
  suggestCopiedSku,
} from '../lib/variant-matrix';

const VARIANT_ROW_H = 48;
const VARIANT_VIRTUALIZE_AT = 40;
const VARIANT_VIEWPORT_H = 420;

const LIFECYCLE_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
  { value: 'discontinued', label: 'Discontinued' },
];

function AttributePicker({
  catalog,
  selected,
  onChange,
  onCreated,
  disabled,
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [valuesText, setValuesText] = useState('');
  const [saving, setSaving] = useState(false);

  const toggleAttribute = (attr) => {
    const exists = selected.find((s) => String(s.attribute_id) === String(attr.id));
    if (exists) {
      onChange(selected.filter((s) => String(s.attribute_id) !== String(attr.id)));
      return;
    }
    onChange([
      ...selected,
      {
        attribute_id: attr.id,
        name: attr.name,
        code: attr.code,
        value_ids: [],
        values: [],
      },
    ]);
  };

  const toggleValue = (attrId, value) => {
    onChange(
      selected.map((s) => {
        if (String(s.attribute_id) !== String(attrId)) return s;
        const has = s.values.some((v) => String(v.id) === String(value.id));
        const values = has
          ? s.values.filter((v) => String(v.id) !== String(value.id))
          : [...s.values, { id: value.id, name: value.name, code: value.code }];
        return {
          ...s,
          values,
          value_ids: values.map((v) => v.id).filter((id) => id != null),
        };
      }),
    );
  };

  const createAttribute = async () => {
    const attrName = name.trim();
    if (!attrName) {
      toast.error('Attribute name is required');
      return;
    }
    const valueNames = valuesText
      .split(/[\n,]+/)
      .map((v) => v.trim())
      .filter(Boolean);
    if (!valueNames.length) {
      toast.error('Add at least one value (comma or line separated)');
      return;
    }
    setSaving(true);
    try {
      const res = await productsApi.createAttribute({
        name: attrName,
        values: valueNames.map((n) => ({ name: n })),
      });
      const created = res?.data?.data;
      onCreated?.(created);
      if (created?.id) {
        onChange([
          ...selected,
          {
            attribute_id: created.id,
            name: created.name,
            code: created.code,
            value_ids: (created.values || []).map((v) => v.id),
            values: (created.values || []).map((v) => ({
              id: v.id,
              name: v.name,
              code: v.code,
            })),
          },
        ]);
      }
      setCreateOpen(false);
      setName('');
      setValuesText('');
      toast.success('Attribute created');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create attribute');
    } finally {
      setSaving(false);
    }
  };

  const addInlineValue = async (attrId) => {
    const label = window.prompt('New value name');
    if (!label?.trim()) return;
    try {
      const res = await productsApi.createAttributeValue(attrId, { name: label.trim() });
      const value = res?.data?.data;
      onCreated?.(null);
      if (value?.id) {
        toggleValue(attrId, value);
        onCreated?.({ refresh: true });
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to add value');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Choose attributes and values. Every combination becomes a sellable SKU.
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="size-3.5 mr-1" />
          New attribute
        </Button>
      </div>

      <div className="space-y-2">
        {(catalog || []).map((attr) => {
          const selectedAttr = selected.find((s) => String(s.attribute_id) === String(attr.id));
          const checked = Boolean(selectedAttr);
          return (
            <div
              key={attr.id}
              className={cn(
                'rounded-lg border px-3 py-2.5',
                checked ? 'border-primary/30 bg-primary/5' : 'border-border/70',
              )}
            >
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={checked}
                  disabled={disabled}
                  onCheckedChange={() => toggleAttribute(attr)}
                />
                <span className="text-sm font-medium">{attr.name}</span>
                <Badge variant="outline" className="text-[10px] font-normal">
                  {attr.code}
                </Badge>
              </div>
              {checked ? (
                <div className="mt-2 flex flex-wrap gap-1.5 ps-6">
                  {(attr.values || []).map((v) => {
                    const on = selectedAttr.values.some((x) => String(x.id) === String(v.id));
                    return (
                      <button
                        key={v.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => toggleValue(attr.id, v)}
                        className={cn(
                          'rounded-full border px-2.5 py-0.5 text-xs transition-colors',
                          on
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-background text-muted-foreground hover:bg-muted',
                        )}
                      >
                        {v.name}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => addInlineValue(attr.id)}
                    className="rounded-full border border-dashed px-2.5 py-0.5 text-xs text-muted-foreground hover:bg-muted"
                  >
                    + Value
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
        {!catalog?.length ? (
          <p className="text-xs text-muted-foreground py-2">
            No attributes yet. Create Color, Size, or any custom attribute.
          </p>
        ) : null}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New attribute</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Color"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Values</Label>
              <textarea
                className="flex min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={valuesText}
                onChange={(e) => setValuesText(e.target.value)}
                placeholder={'Red\nBlue\nBlack\n\nor: Red, Blue, Black'}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={createAttribute} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CopyVariantDialog({
  open,
  onOpenChange,
  source,
  matrixAttrs,
  catalog,
  onConfirm,
  disabled,
}) {
  const [selections, setSelections] = useState({});
  const [newValueByAttr, setNewValueByAttr] = useState({});
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    if (!open || !source) return;
    const sel = {};
    (matrixAttrs || []).forEach((attr) => {
      const matched = (source.values || []).find(
        (v) => String(v.attribute_id) === String(attr.attribute_id),
      );
      const fromIds = (source.value_ids || []).find((id) =>
        (attr.values || []).some((v) => String(v.id) === String(id)),
      );
      sel[attr.attribute_id] = matched?.id ?? fromIds ?? attr.values?.[0]?.id ?? '';
    });
    setSelections(sel);
    setNewValueByAttr({});
    setDraft({
      ...commercialFieldsFromVariant(source),
      sku: suggestCopiedSku(source.sku, 'COPY'),
    });
  }, [open, source, matrixAttrs]);

  if (!source || !draft) return null;

  const confirm = async () => {
    const nextMatrix = [...(matrixAttrs || [])];
    const valueIds = [];
    const labels = [];

    for (const attr of nextMatrix) {
      const attrId = attr.attribute_id;
      let valueId = selections[attrId];
      const newName = (newValueByAttr[attrId] || '').trim();

      if (newName) {
        try {
          const res = await productsApi.createAttributeValue(attrId, { name: newName });
          const created = res?.data?.data;
          if (!created?.id) throw new Error('No value');
          valueId = created.id;
          const values = [...(attr.values || []), { id: created.id, name: created.name, code: created.code }];
          attr.values = values;
          attr.value_ids = values.map((v) => v.id);
        } catch (err) {
          toast.error(err?.response?.data?.message || `Failed to create value for ${attr.name}`);
          return;
        }
      } else if (valueId && !attr.values.some((v) => String(v.id) === String(valueId))) {
        // ensure selected existing value is in matrix selection
        const cat = (catalog || []).find((c) => String(c.id) === String(attrId));
        const val = (cat?.values || []).find((v) => String(v.id) === String(valueId));
        if (val) {
          attr.values = [...(attr.values || []), val];
          attr.value_ids = attr.values.map((v) => v.id);
        }
      }

      if (!valueId) {
        toast.error(`Select a value for ${attr.name}`);
        return;
      }
      valueIds.push(Number(valueId));
      const valObj =
        (attr.values || []).find((v) => String(v.id) === String(valueId)) ||
        ((catalog || []).find((c) => String(c.id) === String(attrId))?.values || []).find(
          (v) => String(v.id) === String(valueId),
        );
      labels.push(valObj?.name || String(valueId));
    }

    onConfirm({
      matrixAttrs: nextMatrix,
      valueIds,
      label: labels.join(' / '),
      commercial: draft,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Copy variant — {source.variant_label}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <p className="text-xs text-muted-foreground">
            Change one or more attribute values (e.g. Size → XL), then adjust pricing before applying.
            The new combination is added to the matrix; save the product to persist.
          </p>
          {(matrixAttrs || []).map((attr) => (
            <div key={attr.attribute_id} className="space-y-1.5">
              <Label>{attr.name}</Label>
              <div className="flex gap-2">
                <Select
                  value={String(selections[attr.attribute_id] || '')}
                  onValueChange={(v) =>
                    setSelections((s) => ({ ...s, [attr.attribute_id]: Number(v) }))
                  }
                  disabled={disabled}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Value" />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      (catalog || []).find((c) => String(c.id) === String(attr.attribute_id))
                        ?.values ||
                      attr.values ||
                      []
                    ).map((v) => (
                      <SelectItem key={v.id} value={String(v.id)}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  className="w-36"
                  placeholder="+ New value"
                  value={newValueByAttr[attr.attribute_id] || ''}
                  onChange={(e) =>
                    setNewValueByAttr((s) => ({ ...s, [attr.attribute_id]: e.target.value }))
                  }
                  disabled={disabled}
                />
              </div>
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>SKU</Label>
              <Input
                value={draft.sku || ''}
                onChange={(e) => setDraft((d) => ({ ...d, sku: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Sell price</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={draft.unit_price ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, unit_price: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Cost</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={draft.purchase_price ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, purchase_price: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Reorder</Label>
              <Input
                type="number"
                min={0}
                value={draft.reorder_level ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, reorder_level: e.target.value }))}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={confirm} disabled={disabled}>
            Apply copy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ProductVariantsSection({
  enabled,
  onEnabledChange,
  form,
  setField,
  disabled = false,
  taxRates = [],
  /** When true, omit the outer enable switch (used inside the variants manager panel). */
  panelMode = false,
}) {
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkCost, setBulkCost] = useState('');
  const [bulkSkuPrefix, setBulkSkuPrefix] = useState('');
  const [scrollTop, setScrollTop] = useState(0);
  const [copySource, setCopySource] = useState(null);
  const scrollRef = useRef(null);

  const matrixAttrs = form.variant_matrix_attributes || [];
  const variantRows = form.variants || [];

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const res = await productsApi.listAttributes({ active_only: 1 });
      setCatalog(res?.data?.data || []);
    } catch {
      toast.error('Failed to load attributes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (enabled) loadCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const combinations = useMemo(
    () => generateVariantCombinations(matrixAttrs),
    [matrixAttrs],
  );

  useEffect(() => {
    if (!enabled) return;
    const merged = mergeVariantRows(combinations, variantRows, form.sku);
    const prevKeys = (variantRows || []).map((r) => r._key || r.variant_label).join('|');
    const nextKeys = merged.map((r) => r._key).join('|');
    if (prevKeys !== nextKeys) {
      setField('variants', merged);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combinations, form.sku, enabled]);

  const filteredRows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return variantRows;
    return variantRows.filter(
      (r) =>
        (r.variant_label || '').toLowerCase().includes(q) ||
        (r.sku || '').toLowerCase().includes(q) ||
        (r.barcode || '').toLowerCase().includes(q) ||
        (r.lifecycle_status || '').toLowerCase().includes(q),
    );
  }, [variantRows, filter]);

  const updateRow = (key, patch) => {
    setField(
      'variants',
      variantRows.map((r) => {
        if ((r._key || r.variant_label) !== key) return r;
        const next = { ...r, ...patch };
        if (patch.lifecycle_status) {
          next.is_active = patch.lifecycle_status === 'active';
          if (patch.lifecycle_status !== 'active') next.is_default_variant = false;
        }
        return next;
      }),
    );
  };

  const setDefaultVariant = (key) => {
    setField(
      'variants',
      variantRows.map((r) => {
        const rowKey = r._key || r.variant_label;
        const isTarget = rowKey === key;
        const status = r.lifecycle_status || 'active';
        return {
          ...r,
          is_default_variant: isTarget && status === 'active',
        };
      }),
    );
  };

  const applyBulk = () => {
    setField(
      'variants',
      variantRows.map((r) => ({
        ...r,
        unit_price: bulkPrice !== '' ? bulkPrice : r.unit_price,
        purchase_price: bulkCost !== '' ? bulkCost : r.purchase_price,
        sku:
          bulkSkuPrefix !== ''
            ? `${bulkSkuPrefix}${r.variant_label || ''}`.replace(/\s*\/\s*/g, '-').slice(0, 50)
            : r.sku,
      })),
    );
    toast.success('Bulk values applied to all variants');
  };

  const handleCopyConfirm = ({ matrixAttrs: nextMatrix, valueIds, label, commercial }) => {
    const targetKey = [...valueIds].map(Number).sort((a, b) => a - b).join('-');
    const combos = generateVariantCombinations(nextMatrix);
    const merged = mergeVariantRows(combos, form.variants || [], form.sku).map((row) => {
      const key = row._key || row.variant_label;
      if (key === targetKey || row.variant_label === label) {
        return {
          ...row,
          ...commercial,
          sku: commercial.sku || row.sku,
          value_ids: valueIds,
          variant_label: label,
          _key: targetKey,
        };
      }
      return row;
    });
    setField('variant_matrix_attributes', nextMatrix);
    setField('variants', merged);
    loadCatalog();
    toast.success(`Copied into ${label}`);
  };

  if (!enabled) {
    if (panelMode) {
      return (
        <div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
          Variants are off. Close this panel and enable variants on the product sheet.
        </div>
      );
    }
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
        <div>
          <p className="text-sm font-medium">Enable variants</p>
          <p className="text-xs text-muted-foreground">
            Optional. Create Color / Size / custom attributes and auto-generate SKUs.
          </p>
        </div>
        <Switch checked={false} onCheckedChange={onEnabledChange} disabled={disabled} />
      </div>
    );
  }

  const overHard = combinations.length > VARIANT_HARD_LIMIT;
  const overSoft = combinations.length > VARIANT_SOFT_LIMIT;

  return (
    <div className={cn('space-y-3', panelMode && 'space-y-3.5')}>
      {!panelMode ? (
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Variants enabled</p>
            <p className="text-xs text-muted-foreground">
              Parent holds shared settings; each combination is a stockable SKU.
            </p>
          </div>
          <Switch checked onCheckedChange={onEnabledChange} disabled={disabled} />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Pick attributes, then edit SKUs, prices, status, and default in the grid.
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <AttributePicker
          catalog={catalog}
          selected={matrixAttrs}
          disabled={disabled}
          onChange={(next) => setField('variant_matrix_attributes', next)}
          onCreated={() => loadCatalog()}
        />
      )}

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant={overHard ? 'destructive' : overSoft ? 'outline' : 'secondary'}>
          {combinations.length} combination{combinations.length === 1 ? '' : 's'}
        </Badge>
        {overSoft && !overHard ? (
          <span className="text-amber-700">Large matrix — consider fewer values.</span>
        ) : null}
        {overHard ? (
          <span className="text-destructive">
            Exceeds max {VARIANT_HARD_LIMIT}. Remove values before saving.
          </span>
        ) : null}
      </div>

      {variantRows.length > 0 ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-muted/20 p-3">
            <div className="space-y-1">
              <Label className="text-xs">Bulk sell price</Label>
              <Input
                className="h-8 w-28"
                type="number"
                min={0}
                step="0.01"
                value={bulkPrice}
                onChange={(e) => setBulkPrice(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Bulk cost</Label>
              <Input
                className="h-8 w-28"
                type="number"
                min={0}
                step="0.01"
                value={bulkCost}
                onChange={(e) => setBulkCost(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">SKU prefix</Label>
              <Input
                className="h-8 w-36"
                value={bulkSkuPrefix}
                onChange={(e) => setBulkSkuPrefix(e.target.value)}
                placeholder="TSH-"
              />
            </div>
            <Button type="button" size="sm" variant="outline" onClick={applyBulk} disabled={disabled}>
              Apply to all
            </Button>
            <div className="ms-auto space-y-1">
              <Label className="text-xs">Search</Label>
              <Input
                className="h-8 w-44"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter variants…"
              />
            </div>
          </div>

          <VariantGrid
            rows={filteredRows}
            taxRates={taxRates}
            disabled={disabled}
            scrollTop={scrollTop}
            scrollRef={scrollRef}
            onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
            onUpdateRow={updateRow}
            onSetDefault={setDefaultVariant}
            onCopy={(row) => setCopySource(row)}
          />
        </div>
      ) : (
        <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          Select attributes and values to preview generated variants.
        </div>
      )}

      <CopyVariantDialog
        open={!!copySource}
        onOpenChange={(v) => !v && setCopySource(null)}
        source={copySource}
        matrixAttrs={matrixAttrs}
        catalog={catalog}
        disabled={disabled}
        onConfirm={handleCopyConfirm}
      />
    </div>
  );
}

function VariantGrid({
  rows,
  taxRates,
  disabled,
  scrollTop,
  scrollRef,
  onScroll,
  onUpdateRow,
  onSetDefault,
  onCopy,
}) {
  const virtualize = rows.length > VARIANT_VIRTUALIZE_AT;
  const visibleCount = Math.ceil(VARIANT_VIEWPORT_H / VARIANT_ROW_H) + 4;
  const start = virtualize ? Math.max(0, Math.floor(scrollTop / VARIANT_ROW_H) - 2) : 0;
  const end = virtualize ? Math.min(rows.length, start + visibleCount) : rows.length;
  const slice = rows.slice(start, end);
  const topPad = virtualize ? start * VARIANT_ROW_H : 0;
  const bottomPad = virtualize ? Math.max(0, (rows.length - end) * VARIANT_ROW_H) : 0;

  const renderRow = (row) => {
    const key = row._key || row.variant_label;
    const ownImages = row.images || [];
    const previewFile = row.image_files?.[0] || row.image_file;
    const preview =
      previewFile instanceof File
        ? URL.createObjectURL(previewFile)
        : ownImages[0]?.url || row.image_url || null;
    const lifecycle = row.lifecycle_status || (row.is_active === false ? 'archived' : 'active');

    return (
      <tr key={key} className="border-b last:border-0" style={{ height: VARIANT_ROW_H }}>
        <td className="px-2 py-1">
          <label className="relative flex size-9 cursor-pointer items-center justify-center overflow-hidden rounded border bg-muted/30">
            {preview ? (
              <img src={preview} alt="" className="size-full object-cover" />
            ) : (
              <ImagePlus className="size-3.5 text-muted-foreground" />
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="sr-only"
              disabled={disabled}
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                if (!files.length) return;
                onUpdateRow(key, {
                  image_files: files,
                  image_file: files[0] || null,
                  image_url: URL.createObjectURL(files[0]),
                });
              }}
            />
          </label>
          {ownImages.length > 1 || (row.image_files || []).length > 1 ? (
            <span className="mt-0.5 block text-[10px] text-muted-foreground text-center">
              {(row.image_files || []).length || ownImages.length} imgs
            </span>
          ) : null}
        </td>
        <td className="px-3 py-1.5 font-medium whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            {row.variant_label}
            {row.is_default_variant ? (
              <Badge variant="secondary" className="text-[10px] font-normal gap-0.5">
                <Star className="size-2.5" /> Default
              </Badge>
            ) : null}
          </div>
        </td>
        <td className="px-3 py-1.5">
          <Input
            className="h-8 min-w-[8rem]"
            value={row.sku || ''}
            disabled={disabled}
            onChange={(e) => onUpdateRow(key, { sku: e.target.value })}
          />
        </td>
        <td className="px-3 py-1.5">
          <Input
            className="h-8 min-w-[7rem]"
            value={row.barcode || ''}
            disabled={disabled}
            onChange={(e) => onUpdateRow(key, { barcode: e.target.value })}
          />
        </td>
        <td className="px-3 py-1.5">
          <Input
            className="h-8 w-24"
            type="number"
            min={0}
            step="0.01"
            value={row.unit_price ?? ''}
            disabled={disabled}
            onChange={(e) => onUpdateRow(key, { unit_price: e.target.value })}
          />
        </td>
        <td className="px-3 py-1.5">
          <Input
            className="h-8 w-24"
            type="number"
            min={0}
            step="0.01"
            value={row.purchase_price ?? ''}
            disabled={disabled}
            onChange={(e) => onUpdateRow(key, { purchase_price: e.target.value })}
          />
        </td>
        <td className="px-3 py-1.5">
          <Select
            value={row.tax_rate_id || '_inherit'}
            onValueChange={(v) => onUpdateRow(key, { tax_rate_id: v === '_inherit' ? '' : v })}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 w-[8.5rem]">
              <SelectValue placeholder="Inherit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_inherit">Inherit</SelectItem>
              {(taxRates || []).map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>
                  {t.name || t.label || `#${t.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </td>
        <td className="px-3 py-1.5">
          <Select
            value={lifecycle}
            onValueChange={(v) => onUpdateRow(key, { lifecycle_status: v })}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 w-[8.5rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LIFECYCLE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </td>
        <td className="px-3 py-1.5">
          <Input
            className="h-8 w-20"
            type="number"
            min={0}
            value={row.reorder_level ?? ''}
            disabled={disabled}
            onChange={(e) => onUpdateRow(key, { reorder_level: e.target.value })}
          />
        </td>
        <td className="px-2 py-1.5">
          <Button
            type="button"
            size="icon"
            variant={row.is_default_variant ? 'default' : 'ghost'}
            className="size-8"
            disabled={disabled || lifecycle !== 'active'}
            title="Set as default variant"
            onClick={() => onSetDefault(key)}
          >
            <Star className={cn('size-3.5', row.is_default_variant && 'fill-current')} />
          </Button>
        </td>
        <td className="px-2 py-1.5">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-8"
            disabled={disabled}
            title="Copy variant"
            onClick={() => onCopy(row)}
          >
            <Copy className="size-3.5" />
          </Button>
        </td>
      </tr>
    );
  };

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      className="overflow-auto rounded-lg border"
      style={{ maxHeight: VARIANT_VIEWPORT_H }}
    >
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-muted/80 backdrop-blur z-10">
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="px-2 py-2 font-medium w-12">Img</th>
            <th className="px-3 py-2 font-medium">Variant</th>
            <th className="px-3 py-2 font-medium">SKU</th>
            <th className="px-3 py-2 font-medium">Barcode</th>
            <th className="px-3 py-2 font-medium">Sell</th>
            <th className="px-3 py-2 font-medium">Cost</th>
            <th className="px-3 py-2 font-medium">Tax</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Reorder</th>
            <th className="px-2 py-2 font-medium">Def</th>
            <th className="px-2 py-2 font-medium">Copy</th>
          </tr>
        </thead>
        <tbody>
          {topPad > 0 ? (
            <tr aria-hidden>
              <td colSpan={11} style={{ height: topPad, padding: 0, border: 0 }} />
            </tr>
          ) : null}
          {slice.map(renderRow)}
          {bottomPad > 0 ? (
            <tr aria-hidden>
              <td colSpan={11} style={{ height: bottomPad, padding: 0, border: 0 }} />
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
