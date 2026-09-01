import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  Building2,
  CreditCard,
  FileText,
  Receipt,
  UserPlus,
  Wallet,
} from 'lucide-react';
import { toAbsoluteUrl } from '@/lib/helpers';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { resolveUiPack } from '@/industries';
import { pharmacyExpensesPath } from '@/industries/pharmacy/paths';
import { useAuthStore } from '@/store/authStore';

const QUICK_LINKS = [
  { label: 'New invoice', icon: FileText, path: 'accounting/invoices/create', tone: 'text-blue-600 bg-blue-500/10' },
  { label: 'New bill', icon: Receipt, path: 'accounting/bills/create', tone: 'text-orange-600 bg-orange-500/10' },
  { label: 'Record payment', icon: CreditCard, path: 'accounting/payments/create', tone: 'text-emerald-600 bg-emerald-500/10' },
  { label: 'New customer', icon: UserPlus, path: 'accounting/customers/create', tone: 'text-violet-600 bg-violet-500/10' },
  { label: 'New vendor', icon: Building2, path: 'accounting/vendors/create', tone: 'text-amber-600 bg-amber-500/10' },
  { label: 'New expense', icon: Wallet, path: 'accounting/expenses/create', pharmacyPath: true, tone: 'text-pink-600 bg-pink-500/10' },
  { label: 'All invoices', icon: FileText, path: 'accounting/invoices', tone: 'text-sky-600 bg-sky-500/10' },
  { label: 'Reports', icon: BarChart3, path: 'accounting/reports', tone: 'text-rose-600 bg-rose-500/10' },
];

export function HomeQuickSetup({ companyId }) {
  const base = `/workspace/${companyId}`;
  const activeCompany = useAuthStore((s) => s.activeCompany);
  const isPharmacy = resolveUiPack(activeCompany) === 'pharmacy';

  return (
    <Card className="h-full">
      <CardContent className="flex flex-col place-content-center gap-5 py-7.5 lg:py-10">
        <div className="flex justify-center">
          <Fragment>
            <img
              src={toAbsoluteUrl('/media/illustrations/32.svg')}
              className="dark:hidden max-h-[140px]"
              alt=""
            />
            <img
              src={toAbsoluteUrl('/media/illustrations/32-dark.svg')}
              className="light:hidden max-h-[140px]"
              alt=""
            />
          </Fragment>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 text-center">
            <h2 className="text-xl font-semibold text-mono">Quick setup for your workspace</h2>
            <p className="text-sm font-medium text-secondary-foreground max-w-lg mx-auto">
              Jump straight into invoicing, payments, and daily accounting — everything you need on one screen.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-2xl mx-auto w-full">
            {QUICK_LINKS.map((item) => {
              const Icon = item.icon;
              const to =
                item.pharmacyPath && isPharmacy
                  ? pharmacyExpensesPath(companyId, { create: true })
                  : `${base}/${item.path}`;
              return (
                <Link
                  key={item.path}
                  to={to}
                  className="group flex flex-col items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-2 py-3 text-center transition-colors hover:bg-background hover:border-primary/30 hover:shadow-sm"
                >
                  <span className={cn('flex size-9 items-center justify-center rounded-lg', item.tone)}>
                    <Icon className="size-4" />
                  </span>
                  <span className="text-xs font-medium text-foreground leading-tight">{item.label}</span>
                </Link>
              );
            })}
          </div>
          <div className="flex justify-center pt-1">
            <Button variant="primary" asChild>
              <Link to={`${base}/accounting/invoices/create`}>Create invoice</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
