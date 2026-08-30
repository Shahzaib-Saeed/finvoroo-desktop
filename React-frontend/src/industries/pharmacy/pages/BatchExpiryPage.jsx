import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { addDays, format, parseISO } from 'date-fns';
import {
  Box,
  Loader2,
  Package,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Container } from '@/components/common/container';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { pharmacyApi } from '../api/pharmacy.api';
import {
  formatPackAndLooseQty,
  normalizeBaseQty,
  parsePackSize,
} from '../lib/pharmacy-pricing';

function unwrap(res) {
  return res?.data?.data ?? res?.data ?? null;
}

const POLICY_GUARDS = [
  { key: 'block_expired_sales', label: 'Block Expired' },
  { key: 'fefo_strict', label: 'Strict FEFO' },
  { key: 'warn_below_cost', label: 'Warn Below Cost' },
  { key: 'warn_above_mrp', label: 'Warn Above MRP' },
  { key: 'block_controlled_without_permission', label: 'Block Controlled' },
  { key: 'require_rx_note_for_rx', label: 'Require Rx Note' },
];

function daysUntilExpiry(expiryDate) {
  if (!expiryDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = parseISO(String(expiryDate).slice(0, 10));
  if (Number.isNaN(exp.getTime())) return null;
  return Math.round((exp.getTime() - today.getTime()) / 86400000);
}

function formatExpiryDate(expiryDate) {
  if (!expiryDate) return '—';
  try {
    return format(parseISO(String(expiryDate).slice(0, 10)), 'yyyy-MM-dd');
  } catch {
    return String(expiryDate).slice(0, 10);
  }
}

function riskMeta(row, mode) {
  const days = daysUntilExpiry(row.expiry_date);
  const isExpired =
    mode === 'expired' || (days != null && days < 0);

  if (isExpired) {
    return {
      label: days != null && days < 0 ? `Expired ${Math.abs(days)}d ago` : 'Expired',
      tone: 'expired',
    };
  }
  if (days === 0) {
    return { label: 'Expires Today', tone: 'critical' };
  }
  if (days === 1) {
    return { label: 'Expires Tomorrow', tone: 'critical' };
  }
  if (days != null && days <= 30) {
    return { label: 'Near Expiry', tone: 'near' };
  }
  return { label: 'Near Expiry', tone: 'near' };
}

function RiskBadge({ tone, label }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide',
        tone === 'expired' && 'bg-red-100 text-red-800 ring-1 ring-red-200',
        tone === 'critical' && 'bg-rose-100 text-rose-800 ring-1 ring-rose-200',
        tone === 'near' && 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
      )}
    >
      {label}
    </span>
  );
}

function PolicyGuardsPanel({ settings, saving, onToggle }) {
  if (!settings) return null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-emerald-700" strokeWidth={2.25} />
          <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600">
            Automated Dispensing Policy Guards
          </h2>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">
          Active enforcement
        </span>
      </div>
      <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 sm:px-5">
        {POLICY_GUARDS.map((policy) => {
          const checked = !!settings[policy.key];
          return (
            <label
              key={policy.key}
              className={cn(
                'flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-colors',
                checked
                  ? 'border-emerald-200 bg-emerald-50/60'
                  : 'border-slate-200 bg-slate-50/50 hover:border-slate-300',
                saving && 'pointer-events-none opacity-60',
              )}
            >
              <Checkbox
                checked={checked}
                disabled={saving}
                onCheckedChange={(value) => onToggle(policy.key, !!value)}
                className="border-slate-300 data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600"
              />
              <span className="text-[13px] font-medium leading-tight text-slate-800">
                {policy.label}
              </span>
            </label>
          );
        })}
      </div>
    </section>
  );
}

