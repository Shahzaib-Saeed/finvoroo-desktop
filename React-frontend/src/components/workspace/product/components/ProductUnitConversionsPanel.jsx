import { useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, Loader2, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import { cn } from '@/lib/utils';
import { productsApi } from '../api/products.api';
import { QuickUnitDialog } from './QuickCreateDialogs';

const NEW_UNIT = '__product_unit_new__';

function blankRow() {
  return {
    unit_key: '',
    parent_unit_key: null,
    factor_to_parent: '',
    is_active: true,
    is_whole_number_only: false,
  };
}

/**
 * Additional (non-base) units for one product — each with a conversion factor to
 * the product's permanent Base / Inventory UOM. The base unit itself is never
 * listed or removable here.
 */
export function ProductUnitConversionsPanel({
  baseUnit,
  baseUnitLabel,
  rows,
  onChange,
  disabled,
  unitOptions,
}) {
  const [availableUnits, setAvailableUnits] = useState([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [unitDialogTargetRow, setUnitDialogTargetRow] = useState(null);

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
        if (cancelled) return;
        setAvailableUnits(res?.data?.data?.units || []);
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

  const list = rows || [];
  const candidateUnits = useMemo(
    () => availableUnits.filter((u) => !u.is_storage && u.unit_key !== baseUnit),
    [availableUnits, baseUnit],
  );
  const unitMeta = useMemo(() => {
    const map = new Map();
    availableUnits.forEach((u) => map.set(u.unit_key, u));
    return map;
  }, [availableUnits]);

  const optionsForRow = (rowIndex) => {
    const usedByOtherRows = new Set(
      list.filter((_, i) => i !== rowIndex).map((r) => r.unit_key).filter(Boolean),
    );
    return candidateUnits.filter((u) => !usedByOtherRows.has(u.unit_key));
  };

  const addRow = () => {
    if (list.some((r) => !r.unit_key)) return;
    onChange([...list, blankRow()]);
  };

  const updateRow = (index, patch) => {
    const next = [...list];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const suggestedFactor = (meta, units = availableUnits) => {
    const storageEntry = units.find((u) => u.is_storage) || units.find((u) => u.unit_key === baseUnit);
    const baseFactor = storageEntry?.factor_to_family_base || 1;
    return meta && baseFactor > 0
      ? Number((meta.factor_to_family_base / baseFactor).toFixed(6))
      : '';
  };

  const quickAddUnit = (unitKey) => {
    if (list.some((r) => r.unit_key === unitKey)) return;
    const meta = unitMeta.get(unitKey);
    onChange([
      ...list,
      {
        ...blankRow(),
        unit_key: unitKey,
        factor_to_parent: suggestedFactor(meta),
        is_whole_number_only: !!meta?.whole_number_only,
      },
    ]);
  };

  const openCreateUnitDialog = (rowIndex) => {
    setUnitDialogTargetRow(rowIndex);
    setUnitDialogOpen(true);
  };

  const handleUnitCreated = async (created) => {
    const units = await refreshAvailableUnits();
    if (unitDialogTargetRow == null) return;

    const unitKey =
      created?.value ||
      created?.unit_key ||
      (created?.id != null ? `u:${created.id}` : null);
    if (!unitKey) return;

    const meta = units.find((u) => u.unit_key === unitKey);
    const current = list[unitDialogTargetRow];
    if (!current) return;

    // Prevent duplicates if the unit was somehow already on another row.
    if (list.some((r, i) => i !== unitDialogTargetRow && r.unit_key === unitKey)) {
      return;
    }

    updateRow(unitDialogTargetRow, {
      unit_key: unitKey,
      factor_to_parent:
        current.factor_to_parent === '' || current.factor_to_parent == null
          ? suggestedFactor(meta, units) ||
            (created?.factor_to_base != null ? Number(created.factor_to_base) : '')
          : current.factor_to_parent,
      is_whole_number_only:
        current.unit_key === ''
          ? !!(meta?.whole_number_only || created?.is_whole_number_only)
          : current.is_whole_number_only,
    });
  };

  const chooseUnitForRow = (index, unitKey) => {
    if (!unitKey || unitKey === baseUnit) return;
    if (list.some((r, i) => i !== index && r.unit_key === unitKey)) return;

    const meta = unitMeta.get(unitKey);
    const suggested = suggestedFactor(meta);
    const current = list[index];
    updateRow(index, {
      unit_key: unitKey,
      factor_to_parent:
        current.factor_to_parent === '' || current.factor_to_parent == null
          ? suggested
          : current.factor_to_parent,
      is_whole_number_only:
        current.unit_key === '' ? !!meta?.whole_number_only : current.is_whole_number_only,
    });
  };

  const removeRow = (index) => {
    onChange(list.filter((_, i) => i !== index));
  };

  const usedCount = list.filter((r) => r.unit_key).length;
  const hasUnfilledRow = list.some((r) => !r.unit_key);
  const noMoreCandidates = candidateUnits.length > 0 && usedCount >= candidateUnits.length;
  // Always allow adding a blank row so "+ Create New Unit" remains reachable,
  // even when the curated family list is empty.
  const addDisabled = disabled || loadingUnits || noMoreCandidates || hasUnfilledRow;

  if (!baseUnit) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
        Select a Base UOM above before adding additional units.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-foreground">Additional units</h4>
            {list.length > 0 && (
              <Badge variant="secondary" className="rounded-md">
                {list.length}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
            Sell or buy this product in other units. Inventory and costing always stay in{' '}
            <span className="font-medium text-foreground">{baseUnitLabel || 'the base UOM'}</span>.
            Example: <span className="font-medium text-foreground">1 Box = 12 {baseUnitLabel || 'PCS'}</span>.
          </p>
        </div>
      </div>

      {!loadingUnits && candidateUnits.some((u) => !list.some((r) => r.unit_key === u.unit_key)) && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground shrink-0">Quick add:</span>
          {candidateUnits
            .filter((u) => !list.some((r) => r.unit_key === u.unit_key))
            .slice(0, 8)
            .map((u) => (
              <button
                key={u.unit_key}
                type="button"
                disabled={disabled}
                onClick={() => quickAddUnit(u.unit_key)}
                className="rounded-full border border-border/60 bg-muted/30 px-2.5 py-0.5 text-xs text-foreground hover:bg-muted/60 disabled:opacity-50 disabled:pointer-events-none"
              >
                + {u.label}
              </button>
            ))}
        </div>
      )}

      {list.length ? (
        <div className="rounded-xl border border-border/60 overflow-hidden bg-background">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="text-left font-medium px-3 py-2.5">Unit</th>
                <th className="text-left font-medium px-3 py-2.5">Conversion to base</th>
                <th className="text-center font-medium px-3 py-2.5 whitespace-nowrap">
                  Whole # only
                </th>
                <th className="text-center font-medium px-3 py-2.5">Active</th>
                <th className="px-3 py-2.5 w-10" />
              </tr>
            </thead>
            <tbody>
              {list.map((row, index) => {
                const chosen = row.unit_key ? unitMeta.get(row.unit_key) : null;
                const label = chosen?.label || row.unit_key;
                const options = optionsForRow(index);
                const factorInvalid = row.unit_key && !(Number(row.factor_to_parent) > 0);
                const inactive = row.unit_key && row.is_active === false;

                return (
                  <tr
                    key={`${row.unit_key || 'new'}-${index}`}
                    className={cn(
                      'border-t border-border/60',
                      inactive && 'bg-muted/20 opacity-80',
                    )}
                  >
                    <td className="px-3 py-2.5 align-top">
                      <SearchableCombobox
                        value={row.unit_key}
                        onValueChange={(v) => chooseUnitForRow(index, v)}
                        options={[
                          ...options.map((u) => ({ value: u.unit_key, label: u.label })),
                          ...(chosen && !options.some((u) => u.unit_key === chosen.unit_key)
                            ? [{ value: chosen.unit_key, label: chosen.label }]
                            : []),
                        ]}
                        placeholder="Choose unit…"
                        searchPlaceholder="Search unit…"
                        disabled={disabled}
                        triggerClassName="h-9 w-44"
                        actionItems={[
                          {
                            value: NEW_UNIT,
                            label: '+ Create New Unit',
                            className: 'text-primary font-medium',
                            onSelect: () => openCreateUnitDialog(index),
                          },
                        ]}
                      />
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      {row.unit_key ? (
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          <ArrowLeftRight className="size-3.5 shrink-0 opacity-60" />
                          <span className="whitespace-nowrap">1 {label} =</span>
                          <Input
                            type="number"
                            min={0}
                            step="any"
                            className={cn(
                              'h-9 w-24 text-center',
                              factorInvalid && 'border-destructive text-destructive',
                            )}
                            value={row.factor_to_parent}
                            disabled={disabled}
                            placeholder="e.g. 12"
                            onChange={(e) => updateRow(index, { factor_to_parent: e.target.value })}
                          />
                          <span className="font-medium text-foreground whitespace-nowrap">
                            {baseUnitLabel || 'base'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/70 italic">
                          Pick a unit, then enter how many {baseUnitLabel || 'base units'} it contains
                        </span>
                      )}
                      {factorInvalid ? (
                        <p className="text-[11px] text-destructive mt-1">Enter a factor greater than 0</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5 text-center align-top">
                      <Switch
                        checked={!!row.is_whole_number_only}
                        disabled={disabled || !row.unit_key}
                        onCheckedChange={(v) => updateRow(index, { is_whole_number_only: v })}
                      />
                    </td>
                    <td className="px-3 py-2.5 text-center align-top">
                      <Switch
                        checked={row.is_active !== false}
                        disabled={disabled || !row.unit_key}
                        onCheckedChange={(v) => updateRow(index, { is_active: v })}
                      />
                    </td>
                    <td className="px-3 py-2.5 text-center align-top">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive/70 hover:text-destructive"
                        disabled={disabled}
                        onClick={() => removeRow(index)}
                        aria-label={`Remove ${label || 'unit'}`}
                        title="Remove unit"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border/60 bg-muted/15 px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            No additional units yet — documents will only offer{' '}
            <span className="font-medium text-foreground">{baseUnitLabel || 'the base UOM'}</span>.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={addRow} disabled={addDisabled}>
          {loadingUnits ? (
            <Loader2 className="size-4 mr-1.5 animate-spin" />
          ) : (
            <Plus className="size-4 mr-1.5" />
          )}
          Add unit
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled || loadingUnits}
          onClick={() => {
            let index = list.findIndex((r) => !r.unit_key);
            if (index < 0) {
              index = list.length;
              onChange([...list, blankRow()]);
            }
            setTimeout(() => openCreateUnitDialog(index), 0);
          }}
        >
          + Create New Unit
        </Button>
      </div>

      {!loadingUnits && noMoreCandidates && (
        <p className="text-xs text-muted-foreground">
          Every available unit for this family is already added. Create a custom unit if you need another.
        </p>
      )}
      {hasUnfilledRow && !noMoreCandidates && (
        <p className="text-xs text-muted-foreground">
          Finish choosing a unit for the open row before adding another.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Disable a unit to hide it on new documents — existing lines keep their saved unit snapshots.
        The Base UOM cannot be removed.
      </p>

      <QuickUnitDialog
        open={unitDialogOpen}
        onOpenChange={setUnitDialogOpen}
        onCreated={handleUnitCreated}
        defaultBaseUnit={baseUnit}
        unitOptions={unitOptions}
      />
    </div>
  );
}
