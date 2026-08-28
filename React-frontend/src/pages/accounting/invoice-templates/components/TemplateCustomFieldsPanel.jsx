import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useId } from 'react';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { jobOrderCustomFieldsApi } from '@/pages/accounting/job-orders/api/job-order-custom-fields.api';
import { invoiceTemplatesApi } from '../api/invoice-templates.api';
import {
  CUSTOM_FIELD_TYPES,
  CUSTOM_FIELD_TYPE_LABELS,
  fetchAllCustomFieldDefinitions,
  customFieldApiErrorMessage,
} from '@/components/accounting/custom-fields-lib';
import {
  PLACEMENT,
  PLACEMENT_LABELS,
  PLACEMENT_EDITOR_VALUES,
  buildPreviewTemplateFields,
  orderDefinitionsForTemplate,
} from '../constants';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const EMPTY_DEF = {
  label: '',
  type: 'text',
  options_text: '',
  is_required: false,
};

function SortableCustomFieldRow({
  def,
  isOn,
  placement,
  displayLabel,
  onIncludedChange,
  onPlacementChange,
  onLabelChange,
  onEdit,
  onDelete,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: def.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.92 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative bg-white transition-colors dark:bg-card',
        isOn ? 'bg-neutral-50 dark:bg-neutral-900/40' : 'hover:bg-neutral-50/80 dark:hover:bg-neutral-900/20',
        isDragging && 'z-10 bg-white shadow-md ring-1 ring-neutral-300 dark:bg-card dark:ring-neutral-600',
      )}
    >
      {isOn ? (
        <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-neutral-900 dark:bg-white" />
      ) : null}

      <div className="flex items-start gap-2.5 px-3 py-2.5">
        <button
          type="button"
          className="mt-1 inline-flex shrink-0 cursor-grab rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 active:cursor-grabbing dark:hover:bg-neutral-800"
          title="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-3.5" />
        </button>

        <div className="mt-1 shrink-0">
          <Switch
            checked={isOn}
            onCheckedChange={(c) => onIncludedChange(Boolean(c))}
            aria-label={`Show ${def.label} on template`}
          />
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="truncate text-[13px] font-semibold text-foreground">{def.label}</p>
                <span className="rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
                  {CUSTOM_FIELD_TYPE_LABELS[def.type] || def.type}
                </span>
                {def.is_required ? (
                  <span className="text-[10px] font-medium text-amber-700">Required</span>
                ) : null}
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0 text-neutral-400 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="size-4" />
                  Edit field
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={onDelete}
                >
                  <Trash2 className="size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {isOn ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                className="h-8 border-neutral-300 bg-white text-[13px] shadow-none dark:border-neutral-600"
                value={displayLabel}
                onChange={(e) => onLabelChange(e.target.value)}
                placeholder="Display name on form"
              />
              <Select value={placement} onValueChange={onPlacementChange}>
                <SelectTrigger className="h-8 w-full border-neutral-300 bg-white text-[13px] shadow-none dark:border-neutral-600">
                  <SelectValue placeholder="Placement" />
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
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * Unified custom fields for an invoice template:
 * - Create / edit / delete company custom fields
 * - Checkbox per field: show on THIS template or not
 * - Drag or use arrows to reorder (applies to invoice & bill forms)
 */
