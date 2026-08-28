import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { jobOrderCustomFieldsApi } from '@/pages/accounting/job-orders/api/job-order-custom-fields.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
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

function apiErrorMessage(err, fallback) {
  const data = err?.response?.data;
  if (data?.errors && typeof data.errors === 'object') {
    const first = Object.values(data.errors).flat().find(Boolean);
    if (first) return String(first);
  }
  return data?.message || fallback;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Long text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'dropdown', label: 'Select' },
];

const TYPE_LABELS = Object.fromEntries(FIELD_TYPES.map((t) => [t.value, t.label]));

const EMPTY_DEF = {
  label: '',
  type: 'text',
  options_text: '',
  is_required: false,
  is_active: true,
  show_on_job_order: true,
  show_on_invoice: false,
  show_on_bill: false,
  show_on_expense: false,
  show_on_quotation: false,
  show_on_sales_order: false,
  show_on_purchase_order: false,
};

function isDocumentEligible(def) {
  return def?.is_active !== false && (def?.show_on_invoice || def?.show_on_bill);
}

function visibilitySummary(def) {
  const parts = [];
  if (def.show_on_job_order !== false) parts.push('Jobs');
  if (def.show_on_invoice) parts.push('Invoices');
  if (def.show_on_bill) parts.push('Bills');
  if (def.show_on_expense) parts.push('Expenses');
  if (def.show_on_quotation) parts.push('Quotations');
  if (def.show_on_sales_order) parts.push('Sales orders');
  if (def.show_on_purchase_order) parts.push('Purchase orders');
  return parts.length ? parts.join(' · ') : 'Hidden everywhere';
}

function sortDefinitions(items) {
  return [...items].sort((a, b) => {
    const orderDiff = Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0);
    if (orderDiff !== 0) return orderDiff;
    return String(a.label || '').localeCompare(String(b.label || ''));
  });
}

