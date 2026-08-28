import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { stockTransfersApi } from '../api/stock-transfers.api';
import { EMPTY_TRANSFER_FORM, EMPTY_TRANSFER_LINE, buildStockTransferPayload } from '../constants';
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
import { Alert, AlertDescription } from '@/components/ui/alert';

function FieldError({ message }) {
  if (!message) return null;
  return <p className="text-sm text-destructive mt-1">{message}</p>;
}

export function StockTransferCreatePage() {
  const { id: workspaceId } = useParams();
  const navigate = useNavigate();
  const invBase = `/workspace/${workspaceId}/accounting/inventory`;
  const base = `${invBase}/stock-transfers`;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_TRANSFER_FORM });
  const [errors, setErrors] = useState({});
  const [opts, setOpts] = useState({
    warehouses: [],
    products: [],
    requires_two_warehouses: false,
  });

  useEffect(() => {
    stockTransfersApi
      .formOptions()
      .then((res) => {
        const data = res.data?.data || {};
        setOpts({
          warehouses: data.warehouses ?? [],
          products: data.products ?? [],
          requires_two_warehouses: !!data.requires_two_warehouses,
        });
        const list = data.warehouses || [];
        const defFrom = list.find((w) => w.is_default) || list[0];
        const defTo = list.filter((w) => w.id !== defFrom?.id)[0];
        if (defFrom) setForm((f) => ({ ...f, from_warehouse_id: String(defFrom.id) }));
        if (defTo) setForm((f) => ({ ...f, to_warehouse_id: String(defTo.id) }));
        if (!data.can_create) {
          toast.error('You do not have permission to create transfers');
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
    setForm((f) => ({ ...f, lines: [...f.lines, { ...EMPTY_TRANSFER_LINE }] }));
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
    toast.error(err?.response?.data?.message || 'Could not save transfer');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const res = await stockTransfersApi.create(buildStockTransferPayload(form));
      toast.success(res.data?.message || 'Transfer saved');
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
        title="New stock transfer"
        subtitle="Move quantities from one warehouse to another."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to={base}>
              <ArrowLeft className="size-4 mr-1" /> Back
            </Link>
          </Button>
        }
      />

      {opts.requires_two_warehouses ? (
        <Alert>
          <AlertDescription>
            Add another active warehouse before you can transfer stock between locations.
          </AlertDescription>
        </Alert>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="rounded-lg border bg-card p-6 space-y-8 max-w-5xl shadow-sm"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>From warehouse <span className="text-destructive">*</span></Label>
            <Select
              value={form.from_warehouse_id || undefined}
              onValueChange={(v) => setField('from_warehouse_id', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {opts.warehouses.map((w) => (
                  <SelectItem key={w.id} value={String(w.id)}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.from_warehouse_id} />
          </div>
          <div className="space-y-2">
            <Label>To warehouse <span className="text-destructive">*</span></Label>
            <Select
              value={form.to_warehouse_id || undefined}
              onValueChange={(v) => setField('to_warehouse_id', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {opts.warehouses.map((w) => (
                  <SelectItem key={`to-${w.id}`} value={String(w.id)}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.to_warehouse_id} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Transfer date <span className="text-destructive">*</span></Label>
            <DatePicker value={form.transfer_date} onChange={(v) => setField('transfer_date', v)} />
            <FieldError message={errors.transfer_date} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="tr_desc">Notes</Label>
            <Textarea
              id="tr_desc"
              rows={2}
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
            />
            <FieldError message={errors.notes} />
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
                  <th className="text-right p-3 font-medium w-32">Quantity <span className="text-destructive">*</span></th>
                  <th className="text-left p-3 font-medium w-32">Unit</th>
                  <th className="w-12 p-2" />
                </tr>
              </thead>
              <tbody>
                {form.lines.map((line, idx) => (
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
                    <td className="p-2 align-top">
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        className="text-right tabular-nums"
                        value={line.quantity}
                        onChange={(e) => setLine(idx, { quantity: e.target.value })}
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
                ))}
              </tbody>
            </table>
          </div>
          <FieldError message={errors.lines} />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate(base)} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || opts.requires_two_warehouses}>
            {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Save className="size-4 mr-2" />}
            Save transfer
          </Button>
        </div>
      </form>
    </div>
  );
}
