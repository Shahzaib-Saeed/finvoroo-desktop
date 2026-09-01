import { Link } from "react-router-dom";
import {
  Building2,
  CreditCard,
  FileText,
  FilePlus2,
  Package,
  Receipt,
  UserPlus,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveUiPack } from "@/industries";
import { pharmacyExpensesPath } from "@/industries/pharmacy/paths";
import { useAuthStore } from "@/store/authStore";

const ICON_CHIP =
  "flex size-7 shrink-0 items-center justify-center rounded-md border border-slate-200/80 bg-slate-50 text-slate-600 ring-1 ring-slate-200/60 transition-colors group-hover:border-primary/20 group-hover:bg-primary/5 group-hover:text-primary";

const CREATE_ACTIONS = [
  { label: "Invoice", icon: FileText, path: "accounting/invoices/create" },
  { label: "Payment", icon: CreditCard, path: "accounting/payments/create" },
  { label: "Quotation", icon: FilePlus2, path: "accounting/quotations/create" },
  { label: "Customer", icon: UserPlus, path: "accounting/customers/create" },
  { label: "Bill", icon: Receipt, path: "accounting/bills/create", dividerBefore: true },
  { label: "Expense", icon: Wallet, path: "accounting/expenses/create", pharmacyPath: true },
  { label: "Vendor", icon: Building2, path: "accounting/vendors/create" },
  { label: "Product", icon: Package, path: "accounting/products/create" },
];

export function DashboardQuickActions({ companyId }) {
  const base = `/workspace/${companyId}`;
  const activeCompany = useAuthStore((s) => s.activeCompany);
  const isPharmacy = resolveUiPack(activeCompany) === "pharmacy";

  return (
    <section className="rounded-xl border border-border/70 bg-card px-3 py-2.5 shadow-xs sm:px-4">
      <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">Create</h2>
        <span className="text-[11px] text-muted-foreground">New document</span>
      </div>

      <div className="grid grid-cols-2 gap-0.5 sm:grid-cols-4 lg:grid-cols-8">
        {CREATE_ACTIONS.map((item) => {
          const Icon = item.icon;
          const to =
            item.pharmacyPath && isPharmacy
              ? pharmacyExpensesPath(companyId, { create: true })
              : `${base}/${item.path}`;

          return (
            <Link
              key={item.path}
              to={to}
              className={cn(
                "group flex min-h-9 items-center gap-2 rounded-lg px-2 py-1.5",
                "text-[13px] font-medium text-foreground",
                "hover:bg-muted/50",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                item.dividerBefore && "lg:border-l lg:border-border/60",
              )}
            >
              <span className={ICON_CHIP}>
                <Icon className="size-3.5" strokeWidth={2} />
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