export function TransactionCustomFieldsManager({ onDefinitionsChange, onDefinitionsLoaded }) {
  const [definitions, setDefinitions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_DEF);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await jobOrderCustomFieldsApi.list({ per_page: 100 });
      const items = res.data?.data ?? [];
      const sorted = Array.isArray(items) ? sortDefinitions(items) : [];
      setDefinitions(sorted);
      onDefinitionsLoaded?.(sorted.length);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load custom fields');
    } finally {
      setLoading(false);
    }
  }, [onDefinitionsLoaded]);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_DEF);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleDialogOpenChange = (open) => {
    setDialogOpen(open);
    if (!open) resetForm();
  };

  const startEdit = (def) => {
    setDialogOpen(true);
    setEditingId(def.id);
    setForm({
      label: def.label || '',
      type: def.type === 'radio' ? 'dropdown' : def.type || 'text',
      options_text: (def.options || []).join('\n'),
      is_required: Boolean(def.is_required),
      is_active: def.is_active !== false,
      show_on_job_order: def.show_on_job_order !== false,
      show_on_invoice: Boolean(def.show_on_invoice),
      show_on_bill: Boolean(def.show_on_bill),
      show_on_expense: Boolean(def.show_on_expense),
      show_on_quotation: Boolean(def.show_on_quotation),
      show_on_sales_order: Boolean(def.show_on_sales_order),
      show_on_purchase_order: Boolean(def.show_on_purchase_order),
    });
  };

  const handleSave = async () => {
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

    setSaving(true);
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
        is_active: form.is_active,
        show_on_job_order: form.show_on_job_order,
        show_on_invoice: form.show_on_invoice,
        show_on_bill: form.show_on_bill,
        show_on_expense: form.show_on_expense,
        show_on_quotation: form.show_on_quotation,
        show_on_sales_order: form.show_on_sales_order,
        show_on_purchase_order: form.show_on_purchase_order,
      };
      if (editingId) {
        await jobOrderCustomFieldsApi.update(editingId, payload);
        toast.success('Field updated');
      } else {
        await jobOrderCustomFieldsApi.create(payload);
        toast.success('Field added');
      }
      setDialogOpen(false);
      resetForm();
      await load();
      onDefinitionsChange?.();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not save field'));
    } finally {
      setSaving(false);
    }
  };

  const moveField = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= definitions.length) return;

    const reordered = [...definitions];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];

    setReordering(true);
    try {
      const res = await jobOrderCustomFieldsApi.reorder(reordered.map((def) => def.id));
      const items = res.data?.data ?? reordered;
      setDefinitions(Array.isArray(items) ? sortDefinitions(items) : reordered);
      onDefinitionsChange?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not update field order');
    } finally {
      setReordering(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await jobOrderCustomFieldsApi.delete(confirmDelete.id);
      toast.success('Field removed');
      setConfirmDelete(null);
      if (editingId === confirmDelete.id) resetForm();
      await load();
      onDefinitionsChange?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not delete field');
    }
  };

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Your fields
            </p>
            {definitions.length > 0 ? (
              <p className="text-xs text-muted-foreground mt-1">
                {definitions.filter(isDocumentEligible).length} of {definitions.length} can be added to
                invoice/bill templates (enable Invoices or Bills under &ldquo;Where to show&rdquo;).
              </p>
            ) : null}
            {definitions.length > 1 ? (
              <p className="text-xs text-muted-foreground mt-1">
                Use the arrows to set display order on job orders, invoices, bills, and expenses.
              </p>
            ) : null}
          </div>
          <Button type="button" size="sm" onClick={openCreate} className="shrink-0">
            <Plus className="size-4" />
            Add field
          </Button>
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : definitions.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-10 text-center">
            <p className="text-sm text-muted-foreground">
              No custom fields yet. Add one to use on job orders, invoices, bills, or expenses.
            </p>
            <Button type="button" size="sm" variant="outline" onClick={openCreate}>
              <Plus className="size-4" />
              Add field
            </Button>
          </div>
        ) : (
          <ul className="space-y-2">
            {definitions.map((def, index) => (
              <li
                key={def.id}
                className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 bg-card"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {definitions.length > 1 ? (
                    <div className="flex flex-col shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        disabled={index === 0 || reordering}
                        onClick={() => moveField(index, -1)}
                        aria-label={`Move ${def.label} up`}
                      >
                        <ChevronUp className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        disabled={index === definitions.length - 1 || reordering}
                        onClick={() => moveField(index, 1)}
                        aria-label={`Move ${def.label} down`}
                      >
                        <ChevronDown className="size-3.5" />
                      </Button>
                    </div>
                  ) : null}
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">
                      {definitions.length > 1 ? (
                        <span className="text-muted-foreground font-normal mr-1.5">#{index + 1}</span>
                      ) : null}
                      {def.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {TYPE_LABELS[def.type] || def.type}
                      {def.is_required ? ' · Required' : ''}
                      {' · '}
                      {visibilitySummary(def)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!def.is_active ? (
                    <Badge variant="outline" className="text-[10px]">
                      Hidden
                    </Badge>
                  ) : null}
                  {!isDocumentEligible(def) ? (
                    <Badge variant="outline" className="text-[10px]">
                      Not on invoice/bill
                    </Badge>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => startEdit(def)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive"
                    onClick={() => setConfirmDelete(def)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit field' : 'New field'}</DialogTitle>
            <DialogDescription>
              Define the field once, then choose where it appears.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4 max-h-[65vh] overflow-y-auto">
            <div className="space-y-2">
              <Label className="text-sm">
                Field name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="e.g. Site code, Contract ID"
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
                  {FIELD_TYPES.map((t) => (
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
                  placeholder={'North site\nSouth site\nRemote'}
                />
              </div>
            ) : null}
            <div className="rounded-md border bg-muted/30 p-3 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Where to show
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={form.show_on_job_order}
                    onCheckedChange={(c) => setForm((f) => ({ ...f, show_on_job_order: Boolean(c) }))}
                  />
                  Job orders
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={form.show_on_invoice}
                    onCheckedChange={(c) => setForm((f) => ({ ...f, show_on_invoice: Boolean(c) }))}
                  />
                  Invoices &amp; bills
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={form.show_on_bill}
                    onCheckedChange={(c) => setForm((f) => ({ ...f, show_on_bill: Boolean(c) }))}
                  />
                  Bills
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={form.show_on_expense}
                    onCheckedChange={(c) => setForm((f) => ({ ...f, show_on_expense: Boolean(c) }))}
                  />
                  Expenses
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={form.show_on_quotation}
                    onCheckedChange={(c) => setForm((f) => ({ ...f, show_on_quotation: Boolean(c) }))}
                  />
                  Quotations
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={form.show_on_sales_order}
                    onCheckedChange={(c) => setForm((f) => ({ ...f, show_on_sales_order: Boolean(c) }))}
                  />
                  Sales orders
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={form.show_on_purchase_order}
                    onCheckedChange={(c) => setForm((f) => ({ ...f, show_on_purchase_order: Boolean(c) }))}
                  />
                  Purchase orders
                </label>
              </div>
              <p className="text-[11px] text-muted-foreground pt-1">
                For invoices &amp; bills, pick which templates show the field in the template editor.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={form.is_required}
                  onCheckedChange={(c) => setForm((f) => ({ ...f, is_required: Boolean(c) }))}
                />
                Required
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={form.is_active}
                  onCheckedChange={(c) => setForm((f) => ({ ...f, is_active: Boolean(c) }))}
                />
                Active
              </label>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDialogOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
              {editingId ? 'Save field' : 'Add field'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove field?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove &ldquo;{confirmDelete?.label}&rdquo;? Existing answers may remain until cleared.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
