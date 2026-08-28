import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { jobOrdersApi } from '../api/job-orders.api';
import { formatCurrency } from '../../invoices/constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { cn } from '@/lib/utils';

const panelHeaderClass =
  'min-h-0 items-start py-5 px-5 max-sm:px-4 border-b border-border';
const panelContentClass = 'px-5 pb-5 pt-5 max-sm:px-4';

const today = () => new Date().toISOString().slice(0, 10);

const EMPTY_LABOR = {
  entry_date: today(),
  employee_name: '',
  description: '',
  hours: '',
  hourly_rate: '',
  amount: '',
};

export function JobOrderLaborPanel({ jobOrderId, currency = 'USD', onLaborChange }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_LABOR });
  const [showForm, setShowForm] = useState(false);

  const loadLabor = useCallback(() => {
    if (!jobOrderId) return;
    setLoading(true);
    jobOrdersApi
      .laborEntries(jobOrderId)
      .then((res) => {
        const rows = res.data?.data ?? [];
        setEntries(Array.isArray(rows) ? rows : []);
      })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [jobOrderId]);

  useEffect(() => {
    loadLabor();
  }, [loadLabor]);

  const totalLabor = entries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const hours = form.hours !== '' ? parseFloat(form.hours) : null;
    const rate = form.hourly_rate !== '' ? parseFloat(form.hourly_rate) : null;
    const amount = form.amount !== '' ? parseFloat(form.amount) : null;

    if (amount == null && (hours == null || rate == null)) {
      toast.error('Enter an amount or both hours and hourly rate');
      return;
    }

    setSaving(true);
    try {
      await jobOrdersApi.storeLaborEntry(jobOrderId, {
        entry_date: form.entry_date,
        employee_name: form.employee_name?.trim() || null,
        description: form.description?.trim() || null,
        hours: hours ?? undefined,
        hourly_rate: rate ?? undefined,
        amount: amount ?? undefined,
      });
      toast.success('Labor cost recorded');
      setForm({ ...EMPTY_LABOR, entry_date: today() });
      setShowForm(false);
      await loadLabor();
      onLaborChange?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not save labor entry');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (entryId) => {
    if (!window.confirm('Delete this labor entry?')) return;
    try {
      await jobOrdersApi.deleteLaborEntry(jobOrderId, entryId);
      toast.success('Labor entry removed');
      await loadLabor();
      onLaborChange?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not delete');
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className={panelHeaderClass}>
        <div className="flex flex-wrap items-start justify-between gap-3 w-full">
          <div className="space-y-1.5 min-w-0">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="size-4 text-muted-foreground shrink-0" />
              Labor cost
            </CardTitle>
            <CardDescription>
              Record wages or contractor time charged to this job.
            </CardDescription>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-semibold tabular-nums">{formatCurrency(totalLabor, currency)}</p>
            <p className="text-xs text-muted-foreground">{entries.length} entries</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className={cn(panelContentClass, 'space-y-4')}>
        {loading ? (
          <div className="flex justify-center py-6 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : entries.length > 0 ? (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-muted-foreground text-left">
                  <th className="py-2 px-3 font-medium">Date</th>
                  <th className="py-2 px-3 font-medium">Worker</th>
                  <th className="py-2 px-3 font-medium">Details</th>
                  <th className="py-2 px-3 font-medium text-right">Hours</th>
                  <th className="py-2 px-3 font-medium text-right">Amount</th>
                  <th className="py-2 px-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b last:border-0">
                    <td className="py-2 px-3 text-muted-foreground">{entry.entry_date}</td>
                    <td className="py-2 px-3">{entry.employee_name || '—'}</td>
                    <td className="py-2 px-3 text-muted-foreground">{entry.description || '—'}</td>
                    <td className="py-2 px-3 text-right tabular-nums">
                      {entry.hours != null ? entry.hours : '—'}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums font-medium">
                      {formatCurrency(entry.amount, currency)}
                    </td>
                    <td className="py-2 px-3">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive"
                        onClick={() => handleDelete(entry.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No labor recorded yet.</p>
        )}

        {showForm ? (
          <form onSubmit={handleSubmit} className="rounded-lg border p-4 space-y-3 bg-muted/20">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Date</Label>
                <DatePicker
                  value={form.entry_date}
                  onChange={(v) => setForm((f) => ({ ...f, entry_date: v || today() }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Employee / contractor</Label>
                <Input
                  value={form.employee_name}
                  onChange={(e) => setForm((f) => ({ ...f, employee_name: e.target.value }))}
                  placeholder="Name"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Description</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Work performed"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Hours</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.25"
                  value={form.hours}
                  onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Hourly rate</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.hourly_rate}
                  onChange={(e) => setForm((f) => ({ ...f, hourly_rate: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Amount (or leave blank if hours × rate)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="Total labor cost"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? <Loader2 className="size-4 mr-1 animate-spin" /> : null}
                Save labor
              </Button>
            </div>
          </form>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(true)}>
            <Plus className="size-4 mr-1" />
            Add labor cost
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
