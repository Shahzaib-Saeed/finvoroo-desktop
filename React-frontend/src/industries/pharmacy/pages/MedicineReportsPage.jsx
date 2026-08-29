import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  BarChart3,
  Boxes,
  Calculator,
  CalendarClock,
  ChevronRight,
  FileBarChart2,
  Layers,
  Receipt,
  Search,
  Store,
  X,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { PharmacyKbd } from '../components/PharmacyKbd';

const GROUP_META = {
  sales: { label: 'Sales', chip: 'bg-emerald-50 text-emerald-800 ring-emerald-200/80' },
  stock: { label: 'Stock', chip: 'bg-teal-50 text-teal-800 ring-teal-200/80' },
  purchases: { label: 'Purchases', chip: 'bg-green-50 text-green-800 ring-green-200/80' },
  accounting: { label: 'Accounting', chip: 'bg-slate-100 text-slate-700 ring-slate-200/80' },
};

const GROUP_ORDER = ['sales', 'stock', 'purchases', 'accounting'];

const REPORTS = [
  {
    title: 'Item-wise POS sales',
    description: 'Qty, rate, discount, and profit per item',
    path: '/pharmacy/reports/item-sales',
    group: 'sales',
    icon: BarChart3,
  },
  {
    title: 'Dispense / shifts',
    description: 'Counter sales and open shifts',
    path: '/pharmacy/pos',
    group: 'sales',
    icon: Store,
  },
  {
    title: 'Stock valuation',
    description: 'On-hand value at purchase, average, and sale price',
    path: '/pharmacy/reports/stock-valuation',
    group: 'stock',
    icon: Layers,
  },
  {
    title: 'Manufacturer-wise expiry',
    description: 'Expiry grouped by manufacturer',
    path: '/pharmacy/reports/manufacturer-expiry',
    group: 'stock',
    icon: CalendarClock,
  },
  {
    title: 'Near expiry / expired',
    description: 'Batch balances by expiry window',
    path: '/pharmacy/batch-expiry',
    group: 'stock',
    icon: CalendarClock,
  },
  {
    title: 'Stock on hand (batch)',
    description: 'Medicine × batch × warehouse',
    path: '/pharmacy/batch-expiry',
    group: 'stock',
    icon: Boxes,
  },
  {
    title: 'Purchase register',
    description: 'Posted supplier invoices',
    path: '/accounting/bills',
    group: 'purchases',
    icon: Receipt,
  },
  {
    title: 'Category sales & purchases',
    description: 'Purchase, sale, and net profit by category',
    path: '/accounting/reports/category-trading',
    group: 'purchases',
    icon: BarChart3,
  },
  {
    title: 'Accounting reports',
    description: 'P&L, balance sheet, tax, and custom builder',
    path: '/accounting/reports',
    group: 'accounting',
    icon: FileBarChart2,
  },
];

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'sales', label: 'Sales' },
  { id: 'stock', label: 'Stock' },
  { id: 'purchases', label: 'Purchases' },
  { id: 'accounting', label: 'Accounting' },
];

function ReportCard({ report, href, focused, cardRef, onFocus, onKeyDown }) {
  const meta = GROUP_META[report.group];
  const Icon = report.icon;

  return (
    <Link
      ref={cardRef}
      to={href}
      tabIndex={focused ? 0 : -1}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      className={cn(
        'group flex items-center gap-3 border-b border-slate-200 px-4 py-2.5 transition-colors last:border-b-0',
        'hover:bg-emerald-50/50 focus-visible:bg-emerald-50/60 focus-visible:outline-none',
        focused && 'bg-emerald-50/70 shadow-[inset_3px_0_0_0_#059669]',
      )}
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
        <Icon className="size-4" strokeWidth={2} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-slate-900 group-hover:text-emerald-950">
          {report.title}
        </p>
        <p className="truncate text-[12px] text-slate-500">{report.description}</p>
      </div>

      <span
        className={cn(
          'hidden shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ring-1 ring-inset sm:inline-flex',
          meta.chip,
        )}
      >
        {meta.label}
      </span>

      <ChevronRight className="size-4 shrink-0 text-slate-300 group-hover:text-emerald-600" />
    </Link>
  );
}

function ReportGrid({ reports, p, focusIndex, setFocusIndex, rowRefs, onRowKeyDown }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      {reports.map((report, i) => (
        <ReportCard
          key={report.title}
          report={report}
          href={p(report.path)}
          focused={focusIndex === i}
          cardRef={(el) => {
            rowRefs.current[i] = el;
          }}
          onFocus={() => setFocusIndex(i)}
          onKeyDown={onRowKeyDown}
        />
      ))}
    </div>
  );
}

