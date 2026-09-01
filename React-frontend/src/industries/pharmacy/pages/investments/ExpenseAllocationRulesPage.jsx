import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, Plus, Scale, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Container } from '@/components/common/container';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { productsApi } from '@/components/workspace/product/api/products.api';
import { investmentsApi } from '../../api/investments.api';

/**
 * How a shared cost is divided between parts of the business.
 *
 * An expense tagged to a category never reaches these rules; they only decide
 * costs that genuinely belong to more than one segment — rent, shared
 * electricity. A split that does not total 100% is refused rather than
 * normalised, because the missing part is money that would otherwise land on
 * nobody's books.
 */
export function ExpenseAllocationRulesPage() {
  const [rules, setRules] = useState({});
  const [incomplete, setIncomplete] = useState([]);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [accountId, setAccountId] = useState('default');
  const [rows, setRows] = useState([{ category_id: '', percentage: '' }]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ruleRes, catRes, acctRes] = await Promise.all([
        investmentsApi.listAllocationRules(),
        productsApi.listCategories(),
        api.get('/workspace/chart-of-accounts', { params: { per_page: 500 } }).catch(() => null),
      ]);
      setRules(ruleRes?.data?.data?.data ?? ruleRes?.data?.data ?? {});
      setIncomplete(ruleRes?.data?.data?.incomplete ?? []);
      setCategories(catRes?.data?.data ?? catRes?.data ?? []);

      const list = acctRes?.data?.data?.data ?? acctRes?.data?.data ?? [];
      // Only expense accounts can carry a shared-cost rule.
      setAccounts(
        (Array.isArray(list) ? list : []).filter((a) =>
          String(a.type || a.main_type || '').toLowerCase().includes('expense'),
        ),
      );
    } catch {
      toast.error('Could not load allocation rules.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const total = useMemo(
    () => rows.reduce((sum, r) => sum + (Number(r.percentage) || 0), 0),
    [rows],
  );
  const balanced = Math.abs(total - 100) < 0.0001;

  const setRow = (index, key, value) =>
    setRows((rs) => rs.map((r, i) => (i === index ? { ...r, [key]: value } : r)));

  const save = async () => {
    const allocations = rows
      .filter((r) => r.category_id && r.percentage !== '')
      .map((r) => ({ category_id: Number(r.category_id), percentage: Number(r.percentage) }));

    if (allocations.length === 0) return toast.error('Add at least one category.');
    if (!balanced) return toast.error(`The split must total 100%. It currently totals ${total}%.`);

    setSaving(true);
    try {
      await investmentsApi.saveAllocationRule({
        expense_account_id: accountId === 'default' ? null : Number(accountId),
        allocations,
      });
      toast.success('Allocation rule saved.');
      setRows([{ category_id: '', percentage: '' }]);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not save the rule.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    try {
      await investmentsApi.deleteAllocationRule(id);
      toast.success('Rule removed.');
      load();
    } catch {
      toast.error('Could not remove the rule.');
    }
  };

  return (
    <Container className="py-5">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
          <Scale className="size-4.5" />
        </span>
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-slate-900">
            Shared expense allocation
          </h1>
          <p className="text-xs text-slate-500">
            How costs that belong to more than one part of the business are divided
          </p>
        </div>
      </div>

      {incomplete.length > 0 ? (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-amber-900">
              {incomplete.length} split{incomplete.length === 1 ? ' does' : 's do'} not total 100%
            </p>
            <p className="mt-0.5 text-xs text-amber-800">
              Expenses on {incomplete.length === 1 ? 'that account' : 'those accounts'} will be
              treated as unallocated until the split is completed.
            </p>
          </div>
        </div>
      ) : null}

      <section className="mb-4 rounded-lg border border-slate-200 bg-white">
        <h2 className="border-b border-slate-900 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-900 sm:px-5">
          New split
        </h2>
        <div className="space-y-3 px-4 py-4 sm:px-5">
          <div>
            <Label>Expense account</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="max-w-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Every expense account (fallback)</SelectItem>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={String(account.id)}>
                    {account.account_number ? `${account.account_number} — ` : ''}
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-[11px] text-slate-500">
              The fallback applies to any account without a rule of its own.
            </p>
          </div>

          <div className="space-y-2">
            {rows.map((row, index) => (
              <div key={index} className="flex items-center gap-2">
                <Select
                  value={row.category_id ? String(row.category_id) : ''}
                  onValueChange={(v) => setRow(index, 'category_id', v)}
                >
                  <SelectTrigger className="max-w-xs">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.0001"
                  className="w-28 text-right tabular-nums"
                  value={row.percentage}
                  onChange={(e) => setRow(index, 'percentage', e.target.value)}
                  placeholder="60"
                />
                <span className="text-sm text-slate-500">%</span>
                {rows.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setRows((rs) => rs.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="size-4 text-slate-400" />
                  </Button>
                ) : null}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRows((rs) => [...rs, { category_id: '', percentage: '' }])}
            >
              <Plus className="size-4" /> Add category
            </Button>
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  'text-sm font-semibold tabular-nums',
                  balanced ? 'text-emerald-700' : 'text-red-600',
                )}
              >
                Total {total}%
              </span>
              <Button
                onClick={save}
                disabled={saving || !balanced}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : 'Save split'}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <h2 className="border-b border-slate-900 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-900 sm:px-5">
          Current splits
        </h2>
        <div className="px-4 py-4 sm:px-5">
          {loading ? (
            <Loader2 className="mx-auto size-5 animate-spin text-slate-400" />
          ) : Object.keys(rules).length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">
              No splits configured. Shared expenses will show as unallocated until one exists.
            </p>
          ) : (
            Object.entries(rules).map(([key, group]) => (
              <div key={key} className="mb-4 last:mb-0">
                <p className="mb-1 text-xs font-semibold text-slate-700">
                  {key === 'default'
                    ? 'Every expense account (fallback)'
                    : accounts.find((a) => String(a.id) === String(key))?.name ||
                      `Account #${key}`}
                </p>
                {group.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center gap-3 border-b border-slate-100 py-1 last:border-b-0"
                  >
                    <span className="min-w-0 flex-1 text-sm text-slate-700">
                      {rule.category?.name || `Category #${rule.category_id}`}
                    </span>
                    <span className="w-20 text-right text-sm tabular-nums text-slate-900">
                      {Number(rule.percentage)}%
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => remove(rule.id)}>
                      <Trash2 className="size-3.5 text-slate-400" />
                    </Button>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </section>
    </Container>
  );
}
