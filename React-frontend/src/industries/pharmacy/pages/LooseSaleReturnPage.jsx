import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Plus,
  RotateCcw,
  Trash2,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { Container } from '@/components/common/container';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { customersApi } from '@/pages/accounting/customers/api/customers.api';
import { pharmacyApi } from '../api/pharmacy.api';
import { ExpiryMaskInput } from '../components/ExpiryMaskInput';
import { ItemNameSearchCell } from '../components/ItemNameSearchCell';
import { PURCHASE_CELL_INPUT, PURCHASE_CELL_NUMBER } from '../components/purchase-grid-ui';
import { expiryDisplayMask, isValidExpiryInput } from '../lib/expiry-mask';
import { prefetchMedicineCatalog } from '../lib/medicine-catalog-cache';
import { openReturnQtyHint, resolveOpenReturnUnitPrice } from '../lib/pharmacy-open-return';
import { getMedicinePricing } from '../lib/pharmacy-pricing';
import { pharmacyDispensePath } from '../paths';

function unwrap(res) {
  return res?.data?.data ?? res?.data ?? null;
}

function money(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '0.00';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function emptyLine(defaults) {
  return {
    product_id: '',
    name: '',
    image_url: null,
    sub: '',
    quantity: '1',
    unit_price: '',
    batch_number: defaults?.batch || 'LOOSE',
    expiry_date: defaults?.expiry_mask ? expiryDisplayMask(defaults.expiry_mask) : '',
  };
}

export function LooseSaleReturnPage() {
  const { id: companyId } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [defaults, setDefaults] = useState({ batch: 'LOOSE', expiry_mask: '' });
  const [walkIn, setWalkIn] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerRows, setCustomerRows] = useState([]);
  const [customerSearching, setCustomerSearching] = useState(false);
  const [canRefundCash, setCanRefundCash] = useState(true);
  const [refundCash, setRefundCash] = useState(true);
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState([emptyLine()]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [lastReturn, setLastReturn] = useState(null);
  const qtyRefs = useRef([]);

  useEffect(() => {
    let cancelled = false;
    prefetchMedicineCatalog();
    pharmacyApi
      .looseSaleReturnContext()
      .then((res) => {
        if (cancelled) return;
        const data = unwrap(res);
        const defs = data?.defaults || {};
        setDefaults(defs);
        setWalkIn(data?.walk_in_customer || null);
        setCustomer(data?.walk_in_customer || null);
        setCanRefundCash(data?.can_refund_cash !== false);
        setRefundCash(data?.can_refund_cash !== false);
        setLines([emptyLine(defs)]);
      })
      .catch(() => {
        if (!cancelled) toast.error('Could not load loose sale return settings.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setCustomerSearching(true);
      try {
        const res = await customersApi.list({
          search: customerQuery || undefined,
          per_page: 12,
        });
        const data = unwrap(res);
        const rows = Array.isArray(data) ? data : data?.data || [];
        if (!cancelled) setCustomerRows(rows);
      } catch {
        if (!cancelled) setCustomerRows([]);
      } finally {
        if (!cancelled) setCustomerSearching(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [customerQuery]);

  const totals = useMemo(() => {
    let amount = 0;
    let items = 0;
    for (const line of lines) {
      if (!line.product_id) continue;
      const qty = Number(line.quantity) || 0;
      const rate = Number(line.unit_price) || 0;
      if (qty <= 0) continue;
      items += 1;
      amount += qty * rate;
    }
    return { amount, items };
  }, [lines]);

  const customerOptions = useMemo(() => {
    const seen = new Set();
    const options = [];
    const push = (row) => {
      if (!row?.id) return;
      const value = String(row.id);
      if (seen.has(value)) return;
      seen.add(value);
      options.push({
        value,
        label: row.name || 'Walk-in Customer',
        keywords: [row.customer_code].filter(Boolean),
      });
    };
    push(walkIn);
    push(customer);
    customerRows.forEach((row) => push(row));
    return options;
  }, [walkIn, customer, customerRows]);

  const updateLine = useCallback((index, patch) => {
    setLines((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }, []);

  const addLine = () => {
    setLines((prev) => [...prev, emptyLine(defaults)]);
    setSelectedIdx(lines.length);
  };

  const removeLine = (index) => {
    setLines((prev) => {
      if (prev.length <= 1) return [emptyLine(defaults)];
      return prev.filter((_, i) => i !== index);
    });
    setSelectedIdx((idx) => Math.max(0, Math.min(idx, lines.length - 2)));
  };

  const pickProduct = (index, product) => {
    if (!product?.id) return;
    const pricing = getMedicinePricing(product);
    updateLine(index, {
      product_id: String(product.id),
      name: product.name || product.label || '',
      image_url: product.image_url || product.thumb_url || null,
      sub: [product.generic_name, product.strength].filter(Boolean).join(' · '),
      pack_count: pricing.packCount,
      unit_price: resolveOpenReturnUnitPrice(product) || lines[index]?.unit_price || '',
    });
    requestAnimationFrame(() => qtyRefs.current[index]?.focus?.());
  };

  const validate = () => {
    const active = lines.filter((l) => l.product_id);
    if (!active.length) {
      toast.error('Add at least one medicine.');
      return null;
    }
    for (const line of active) {
      const qty = Number(line.quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        toast.error('Enter quantity for every medicine.');
        return null;
      }
      const price = Number(line.unit_price);
      if (!Number.isFinite(price) || price < 0) {
        toast.error('Enter the refund price for every medicine.');
        return null;
      }
      if (!String(line.batch_number || '').trim()) {
        toast.error('Batch number is required.');
        return null;
      }
      if (!isValidExpiryInput(line.expiry_date)) {
        toast.error('Expiry (MM/YY) is required on every line.');
        return null;
      }
    }
    return active;
  };

  const submit = async () => {
    const active = validate();
    if (!active) return;
    if (refundCash && !canRefundCash) {
      toast.error('No cash account is set up. Turn off cash refund or add a bank account.');
      return;
    }

    setSaving(true);
    try {
      const res = await pharmacyApi.storeLooseSaleReturn({
        customer_id: customer?.id || walkIn?.id || null,
        notes: notes.trim() || null,
        refund_cash: refundCash,
        lines: active.map((l) => ({
          product_id: Number(l.product_id),
          quantity: Number(l.quantity),
          unit_price: Number(l.unit_price),
          batch_number: String(l.batch_number || '').trim(),
          expiry_date: expiryDisplayMask(l.expiry_date),
        })),
      });
      const data = unwrap(res);
      setLastReturn(data);
      toast.success(
        data?.refunded
          ? `Returned and refunded · ${data?.credit_note_number || ''}`
          : `Returned to stock · ${data?.credit_note_number || ''}`,
      );
      setLines([emptyLine(defaults)]);
      setNotes('');
      setSelectedIdx(0);
      setCustomer(walkIn);
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Loose sale return failed.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-16">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading…
        </div>
      </Container>
    );
  }

  const selectedCustomerId = customer?.id
    ? String(customer.id)
    : walkIn?.id
      ? String(walkIn.id)
      : undefined;

  return (
    <Container className="py-5 pb-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Sale return</h1>
          <p className="mt-0.5 text-[13px] text-slate-600">
            Backup screen — daily returns should use{' '}
            <Link
              to={pharmacyDispensePath(companyId)}
              className="font-semibold text-emerald-800 hover:underline"
            >
              Counter sale → Return
            </Link>
            . No receipt tab is there by default.
          </p>
        </div>
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
          <Link to={pharmacyDispensePath(companyId)}>
            Open POS
            <ArrowRight className="ms-1.5 size-3.5" />
          </Link>
        </Button>
      </div>

      {lastReturn ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-950">
          <div className="flex min-w-0 items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" />
            <p className="truncate">
              <span className="font-medium">{lastReturn.credit_note_number}</span>
              <span className="text-emerald-800">
                {' '}
                · {money(lastReturn.total)}
                {lastReturn.refunded ? ' refunded' : ' credited'} · stock updated
              </span>
            </p>
          </div>
          <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => setLastReturn(null)}>
            New return
          </Button>
        </div>
      ) : null}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <div className="grid gap-3 border-b border-border bg-muted/30 px-4 py-3 sm:grid-cols-[minmax(220px,280px)_minmax(0,1fr)_auto] sm:items-end">
            <div className="min-w-0 space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Customer
              </label>
              <SearchableCombobox
                value={selectedCustomerId}
                onValueChange={(value) => {
                  const hit =
                    [walkIn, customer, ...customerRows].find((row) => String(row?.id) === String(value)) ||
                    null;
                  if (hit) setCustomer(hit);
                }}
                onSearchChange={setCustomerQuery}
                options={customerOptions}
                placeholder="Walk-in Customer"
                searchPlaceholder={customerSearching ? 'Searching…' : 'Search customer…'}
                disabled={saving}
                triggerClassName="h-9"
                renderValue={(opt) => (
                  <span className="flex min-w-0 items-center gap-2">
                    <UserRound className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{opt?.label || 'Walk-in Customer'}</span>
                  </span>
                )}
              />
            </div>
            <div className="min-w-0 space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Note
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional — reason or medicine returned"
                rows={1}
                className="min-h-9 resize-none py-2"
                disabled={saving}
              />
            </div>
            <Button type="button" variant="outline" size="sm" className="h-9" onClick={addLine} disabled={saving}>
              <Plus className="me-1 size-3.5" />
              Line
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="w-10 px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    #
                  </th>
                  <th className="min-w-[220px] px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Medicine
                  </th>
                  <th className="w-[72px] px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Qty (pcs)
                  </th>
                  <th className="w-[108px] px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    / unit
                  </th>
                  <th className="w-[88px] px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Amount
                  </th>
                  <th className="w-[88px] px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Batch
                  </th>
                  <th className="w-[76px] px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Expiry
                  </th>
                  <th className="w-10 px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => {
                  const qty = Number(line.quantity) || 0;
                  const rate = Number(line.unit_price) || 0;
                  const lineTotal = line.product_id && qty > 0 ? qty * rate : 0;
                  return (
                    <tr
                      key={index}
                      className={cn(
                        'border-b border-border/70 last:border-b-0',
                        selectedIdx === index && 'bg-muted/40',
                      )}
                      onClick={() => setSelectedIdx(index)}
                    >
                      <td className="px-2 text-center text-xs tabular-nums text-muted-foreground">{index + 1}</td>
                      <td className="min-w-[220px] p-0">
                        <ItemNameSearchCell
                          rowIndex={index}
                          variant="cell"
                          selectedLabel={line.name}
                          selectedProductId={line.product_id}
                          selectedImage={line.image_url}
                          selectedSub={line.sub}
                          linked={!!line.product_id}
                          disabled={saving}
                          blockZeroStock={false}
                          lookupMode="purchase"
                          onSelect={(product) => pickProduct(index, product)}
                        />
                      </td>
                      <td className="p-0">
                        <Input
                          ref={(el) => {
                            qtyRefs.current[index] = el;
                          }}
                          type="number"
                          min="0"
                          step="any"
                          value={line.quantity}
                          onChange={(e) => updateLine(index, { quantity: e.target.value })}
                          placeholder={line.product_id ? openReturnQtyHint(line) : '1'}
                          title={
                            line.product_id
                              ? `Return count in ${openReturnQtyHint(line)} — not full packs`
                              : 'Pieces returned, not packs'
                          }
                          className={PURCHASE_CELL_NUMBER}
                          disabled={saving}
                        />
                      </td>
                      <td className="p-0">
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          value={line.unit_price}
                          onChange={(e) => updateLine(index, { unit_price: e.target.value })}
                          placeholder="0.00"
                          className={PURCHASE_CELL_NUMBER}
                          disabled={saving}
                        />
                      </td>
                      <td className="px-2.5 text-right text-[13px] tabular-nums text-muted-foreground">
                        {lineTotal ? money(lineTotal) : '—'}
                      </td>
                      <td className="p-0">
                        <Input
                          value={line.batch_number}
                          onChange={(e) => updateLine(index, { batch_number: e.target.value })}
                          className={cn(PURCHASE_CELL_INPUT, 'text-xs uppercase')}
                          disabled={saving}
                        />
                      </td>
                      <td className="p-0">
                        <ExpiryMaskInput
                          value={line.expiry_date}
                          onChange={(v) => updateLine(index, { expiry_date: v })}
                          className={cn(PURCHASE_CELL_INPUT, 'text-xs')}
                          disabled={saving}
                        />
                      </td>
                      <td className="px-1 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeLine(index);
                          }}
                          disabled={saving}
                          aria-label="Remove line"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="rounded-xl border border-border bg-card p-4 shadow-xs lg:sticky lg:top-20">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {refundCash ? 'Cash to refund' : 'Customer credit'}
          </p>
          <p className="mt-1 text-[28px] font-semibold leading-none tabular-nums tracking-tight">
            {money(totals.amount)}
          </p>
          <p className="mt-2 text-[12px] text-muted-foreground">
            {totals.items} item{totals.items === 1 ? '' : 's'} · stock increases on post
          </p>

          <div className="mt-4 space-y-3 border-t border-border pt-4">
            <label className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium">Refund cash now</span>
              <Switch
                checked={refundCash}
                disabled={saving || !canRefundCash}
                onCheckedChange={setRefundCash}
              />
            </label>
            {!canRefundCash ? (
              <p className="text-[12px] leading-relaxed text-amber-700">
                No cash account set. Stock still goes back; amount stays as credit.
              </p>
            ) : (
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                {customer?.name || 'Walk-in'} · credit note + batch restock
              </p>
            )}
          </div>

          <Button
            type="button"
            className="mt-4 h-10 w-full"
            disabled={saving || totals.items === 0}
            onClick={submit}
          >
            {saving ? (
              <>
                <Loader2 className="me-2 size-4 animate-spin" />
                Posting…
              </>
            ) : (
              <>
                <RotateCcw className="me-2 size-4" />
                {refundCash ? 'Return & refund' : 'Return to stock'}
              </>
            )}
          </Button>
        </aside>
      </div>
    </Container>
  );
}
