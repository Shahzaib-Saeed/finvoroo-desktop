import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Boxes,
  Calculator,
  ClipboardList,
  FileBarChart2,
  Layers,
  PieChart,
  Receipt,
  Store,
} from 'lucide-react';
import { Container } from '@/components/common/container';
import { cn } from '@/lib/utils';

const GROUP_META = {
  sales: {
    label: 'Sales',
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    icon: 'bg-slate-100 text-slate-500 group-hover:bg-emerald-600 group-hover:text-white',
  },
  stock: {
    label: 'Stock',
    badge: 'bg-sky-50 text-sky-700 ring-sky-100',
    icon: 'bg-slate-100 text-slate-500 group-hover:bg-sky-600 group-hover:text-white',
  },
  purchases: {
    label: 'Purchases',
    badge: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
    icon: 'bg-slate-100 text-slate-500 group-hover:bg-indigo-600 group-hover:text-white',
  },
  accounting: {
    label: 'Accounting',
    badge: 'bg-violet-50 text-violet-700 ring-violet-100',
    icon: 'bg-slate-100 text-slate-500 group-hover:bg-violet-600 group-hover:text-white',
  },
};

const REPORTS = [
  {
    title: 'Item-wise POS sales',
    description: 'Qty, rate, discount, and profit per item.',
    path: '/pharmacy/reports/item-sales',
    group: 'sales',
    icon: BarChart3,
  },
  {
    title: 'Dispense / shifts',
    description: 'Counter sales and open shifts.',
    path: '/pharmacy/pos',
    group: 'sales',
    icon: Store,
  },
  {
    title: 'Stock valuation',
    description: 'On-hand value at purchase, average, and sale price.',
    path: '/pharmacy/reports/stock-valuation',
    group: 'stock',
    icon: Layers,
  },
  {
    title: 'Manufacturer-wise expiry',
    description: 'Expiry grouped by manufacturer.',
    path: '/pharmacy/reports/manufacturer-expiry',
    group: 'stock',
    icon: ClipboardList,
  },
  {
    title: 'Near expiry / expired',
    description: 'Batch balances by expiry window.',
    path: '/pharmacy/batch-expiry',
    group: 'stock',
    icon: AlertTriangle,
  },
  {
    title: 'Stock on hand (batch)',
    description: 'Medicine × batch × warehouse matrix.',
    path: '/pharmacy/batch-expiry',
    group: 'stock',
    icon: Boxes,
  },
  {
    title: 'Purchase register',
    description: 'Posted supplier invoices.',
    path: '/accounting/bills',
    group: 'purchases',
    icon: Receipt,
  },
  {
    title: 'Category sales & purchases',
    description: 'Purchase, sale, and net profit by category.',
    path: '/accounting/reports/category-trading',
    group: 'purchases',
    icon: PieChart,
  },
  {
    title: 'Accounting reports',
    description: 'P&L, balance sheet, tax, and custom builder.',
    path: '/accounting/reports',
    group: 'accounting',
    icon: Calculator,
  },
];

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'sales', label: 'Sales' },
  { id: 'stock', label: 'Stock' },
  { id: 'purchases', label: 'Purchases' },
  { id: 'accounting', label: 'Accounting' },
];

function ReportCard({ report, href }) {
  const meta = GROUP_META[report.group];
  const Icon = report.icon;

  return (
    <Link
      to={href}
      className={cn(
        'group flex h-full flex-col rounded-lg border border-slate-200/90 bg-white p-4 no-underline',
        'shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-200',
        'hover:-translate-y-0.5 hover:border-emerald-500/70 hover:shadow-[0_6px_18px_rgba(15,23,42,0.07)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-md transition-colors duration-200',
            meta.icon,
          )}
        >
          <Icon className="size-4" strokeWidth={2} />
        </div>

        <span
          className={cn(
            'shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ring-1 ring-inset',
            meta.badge,
          )}
        >
          {meta.label}
        </span>
      </div>

      <h3 className="mt-3 text-sm font-semibold leading-snug text-slate-900 group-hover:text-emerald-950">
        {report.title}
      </h3>

      <p className="mt-1 flex-1 text-xs leading-relaxed text-slate-500">
        {report.description}
      </p>

      <div className="mt-3 flex items-center justify-end gap-1 text-xs font-medium text-slate-400 transition-colors group-hover:text-emerald-600">
        Open Report
        <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

export function MedicineReportsPage() {
  const { id: companyId } = useParams();
  const [group, setGroup] = useState('all');

  const p = (path) => `/workspace/${companyId}${path}`;

  const filtered = useMemo(() => {
    if (group === 'all') return REPORTS;
    return REPORTS.filter((r) => r.group === group);
  }, [group]);

  return (
    <Container className="pb-10">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Pharmacy Reports
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {filtered.length} active {filtered.length === 1 ? 'report' : 'reports'} available
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Filter reports by category"
            className="inline-flex flex-wrap items-center gap-1 rounded-full border border-slate-200 bg-slate-50/80 p-1"
          >
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={group === f.id}
                onClick={() => setGroup(f.id)}
                className={cn(
                  'rounded-full px-4 py-1.5 text-[13px] font-semibold transition-all duration-150',
                  group === f.id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-20">
            <FileBarChart2 className="mb-3 size-9 text-slate-300" />
            <p className="text-sm font-semibold text-slate-900">No reports in this category</p>
            <p className="mt-1 text-sm text-slate-500">Try selecting a different filter.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((report) => (
              <ReportCard key={report.title} report={report} href={p(report.path)} />
            ))}
          </div>
        )}
      </div>
    </Container>
  );
}
