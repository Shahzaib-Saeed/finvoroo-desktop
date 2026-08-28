import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarClock,
  Keyboard,
  PackageMinus,
  Pill,
  RotateCcw,
  ScanLine,
  ShoppingCart,
} from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import { Container } from '@/components/common/container';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/currency';
import { pharmacyApi } from '../api/pharmacy.api';
import { prefetchMedicineCatalog } from '../lib/medicine-catalog-cache';
import {
  pharmacyDispensePath,
  pharmacyLoosePurchasePath,
  pharmacyLooseSaleReturnPath,
  pharmacyPurchasePath,
} from '../paths';

const EMPTY = {
  currency: 'PKR',
  today: {
    sales_total: 0,
    sales_count: 0,
    sales_paid: 0,
    sales_unpaid: 0,
    purchase_total: 0,
    purchase_count: 0,
    returns_total: 0,
    returns_count: 0,
  },
  month: { sales_total: 0, sales_count: 0, purchase_total: 0, purchase_count: 0 },
  shift: { open: false, opened_at: null, opening_cash: null },
  catalog: { medicines: 0 },
  alerts: {
    near_expiry: { count: 0, items: [] },
    expired: { count: 0, items: [] },
    low_stock: { count: 0, items: [] },
  },
  recent_sales: [],
  recent_purchases: [],
  top_sold_today: [],
};

function money(value, currency) {
  return formatMoney(value, currency);
}

function timeLabel(raw) {
  if (!raw) return '';
  const d = parseISO(String(raw).replace(' ', 'T'));
  if (!isValid(d)) return '';
  return format(d, 'HH:mm');
}

function dateLabel(raw) {
  if (!raw) return '';
  const d = parseISO(String(raw).slice(0, 10));
  if (!isValid(d)) return String(raw);
  return format(d, 'dd/MM');
}

function Kpi({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
      <p className="text-[12px] font-medium text-slate-600">{label}</p>
      <p className="mt-1 text-[22px] font-semibold tabular-nums tracking-tight text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-[12px] font-medium text-slate-600">{hint}</p> : null}
    </div>
  );
}

function Panel({ title, href, hrefLabel = 'View all', children }) {
  return (
    <section className="flex min-h-[240px] flex-col rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
        <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>
        {href ? (
          <Link to={href} className="text-[13px] font-semibold text-emerald-800 hover:underline">
            {hrefLabel}
          </Link>
        ) : null}
      </div>
      <div className="flex-1 px-5 py-2">{children}</div>
    </section>
  );
}

function EmptyRow({ children }) {
  return <p className="py-8 text-center text-[13px] text-slate-600">{children}</p>;
}