function ReportHorizonBar({
  mode,
  withinDays,
  loading,
  itemCount,
  cutoffDate,
  onModeChange,
  onWithinDaysChange,
  onRefresh,
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100 sm:px-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
              Report horizon
            </p>
            <Select value={mode} onValueChange={onModeChange}>
              <SelectTrigger className="h-9 w-[148px] border-slate-200 bg-white text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="near">Near Expiry</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {mode === 'near' ? (
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                Within days
              </p>
              <Input
                type="number"
                min={1}
                max={365}
                className="h-9 w-[88px] border-slate-200 tabular-nums"
                value={withinDays}
                onChange={(e) => onWithinDaysChange(Number(e.target.value) || 90)}
              />
            </div>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 border-slate-200 bg-white px-3 text-[13px] font-semibold shadow-sm"
            onClick={onRefresh}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 size-3.5" />
            )}
            Refresh
          </Button>
        </div>
        <p className="text-[13px] text-slate-600 lg:text-right">
          {mode === 'expired' ? (
            <>
              Showing <span className="font-semibold text-slate-900">{itemCount}</span> expired{' '}
              {itemCount === 1 ? 'batch' : 'batches'}
            </>
          ) : (
            <>
              Showing <span className="font-semibold text-slate-900">{itemCount}</span>{' '}
              {itemCount === 1 ? 'item' : 'items'} expiring before{' '}
              <span className="font-semibold text-red-700">{cutoffDate}</span>
            </>
          )}
        </p>
      </div>
    </section>
  );
}

function productDetailHref(companyId, productId, batchNumber) {
  if (!companyId || !productId) return null;
  const params = new URLSearchParams({ tab: 'purchases' });
  if (batchNumber) params.set('batch', String(batchNumber));
  return `/workspace/${companyId}/accounting/products/${productId}?${params.toString()}`;
}

function rowPackStock(row) {
  const packSize = parsePackSize({
    name: row.product_name,
    pack_size: row.pack_size,
    units_per_pack: row.units_per_pack,
    pharmacy: {
      pack_size: row.pack_size,
      units_per_pack: row.units_per_pack,
    },
  });
  const rawQty = row.quantity_on_hand ?? row.quantity ?? row.qty_on_hand ?? 0;
  const unitHint = row.dosage_form || row.sales_unit || row.product_name || '';
  const breakdown = formatPackAndLooseQty(rawQty, packSize, unitHint);

  const packLabel =
    packSize > 1 && breakdown.packs > 0
      ? `${breakdown.packs.toLocaleString('en-US')} ${breakdown.packs === 1 ? 'pack' : 'packs'}`
      : '';

  const stockLabel = `${breakdown.totalUnits.toLocaleString('en-US')} ${breakdown.unitLabel}`;

  return { packLabel, stockLabel };
}

function ProductNameCell({ row, companyId }) {
  const href = productDetailHref(companyId, row.product_id, row.batch_number);
  const name = row.product_name || row.name || '—';
  const sku = row.sku || row.product_sku || '—';

  if (!href) {
    return (
      <div>
        <p className="font-semibold leading-snug text-slate-900">{name}</p>
        <p className="mt-0.5 text-[11px] font-medium text-slate-500">{sku}</p>
      </div>
    );
  }

  return (
    <Link
      to={href}
      className="block rounded-md outline-none ring-emerald-500/30 focus-visible:ring-2 hover:opacity-90"
    >
      <p className="font-semibold leading-snug text-slate-900 hover:text-emerald-800">{name}</p>
      <p className="mt-0.5 text-[11px] font-medium text-slate-500">{sku}</p>
    </Link>
  );
}

