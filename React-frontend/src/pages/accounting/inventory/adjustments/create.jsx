import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { stockAdjustmentsApi } from '../api/stock-adjustments.api';
import {
  EMPTY_ADJUSTMENT_FORM,
  EMPTY_ADJUSTMENT_LINE,
  buildAdjustmentPayload,
  getProductStockInWarehouse,
} from '../constants';
import { UnitPickerCell } from '@/components/workspace/product/components/UnitPickerCell';
import { defaultEnteredUnitForProduct } from '@/lib/units';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';

function FieldError({ message }) {
  if (!message) return null;
  return <p className="text-sm text-destructive mt-1">{message}</p>;
}

export function StockAdjustmentCreatePage() {
  const { id: workspaceId } = useParams();
  const navigate = useNavigate();
  const invBase = `/workspace/${workspaceId}/accounting/inventory`;
  const base = `${invBase}/adjustments`;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_ADJUSTMENT_FORM });
  const [errors, setErrors] = useState({});

  const [opts, setOpts] = useState({
    warehouses: [],
    products: [],
    stock_by_product: {},
    inventory_accounts: [],
    expense_accounts: [],
    income_accounts: [],
    reasons: [],
    defaults: {},
  });

  useEffect(() => {
    stockAdjustmentsApi
      .formOptions()
      .then((res) => {
        const data = res.data?.data || {};
        const d = data.defaults || {};
        setOpts({
          warehouses: data.warehouses ?? [],
          products: data.products ?? [],
          stock_by_product: data.stock_by_product ?? {},
          inventory_accounts: data.inventory_accounts ?? [],
          expense_accounts: data.expense_accounts ?? [],
          income_accounts: data.income_accounts ?? [],
          reasons: data.reasons ?? [],
          defaults: d,
        });
        setForm((f) => ({
          ...f,
          inventory_account_id: d.inventory_account_id ? String(d.inventory_account_id) : f.inventory_account_id,
          adjustment_expense_account_id: d.adjustment_expense_account_id
            ? String(d.adjustment_expense_account_id)
            : f.adjustment_expense_account_id,
          adjustment_income_account_id: d.adjustment_income_account_id
            ? String(d.adjustment_income_account_id)
            : f.adjustment_income_account_id,
        }));

        const wh = (data.warehouses || []).find((w) => w.is_default) || (data.warehouses || [])[0];
        if (wh) {
          setForm((f) => ({ ...f, warehouse_id: String(wh.id) }));
        }
        if (!data.can_create) {
          toast.error('You do not have permission to create adjustments');
        }
      })
      .catch((err) => toast.error(err?.response?.data?.message || 'Failed to load form'))
      .finally(() => setLoading(false));
  }, []);

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const productsById = useMemo(() => {
    const map = {};
    opts.products.forEach((p) => {
      map[String(p.id)] = p;
    });
    return map;
  }, [opts.products]);

  const setLine = (index, patch) => {
    setForm((f) => {
      const lines = [...f.lines];
      lines[index] = { ...lines[index], ...patch };
      return { ...f, lines };
    });
  };

  const selectLineProduct = (index, productId) => {
    const product = productsById[String(productId)];
    setLine(index, {
      product_id: productId,
      entered_unit: defaultEnteredUnitForProduct(product) || '',
    });
  };

  const addLine = () => {
    setForm((f) => ({ ...f, lines: [...f.lines, { ...EMPTY_ADJUSTMENT_LINE }] }));
  };

  const removeLine = (index) => {
    setForm((f) => ({
      ...f,
      lines: f.lines.length <= 1 ? f.lines : f.lines.filter((_, i) => i !== index),
    }));
  };

  const applyServerErrors = (err) => {
    const serverErrors = err?.response?.data?.errors;
    if (serverErrors && typeof serverErrors === 'object') {
      const next = {};
      Object.entries(serverErrors).forEach(([k, v]) => {
        next[k] = Array.isArray(v) ? v[0] : String(v);
      });
      setErrors(next);
      return;
    }
    toast.error(err?.response?.data?.message || 'Could not save adjustment');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const res = await stockAdjustmentsApi.create(buildAdjustmentPayload(form));
      toast.success(res.data?.message || 'Adjustment saved');
      const created = res.data?.data;
      if (created?.id) navigate(`${base}/${created.id}`);
      else navigate(base);
    } catch (err) {
      applyServerErrors(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="size-6 animate-spin mr-2" /> Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full min-w-0">
      <PageHeader
        title="New stock adjustment"
        subtitle="Set counted quantities; GL posts when there is a net value change."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to={base}>
              <ArrowLeft className="size-4 mr-1" /> Back
            </Link>
          </Button>
        }
      />

      <form
        onSubmit={handleSubmit}
        className="rounded-lg border bg-card p-6 space-y-8 max-w-5xl shadow-sm"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Warehouse <span className="text-destructive">*</span></Label>
            <Select
              value={form.warehouse_id || undefined}
              onValueChange={(v) => setField('warehouse_id', v)}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select warehouse" />
              </SelectTrigger>
              <SelectContent>
                {opts.warehouses.map((w) => (
                  <SelectItem key={w.id} value={String(w.id)}>
                    {w.name}
                    {w.is_default ? ' (default)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.warehouse_id} />
          </div>
          <div className="space-y-2">
            <Label>Adjustment date <span className="text-destructive">*</span></Label>
            <DatePicker value={form.adjustment_date} onChange={(v) => setField('adjustment_date', v)} />
            <FieldError message={errors.adjustment_date} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Reason <span className="text-destructive">*</span></Label>
            <Select value={form.reason} onValueChange={(v) => setField('reason', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {opts.reasons.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.reason} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="adj_notes">Notes</Label>
            <Textarea
              id="adj_notes"
              rows={2}
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
            />
            <FieldError message={errors.notes} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Inventory account <span className="text-destructive">*</span></Label>
            <Select
              value={form.inventory_account_id || undefined}
              onValueChange={(v) => setField('inventory_account_id', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {opts.inventory_accounts.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.inventory_account_id} />
          </div>
          <div className="space-y-2">
            <Label>Expense account <span className="text-destructive">*</span></Label>
            <Select
              value={form.adjustment_expense_account_id || undefined}
              onValueChange={(v) => setField('adjustment_expense_account_id', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {opts.expense_accounts.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.adjustment_expense_account_id} />
          </div>
          <div className="space-y-2">
            <Label>Income account <span className="text-destructive">*</span></Label>
            <Select
              value={form.adjustment_income_account_id || undefined}
              onValueChange={(v) => setField('adjustment_income_account_id', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {opts.income_accounts.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.adjustment_income_account_id} />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-medium">Lines</h3>
            <Button type="button" size="sm" variant="outline" onClick={addLine}>
              <Plus className="size-4 mr-1" /> Add line
            </Button>
          </div>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-muted-foreground">
                  <th className="text-left p-3 font-medium min-w-[220px]">Product</th>
                  <th className="text-right p-3 font-medium w-28">Current qty</th>
                  <th className="text-right p-3 font-medium w-32">New qty <span className="text-destructive">*</span></th>
                  <th className="text-left p-3 font-medium w-32">Unit</th>
                  <th className="w-12 p-2" />
                </tr>
              </thead>
              <tbody>
                {form.lines.map((line, idx) => {
                  const current =
                    form.warehouse_id &&
                    getProductStockInWarehouse(
                      opts.stock_by_product,
                      line.product_id,
                      Number(form.warehouse_id)
                    );
                  return (
                    <tr key={idx} className="border-b last:border-0">
                      <td className="p-2 align-top">
                        <Select
                          value={line.product_id ? String(line.product_id) : undefined}
                          onValueChange={(v) => selectLineProduct(idx, v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Product" />
                          </SelectTrigger>
                          <SelectContent>
                            {opts.products.map((p) => (
                              <SelectItem key={p.id} value={String(p.id)}>
                                {p.sku ? `${p.sku} — ` : ''}
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2 align-top text-right tabular-nums text-muted-foreground">
                        {line.product_id && form.warehouse_id ? current : '—'}
                      </td>
                      <td className="p-2 align-top">
                        <Input
                          type="number"
                          step="any"
                          className="text-right tabular-nums"
                          value={line.quantity_after}
                          onChange={(e) => setLine(idx, { quantity_after: e.target.value })}
                          placeholder="0"
                        />
                      </td>
                      <td className="p-2 align-top">
                        <UnitPickerCell
                          line={line}
                          product={productsById[String(line.product_id)]}
                          onChange={(v) => setLine(idx, { entered_unit: v })}
                        />
                      </td>
                      <td className="p-1 align-top">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-8 text-destructive"
                          onClick={() => removeLine(idx)}
                          disabled={form.lines.length <= 1}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <FieldError message={errors.lines} />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate(base)} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Save className="size-4 mr-2" />}
            Save adjustment
          </Button>
        </div>
      </form>
    </div>
  );
}
