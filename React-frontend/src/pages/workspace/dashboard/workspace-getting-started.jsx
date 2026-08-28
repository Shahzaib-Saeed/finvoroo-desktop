import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = (companyId) => `erp:getting-started:${companyId}`;

function toCount(...values) {
  return values.reduce((max, value) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return max;
    return Math.max(max, n);
  }, 0);
}

function hasList(value) {
  return Array.isArray(value) && value.length > 0;
}

/** True when the company already has masters or posted operational activity. */
export function companyHasStartedBooks(overview, dash) {
  const kpi = overview?.kpi || {};
  const stats = dash?.stats || {};

  if (
    toCount(
      kpi.invoice_count,
      kpi.open_invoice_count,
      stats.invoice_count,
      stats.open_invoice_count,
      stats.overdue_count,
      kpi.unpaid_bill_count,
      stats.bill_count,
      kpi.customer_count,
      stats.customer_count,
      kpi.vendor_count,
      stats.vendor_count,
      kpi.product_count,
      stats.product_count,
    )
  ) {
    return true;
  }

  if (
    hasList(dash?.recent_invoices) ||
    hasList(dash?.recent_bills) ||
    hasList(dash?.recent_payments) ||
    hasList(overview?.recent_transactions) ||
    hasList(overview?.overdue_invoices) ||
    hasList(overview?.unpaid_bills)
  ) {
    return true;
  }

  return (
    toCount(
      kpi.balance_due,
      stats.balance_due,
      stats.total_invoiced,
      stats.total_paid,
      stats.payment_total,
      kpi.bills_balance_due,
      stats.bills_balance_due,
      kpi.revenue_this_month,
      kpi.expenses_this_month,
    ) > 0
  );
}

export function WorkspaceGettingStarted({
  companyId,
  overview,
  dash,
  loading = false,
}) {
  const [hidden, setHidden] = useState(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEY(companyId)) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      setHidden(window.localStorage.getItem(STORAGE_KEY(companyId)) === '1');
    } catch {
      setHidden(false);
    }
  }, [companyId]);

  const alreadySetUp = companyHasStartedBooks(overview, dash);

  useEffect(() => {
    if (!companyId || !alreadySetUp) return;
    try {
      window.localStorage.setItem(STORAGE_KEY(companyId), '1');
    } catch {
      /* ignore */
    }
    setHidden(true);
  }, [alreadySetUp, companyId]);

  const items = useMemo(() => {
    const base = `/workspace/${companyId}`;
    return [
      { label: 'Add a customer', to: `${base}/accounting/customers` },
      { label: 'Add a product', to: `${base}/accounting/products` },
      { label: 'Create an invoice', to: `${base}/accounting/invoices/create` },
    ];
  }, [companyId]);

  if (!companyId || hidden || loading || alreadySetUp) return null;

  function dismiss() {
    try {
      window.localStorage.setItem(STORAGE_KEY(companyId), '1');
    } catch {
      /* ignore */
    }
    setHidden(true);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Set up this company</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Your books are empty by design. Add masters first, then start invoicing.
          </p>
        </div>
        <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0" onClick={dismiss}>
          <X className="size-4" />
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => (
          <Button key={item.to} asChild size="sm" variant="outline">
            <Link to={item.to}>{item.label}</Link>
          </Button>
        ))}
      </div>
    </div>
  );
}
