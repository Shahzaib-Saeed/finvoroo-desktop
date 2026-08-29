import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Plus,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Container } from '@/components/common/container';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useProductDialog } from '@/components/workspace/product/product-dialog-provider';
import { cn } from '@/lib/utils';
import { pharmacyApi } from '../api/pharmacy.api';
import { ExpiryMaskInput } from '../components/ExpiryMaskInput';
import { ItemNameSearchCell } from '../components/ItemNameSearchCell';
import {
  PURCHASE_CELL_INPUT,
  PURCHASE_CELL_NUMBER,
  PurchaseGridTd,
  PurchaseGridTh,
} from '../components/purchase-grid-ui';
import {
  lineHasEffectiveBatch,
  lineHasEffectiveExpiry,
  resolvePurchaseLineBatch,
  resolvePurchaseLineExpiryIso,
} from '../lib/pharmacy-purchase-defaults';
import { loadMedicineCatalog, prefetchMedicineCatalog } from '../lib/medicine-catalog-cache';
import { expiryDisplayMask } from '../lib/expiry-mask';
import { pharmacyDispensePath } from '../paths';

function unwrap(res) {
  return res?.data?.data ?? res?.data ?? null;
}

function money(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '0.00';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function emptyLine() {
  return {
    product_id: '',
    name: '',
    image_url: null,
    sub: '',
    quantity: '1',
    unit_price: '',
    sale_price: '',
    batch_number: '',
    expiry_date: '',
  };
}

function looseSettingsFromDefaults(defaults) {
  return {
    default_batch_when_missing: defaults?.batch || '',
    default_expiry_when_missing: defaults?.expiry_mask || '',
  };
}

function FieldLabel({ children }) {
  return (
    <span className="text-[12px] font-semibold text-slate-800">{children}</span>
  );
}

export function LoosePurchasePage() {
  const { id: companyId } = useParams();
  const navigate = useNavigate();
  const productDialog = useProductDialog();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [defaults, setDefaults] = useState({ batch: 'LOOSE', expiry_mask: '' });
  const [vendorName, setVendorName] = useState('Local / Open Purchase');
  const [shopName, setShopName] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState([emptyLine()]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [lastBill, setLastBill] = useState(null);
  const qtyRefs = useRef([]);

  useEffect(() => {
    let cancelled = false;
    prefetchMedicineCatalog();
    pharmacyApi
      .loosePurchaseContext()
      .then((res) => {
        if (cancelled) return;
        const data = unwrap(res);
        const defs = data?.defaults || {};
        setDefaults(defs);
        setVendorName(data?.vendor?.name || 'Local / Open Purchase');
        setLines([emptyLine()]);
      })
      .catch(() => {
        if (!cancelled) toast.error('Could not load open purchase settings.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const purchaseSettings = useMemo(() => looseSettingsFromDefaults(defaults), [defaults]);
  const defaultBatchLabel = String(defaults.batch || '').trim();
  const defaultExpiryLabel = defaults.expiry_mask
    ? expiryDisplayMask(defaults.expiry_mask)
    : '';

  const totals = useMemo(() => {
    let cost = 0;
    let items = 0;
    for (const line of lines) {
      if (!line.product_id) continue;
      const qty = Number(line.quantity) || 0;
      const rate = Number(line.unit_price) || 0;
      if (qty <= 0) continue;
      items += 1;
      cost += qty * rate;
    }
    return { cost, items };
  }, [lines]);

  const updateLine = useCallback((index, patch) => {
    setLines((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }, []);

  const addLine = () => {
    setLines((prev) => [...prev, emptyLine()]);
    setSelectedIdx(lines.length);
  };

  const removeLine = (index) => {
    setLines((prev) => {
      if (prev.length <= 1) return [emptyLine()];
      return prev.filter((_, i) => i !== index);
    });
    setSelectedIdx((idx) => Math.max(0, Math.min(idx, lines.length - 2)));
  };

  const pickProduct = (index, product) => {
    if (!product?.id) return;
    updateLine(index, {
      product_id: String(product.id),
      name: product.name || product.label || '',
      image_url: product.image_url || product.thumb_url || null,
      sub: [product.generic_name, product.strength].filter(Boolean).join(' · '),
      sale_price:
        product.unit_price != null && product.unit_price !== ''
          ? String(product.unit_price)
          : lines[index]?.sale_price || '',
      unit_price:
        lines[index]?.unit_price ||
        (product.purchase_price != null && product.purchase_price !== ''
          ? String(product.purchase_price)
          : ''),
    });
    requestAnimationFrame(() => qtyRefs.current[index]?.focus?.());
  };

  const openCreateProduct = (index) => {
    const line = lines[index];
    productDialog?.openCreate?.({
      skipTypePicker: true,
      type: 'inventory',
      prefill: {
        name: line?.name || '',
        unit_price: line?.sale_price || '',
        mrp: line?.sale_price || '',
      },
      onSuccess: (saved) => pickProduct(index, saved),
    });
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
      const cost = Number(line.unit_price);
      if (!Number.isFinite(cost) || cost < 0) {
        toast.error('Enter what you paid (cost) for every medicine.');
        return null;
      }
      if (!lineHasEffectiveBatch(line, purchaseSettings)) {
        toast.error('Batch number is required (or set a default in Pharmacy settings).');
        return null;
      }
      if (!lineHasEffectiveExpiry(line, purchaseSettings)) {
        toast.error('Expiry (MM/YY) is required (or set a default in Pharmacy settings).');
        return null;
      }
    }
    return active;
  };

  const submit = async () => {
    const active = validate();
    if (!active) return;

    setSaving(true);
    try {
      const res = await pharmacyApi.storeLoosePurchase({
        shop_name: shopName.trim() || null,
        notes: notes.trim() || null,
        lines: active.map((l) => ({
          product_id: Number(l.product_id),
          quantity: Number(l.quantity),
          unit_price: Number(l.unit_price),
          batch_number: resolvePurchaseLineBatch(l, purchaseSettings),
          expiry_date: resolvePurchaseLineExpiryIso(l, purchaseSettings),
          retail_unit_price:
            l.sale_price !== '' && Number(l.sale_price) > 0 ? Number(l.sale_price) : null,
        })),
      });
      const data = unwrap(res);
      setLastBill(data);
      toast.success(
        `Stock received · ${data?.line_count || active.length} line${active.length === 1 ? '' : 's'} · bill ${data?.bill_number || ''}`,
      );
      setLines([emptyLine()]);
      setShopName('');
      setNotes('');
      setSelectedIdx(0);
      prefetchMedicineCatalog();
      void loadMedicineCatalog({ force: true });
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Open purchase failed.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-10">
        <div className="flex items-center justify-center gap-2 text-sm font-medium text-slate-600">
          <Loader2 className="size-5 animate-spin text-emerald-700" />
          Loading open purchase…
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-6 pb-10">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-slate-900">
            Open purchase
          </h1>
          <p className="mt-1 text-[13px] text-slate-600">
            Buy from another shop when out of stock · posts to{' '}
            <span className="font-semibold text-slate-800">{vendorName}</span>
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="border-slate-400 text-slate-800">
          <Link to={pharmacyDispensePath(companyId)}>
            Counter sale
            <ArrowRight className="size-3.5 ms-1.5" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px] xl:items-start">
        <div className="min-w-0 space-y-4">
          <p className="border-s-4 border-emerald-700 bg-white py-2 ps-3 text-[13px] leading-relaxed text-slate-700">
            Record cost, batch, and expiry for stock bought nearby — then sell on{' '}
            <Link
              to={pharmacyDispensePath(companyId)}
              className="font-semibold text-emerald-800 hover:underline"
            >
              Counter sale
            </Link>
            .
          </p>

          {lastBill ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3">
              <div className="flex items-start gap-2 text-emerald-950">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-700" />
                <div>
                  <p className="text-[14px] font-semibold">
                    Bill {lastBill.bill_number} posted · {money(lastBill.total)}
                  </p>
                  <p className="text-[12px] text-emerald-800">Stock updated — ready to dispense.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="bg-emerald-800 hover:bg-emerald-900"
                  onClick={() => navigate(pharmacyDispensePath(companyId))}
                >
                  Dispense now
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setLastBill(null)}>
                  New entry
                </Button>
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 rounded-lg border border-slate-400 bg-white p-4 sm:grid-cols-2">
            <label className="block min-w-0 space-y-1.5">
              <FieldLabel>Shop name</FieldLabel>
              <Input
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="City Medical Store"
                disabled={saving}
                className="border-slate-400 text-slate-900"
              />
              <p className="text-[11px] text-slate-500">Where you bought it — optional</p>
            </label>
            <label className="block min-w-0 space-y-1.5 sm:col-span-2">
              <FieldLabel>Notes</FieldLabel>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Customer waiting, emergency refill…"
                rows={2}
                className="min-h-[68px] resize-none border-slate-400 text-slate-900"
                disabled={saving}
              />
            </label>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-400 bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-slate-400 bg-white px-4 py-3">
              <div>
                <h2 className="text-[15px] font-semibold text-slate-900">Medicines</h2>
                <p className="text-[12px] text-slate-600">
                  Search catalogue · enter qty, cost, batch, expiry
                  {defaultBatchLabel || defaultExpiryLabel ? (
                    <>
                      {' '}
                      · empty batch/expiry uses{' '}
                      {defaultBatchLabel ? `batch ${defaultBatchLabel}` : ''}
                      {defaultBatchLabel && defaultExpiryLabel ? ', ' : ''}
                      {defaultExpiryLabel ? `expiry ${defaultExpiryLabel}` : ''}
                    </>
                  ) : null}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-slate-400 text-slate-800"
                onClick={addLine}
                disabled={saving}
              >
                <Plus className="size-3.5 me-1" />
                Add line
              </Button>
            </div>

            <ScrollArea className="w-full">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead>
                  <tr>
                    <PurchaseGridTh align="center" className="w-10">
                      #
                    </PurchaseGridTh>
                    <PurchaseGridTh className="min-w-[240px]">Medicine</PurchaseGridTh>
                    <PurchaseGridTh align="right" className="w-[72px]">
                      Qty
                    </PurchaseGridTh>
                    <PurchaseGridTh align="right" className="w-[96px]">
                      Cost
                    </PurchaseGridTh>
                    <PurchaseGridTh className="w-[88px]">Batch</PurchaseGridTh>
                    <PurchaseGridTh className="w-[76px]">Expiry</PurchaseGridTh>
                    <PurchaseGridTh align="right" className="w-[96px]">
                      Sale
                    </PurchaseGridTh>
                    <PurchaseGridTh className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, index) => {
                    const selected = selectedIdx === index;
                    return (
                      <tr
                        key={index}
                        className={cn(!selected && 'hover:[&>td]:bg-emerald-50/60')}
                        onClick={() => setSelectedIdx(index)}
                      >
                        <PurchaseGridTd align="center" selected={selected} lead>
                          <span className="flex h-11 items-center justify-center text-[13px] font-semibold tabular-nums text-slate-700">
                            {index + 1}
                          </span>
                        </PurchaseGridTd>
                        <PurchaseGridTd selected={selected} className="min-w-[240px]">
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
                            onSelect={(product) => pickProduct(index, product)}
                            onCreateNew={() => openCreateProduct(index)}
                          />
                        </PurchaseGridTd>
                        <PurchaseGridTd align="right" selected={selected}>
                          <Input
                            ref={(el) => {
                              qtyRefs.current[index] = el;
                            }}
                            type="number"
                            min="0"
                            step="any"
                            value={line.quantity}
                            onChange={(e) => updateLine(index, { quantity: e.target.value })}
                            className={PURCHASE_CELL_NUMBER}
                            disabled={saving}
                          />
                        </PurchaseGridTd>
                        <PurchaseGridTd align="right" selected={selected}>
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
                        </PurchaseGridTd>
                        <PurchaseGridTd selected={selected}>
                          <Input
                            value={line.batch_number}
                            onChange={(e) => updateLine(index, { batch_number: e.target.value })}
                            className={cn(PURCHASE_CELL_INPUT, 'uppercase text-xs placeholder:text-slate-400')}
                            placeholder={
                              defaultBatchLabel && !String(line.batch_number || '').trim()
                                ? defaultBatchLabel
                                : 'Batch'
                            }
                            disabled={saving}
                          />
                        </PurchaseGridTd>
                        <PurchaseGridTd selected={selected}>
                          <ExpiryMaskInput
                            value={line.expiry_date}
                            onChange={(v) => updateLine(index, { expiry_date: v })}
                            className={cn(PURCHASE_CELL_INPUT, 'text-xs placeholder:text-slate-400')}
                            placeholder={
                              defaultExpiryLabel && !String(line.expiry_date || '').trim()
                                ? defaultExpiryLabel
                                : 'MM/YY'
                            }
                            disabled={saving}
                          />
                        </PurchaseGridTd>
                        <PurchaseGridTd align="right" selected={selected}>
                          <Input
                            type="number"
                            min="0"
                            step="any"
                            value={line.sale_price}
                            onChange={(e) => updateLine(index, { sale_price: e.target.value })}
                            placeholder="—"
                            className={PURCHASE_CELL_NUMBER}
                            disabled={saving}
                          />
                        </PurchaseGridTd>
                        <PurchaseGridTd align="center" selected={selected}>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 text-slate-500 hover:text-red-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeLine(index);
                            }}
                            disabled={saving}
                            aria-label="Remove line"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </PurchaseGridTd>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        </div>

        <aside className="overflow-hidden rounded-lg border border-slate-400 bg-white xl:sticky xl:top-20">
          <div className="border-b border-slate-400 bg-emerald-800 px-4 py-4 text-white">
            <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-100">
              Total cost
            </p>
            <p className="mt-1 text-[28px] font-bold tabular-nums leading-none">
              {money(totals.cost)}
            </p>
            <p className="mt-2 text-[12px] text-emerald-100">
              {totals.items} medicine{totals.items === 1 ? '' : 's'} · batch stock on post
            </p>
          </div>

          <div className="space-y-3 px-4 py-4">
            <div className="flex items-center justify-between gap-2 text-[13px]">
              <span className="font-medium text-slate-600">Vendor</span>
              <span className="max-w-[160px] truncate text-right font-semibold text-slate-900">
                {vendorName}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 text-[13px]">
              <span className="font-medium text-slate-600">Default batch</span>
              <span className="font-semibold tabular-nums text-slate-900">
                {defaults.batch || 'LOOSE'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 text-[13px]">
              <span className="font-medium text-slate-600">Default expiry</span>
              <span className="font-semibold tabular-nums text-slate-900">
                {defaults.expiry_mask ? expiryDisplayMask(defaults.expiry_mask) : '—'}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Change defaults in{' '}
              <Link
                to={`/workspace/${companyId}/pharmacy/settings`}
                className="font-semibold text-emerald-800 hover:underline"
              >
                Pharmacy settings
              </Link>
            </p>
          </div>

          <div className="border-t border-slate-400 px-4 py-4">
            <Button
              type="button"
              className="h-11 w-full bg-emerald-800 text-[14px] font-semibold hover:bg-emerald-900"
              disabled={saving || totals.items === 0}
              onClick={submit}
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 me-2 animate-spin" />
                  Receiving…
                </>
              ) : (
                <>
                  <ShoppingBag className="size-4 me-2" />
                  Receive into stock
                </>
              )}
            </Button>
            <p className="mt-2 text-center text-[11px] text-slate-500">
              Creates &amp; posts purchase · ready for POS
            </p>
          </div>
        </aside>
      </div>
    </Container>
  );
}
