import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { productsApi } from '@/components/workspace/product/api/products.api';
import { investmentsApi } from '../../api/investments.api';

const EMPTY = {
  investor_id: '',
  investment_amount: '',
  profit_share_percentage: '',
  scope_type: 'all',
  category_ids: [],
  start_date: new Date().toISOString().slice(0, 10),
  end_date: '',
  notes: '',
};

/**
 * The contract: how much was put in, what share of profit it earns, over which
 * part of the business, and for how long.
 *
 * The share is a percentage of profit, not of the company — an investor can
 * hold 4% of the monthly profit while owning none of it.
 */
export function InvestmentFormDialog({ open, onOpenChange, investors = [], onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);

  const loadCategories = useCallback(async () => {
    try {
      const res = await productsApi.listCategories();
      setCategories(res?.data?.data ?? res?.data ?? []);
    } catch {
      // A missing category list only limits scope selection; the dialog still
      // works for a whole-business investment.
      setCategories([]);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setForm(EMPTY);
      loadCategories();
    }
  }, [open, loadCategories]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const toggleCategory = (categoryId) =>
    setForm((f) => ({
      ...f,
      category_ids: f.category_ids.includes(categoryId)
        ? f.category_ids.filter((c) => c !== categoryId)
        : [...f.category_ids, categoryId],
    }));

  const submit = async (e) => {
    e.preventDefault();

    if (!form.investor_id) return toast.error('Choose an investor.');
    if (!Number(form.profit_share_percentage)) return toast.error('Set a profit share percentage.');
    if (form.scope_type === 'categories' && form.category_ids.length === 0) {
      return toast.error('Choose at least one category, or scope the investment to the whole business.');
    }

    setSaving(true);
    try {
      await investmentsApi.createInvestment({
        investor_id: Number(form.investor_id),
        investment_amount: Number(form.investment_amount || 0),
        profit_share_percentage: Number(form.profit_share_percentage),
        scope_type: form.scope_type,
        category_ids: form.scope_type === 'categories' ? form.category_ids : undefined,
        start_date: form.start_date,
        end_date: form.end_date || undefined,
        notes: form.notes || undefined,
      });
      toast.success('Investment created.');
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not save the investment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>New investment</DialogTitle>
          <DialogDescription>
            The share is a percentage of the profit this scope actually makes — not ownership of the
            business, and not a fixed return on the capital.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Investor</Label>
            <Select value={form.investor_id} onValueChange={(v) => set('investor_id', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an investor" />
              </SelectTrigger>
              <SelectContent>
                {investors.map((investor) => (
                  <SelectItem key={investor.id} value={String(investor.id)}>
                    {investor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="amount">Capital</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={form.investment_amount}
                onChange={(e) => set('investment_amount', e.target.value)}
                placeholder="1000000"
              />
            </div>
            <div>
              <Label htmlFor="share">Profit share %</Label>
              <Input
                id="share"
                type="number"
                min="0"
                max="100"
                step="0.0001"
                value={form.profit_share_percentage}
                onChange={(e) => set('profit_share_percentage', e.target.value)}
                placeholder="4"
              />
            </div>
          </div>

          <div>
            <Label>Scope</Label>
            <Select value={form.scope_type} onValueChange={(v) => set('scope_type', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Entire business</SelectItem>
                <SelectItem value="categories">Specific categories</SelectItem>
              </SelectContent>
            </Select>

            {form.scope_type === 'categories' ? (
              <div className="mt-2 max-h-40 space-y-1.5 overflow-y-auto rounded-md border border-slate-200 p-2.5">
                {categories.length === 0 ? (
                  <p className="text-xs text-slate-400">No categories found.</p>
                ) : (
                  categories.map((category) => (
                    <label key={category.id} className="flex cursor-pointer items-center gap-2">
                      <Checkbox
                        checked={form.category_ids.includes(category.id)}
                        onCheckedChange={() => toggleCategory(category.id)}
                      />
                      <span className="text-sm text-slate-700">{category.name}</span>
                    </label>
                  ))
                )}
              </div>
            ) : (
              <p className="mt-1 text-[11px] text-slate-500">
                Includes every category, and products with no category.
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="start">Start date</Label>
              <Input
                id="start"
                type="date"
                value={form.start_date}
                onChange={(e) => set('start_date', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="end">End date</Label>
              <Input
                id="end"
                type="date"
                value={form.end_date}
                onChange={(e) => set('end_date', e.target.value)}
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Leave blank for open-ended. Both dates are inclusive.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? <Loader2 className="size-4 animate-spin" /> : 'Create investment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
