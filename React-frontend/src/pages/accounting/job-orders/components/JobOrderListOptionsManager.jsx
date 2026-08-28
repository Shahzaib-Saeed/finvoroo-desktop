import { useCallback, useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { jobOrderListOptionsApi } from '../api/job-order-list-options.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

const EMPTY_FORM = {
  label: '',
  is_active: true,
};

export function JobOrderListOptionsManager({
  open,
  onOpenChange,
  initialTab = 'status',
  onOptionsChange,
}) {
  const [tab, setTab] = useState(initialTab);
  const [statusOptions, setStatusOptions] = useState([]);
  const [priorityOptions, setPriorityOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await jobOrderListOptionsApi.list({ include_inactive: 1 });
      const data = res.data?.data || {};
      setStatusOptions(data.status_options || []);
      setPriorityOptions(data.priority_options || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load options');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const currentList = tab === 'status' ? statusOptions : priorityOptions;

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setForm({
      label: row.label || '',
      is_active: row.is_active !== false,
    });
  };

  const handleSave = async () => {
    const label = form.label?.trim();
    if (!label) {
      toast.error('Enter a name for this option');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        list_type: tab,
        label,
        is_active: form.is_active,
      };
      if (editingId) {
        await jobOrderListOptionsApi.update(editingId, payload);
        toast.success('Option updated');
      } else {
        await jobOrderListOptionsApi.create(payload);
        toast.success('Option added');
      }
      resetForm();
      await load();
      onOptionsChange?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not save option');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await jobOrderListOptionsApi.delete(confirmDelete.id);
      toast.success('Option removed');
      setConfirmDelete(null);
      if (editingId === confirmDelete.id) resetForm();
      await load();
      onOptionsChange?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not delete option');
    }
  };

  const toggleActive = async (row) => {
    try {
      await jobOrderListOptionsApi.update(row.id, { is_active: !row.is_active });
      await load();
      onOptionsChange?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not update option');
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col gap-0 p-0">
          <SheetHeader className="px-5 py-4 border-b text-left shrink-0">
            <SheetTitle className="text-base">Status &amp; priority options</SheetTitle>
            <SheetDescription>
              Add custom status and priority labels for your company. Built-in options can be hidden
              but not deleted.
            </SheetDescription>
            <div className="flex gap-1 pt-2">
              {['status', 'priority'].map((t) => (
                <Button
                  key={t}
                  type="button"
                  size="sm"
                  variant={tab === t ? 'default' : 'outline'}
                  className="capitalize"
                  onClick={() => {
                    setTab(t);
                    resetForm();
                  }}
                >
                  {t}
                </Button>
              ))}
            </div>
          </SheetHeader>
          <SheetBody className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <p className="text-sm font-medium">
                {editingId ? 'Edit option' : `New ${tab} option`}
              </p>
              <div className="space-y-2">
                <Label className="text-sm">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder={tab === 'status' ? 'e.g. Awaiting parts' : 'e.g. Critical'}
                />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={form.is_active}
                  onCheckedChange={(c) => setForm((f) => ({ ...f, is_active: Boolean(c) }))}
                />
                Show in dropdowns
              </label>
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="size-4 animate-spin mr-1" /> : <Plus className="size-4 mr-1" />}
                  {editingId ? 'Save' : 'Add'}
                </Button>
                {editingId ? (
                  <Button type="button" size="sm" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                {tab} options
              </p>
              {loading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ul className="space-y-2">
                  {currentList.map((row) => (
                    <li
                      key={row.id}
                      className={cn(
                        'flex items-center justify-between gap-2 rounded-lg border px-3 py-2',
                        !row.is_active && 'opacity-60',
                      )}
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{row.label}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {row.is_system ? (
                          <Badge variant="outline" className="text-[10px]">
                            System
                          </Badge>
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => toggleActive(row)}
                        >
                          {row.is_active ? 'Hide' : 'Show'}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => startEdit(row)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        {!row.is_system ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive"
                            onClick={() => setConfirmDelete(row)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        ) : null}
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
            <AlertDialogTitle>Remove option?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove &ldquo;{confirmDelete?.label}&rdquo;? This only works if no jobs use it.
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
