import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import { cn } from '@/lib/utils';
import { productsApi } from '../api/products.api';
import { QuickUnitDialog } from './QuickCreateDialogs';

const NEW_UNIT = '__product_unit_new__';
const NEW_BASE = '__new_base_unit__';

function blankRow() {
  return {
    unit_key: '',
    parent_unit_key: null,
    factor_to_parent: '',
    is_active: true,
    is_whole_number_only: false,
    _label: '',
  };
}

function shortUnitLabel(label, fallback = '') {
  const raw = String(label || '').trim();
  if (!raw) return fallback || '';
  if (/^u:\d+$/i.test(raw)) return fallback || 'Unit';
  const cut = raw.indexOf(' (');
  if (cut > 0) return raw.slice(0, cut).trim();
  return raw;
}

function isBuiltinUnitKey(key) {
  return !!key && !String(key).startsWith('u:');
}

export function ProductUnitsSection({
  baseUnit,
  baseUnitLabel,
  unitOptions = [],
  rows = [],
  onBaseUnitChange,
  onRowsChange,
  onBaseUnitCreated,
  disabled = false,
  selectKey,
  fallbackBaseLabel,
}) {
  const [availableUnits, setAvailableUnits] = useState([]);
  const [catalogUnits, setCatalogUnits] = useState([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createTarget, setCreateTarget] = useState(null);
  const [extraLabels, setExtraLabels] = useState({});

  const list = rows || [];
  const baseShort = useMemo(
    () => shortUnitLabel(baseUnitLabel || fallbackBaseLabel, 'base unit'),
    [baseUnitLabel, fallbackBaseLabel],
  );
  const dialogBaseUnit = isBuiltinUnitKey(baseUnit) ? baseUnit : 'pcs';

  useEffect(() => {
    let cancelled = false;
    productsApi
      .listUnits()
      .then((res) => {
        if (cancelled) return;
        const items = res?.data?.data || res?.data || [];
        setCatalogUnits(Array.isArray(items) ? items : []);
      })
      .catch(() => {
        if (!cancelled) setCatalogUnits([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshAvailableUnits = () => {
    if (!baseUnit) {
      setAvailableUnits([]);
      return Promise.resolve([]);
    }
    setLoadingUnits(true);
    return productsApi
      .unitFamilyOptions(baseUnit)
      .then((res) => {
        const units = res?.data?.data?.units || [];
        setAvailableUnits(units);
        return units;
      })
      .catch(() => {
        setAvailableUnits([]);
        return [];
      })
      .finally(() => setLoadingUnits(false));
  };

  useEffect(() => {
    let cancelled = false;
    if (!baseUnit) {
      setAvailableUnits([]);
      return undefined;
    }
    setLoadingUnits(true);
    productsApi
      .unitFamilyOptions(baseUnit)
      .then((res) => {
        if (!cancelled) setAvailableUnits(res?.data?.data?.units || []);
      })
      .catch(() => {
        if (!cancelled) setAvailableUnits([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingUnits(false);
      });
    return () => {
      cancelled = true;
    };
  }, [baseUnit]);

  const labelByKey = useMemo(() => {
    const map = new Map();
    (unitOptions || []).forEach((u) => {
      if (u?.value) map.set(String(u.value), shortUnitLabel(u.label || u.name, String(u.value)));
    });
    catalogUnits.forEach((u) => {
      const key = String(u.value || (u.id != null ? `u:${u.id}` : ''));
      if (key) map.set(key, shortUnitLabel(u.label || u.name, key));
    });
    availableUnits.forEach((u) => {
      if (u?.unit_key) map.set(String(u.unit_key), shortUnitLabel(u.label, u.unit_key));
    });
    Object.entries(extraLabels).forEach(([k, v]) => map.set(k, shortUnitLabel(v, k)));
    return map;
  }, [unitOptions, catalogUnits, availableUnits, extraLabels]);

  const resolveLabel = (unitKey, rowLabel) => {
    if (!unitKey) return '';
    if (rowLabel) return shortUnitLabel(rowLabel, unitKey);
    return labelByKey.get(String(unitKey)) || shortUnitLabel(unitKey, 'Unit');
  };

  const candidateUnits = useMemo(() => {
    const usedKeys = new Set(
      [baseUnit, ...list.map((r) => r.unit_key)].filter(Boolean).map(String),
    );
    const fromFamily = availableUnits.filter(
      (u) => !u.is_storage && u.unit_key && !usedKeys.has(String(u.unit_key)),
    );
    const fromCatalog = catalogUnits
      .filter((u) => {
        const key = String(u.value || (u.id != null ? `u:${u.id}` : ''));
        if (!key || usedKeys.has(key) || key === baseUnit) return false;
        if (fromFamily.some((f) => f.unit_key === key)) return false;
        return true;
      })
      .map((u) => ({
        unit_key: String(u.value || `u:${u.id}`),
        label: shortUnitLabel(u.label || u.name),
        factor_to_family_base: Number(u.factor_to_base) > 0 ? Number(u.factor_to_base) : 1,
        is_storage: false,
        whole_number_only: !!u.is_whole_number_only,
      }));

    const merged = [...fromFamily];
    fromCatalog.forEach((u) => {
      if (!merged.some((m) => m.unit_key === u.unit_key)) merged.push(u);
    });
    return merged;
  }, [availableUnits, catalogUnits, list, baseUnit]);

  const baseSelectOptions = useMemo(() => {
    const opts = (unitOptions || []).map((o) => ({
      value: String(o.value),
      label: shortUnitLabel(o.label || o.name, String(o.value)),
    }));
    if (baseUnit && !opts.some((o) => o.value === String(baseUnit))) {
      opts.push({
        value: String(baseUnit),
        label: shortUnitLabel(fallbackBaseLabel || baseUnitLabel, baseShort),
      });
    }
    return opts;
  }, [unitOptions, baseUnit, baseUnitLabel, fallbackBaseLabel, baseShort]);

  const suggestedFactor = (meta) => {
    if (!meta) return '';
    const storage = availableUnits.find((u) => u.is_storage);
    const baseFactor = storage?.factor_to_family_base || 1;
    if (!(meta.factor_to_family_base > 0) || !(baseFactor > 0)) {
      return meta.factor_to_family_base > 0 ? Number(meta.factor_to_family_base) : '';
    }
    const ratio = meta.factor_to_family_base / baseFactor;
    if (ratio === 1 && meta.unit_key && meta.unit_key !== baseUnit) return '';
    return Number(ratio.toFixed(6));
  };

  const optionsForRow = (rowIndex) => {
    const used = new Set(
      list.filter((_, i) => i !== rowIndex).map((r) => r.unit_key).filter(Boolean).map(String),
    );
    return candidateUnits.filter((u) => !used.has(String(u.unit_key)));
  };

  const updateRow = (index, patch) => {
    const next = [...list];
    next[index] = { ...next[index], ...patch };
    onRowsChange(next);
  };

  const chooseUnitForRow = (index, unitKey) => {
    if (!unitKey || unitKey === baseUnit) return;
    if (list.some((r, i) => i !== index && r.unit_key === unitKey)) {
      toast.error('That unit is already added');
      return;
    }
    const meta =
      availableUnits.find((u) => u.unit_key === unitKey) ||
      candidateUnits.find((u) => u.unit_key === unitKey);
    const current = list[index];
    const label = resolveLabel(unitKey, meta?.label);
    updateRow(index, {
      unit_key: unitKey,
      _label: label,
      factor_to_parent:
        current.factor_to_parent === '' || current.factor_to_parent == null
          ? suggestedFactor(meta)
          : current.factor_to_parent,
      is_whole_number_only:
        current.unit_key === '' ? !!meta?.whole_number_only : current.is_whole_number_only,
    });
  };

  const addRow = (prefill = null) => {
    if (list.some((r) => !r.unit_key)) {
      toast.message('Finish the open unit row first');
      return;
    }
    if (prefill?.unit_key && list.some((r) => r.unit_key === prefill.unit_key)) return;
    onRowsChange([...list, { ...blankRow(), ...(prefill || {}) }]);
  };

  const quickAdd = (unitKey) => {
    const meta = candidateUnits.find((u) => u.unit_key === unitKey);
    addRow({
      unit_key: unitKey,
      _label: resolveLabel(unitKey, meta?.label),
      factor_to_parent: suggestedFactor(meta),
      is_whole_number_only: !!meta?.whole_number_only,
    });
  };

  const removeRow = (index) => onRowsChange(list.filter((_, i) => i !== index));

  const openCreateForRow = (rowIndex) => {
    setCreateTarget(rowIndex);
    setCreateOpen(true);
  };

  const openCreateForBase = () => {
    setCreateTarget('base');
    setCreateOpen(true);
  };

  const handleUnitCreated = async (created) => {
    const unitKey =
      created?.value || created?.unit_key || (created?.id != null ? `u:${created.id}` : null);
    const name = shortUnitLabel(created?.label || created?.name, unitKey || 'Unit');

    if (unitKey && name) {
      setExtraLabels((prev) => ({ ...prev, [unitKey]: name }));
    }

    await refreshAvailableUnits();
    try {
      const res = await productsApi.listUnits();
      const items = res?.data?.data || res?.data || [];
      setCatalogUnits(Array.isArray(items) ? items : []);
    } catch {
      /* ignore */
    }

    if (createTarget === 'base') {
      await onBaseUnitCreated?.(created);
      return;
    }

    if (createTarget == null || !unitKey) return;
    const current = list[createTarget];
    if (!current) return;
    if (list.some((r, i) => i !== createTarget && r.unit_key === unitKey)) {
      toast.error('That unit is already added');
      return;
    }

    updateRow(createTarget, {
      unit_key: unitKey,
      _label: name,
      factor_to_parent:
        current.factor_to_parent === '' || current.factor_to_parent == null
          ? created?.factor_to_base != null && Number(created.factor_to_base) > 0
            ? Number(created.factor_to_base)
            : ''
          : current.factor_to_parent,
      is_whole_number_only:
        current.unit_key === ''
          ? !!created?.is_whole_number_only
          : current.is_whole_number_only,
    });
  };

  const quickCandidates = candidateUnits.slice(0, 5);
  const hasUnfilled = list.some((r) => !r.unit_key);

  return (
    <div className="overflow-hidden">
      {/* Base unit */}
      <div className="border-b bg-muted/20 px-4 py-3.5">
        <div className="flex items-center justify-between gap-2 mb-2">
          <Label className="text-xs font-medium text-muted-foreground">
            Base unit (inventory) <span className="text-destructive">*</span>
          </Label>
        </div>
        <Select
          key={selectKey ? `${selectKey}-${baseUnit}` : undefined}
          value={baseUnit || undefined}
          onValueChange={(v) => {
            if (v === NEW_BASE) {
              openCreateForBase();
              return;
            }
            onBaseUnitChange?.(v);
          }}
          disabled={disabled}
        >
          <SelectTrigger className="h-10 bg-background">
            <SelectValue placeholder="Select base unit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NEW_BASE} className="text-primary font-medium">
              + Create new unit
            </SelectItem>
            {baseSelectOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="mt-2 text-xs text-muted-foreground">
          Stock and costing use <span className="font-medium text-foreground">{baseShort}</span>.
        </p>
      </div>

      {/* Additional units */}
      <div className="px-4 py-3.5 space-y-3">
        <div>
          <p className="text-sm font-medium text-foreground">Also sell or buy in</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Optional — e.g. 1 Box = 12 {baseShort}
          </p>
        </div>

        {!baseUnit ? (
          <p className="text-sm text-muted-foreground py-2">Select a base unit first.</p>
        ) : (
          <>
            {quickCandidates.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {quickCandidates.map((u) => (
                  <button
                    key={u.unit_key}
                    type="button"
                    disabled={disabled || hasUnfilled}
                    onClick={() => quickAdd(u.unit_key)}
                    className={cn(
                      'h-7 rounded-md border bg-background px-2.5 text-xs',
                      'hover:bg-muted/50 transition-colors',
                      'disabled:opacity-40 disabled:pointer-events-none',
                    )}
                  >
                    + {shortUnitLabel(u.label, u.unit_key)}
                  </button>
                ))}
              </div>
            )}

            {list.length === 0 ? (
              <div className="rounded-md border border-dashed px-3 py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No extra units — documents will use {baseShort} only.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  disabled={disabled || loadingUnits}
                  onClick={() => addRow()}
                >
                  {loadingUnits ? (
                    <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Plus className="size-3.5 mr-1.5" />
                  )}
                  Add unit
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {list.map((row, index) => {
                  const label = resolveLabel(row.unit_key, row._label);
                  const options = optionsForRow(index);
                  const factorInvalid = !!row.unit_key && !(Number(row.factor_to_parent) > 0);
                  const inactive = row.unit_key && row.is_active === false;
                  const comboboxOptions = [
                    ...options.map((u) => ({
                      value: u.unit_key,
                      label: shortUnitLabel(u.label, u.unit_key),
                    })),
                    ...(row.unit_key && !options.some((u) => u.unit_key === row.unit_key)
                      ? [{ value: row.unit_key, label }]
                      : []),
                  ];

                  return (
                    <div
                      key={`${row.unit_key || 'new'}-${index}`}
                      className={cn(
                        'rounded-md border bg-muted/10 p-2.5',
                        inactive && 'opacity-60',
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-muted-foreground tabular-nums w-4 text-center shrink-0">
                          1
                        </span>

                        <div className="min-w-[8rem] flex-1">
                          <SearchableCombobox
                            value={row.unit_key}
                            onValueChange={(v) => chooseUnitForRow(index, v)}
                            options={comboboxOptions}
                            placeholder="Unit"
                            searchPlaceholder="Search…"
                            disabled={disabled}
                            triggerClassName="h-9 w-full bg-background"
                            renderValue={() => label || null}
                            actionItems={[
                              {
                                value: NEW_UNIT,
                                label: '+ Create unit',
                                className: 'text-primary font-medium',
                                onSelect: () => openCreateForRow(index),
                              },
                            ]}
                          />
                        </div>

                        <span className="text-sm text-muted-foreground shrink-0">=</span>

                        <Input
                          type="number"
                          min={0}
                          step="any"
                          inputMode="decimal"
                          className={cn(
                            'h-9 w-20 shrink-0 text-center font-medium tabular-nums bg-background',
                            factorInvalid && 'border-destructive',
                          )}
                          value={row.factor_to_parent}
                          disabled={disabled || !row.unit_key}
                          placeholder="12"
                          onChange={(e) => updateRow(index, { factor_to_parent: e.target.value })}
                        />

                        <span className="text-sm font-medium text-foreground shrink-0 min-w-[3rem] truncate">
                          {baseShort}
                        </span>

                        <div className="flex items-center gap-1 ms-auto shrink-0">
                          <Switch
                            checked={row.is_active !== false}
                            disabled={disabled || !row.unit_key}
                            onCheckedChange={(v) => updateRow(index, { is_active: v })}
                            aria-label="Active on documents"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:text-destructive"
                            disabled={disabled}
                            onClick={() => removeRow(index)}
                            aria-label="Remove"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>

                      {row.unit_key && Number(row.factor_to_parent) > 0 ? (
                        <p className="mt-1.5 ps-6 text-xs text-muted-foreground">
                          1 {label} = {row.factor_to_parent} {baseShort}
                        </p>
                      ) : null}

                      {factorInvalid ? (
                        <p className="mt-1.5 ps-6 text-xs text-destructive">
                          Enter quantity in {baseShort}
                        </p>
                      ) : null}
                    </div>
                  );
                })}

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={disabled || loadingUnits || hasUnfilled}
                    onClick={() => addRow()}
                  >
                    {loadingUnits ? (
                      <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Plus className="size-3.5 mr-1.5" />
                    )}
                    Add unit
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <QuickUnitDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleUnitCreated}
        defaultBaseUnit={createTarget === 'base' ? '' : dialogBaseUnit}
        unitOptions={unitOptions}
      />
    </div>
  );
}