export function TemplateCustomFieldsPanel({
  templateId,
  templateFields = [],
  onSaved,
  onPreviewFieldsChange,
}) {
  const dndId = useId();
  const [definitions, setDefinitions] = useState([]);
  const [orderedIds, setOrderedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingDef, setSavingDef] = useState(false);
  const [placements, setPlacements] = useState({});
  const [included, setIncluded] = useState({});
  const [labels, setLabels] = useState({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_DEF);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const labelsDirtyRef = useRef(new Set());

  const templateOrderKey = useMemo(
    () =>
      (templateFields || [])
        .map((f) => `${f.field_key}:${f.sort_order ?? 0}`)
        .sort()
        .join('|'),
    [templateFields],
  );

  const loadDefinitions = useCallback(async () => {
    setLoading(true);
    try {
      const items = await fetchAllCustomFieldDefinitions();
      setDefinitions((items || []).filter((d) => d.is_active !== false));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load custom fields');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDefinitions();
  }, [loadDefinitions]);

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
      if (f?.definition_id) set[String(f.definition_id)] = true;
    });
    return set;
  }, [templateFields]);

  const labelByKey = useMemo(() => {
    const map = {};
    (templateFields || []).forEach((f) => {
      if (f?.field_key) {
        map[f.field_key] = f.label || '';
      }
    });
    return map;
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
    if (!definitions.length) {
      setOrderedIds([]);
      return;
    }
    const sorted = orderDefinitionsForTemplate(definitions, templateFields);
    setOrderedIds(sorted.map((d) => d.id));
  }, [definitions, templateOrderKey, templateFields]);

  useEffect(() => {
    const nextPlacements = {};
    const nextIncluded = {};
    const nextLabels = {};
    definitions.forEach((def) => {
      nextPlacements[def.field_key] = placementByKey[def.field_key] ?? PLACEMENT.INVOICE_DETAILS_TOP;
      nextIncluded[def.field_key] = isDefinitionIncluded(def);
      const serverLabel = labelByKey[def.field_key] || def.label || '';
      nextLabels[def.field_key] = labelsDirtyRef.current.has(def.field_key)
        ? undefined
        : serverLabel;
    });
    setPlacements((prev) => ({ ...prev, ...nextPlacements }));
    setIncluded((prev) => ({ ...prev, ...nextIncluded }));
    setLabels((prev) => {
      const merged = { ...prev };
      definitions.forEach((def) => {
        if (!labelsDirtyRef.current.has(def.field_key)) {
          merged[def.field_key] = labelByKey[def.field_key] || def.label || '';
        } else if (merged[def.field_key] === undefined) {
          merged[def.field_key] = labelByKey[def.field_key] || def.label || '';
        }
      });
      return merged;
    });
  }, [templateOrderKey, definitions, placementByKey, labelByKey, isDefinitionIncluded]);

  const orderedDefinitions = useMemo(() => {
    const byId = Object.fromEntries(definitions.map((d) => [d.id, d]));
    const ordered = orderedIds.map((id) => byId[id]).filter(Boolean);
    const seen = new Set(orderedIds);
    const missing = definitions.filter((d) => !seen.has(d.id));
    return [...ordered, ...missing];
  }, [definitions, orderedIds]);

  useEffect(() => {
    if (!onPreviewFieldsChange) return;
    onPreviewFieldsChange(
      buildPreviewTemplateFields(orderedDefinitions, templateFields, included, placements, labels),
    );
  }, [orderedDefinitions, templateFields, included, placements, labels, onPreviewFieldsChange]);

  const includedCount = orderedDefinitions.filter((def) => included[def.field_key]).length;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrderedIds((ids) => {
      const oldIndex = ids.indexOf(active.id);
      const newIndex = ids.indexOf(over.id);
      if (oldIndex < 0 || newIndex < 0) return ids;
      return arrayMove(ids, oldIndex, newIndex);
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_DEF);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const startEdit = (def) => {
    setEditingId(def.id);
    setForm({
      label: def.label || '',
      type: def.type === 'radio' ? 'dropdown' : def.type || 'text',
      options_text: (def.options || []).join('\n'),
      is_required: Boolean(def.is_required),
    });
    setDialogOpen(true);
  };

  const saveDefinition = async () => {
    const label = form.label?.trim();
    if (!label) {
      toast.error('Enter a field name');
      return;
    }
    if (form.type === 'dropdown') {
      const opts = form.options_text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (opts.length === 0) {
        toast.error('Add at least one choice for the select field');
        return;
      }
    }

    setSavingDef(true);
    try {
      const payload = {
        label,
        type: form.type,
        options_text: form.type === 'dropdown' ? form.options_text : undefined,
        options:
          form.type === 'dropdown'
            ? form.options_text
                .split(/\r?\n/)
                .map((l) => l.trim())
                .filter(Boolean)
            : undefined,
        is_required: form.is_required,
        is_active: true,
        show_on_invoice: true,
        show_on_bill: true,
      };

      if (editingId) {
        await jobOrderCustomFieldsApi.update(editingId, payload);
        toast.success('Field updated');
        if (templateId) {
          const def = definitions.find((d) => d.id === editingId);
          if (def && included[def.field_key]) {
            const displayLabel = String(labels[def.field_key] ?? form.label ?? '').trim();
            const placementRes = await invoiceTemplatesApi.updateFieldPlacements(templateId, {
              placements: [
                {
                  definition_id: def.id,
                  field_key: def.field_key,
                  placement: placements[def.field_key] || PLACEMENT.INVOICE_DETAILS_TOP,
                  included: true,
                  label: displayLabel || form.label.trim(),
                },
              ],
            });
            labelsDirtyRef.current.delete(def.field_key);
            onSaved?.(placementRes.data?.data);
          } else {
            const tplRes = await invoiceTemplatesApi.show(templateId);
            onSaved?.(tplRes.data?.data);
          }
        }
      } else {
        const res = await jobOrderCustomFieldsApi.create(payload);
        const created = res.data?.data;
        toast.success('Field created');
        if (created?.id) {
          setOrderedIds((prev) => [...prev, created.id]);
        }
        if (created?.field_key) {
          setIncluded((prev) => ({ ...prev, [created.field_key]: true }));
        }
      }
      setDialogOpen(false);
      resetForm();
      await loadDefinitions();
    } catch (err) {
      toast.error(customFieldApiErrorMessage(err, 'Could not save field'));
    } finally {
      setSavingDef(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await jobOrderCustomFieldsApi.delete(confirmDelete.id);
      toast.success('Field removed');
      setConfirmDelete(null);
      setOrderedIds((prev) => prev.filter((id) => id !== confirmDelete.id));
      await loadDefinitions();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not delete field');
    }
  };

  const saveTemplateSelection = async () => {
    if (!templateId) return;
    setSaving(true);
    try {
      const payload = orderedDefinitions.map((def) => ({
        definition_id: def.id,
        field_key: def.field_key,
        placement: placements[def.field_key] || PLACEMENT.INVOICE_DETAILS_TOP,
        included: Boolean(included[def.field_key]),
        label: included[def.field_key]
          ? String(labels[def.field_key] ?? '').trim()
          : undefined,
      }));
      const res = await invoiceTemplatesApi.updateFieldPlacements(templateId, {
        placements: payload,
      });
      labelsDirtyRef.current.clear();
      toast.success(res.data?.message || 'Template fields saved.');
      onSaved?.(res.data?.data);
    } catch (err) {
      toast.error(customFieldApiErrorMessage(err, 'Could not save template fields.'));
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
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Fields on this template</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Toggle to include, drag to reorder, then save.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {definitions.length > 0 ? (
              <span className="rounded-full bg-muted/80 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                {includedCount}/{definitions.length} active
              </span>
            ) : null}
            <Button type="button" size="sm" variant="outline" className="h-8" onClick={openCreate}>
              <Plus className="size-3.5" />
              Add
            </Button>
            {definitions.length > 0 ? (
              <Button
                type="button"
                size="sm"
                variant="mono"
                className="h-8"
                onClick={saveTemplateSelection}
                disabled={saving}
              >
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                Save
              </Button>
            ) : null}
          </div>
        </div>

        {definitions.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-border/60 bg-muted/10 px-6 py-12 text-center">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10">
              <Plus className="size-5 text-primary" />
            </div>
            <p className="mt-3 text-sm font-semibold">Create your first field</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              Fields can be reused across templates. Toggle them on here for this layout.
            </p>
            <Button type="button" size="sm" className="mt-4 h-8" onClick={openCreate}>
              <Plus className="size-3.5" />
              Add field
            </Button>
          </div>
        ) : (
          <DndContext
            id={dndId}
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
              <div className="overflow-hidden rounded-lg border border-neutral-300 divide-y divide-neutral-200 dark:border-neutral-600 dark:divide-neutral-700">
                {orderedDefinitions.map((def) => (
                  <SortableCustomFieldRow
                    key={def.id}
                    def={def}
                    isOn={Boolean(included[def.field_key])}
                    placement={placements[def.field_key] || PLACEMENT.INVOICE_DETAILS_TOP}
                    displayLabel={labels[def.field_key] ?? def.label ?? ''}
                    onIncludedChange={(checked) => {
                      setIncluded((prev) => ({ ...prev, [def.field_key]: checked }));
                      if (checked && !labels[def.field_key]) {
                        setLabels((prev) => ({
                          ...prev,
                          [def.field_key]: labelByKey[def.field_key] || def.label || '',
                        }));
                      }
                    }}
                    onPlacementChange={(value) =>
                      setPlacements((prev) => ({ ...prev, [def.field_key]: value }))
                    }
                    onLabelChange={(value) => {
                      labelsDirtyRef.current.add(def.field_key);
                      setLabels((prev) => ({ ...prev, [def.field_key]: value }));
                    }}
                    onEdit={() => startEdit(def)}
                    onDelete={() => setConfirmDelete(def)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit custom field' : 'New custom field'}</DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Changes apply everywhere this field is used. Template visibility is controlled by the checkboxes below.'
                : 'After creating, check the field to include it on this template, then save.'}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">
                Field name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="e.g. Container No, Site code"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CUSTOM_FIELD_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.type === 'dropdown' ? (
              <div className="space-y-2">
                <Label className="text-sm">Choices (one per line)</Label>
                <Textarea
                  rows={4}
                  value={form.options_text}
                  onChange={(e) => setForm((f) => ({ ...f, options_text: e.target.value }))}
                  placeholder={'Option A\nOption B'}
                />
              </div>
            ) : null}
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={form.is_required}
                onCheckedChange={(c) => setForm((f) => ({ ...f, is_required: Boolean(c) }))}
              />
              Required on invoice/bill forms
            </label>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={saveDefinition} disabled={savingDef}>
              {savingDef ? <Loader2 className="size-4 animate-spin" /> : null}
              {editingId ? 'Update field' : 'Create field'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(confirmDelete)} onOpenChange={() => setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete custom field?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{confirmDelete?.label}&rdquo; will be removed from all templates and documents.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