function ExpiryAuditTable({ rows, mode, loading, companyId }) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <Package className="size-4 text-emerald-700" strokeWidth={2.25} />
          <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-700">
            {mode === 'expired' ? 'Expired Inventory Audit' : 'Near-Expiry Inventory Audit'}
          </h2>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
          Sorted by expiry date (FEFO)
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/90">
              <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                Product name &amp; SKU
              </th>
              <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                Batch no.
              </th>
              <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                Expiry date
              </th>
              <th className="w-[96px] px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                Pack
              </th>
              <th className="w-[108px] px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                Stock
              </th>
              <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                Risk level
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-14 text-center text-slate-500">
                  <Loader2 className="mr-2 inline size-4 animate-spin text-emerald-600" />
                  Loading audit…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-14 text-center text-slate-500">
                  No batches in this window.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const risk = riskMeta(row, mode);
                const { packLabel, stockLabel } = rowPackStock(row);
                return (
                  <tr
                    key={`${row.batch_id || row.id}-${row.warehouse_id || ''}`}
                    className="border-b border-slate-100 transition-colors hover:bg-slate-50/60"
                  >
                    <td className="px-4 py-3">
                      <ProductNameCell row={row} companyId={companyId} />
                    </td>
                    <td className="px-3 py-3 font-medium tabular-nums text-slate-800">
                      {row.batch_number || '—'}
                    </td>
                    <td className="px-3 py-3 font-bold tabular-nums text-red-700">
                      {formatExpiryDate(row.expiry_date)}
                    </td>
                    <td className="w-[96px] px-3 py-3 text-center align-middle">
                      {packLabel ? (
                        <span className="font-semibold tabular-nums text-slate-900">{packLabel}</span>
                      ) : null}
                    </td>
                    <td className="w-[108px] px-3 py-3 text-center align-middle font-bold tabular-nums text-slate-900">
                      {stockLabel}
                    </td>
                    <td className="px-3 py-3">
                      <RiskBadge tone={risk.tone} label={risk.label} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ExpiryAuditFooter({ totalUnits, batchCount }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">
        Total expiring stock on hand{' '}
        <span className="ms-1 text-[15px] font-bold tracking-normal text-red-700">
          {totalUnits.toLocaleString('en-US')} units
        </span>
      </p>
      <p className="text-[12px] font-semibold text-slate-600">
        {batchCount.toLocaleString('en-US')} {batchCount === 1 ? 'batch' : 'batches'} at risk
      </p>
    </div>
  );
}

export function BatchExpiryPage() {
  const { id: companyId } = useParams();
  const [mode, setMode] = useState('near');
  const [withinDays, setWithinDays] = useState(90);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const cutoffDate = useMemo(
    () => format(addDays(new Date(), withinDays), 'dd MMM yyyy'),
    [withinDays],
  );

  const totals = useMemo(() => {
    const totalUnits = rows.reduce((sum, row) => {
      const qty = normalizeBaseQty(
        row.quantity_on_hand ?? row.quantity ?? row.qty_on_hand ?? 0,
      );
      return sum + qty;
    }, 0);
    return { totalUnits, batchCount: rows.length };
  }, [rows]);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const data = unwrap(
        await pharmacyApi.expiryReport({ mode, within_days: withinDays }),
      );
      setRows(data?.rows || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not load expiry report');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [mode, withinDays]);

  const loadSettings = useCallback(async () => {
    try {
      const data = unwrap(await pharmacyApi.settings());
      setSettings(data?.settings || data || null);
    } catch {
      /* optional */
    }
  }, []);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveSetting = async (key, value) => {
    setSavingSettings(true);
    try {
      const data = unwrap(await pharmacyApi.updateSettings({ [key]: value }));
      setSettings(data?.settings || data);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not save settings');
      await loadSettings();
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <Container className="max-w-[1200px] space-y-4 py-5 sm:space-y-5 sm:py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100">
              <Box className="size-4" strokeWidth={2.25} />
            </span>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">
                Batch &amp; Expiry
              </h1>
              <p className="mt-0.5 text-[13px] text-slate-500">
                Near-expiry audit with dispensing policy guards
              </p>
            </div>
          </div>
        </div>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-9 border-slate-200 bg-white shadow-sm"
        >
          <Link to={`/workspace/${companyId}/accounting/products`}>Medicines</Link>
        </Button>
      </div>

      <PolicyGuardsPanel
        settings={settings}
        saving={savingSettings}
        onToggle={saveSetting}
      />

      <ReportHorizonBar
        mode={mode}
        withinDays={withinDays}
        loading={loading}
        itemCount={rows.length}
        cutoffDate={cutoffDate}
        onModeChange={setMode}
        onWithinDaysChange={setWithinDays}
        onRefresh={loadReport}
      />

      <ExpiryAuditTable
        rows={rows}
        mode={mode}
        loading={loading}
        companyId={companyId}
      />

      {!loading && rows.length > 0 ? (
        <ExpiryAuditFooter
          totalUnits={totals.totalUnits}
          batchCount={totals.batchCount}
        />
      ) : null}
    </Container>
  );
}
