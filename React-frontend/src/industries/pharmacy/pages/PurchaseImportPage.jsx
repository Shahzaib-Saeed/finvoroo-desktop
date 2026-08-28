import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ClipboardPaste, Keyboard, ScanLine } from 'lucide-react';
import { cn } from '@/lib/utils';

const OPTIONS = [
  {
    key: 'type',
    icon: Keyboard,
    title: 'New purchase',
    body: 'Search medicines and type qty, batch, expiry and cost. Use this for the daily supplier delivery.',
    href: (id) => `/workspace/${id}/pharmacy/receive`,
  },
  {
    key: 'paste',
    icon: ClipboardPaste,
    title: 'Paste Excel / CSV',
    body: 'Copy rows from a spreadsheet. Columns: name or SKU, qty, batch, expiry, cost, MRP.',
    href: (id) => `/workspace/${id}/pharmacy/receive?paste=1`,
  },
  {
    key: 'scan',
    icon: ScanLine,
    title: 'Scan supplier bill',
    body: 'Photograph the paper bill. Lines are read for you to check, then you post as a purchase.',
    href: (id) => `/workspace/${id}/pharmacy/purchase-entry`,
  },
];

export function PurchaseImportPage() {
  const { id: companyId } = useParams();

  return (
    <div className="mx-auto w-full max-w-6xl py-2">
      <div className="mb-6 flex items-start gap-3">
        <Link
          to={`/workspace/${companyId}/pharmacy`}
          className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          aria-label="Back to Pharmacy"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-slate-900">Import purchase</h1>
          <p className="mt-1 text-[13px] text-slate-500">
            How did the supplier bill arrive? All three end as the same posted purchase and stock.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          return (
            <Link
              key={opt.key}
              to={opt.href(companyId)}
              className={cn(
                'group flex flex-col rounded-xl border border-slate-200 bg-white p-5',
                'hover:border-emerald-400 hover:bg-emerald-50/40',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40',
              )}
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-800 text-white">
                <Icon className="size-5" />
              </div>
              <h2 className="mt-4 text-[16px] font-semibold text-slate-900">{opt.title}</h2>
              <p className="mt-2 flex-1 text-[13px] leading-relaxed text-slate-600">{opt.body}</p>
              <span className="mt-5 inline-flex items-center gap-1 text-[13px] font-semibold text-emerald-800">
                Continue
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