function AlertCard({ title, count, href, icon: Icon, tone = 'default', empty, items }) {
  const warn = tone === 'warn' && count > 0;
  const danger = tone === 'danger' && count > 0;

  return (
    <section
      className={cn(
        'flex min-h-[200px] flex-col rounded-xl border bg-white',
        danger ? 'border-red-300' : warn ? 'border-amber-300' : 'border-slate-200',
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              'flex size-9 items-center justify-center rounded-lg',
              danger
                ? 'bg-red-50 text-red-700'
                : warn
                  ? 'bg-amber-50 text-amber-800'
                  : 'bg-slate-100 text-slate-700',
            )}
          >
            <Icon className="size-4" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>
            <p className="text-[12px] font-medium text-slate-600">
              {count} medicine{count === 1 ? '' : 's'}
            </p>
          </div>
        </div>
        <Link to={href} className="text-[13px] font-semibold text-emerald-800 hover:underline">
          View
        </Link>
      </div>
      <div className="flex-1 px-5 py-3">
        {items.length === 0 ? (
          <p className="py-5 text-[13px] text-slate-600">{empty}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((row, i) => (
              <li key={`${row.name}-${i}`} className="flex items-baseline justify-between gap-3 py-2">
                <span className="min-w-0 truncate text-[13px] font-medium text-slate-900">{row.name}</span>
                <span className="shrink-0 text-[12px] tabular-nums text-slate-600">{row.meta}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export function PharmacyDashboardPage() {
  const { id: companyId } = useParams();
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    prefetchMedicineCatalog();
    let cancelled = false;
    pharmacyApi
      .dashboard()
      .then((res) => {
        if (cancelled) return;
        const payload = res?.data?.data;
        if (payload && typeof payload === 'object') {
          setData({ ...EMPTY, ...payload });
        }
      })
      .catch(() => {
        if (!cancelled) setData(EMPTY);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const base = `/workspace/${companyId}`;
  const currency = data.currency || 'PKR';
  const today = data.today || EMPTY.today;
  const month = data.month || EMPTY.month;
  const alerts = data.alerts || EMPTY.alerts;
  const sales = data.recent_sales || [];
  const purchases = data.recent_purchases || [];
  const topSold = data.top_sold_today || [];

  return (
    <Container className="space-y-6 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">Pharmacy</h1>
          <p className="mt-1 text-[13px] font-medium text-slate-600">
            {format(new Date(), 'EEEE d MMMM yyyy')}
            {data.shift?.open ? ' · Counter shift is open' : ' · Counter shift is closed'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={pharmacyDispensePath(companyId)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-800 px-3 text-[13px] font-semibold text-white hover:bg-emerald-900"
          >
            <Keyboard className="size-3.5" />
            Counter sale
          </Link>
          <Link
            to={pharmacyPurchasePath(companyId)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-800 hover:border-emerald-400"
          >
            <ShoppingCart className="size-3.5" />
            New purchase
          </Link>
          <Link
            to={`${base}/pharmacy/purchase-entry`}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-800 hover:border-emerald-400"
          >
            <ScanLine className="size-3.5" />
            Scan bill
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi
          label="Sales today"
          value={loading ? '…' : money(today.sales_total, currency)}
          hint={`${today.sales_count} bill${today.sales_count === 1 ? '' : 's'}`}
        />
        <Kpi
          label="Collected today"
          value={loading ? '…' : money(today.sales_paid, currency)}
          hint={
            today.sales_unpaid > 0
              ? `${money(today.sales_unpaid, currency)} still unpaid`
              : 'All paid'
          }
        />
        <Kpi
          label="Purchases today"
          value={loading ? '…' : money(today.purchase_total, currency)}
          hint={`${today.purchase_count} bill${today.purchase_count === 1 ? '' : 's'}`}
        />
        <Kpi
          label="This month"
          value={loading ? '…' : money(month.sales_total, currency)}
          hint={`${month.sales_count} sales · ${data.catalog?.medicines || 0} medicines`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Latest sales" href={pharmacyDispensePath(companyId)} hrefLabel="Counter">
          {sales.length === 0 ? (
            <EmptyRow>No counter sales yet today.</EmptyRow>
          ) : (
            <ul className="divide-y divide-slate-100">
              {sales.map((row) => (
                <li key={row.id} className="flex items-baseline justify-between gap-3 py-2">
                  <span className="min-w-0 truncate text-[13px] font-medium text-slate-900">
                    <span className="tabular-nums text-slate-500">{timeLabel(row.at)} </span>
                    {row.number || row.customer}
                  </span>
                  <span className="shrink-0 text-[13px] font-semibold tabular-nums text-slate-900">
                    {money(row.total, currency)}
                    {row.unpaid > 0 ? (
                      <span className="ms-1 font-medium text-amber-800">unpaid</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Latest purchases" href={pharmacyPurchasePath(companyId)} hrefLabel="Purchase">
          {purchases.length === 0 ? (
            <EmptyRow>No posted purchases yet.</EmptyRow>
          ) : (
            <ul className="divide-y divide-slate-100">
              {purchases.map((row) => (
                <li key={row.id} className="flex items-baseline justify-between gap-3 py-2">
                  <span className="min-w-0 truncate text-[13px] font-medium text-slate-900">
                    <span className="tabular-nums text-slate-500">{dateLabel(row.date)} </span>
                    {row.vendor}
                  </span>
                  <span className="shrink-0 text-[13px] font-semibold tabular-nums text-slate-900">
                    {money(row.total, currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Sold today" href={`${base}/pharmacy/reports`} hrefLabel="Reports">
          {topSold.length === 0 ? (
            <EmptyRow>No medicines sold yet today.</EmptyRow>
          ) : (
            <ul className="divide-y divide-slate-100">
              {topSold.map((row, i) => (
                <li key={`${row.name}-${i}`} className="flex items-baseline justify-between gap-3 py-2">
                  <span className="min-w-0 truncate text-[13px] font-medium text-slate-900">{row.name}</span>
                  <span className="shrink-0 text-[12px] tabular-nums text-slate-600">
                    {row.qty} · {money(row.total, currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <AlertCard
          title="Expiring soon"
          count={alerts.near_expiry?.count || 0}
          href={`${base}/pharmacy/batch-expiry`}
          icon={CalendarClock}
          tone="warn"
          empty="Nothing expiring in the next 90 days."
          items={alerts.near_expiry?.items || []}
        />
        <AlertCard
          title="Expired on shelf"
          count={alerts.expired?.count || 0}
          href={`${base}/pharmacy/batch-expiry`}
          icon={AlertTriangle}
          tone="danger"
          empty="No expired stock on hand."
          items={alerts.expired?.items || []}
        />
        <AlertCard
          title="Low stock"
          count={alerts.low_stock?.count || 0}
          href={`${base}/pharmacy/medicines`}
          icon={PackageMinus}
          empty="No medicines below reorder level."
          items={alerts.low_stock?.items || []}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          to={pharmacyLoosePurchasePath(companyId)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-medium text-slate-800 hover:border-emerald-400"
        >
          <ShoppingCart className="size-4 text-emerald-800" />
          Open purchase
        </Link>
        <Link
          to={pharmacyLooseSaleReturnPath(companyId)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-medium text-slate-800 hover:border-emerald-400"
        >
          <RotateCcw className="size-4 text-emerald-800" />
          Sale return
        </Link>
        <Link
          to={`${base}/pharmacy/medicines`}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-medium text-slate-800 hover:border-emerald-400"
        >
          <Pill className="size-4 text-emerald-800" />
          Medicines
        </Link>
      </div>
    </Container>
  );
}
