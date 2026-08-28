import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { jobOrderCustomFieldsApi } from '@/pages/accounting/job-orders/api/job-order-custom-fields.api';
import { invoiceTemplatesApi } from '../api/invoice-templates.api';
import { PLACEMENT, PLACEMENT_LABELS, PLACEMENT_EDITOR_VALUES } from '../constants';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function visibilitySummary(def) {
  const parts = [];
  if (def.show_on_invoice) parts.push('Invoices');
  if (def.show_on_bill) parts.push('Bills');
  return parts.length ? parts.join(' · ') : 'Not on invoice/bill';
}

function isDocumentEligible(def) {
  return def?.is_active !== false && (def?.show_on_invoice || def?.show_on_bill);
}

function apiErrorMessage(err, fallback) {
  const data = err?.response?.data;
  if (data?.errors && typeof data.errors === 'object') {
    const first = Object.values(data.errors).flat().find(Boolean);
    if (first) return String(first);
  }
  return data?.message || fallback;
}

export function TemplateFieldPlacementsPanel({
  templateId,
  templateFields = [],
  refreshKey = 0,
  onSaved,
  totalDefinitionsCount = null,
}) {
  const [definitions, setDefinitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [placements, setPlacements] = useState({});
  const [included, setIncluded] = useState({});

  const loadDefinitions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await jobOrderCustomFieldsApi.list({ per_page: 100 });
      const items = res.data?.data ?? [];
      setDefinitions(
        (Array.isArray(items) ? items : []).filter(isDocumentEligible),
      );
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load custom fields');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDefinitions();
  }, [loadDefinitions, refreshKey]);

  const placementByKey = useMemo(() => {
    const map = {};
    (templateFields || []).forEach((f) => {
      if (f?.field_key) {
        map[f.field_key] = f.placement || PLACEMENT.INVOICE_DETAILS_TOP;
      }
    });
    return map;
  }, [templateFields]);

  const includedByDefinitionId = useMemo(() => {
    const set = {};
    (templateFields || []).forEach((f) => {
      if (f?.definition_id) {
        set[String(f.definition_id)] = true;
      }
    });
    return set;
  }, [templateFields]);

  const includedByKey = useMemo(() => {
    const set = {};
    (templateFields || []).forEach((f) => {
      if (f?.field_key) set[f.field_key] = true;
    });
    return set;
  }, [templateFields]);

  const isDefinitionIncluded = useCallback(
    (def) =>
      Boolean(includedByDefinitionId[String(def.id)]) ||
      Boolean(includedByKey[def.field_key]),
    [includedByDefinitionId, includedByKey],
  );

  useEffect(() => {
    const nextPlacements = {};
    const nextIncluded = {};
    definitions.forEach((def) => {
      nextPlacements[def.field_key] = placementByKey[def.field_key] ?? PLACEMENT.INVOICE_DETAILS_TOP;
      nextIncluded[def.field_key] = isDefinitionIncluded(def);
    });
    setPlacements(nextPlacements);
    setIncluded(nextIncluded);
  }, [definitions, placementByKey, isDefinitionIncluded]);

  const documentFields = definitions;
  const includedCount = documentFields.filter((def) => included[def.field_key]).length;
  const hiddenFromTemplateCount =
    totalDefinitionsCount != null
      ? Math.max(0, totalDefinitionsCount - documentFields.length)
      : null;

  const savePlacements = async () => {
    if (!templateId || documentFields.length === 0) return;
    setSaving(true);
    try {
      const payload = documentFields.map((def) => ({
        definition_id: def.id,
        field_key: def.field_key,
        placement: placements[def.field_key] || PLACEMENT.INVOICE_DETAILS_TOP,
        included: Boolean(included[def.field_key]),
      }));
      const res = await invoiceTemplatesApi.updateFieldPlacements(templateId, {
        placements: payload,
      });
      toast.success(res.data?.message || 'Template fields saved.');
      onSaved?.(res.data?.data);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not save fields.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold">Fields on this template</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Choose which invoice/bill fields appear on this template and where they show. Only fields
            with <strong>Invoices</strong> and/or <strong>Bills</strong> enabled above are listed here.
          </p>
          {hiddenFromTemplateCount > 0 ? (
            <p className="text-xs text-muted-foreground mt-2">
              {hiddenFromTemplateCount} of your {totalDefinitionsCount} fields are job-order or other
              documents only — enable Invoices or Bills on those fields to add them here.
            </p>
          ) : null}
        </div>
        {documentFields.length > 0 ? (
          <Badge variant="secondary" appearance="light" className="shrink-0">
            {includedCount} of {documentFields.length} on template
          </Badge>
        ) : null}
      </div>

      {documentFields.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No fields enabled for invoices or bills yet. Add a field above and check{' '}
          <strong>Invoices</strong> and/or <strong>Bills</strong> under &ldquo;Where to show&rdquo;.
        </div>
      ) : (
        <div className="space-y-3">
          {documentFields.map((def) => {
            const isOn = Boolean(included[def.field_key]);
            return (
              <div
                key={def.id}
                className={cn(
                  'rounded-xl border bg-card p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between transition-colors',
                  !isOn && 'opacity-70',
                )}
              >
                <label className="flex min-w-0 items-start gap-3 cursor-pointer">
                  <Checkbox
                    checked={isOn}
                    onCheckedChange={(c) =>
                      setIncluded((prev) => ({ ...prev, [def.field_key]: Boolean(c) }))
                    }
                    className="mt-0.5 shrink-0"
                  />
                  <span className="min-w-0">
                    <span className="block font-medium text-sm truncate">{def.label}</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      {isOn ? 'Shown on this template' : 'Hidden on this template'} ·{' '}
                      {visibilitySummary(def)}
                    </span>
                  </span>
                </label>
                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                  <Badge variant="outline" className="text-[10px] shrink-0 hidden sm:inline-flex">
                    Settings
                  </Badge>
                  <Select
                    value={placements[def.field_key] || PLACEMENT.INVOICE_DETAILS_TOP}
                    onValueChange={(v) =>
                      setPlacements((prev) => ({ ...prev, [def.field_key]: v }))
                    }
                    disabled={!isOn}
                  >
                    <SelectTrigger className="h-9 text-sm w-full sm:w-[240px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLACEMENT_EDITOR_VALUES.map((key) => (
                        <SelectItem key={key} value={key}>
                          {PLACEMENT_LABELS[key] || key}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {documentFields.length > 0 ? (
        <div className="flex justify-end">
          <Button type="button" size="sm" onClick={savePlacements} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save fields
          </Button>
        </div>
      ) : null}
    </div>
  );
}
