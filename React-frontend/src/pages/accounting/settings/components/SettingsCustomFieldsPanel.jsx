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
import { ChevronDown, ChevronUp, GripVertical, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { jobOrderCustomFieldsApi } from '@/pages/accounting/job-orders/api/job-order-custom-fields.api';
import { invoiceTemplatesApi } from '@/pages/accounting/invoice-templates/api/invoice-templates.api';
import {
  CUSTOM_FIELD_TYPES,
  CUSTOM_FIELD_TYPE_LABELS,
  OTHER_PAGE_VISIBILITY,
  sortCustomFieldDefinitions,
  fetchAllCustomFieldDefinitions,
  customFieldApiErrorMessage,
  customFieldVisibilityBadges,
  mergeDefinitionInList,
  normalizeTemplateLabelsMap,
  loadTemplateLabelsForDefinition,
  mergeTemplateLabelMaps,
} from '@/components/accounting/custom-fields-lib';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

const TEMPLATE_SCOPE_OPTIONS = [
  { value: 'none', label: 'Do not show on invoices or bills' },
  { value: 'all', label: 'All invoice/bill templates' },
  { value: 'selected', label: 'Selected templates only' },
];

const EMPTY_DEF = {
  label: '',
  type: 'text',
  options_text: '',
  is_required: false,
  show_on_job_order: true,
  show_on_expense: false,
  show_on_quotation: false,
  show_on_sales_order: false,
  show_on_purchase_order: false,
  invoice_bill_template_scope: 'none',
  invoice_bill_template_ids: [],
  invoice_bill_template_labels: {},
};

function getTemplateLabelValue(form, tplId) {
  const labels = form.invoice_bill_template_labels || {};
  const val = labels[tplId] ?? labels[String(tplId)];
  const custom = val != null ? String(val).trim() : '';
  if (custom) return custom;
  // Match invoice template editor: show master label when no per-template override in state.
  return form.label?.trim() || '';
}

function buildTemplateLabelsPayload(form, templates, originalMasterLabel = '') {
  const scope = form.invoice_bill_template_scope;
  if (scope === 'none') return {};

  const labels = form.invoice_bill_template_labels || {};
  const defaultLabel = form.label?.trim() || '';
  const origMaster = String(originalMasterLabel || '').trim();
  const templateIds =
    scope === 'all'
      ? templates.map((t) => Number(t.id))
      : (form.invoice_bill_template_ids || []).map(Number);

  const out = {};
  for (const id of templateIds) {
    const custom = labels[id] ?? labels[String(id)];
    const customTrim = typeof custom === 'string' ? custom.trim() : '';
    if (customTrim) {
      // Per-template input still shows the old master default — use the new master name.
      if (origMaster && customTrim === origMaster && defaultLabel && defaultLabel !== origMaster) {
        out[id] = defaultLabel;
      } else {
        out[id] = customTrim;
      }
    } else if (defaultLabel) {
      out[id] = defaultLabel;
    }
  }
  return out;
}

function formStateFromDefinition(def) {
  return {
    label: def.label || '',
    type: def.type === 'radio' ? 'dropdown' : def.type || 'text',
    options_text: (def.options || []).join('\n'),
    is_required: Boolean(def.is_required),
    show_on_job_order: def.show_on_job_order !== false,
    show_on_expense: Boolean(def.show_on_expense),
    show_on_quotation: Boolean(def.show_on_quotation),
    show_on_sales_order: Boolean(def.show_on_sales_order),
    show_on_purchase_order: Boolean(def.show_on_purchase_order),
    invoice_bill_template_scope: def.invoice_bill_template_scope || 'none',
    invoice_bill_template_ids: Array.isArray(def.invoice_bill_template_ids)
      ? def.invoice_bill_template_ids.map(Number)
      : [],
    invoice_bill_template_labels: normalizeTemplateLabelsMap(def.invoice_bill_template_labels),
  };
}

async function fetchAllTemplates() {
  const perPage = 200;
  let page = 1;
  let lastPage = 1;
  const all = [];

  do {
    const res = await invoiceTemplatesApi.list({ per_page: perPage, page });
    const items = res.data?.data ?? [];
    if (Array.isArray(items)) all.push(...items);
    lastPage = Number(res.data?.meta?.last_page ?? 1);
    page += 1;
  } while (page <= lastPage);

  return all.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
}

function SortableSettingsFieldRow({
  def,
  position,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  reordering,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: def.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
  };

  const badges = customFieldVisibilityBadges(def);
  const visibleBadges = badges.slice(0, 3);
  const hiddenBadgeCount = badges.length - visibleBadges.length;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-xl border bg-background px-3 py-2.5 flex items-center gap-2 sm:gap-3 transition-all',
        'hover:border-primary/25 hover:shadow-sm',
        def.is_active === false && 'opacity-75',
      )}
    >
      <button
        type="button"
        className="flex size-7 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted active:cursor-grabbing disabled:opacity-50"
        aria-label={`Drag to reorder ${def.label}`}
        disabled={reordering}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3.5" />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-medium text-muted-foreground tabular-nums shrink-0">
            #{position}
          </span>
          <span className="text-sm font-medium truncate">{def.label}</span>
          <span className="hidden sm:inline text-xs text-muted-foreground shrink-0">
            · {CUSTOM_FIELD_TYPE_LABELS[def.type] || def.type}
            {def.is_required ? ' · Required' : ''}
          </span>
        </div>
        <div className="flex flex-wrap gap-1 mt-1.5">
          {def.is_active === false ? (
            <Badge variant="outline" className="text-[10px] font-normal h-5 px-1.5">
              Inactive
            </Badge>
          ) : null}
          {visibleBadges.map((label) => (
            <Badge
              key={label}
              variant={label.startsWith('Invoices/bills') ? 'outline' : 'secondary'}
              appearance={label.startsWith('Invoices/bills') ? undefined : 'light'}
              className="text-[10px] font-normal h-5 px-1.5 max-w-[140px] truncate"
            >
              {label}
            </Badge>
          ))}
          {hiddenBadgeCount > 0 ? (
            <Badge variant="outline" className="text-[10px] font-normal h-5 px-1.5">
              +{hiddenBadgeCount}
            </Badge>
          ) : null}
          {badges.length === 0 && def.is_active !== false ? (
            <Badge variant="outline" className="text-[10px] font-normal h-5 px-1.5">
              Hidden
            </Badge>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          disabled={!canMoveUp || reordering}
          onClick={onMoveUp}
          aria-label={`Move ${def.label} up`}
        >
          <ChevronUp className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          disabled={!canMoveDown || reordering}
          onClick={onMoveDown}
          aria-label={`Move ${def.label} down`}
        >
          <ChevronDown className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={onEdit}
          title="Edit field"
        >
          <Pencil className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 text-destructive"
          onClick={onDelete}
          title="Delete field"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

/**
 * Settings custom fields — create fields once, choose job-order visibility,
 * and assign to all or specific invoice/bill templates by name.
 */
export function SettingsCustomFieldsPanel() {
  const dndId = useId();
  const [definitions, setDefinitions] = useState([]);
  const [orderedIds, setOrderedIds] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingDef, setSavingDef] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [originalMasterLabel, setOriginalMasterLabel] = useState('');
  const [form, setForm] = useState(EMPTY_DEF);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const templateHeaderFieldsCacheRef = useRef({});

  const loadTemplateHeaderFields = useCallback(async (tplId) => {
    const id = Number(tplId);
    if (Array.isArray(templateHeaderFieldsCacheRef.current[id])) {
      return templateHeaderFieldsCacheRef.current[id];
    }
    const res = await invoiceTemplatesApi.show(id);
    const payload = res.data?.data ?? res.data ?? {};
    const fields =
      payload.header_fields ??
      payload.headerFields ??
      payload.custom_header_fields ??
      payload.fields ??
      [];
    templateHeaderFieldsCacheRef.current[id] = Array.isArray(fields) ? fields : [];
    return templateHeaderFieldsCacheRef.current[id];
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const orderedDefinitions = useMemo(() => {
    const byId = Object.fromEntries(definitions.map((d) => [d.id, d]));
    return orderedIds.map((id) => byId[id]).filter(Boolean);
  }, [definitions, orderedIds]);

  const persistOrder = useCallback(async (nextIds, previousIds) => {
    setOrderedIds(nextIds);
    setReordering(true);
    try {
      const res = await jobOrderCustomFieldsApi.reorder(nextIds);
      const items = res.data?.data;
      if (Array.isArray(items) && items.length) {
        const sorted = sortCustomFieldDefinitions(items);
        setDefinitions(sorted);
        setOrderedIds(sorted.map((d) => d.id));
      }
    } catch (err) {
      setOrderedIds(previousIds);
      toast.error(customFieldApiErrorMessage(err, 'Could not update field order'));
    } finally {
      setReordering(false);
    }
  }, []);

  const moveField = useCallback(
    (id, direction) => {
      const index = orderedIds.indexOf(id);
      if (index < 0) return;
      const nextIndex = direction === 'up' ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= orderedIds.length) return;
      const nextIds = arrayMove(orderedIds, index, nextIndex);
      persistOrder(nextIds, orderedIds);
    },
    [orderedIds, persistOrder],
  );

  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = orderedIds.indexOf(active.id);
      const newIndex = orderedIds.indexOf(over.id);
      if (oldIndex < 0 || newIndex < 0) return;
      const nextIds = arrayMove(orderedIds, oldIndex, newIndex);
      persistOrder(nextIds, orderedIds);
    },
    [orderedIds, persistOrder],
  );

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [items, templateRows] = await Promise.all([
        fetchAllCustomFieldDefinitions(),
        fetchAllTemplates(),
      ]);
      const sorted = sortCustomFieldDefinitions(items);
      setDefinitions(sorted);
      setOrderedIds(sorted.map((d) => d.id));
      setTemplates(templateRows);
      // Warm header_fields cache so edit opens with saved template labels.
      templateRows.forEach((tpl) => {
        loadTemplateHeaderFields(tpl.id).catch(() => {});
      });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load custom fields');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [loadTemplateHeaderFields]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setEditingId(null);
    setOriginalMasterLabel('');
    setForm(EMPTY_DEF);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const startEdit = async (def) => {
    setEditingId(def.id);
    setDialogOpen(true);
    setEditLoading(true);
    setOriginalMasterLabel('');
    setForm(EMPTY_DEF);

    try {
      const res = await jobOrderCustomFieldsApi.show(def.id);
      const fresh = res.data?.data ?? def;
      const headerLabels = await loadTemplateLabelsForDefinition(
        fresh,
        templates,
        templateHeaderFieldsCacheRef.current,
        loadTemplateHeaderFields,
      );
      const withLabels = {
        ...fresh,
        invoice_bill_template_labels: mergeTemplateLabelMaps(
          fresh.invoice_bill_template_labels,
          headerLabels,
        ),
      };
      setOriginalMasterLabel(withLabels.label || '');
      setForm(formStateFromDefinition(withLabels));
      setDefinitions((prev) => mergeDefinitionInList(prev, def.id, withLabels));
    } catch {
      setOriginalMasterLabel(def.label || '');
      setForm(formStateFromDefinition(def));
      toast.error('Could not load the latest field details');
    } finally {
      setEditLoading(false);
    }
  };

  const toggleTemplateId = (templateId, checked) => {
    const id = Number(templateId);
    setForm((prev) => {
      const ids = new Set(prev.invoice_bill_template_ids || []);
      const labels = { ...(prev.invoice_bill_template_labels || {}) };
      if (checked) {
        ids.add(id);
      } else {
        ids.delete(id);
        delete labels[id];
        delete labels[String(id)];
      }
      return { ...prev, invoice_bill_template_ids: Array.from(ids), invoice_bill_template_labels: labels };
    });
  };

  const setTemplateLabel = (templateId, value) => {
    const id = Number(templateId);
    setForm((prev) => ({
      ...prev,
      invoice_bill_template_labels: {
        ...(prev.invoice_bill_template_labels || {}),
        [id]: value,
      },
    }));
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
    if (
      form.invoice_bill_template_scope === 'selected' &&
      (form.invoice_bill_template_ids || []).length === 0
    ) {
      toast.error('Select at least one template');
      return;
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
        show_on_job_order: form.show_on_job_order,
        show_on_expense: form.show_on_expense,
        show_on_quotation: form.show_on_quotation,
        show_on_sales_order: form.show_on_sales_order,
        show_on_purchase_order: form.show_on_purchase_order,
        invoice_bill_template_scope: form.invoice_bill_template_scope,
        invoice_bill_template_ids:
          form.invoice_bill_template_scope === 'selected'
            ? form.invoice_bill_template_ids
            : [],
        invoice_bill_template_labels: buildTemplateLabelsPayload(form, templates, originalMasterLabel),
      };

      let savedDef = null;
      if (editingId) {
        const res = await jobOrderCustomFieldsApi.update(editingId, payload);
        savedDef = res.data?.data ?? null;
        toast.success('Field updated');
      } else {
        const res = await jobOrderCustomFieldsApi.create(payload);
        savedDef = res.data?.data ?? null;
        toast.success('Field created');
      }

      if (savedDef) {
        setDefinitions((prev) => {
          const merged = mergeDefinitionInList(prev, savedDef.id, savedDef);
          return sortCustomFieldDefinitions(merged);
        });
      }

      setDialogOpen(false);
      resetForm();
      // Saved labels live on the invoice templates' header fields. Drop the
      // cached header fields so the next edit (and the silent reload below)
      // re-fetch fresh labels instead of showing the pre-edit / default name.
      templateHeaderFieldsCacheRef.current = {};
      await loadData({ silent: true });
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
      // Removing a field changes the templates' header fields — refresh the cache.
      templateHeaderFieldsCacheRef.current = {};
      await loadData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not delete field');
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
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-border/60">
          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Shared across documents. Drag to reorder on job orders, quotes, and orders.
          </p>
          <Button type="button" size="sm" className="h-9 shrink-0 shadow-sm" onClick={openCreate}>
            <Plus className="size-4" />
            Add field
          </Button>
        </div>

        {orderedDefinitions.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/20 p-8 text-center">
            <p className="text-sm font-medium text-foreground">No custom fields yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create your first field to use it across documents.</p>
          </div>
        ) : (
          <DndContext
            id={dndId}
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-2 max-h-[min(480px,calc(100vh-14rem))] overflow-y-auto pr-1">
                {orderedDefinitions.map((def, index) => (
                  <SortableSettingsFieldRow
                    key={def.id}
                    def={def}
                    position={index + 1}
                    reordering={reordering}
                    canMoveUp={index > 0}
                    canMoveDown={index < orderedDefinitions.length - 1}
                    onMoveUp={() => moveField(def.id, 'up')}
                    onMoveDown={() => moveField(def.id, 'down')}
                    onEdit={() => startEdit(def)}
                    onDelete={() => setConfirmDelete(def)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit custom field' : 'New custom field'}</DialogTitle>
            <DialogDescription>
              Define the field, then choose where it appears. Invoice and bill fields are tied to
              layout templates — not every document shows every field.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4 max-h-[65vh] overflow-y-auto">
            {editLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
            <>
            <div className="space-y-2">
              <Label className="text-sm">
                Default field name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.label}
                onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
                placeholder="e.g. Container No, Site code"
                autoFocus
                disabled={editLoading}
              />
              <p className="text-xs text-muted-foreground">
                Used on job orders and as the default label when adding to templates.
              </p>
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
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={form.is_required}
                onCheckedChange={(c) => setForm((f) => ({ ...f, is_required: Boolean(c) }))}
              />
              Required when shown on forms
            </label>

            <div className="rounded-lg border p-4 space-y-3">
              <div>
                <Label className="text-sm font-medium">Other pages</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  These documents do not use layout templates — turn each page on or off directly.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                {OTHER_PAGE_VISIBILITY.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={Boolean(form[key])}
                      onCheckedChange={(c) => setForm((f) => ({ ...f, [key]: Boolean(c) }))}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-lg border p-4 space-y-3">
              <div>
                <Label className="text-sm font-medium">Invoices &amp; bills</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pick which layout templates include this field. Users choose a template when
                  creating an invoice or bill.
                </p>
              </div>
              <Select
                value={form.invoice_bill_template_scope}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    invoice_bill_template_scope: v,
                    invoice_bill_template_ids:
                      v === 'selected' ? f.invoice_bill_template_ids : [],
                  }))
                }
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_SCOPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {form.invoice_bill_template_scope === 'selected' ? (
                templates.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No invoice templates yet. Create templates under Accounting → Invoice templates.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pt-1">
                    {templates.map((tpl) => {
                      const tplId = Number(tpl.id);
                      const checked = (form.invoice_bill_template_ids || []).includes(tplId);
                      return (
                        <div
                          key={tpl.id}
                          className="rounded-md border px-3 py-2 space-y-2 hover:bg-muted/30"
                        >
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(c) => toggleTemplateId(tpl.id, Boolean(c))}
                            />
                            <span className="truncate font-medium">{tpl.name}</span>
                          </label>
                          {checked ? (
                            <Input
                              className="h-8 text-sm"
                              value={getTemplateLabelValue(form, tplId)}
                              onChange={(e) => setTemplateLabel(tpl.id, e.target.value)}
                              placeholder={`Display name on ${tpl.name}`}
                            />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )
              ) : form.invoice_bill_template_scope === 'all' && templates.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto pt-1">
                  <p className="text-xs text-muted-foreground">
                    Optional: set a different display name per template.
                  </p>
                  {templates.map((tpl) => {
                    const tplId = Number(tpl.id);
                    return (
                      <div key={tpl.id} className="rounded-md border px-3 py-2 space-y-1.5">
                        <span className="text-sm font-medium truncate block">{tpl.name}</span>
                        <Input
                          className="h-8 text-sm"
                          value={getTemplateLabelValue(form, tplId)}
                          onChange={(e) => setTemplateLabel(tpl.id, e.target.value)}
                          placeholder={`Display name on ${tpl.name}`}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
            </>
            )}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={saveDefinition} disabled={savingDef || editLoading}>
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
