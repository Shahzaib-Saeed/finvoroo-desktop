import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Columns3, EyeOff, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { jobOrderCustomFieldsApi } from '../api/job-order-custom-fields.api';
import { formatFieldLabel } from '../lib/job-order-list.lib';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const COLUMN_OPTIONS = [
  { value: 'auto', label: 'Auto', hint: 'Placed automatically' },
  { value: 'details', label: 'Details', hint: 'Left column' },
  { value: 'more_details', label: 'More Details', hint: 'Right column' },
  { value: 'hidden', label: 'Hidden', hint: 'Not shown on the card' },
];

const COLUMN_BADGE = {
  auto: 'bg-slate-100 text-slate-500',
  details: 'bg-blue-50 text-blue-700',
  more_details: 'bg-violet-50 text-violet-700',
  hidden: 'bg-slate-100 text-slate-400 line-through',
};

/**
 * Company-level layout manager for the job list card: choose which column
 * (Details / More Details) each custom field renders in — or hide it — and
 * reorder fields. "Auto" keeps the built-in smart placement.
 */
export function JobCardLayoutDialog({ open, onOpenChange, onSaved }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    jobOrderCustomFieldsApi
      .list({ per_page: 200 })
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res.data?.data) ? res.data.data : [];
        setRows(
          list.map((d) => ({
            id: d.id,
            label: formatFieldLabel(d.label) || d.label,
            type: d.type,
            isActive: d.is_active !== false,
            column: d.job_card_column || 'auto',
          })),
        );
      })
      .catch((err) => {
        toast.error(err?.response?.data?.message || 'Failed to load custom fields');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const move = (index, delta) => {
    setRows((current) => {
      const next = [...current];
      const target = index + delta;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const setColumn = (id, column) => {
    setRows((current) => current.map((r) => (r.id === id ? { ...r, column } : r)));
  };

  const setAll = (column) => {
    setRows((current) => current.map((r) => ({ ...r, column })));
  };

  const counts = useMemo(() => {
    const c = { details: 0, more_details: 0, hidden: 0, auto: 0 };
    rows.forEach((r) => {
      c[r.column] = (c[r.column] || 0) + 1;
    });
    return c;
  }, [rows]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const placements = {};
      rows.forEach((r) => {
        placements[r.id] = r.column;
      });
      await jobOrderCustomFieldsApi.cardLayout(placements, rows.map((r) => r.id));
      toast.success('Job card layout saved');
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save layout');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl! max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="border-b px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Columns3 className="size-4" />
            </span>
            <div>
              <DialogTitle className="text-sm font-semibold">Job card layout</DialogTitle>
              <DialogDescription className="mt-0.5 text-xs">
                Choose which column each field appears in on the job list, and its order.
                Applies to everyone in this company.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogBody className="overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm font-medium text-foreground">No custom fields yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create job order custom fields first — then arrange them here.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <Badge variant="secondary" className={COLUMN_BADGE.details}>
                    Details: {counts.details}
                  </Badge>
                  <Badge variant="secondary" className={COLUMN_BADGE.more_details}>
                    More Details: {counts.more_details}
                  </Badge>
                  <Badge variant="secondary" className={COLUMN_BADGE.hidden}>
                    Hidden: {counts.hidden}
                  </Badge>
                  <Badge variant="secondary" className={COLUMN_BADGE.auto}>
                    Auto: {counts.auto}
                  </Badge>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs text-slate-500"
                  onClick={() => setAll('auto')}
                  title="Let the system place every field automatically"
                >
                  <Wand2 className="size-3.5" />
                  Reset to automatic
                </Button>
              </div>

              <ul className="space-y-1.5">
                {rows.map((row, index) => (
                  <li
                    key={row.id}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border bg-white px-3 py-2',
                      row.column === 'hidden' && 'opacity-60',
                    )}
                  >
                    <div className="flex shrink-0 flex-col">
                      <button
                        type="button"
                        className="flex size-5 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                        onClick={() => move(index, -1)}
                        disabled={index === 0}
                        aria-label="Move up"
                      >
                        <ArrowUp className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        className="flex size-5 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                        onClick={() => move(index, 1)}
                        disabled={index === rows.length - 1}
                        aria-label="Move down"
                      >
                        <ArrowDown className="size-3.5" />
                      </button>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {row.label}
                        {row.column === 'hidden' ? (
                          <EyeOff className="ml-1.5 inline size-3.5 text-slate-400" />
                        ) : null}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {row.type}
                        {!row.isActive ? ' · inactive' : ''}
                      </p>
                    </div>

                    <Select value={row.column} onValueChange={(v) => setColumn(row.id, v)}>
                      <SelectTrigger className="h-8 w-40 shrink-0 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COLUMN_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <span className="flex flex-col">
                              <span>{opt.label}</span>
                              <span className="text-[10px] text-muted-foreground">
                                {opt.hint}
                              </span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </li>
                ))}
              </ul>
            </>
          )}
        </DialogBody>

        <DialogFooter className="border-t px-5 py-3">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={saving || loading || rows.length === 0}
          >
            {saving ? 'Saving…' : 'Save layout'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
