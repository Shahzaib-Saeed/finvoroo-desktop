import { useCallback, useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, Settings2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { jobOrderCustomFieldsApi } from '../api/job-order-custom-fields.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
};

export function JobOrderCustomFieldsManager({ open, onOpenChange, onDefinitionsChange }) {
  const [definitions, setDefinitions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_DEF);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await jobOrderCustomFieldsApi.list({ per_page: 100 });
      const items = res.data?.data ?? [];
      setDefinitions(Array.isArray(items) ? items : []);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load custom fields');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_DEF);
  };

  const startEdit = (def) => {
    setEditingId(def.id);
    setForm({
      label: def.label || '',
      type: def.type === 'radio' ? 'dropdown' : def.type || 'text',
      options_text: (def.options || []).join('\n'),
      is_required: Boolean(def.is_required),
      is_active: def.is_active !== false,
      show_on_job_order: def.show_on_job_order !== false,
      show_on_invoice: Boolean(def.show_on_invoice),
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
      };
      if (editingId) {
        await jobOrderCustomFieldsApi.update(editingId, payload);
        toast.success('Field updated');
      } else {
        await jobOrderCustomFieldsApi.create(payload);
        toast.success('Field added');
      }
      resetForm();
      await load();
      onDefinitionsChange?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not save field');
    } finally {
      setSaving(false);
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
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col gap-0 p-0">
          <SheetHeader className="px-5 py-4 border-b text-left shrink-0">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Settings2 className="size-4 text-muted-foreground" />
              Job custom fields
            </SheetTitle>
            <SheetDescription>
              Define fields once, then choose whether they appear on job orders, invoices, or both.
              Invoice fields are linked to your default invoice template by matching field key.
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
            <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
              <p className="text-sm font-medium">{editingId ? 'Edit field' : 'New field'}</p>
              <div className="space-y-2">
                <Label className="text-sm">
                  Field name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder="e.g. Site code, Contract ID"
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
              <div className="rounded-md border bg-background/80 p-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Where to show
                </p>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={form.show_on_job_order}
                    onCheckedChange={(c) =>
                      setForm((f) => ({ ...f, show_on_job_order: Boolean(c) }))
                    }
                  />
                  Job orders
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={form.show_on_invoice}
                    onCheckedChange={(c) =>
                      setForm((f) => ({ ...f, show_on_invoice: Boolean(c) }))
                    }
                  />
                  Invoices (syncs to invoice template)
                </label>
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
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
                  {editingId ? 'Save' : 'Add field'}
                </Button>
                {editingId ? (
                  <Button type="button" size="sm" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Your fields
              </p>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : definitions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center border rounded-lg border-dashed">
                  No custom fields yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {definitions.map((def) => (
                    <li
                      key={def.id}
                      className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 bg-card"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{def.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {TYPE_LABELS[def.type] || def.type}
                          {def.is_required ? ' · Required' : ''}
                          {def.show_on_job_order !== false ? ' · Jobs' : ''}
                          {def.show_on_invoice ? ' · Invoices' : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!def.is_active ? (
                          <Badge variant="outline" className="text-[10px]">
                            Hidden
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
          </SheetBody>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove field?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove &ldquo;{confirmDelete?.label}&rdquo;? Existing job answers may remain until cleared.
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

export function JobOrderCustomFieldsManagerTrigger({ onClick, className }) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick} className={className}>
      <Plus className="size-4 mr-1" />
      Manage custom fields
    </Button>
  );
}
