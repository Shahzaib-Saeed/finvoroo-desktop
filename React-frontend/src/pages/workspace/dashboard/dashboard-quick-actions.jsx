import { Link } from "react-router-dom";
import {
  Building2,
  CreditCard,
  FileText,
  Package,
  Receipt,
  UserPlus,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CREATE_ACTIONS = [
  {
    label: "Invoice",
    icon: FileText,
    path: "accounting/invoices/create",
    tone: "text-blue-600 bg-blue-50 dark:bg-blue-500/15 dark:text-blue-400",
  },
  {
    label: "Bill",
    icon: Receipt,
    path: "accounting/bills/create",
    tone: "text-orange-600 bg-orange-50 dark:bg-orange-500/15 dark:text-orange-400",
  },
  {
    label: "Payment",
    icon: CreditCard,
    path: "accounting/payments/create",
    tone: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/15 dark:text-emerald-400",
  },
  {
    label: "Quotation",
    icon: FileText,
    path: "accounting/quotations/create",
    tone: "text-cyan-600 bg-cyan-50 dark:bg-cyan-500/15 dark:text-cyan-400",
  },
  {
    label: "Customer",
    icon: UserPlus,
    path: "accounting/customers/create",
    tone: "text-violet-600 bg-violet-50 dark:bg-violet-500/15 dark:text-violet-400",
  },
  {
    label: "Vendor",
    icon: Building2,
    path: "accounting/vendors/create",
    tone: "text-amber-600 bg-amber-50 dark:bg-amber-500/15 dark:text-amber-400",
  },
  {
    label: "Expense",
    icon: Wallet,
    path: "accounting/expenses/create",
    tone: "text-rose-600 bg-rose-50 dark:bg-rose-500/15 dark:text-rose-400",
  },
  {
    label: "Product",
    icon: Package,
    path: "accounting/products/create",
    tone: "text-indigo-600 bg-indigo-50 dark:bg-indigo-500/15 dark:text-indigo-400",
  },
];

export function DashboardQuickActions({ companyId }) {
  const base = `/workspace/${companyId}`;

  return (
    <section className="rounded-xl border border-border/70 bg-card px-4 py-3 shadow-xs">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-tight">Create</h2>
        <p className="text-xs text-muted-foreground">Open a new document</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
        {CREATE_ACTIONS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={`${base}/${item.path}`}
              className={cn(
                "flex items-center gap-2.5 rounded-lg border border-transparent px-2.5 py-2",
                "text-[13px] font-medium text-foreground",
                "hover:border-border hover:bg-muted/50",
              )}
            >
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-md",
                  item.tone,
                )}
              >
                <Icon className="size-3.5" strokeWidth={2.25} />
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