export function MedicineReportsPage() {
  const { id: companyId } = useParams();
  const [group, setGroup] = useState('all');
  const [q, setQ] = useState('');
  const [focusIndex, setFocusIndex] = useState(0);
  const rowRefs = useRef([]);
  const p = (path) => `/workspace/${companyId}${path}`;

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return REPORTS.filter((r) => {
      if (group !== 'all' && r.group !== group) return false;
      if (!term) return true;
      return `${r.title} ${r.description} ${r.group}`.toLowerCase().includes(term);
    });
  }, [group, q]);

  const groupedSections = useMemo(() => {
    if (group !== 'all' || q.trim()) return null;
    return GROUP_ORDER.map((g) => ({
      group: g,
      reports: filtered.filter((r) => r.group === g),
    })).filter((s) => s.reports.length > 0);
  }, [filtered, group, q]);

  const flatList = groupedSections ? groupedSections.flatMap((s) => s.reports) : filtered;

  const indexByTitle = useMemo(() => {
    const map = new Map();
    flatList.forEach((report, i) => map.set(report.title, i));
    return map;
  }, [flatList]);

  useEffect(() => {
    setFocusIndex(0);
  }, [group, q]);

  useEffect(() => {
    rowRefs.current[focusIndex]?.focus?.({ preventScroll: true });
  }, [focusIndex]);

  const onRowKeyDown = useCallback(
    (e) => {
      const max = flatList.length - 1;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusIndex((i) => Math.min(max, i + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusIndex((i) => Math.max(0, i - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setFocusIndex((i) => Math.min(max, i + 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setFocusIndex((i) => Math.max(0, i - 1));
      }
    },
    [flatList.length],
  );

  return (
    <div className="flex min-h-full flex-col">
      {/* Toolbar — full width, one row */}
      <div className="shrink-0 border-b border-slate-200 bg-white px-6 py-3 lg:px-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 border-s-[3px] border-emerald-600 ps-3">
            <h1 className="text-lg font-semibold tracking-tight text-slate-900">Pharmacy reports</h1>
            <p className="text-xs text-slate-500">
              {filtered.length} reports · P&amp;L and ledger under Accounting
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search reports…"
                className="h-9 w-full rounded-md border-slate-200 ps-9 text-sm shadow-sm focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
                aria-label="Search reports"
              />
              {q ? (
                <button
                  type="button"
                  onClick={() => setQ('')}
                  className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100"
                  aria-label="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>

            <div
              role="tablist"
              className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1"
            >
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={group === f.id}
                  onClick={() => setGroup(f.id)}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors',
                    group === f.id
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-white hover:text-emerald-900',
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3 h-0.5 bg-gradient-to-r from-emerald-700 via-emerald-500 to-emerald-700" aria-hidden />
      </div>

      <div className="flex-1 bg-slate-50/80 px-6 py-4 lg:px-8">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white py-16">
            <FileBarChart2 className="mb-3 size-8 text-slate-300" />
            <p className="text-sm font-semibold text-slate-900">No reports match</p>
            <p className="mt-1 text-xs text-slate-500">Try another category or search.</p>
          </div>
        ) : groupedSections ? (
          <div className="space-y-4">
            {groupedSections.map((section) => {
              const meta = GROUP_META[section.group];
              return (
                <section
                  key={section.group}
                  className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
                >
                  <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2">
                    <h2 className="text-[11px] font-bold uppercase tracking-wide text-slate-600">
                      {meta.label}
                    </h2>
                    <span className="text-[10px] font-medium text-slate-400">{section.reports.length}</span>
                  </div>
                  <div role="list">
                    {section.reports.map((report) => {
                      const i = indexByTitle.get(report.title) ?? 0;
                      return (
                        <ReportCard
                          key={report.title}
                          report={report}
                          href={p(report.path)}
                          focused={focusIndex === i}
                          cardRef={(el) => {
                            rowRefs.current[i] = el;
                          }}
                          onFocus={() => setFocusIndex(i)}
                          onKeyDown={onRowKeyDown}
                        />
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <ReportGrid
            reports={filtered}
            p={p}
            focusIndex={focusIndex}
            setFocusIndex={setFocusIndex}
            rowRefs={rowRefs}
            onRowKeyDown={onRowKeyDown}
          />
        )}

        <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
            <PharmacyKbd>↑</PharmacyKbd>
            <PharmacyKbd>↓</PharmacyKbd>
            <PharmacyKbd>←</PharmacyKbd>
            <PharmacyKbd>→</PharmacyKbd>
            navigate · <PharmacyKbd>Enter</PharmacyKbd> open
          </p>
          <Link
            to={p('/accounting/reports')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-900"
          >
            <Calculator className="size-4" />
            Full accounting reports
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
