import { format, startOfYear } from "date-fns";
import {
  ArrowLeftRight,
  Banknote,
  BarChart3,
  BookOpen,
  ClipboardList,
  CreditCard,
  GitBranch,
  LayoutGrid,
  Landmark,
  LineChart,
  PackageSearch,
  ReceiptText,
  Scale,
  ScrollText,
  TrendingUp,
  Wallet,
  Warehouse,
} from "lucide-react";

export function defaultReportPeriod() {
  return {
    from: format(startOfYear(new Date()), "yyyy-MM-dd"),
    to: format(new Date(), "yyyy-MM-dd"),
  };
}

export { formatCurrencyAmount as formatCurrency } from "@/lib/currency";

/** Neutral icon chip — keeps the hub looking like a finance catalog, not a rainbow. */
const ICON = "bg-slate-50 text-slate-600 border-slate-200";

/** Report hub sections — financial, AR/AP, and inventory reports. */
export function getReportHubSections(workspaceId) {
  const r = `/workspace/${workspaceId}/accounting/reports`;
  const inv = `/workspace/${workspaceId}/accounting/inventory/reports`;
  const accounting = `/workspace/${workspaceId}/accounting`;

  return [
    {
      id: "financial",
      title: "Financial statements",
      description:
        "Income, position, and cash movement for the selected period.",
      items: [
        {
          title: "Financial Summary",
          description:
            "Balance sheet and P&L together with net profit at a glance",
          path: `${r}/financial-summary`,
          icon: BarChart3,
          iconClass: ICON,
        },
        {
          title: "Category Sales & Purchases",
          description:
            "Category-wise purchase, sale, net profit, and margin",
          path: `${r}/category-trading`,
          icon: LayoutGrid,
          iconClass: ICON,
        },
        {
          title: "Income Statement",
          description: "Period revenue, expenses, and net income by account",
          path: `${r}/income-statement`,
          icon: LineChart,
          iconClass: ICON,
        },
        {
          title: "Profit & Loss",
          description: "Operating performance — revenue, costs, and net profit",
          path: `${r}/profit-loss`,
          icon: TrendingUp,
          iconClass: ICON,
          featured: true,
        },
        {
          title: "Profit & Loss by Job",
          description: "Job-level revenue, cost, and margin analysis",
          path: `${r}/profit-loss-by-job`,
          icon: ClipboardList,
          iconClass: ICON,
        },
        {
          title: "Balance Sheet",
          description: "Assets, liabilities, and equity as of a date",
          path: `${r}/balance-sheet`,
          icon: Wallet,
          iconClass: ICON,
          featured: true,
        },
        {
          title: "Cash Flow",
          description:
            "Cash from operating, investing, and financing activities",
          path: `${r}/cash-flow`,
          icon: ArrowLeftRight,
          iconClass: ICON,
        },
      ],
    },
    {
      id: "ledger",
      title: "General ledger & books",
      description: "Posted activity, trial balance, and account detail.",
      items: [
        {
          title: "General Ledger",
          description: "Full posted journal activity grouped by account",
          path: `${r}/general-ledger`,
          icon: BookOpen,
          iconClass: ICON,
          featured: true,
        },
        {
          title: "Trial Balance",
          description: "Debit and credit totals by account for period close",
          path: `${r}/trial-balance`,
          icon: Scale,
          iconClass: ICON,
          featured: true,
        },
        {
          title: "Account Balances",
          description: "Snapshot of chart-of-accounts balances",
          path: `${r}/account-balances`,
          icon: Wallet,
          iconClass: ICON,
        },
        {
          title: "Account Statement",
          description: "One account’s movements with running balance",
          path: `${r}/account-statement`,
          icon: Landmark,
          iconClass: ICON,
        },
      ],
    },
    {
      id: "ar-ap",
      title: "Receivables & payables",
      description: "Customer and supplier balances, aging, and ledgers.",
      items: [
        {
          title: "Customer Ledger",
          description:
            "Customer statement with opening, activity, and running balance",
          path: `${r}/customer-ledger`,
          icon: BookOpen,
          iconClass: ICON,
          featured: true,
        },
        {
          title: "Aged Receivables",
          description:
            "Unpaid customer invoices by aging bucket (Current → 90+)",
          path: `${r}/aged-receivables`,
          icon: BarChart3,
          iconClass: ICON,
          featured: true,
        },
        {
          title: "Vendor Ledger",
          description:
            "Vendor statement with opening, activity, and running balance",
          path: `${r}/vendor-ledger`,
          icon: BookOpen,
          iconClass: ICON,
        },
        {
          title: "Aged Payables",
          description: "Unpaid vendor bills by aging bucket (Current → 90+)",
          path: `${r}/aged-payables`,
          icon: BarChart3,
          iconClass: ICON,
          featured: true,
        },
        {
          title: "Accounts Receivable",
          description: "Open AR positions — customer invoice activity view",
          path: `${r}/accounts-receivable`,
          icon: Banknote,
          iconClass: ICON,
        },
        {
          title: "Accounts Payable",
          description: "Open AP positions — vendor bill activity view",
          path: `${r}/accounts-payable`,
          icon: CreditCard,
          iconClass: ICON,
        },
      ],
    },
    {
      id: "compliance",
      title: "Tax & compliance",
      description: "Tax filings, audit trail, and control reports.",
      items: [
        {
          title: "VAT / Tax Summary",
          description:
            "Output VAT, input VAT, net payable, and source documents",
          path: `${r}/tax-summary`,
          icon: ReceiptText,
          iconClass: ICON,
        },
        {
          title: "Audit Logs",
          description: "Who changed what and when — full activity trail",
          path: `${accounting}/audit-logs`,
          icon: ScrollText,
          iconClass: ICON,
        },
      ],
    },
    {
      id: "inventory",
      title: "Inventory",
      description: "Stock purchases, sales, levels, and valuation.",
      items: [
        {
          title: "Inventory Activity",
          description:
            "Purchases and sales linked to invoices, bills, and parties",
          path: `${inv}/movements`,
          icon: LineChart,
          iconClass: ICON,
        },
        {
          title: "Category Sales & Purchases",
          description: "Purchase, sale, and net profit by product category",
          path: `${r}/category-trading`,
          icon: LayoutGrid,
          iconClass: ICON,
        },
        {
          title: "Stock Summary",
          description: "On-hand qty, cost, and inventory value by product",
          path: `${inv}/stock-summary`,
          icon: PackageSearch,
          iconClass: ICON,
        },
        {
          title: "All Inventory Reports",
          description: "Valuation, low stock, and movement history hub",
          path: inv,
          icon: Warehouse,
          iconClass: ICON,
        },
      ],
    },
    {
      id: "traceability",
      title: "Traceability",
      description: "Search any document and trace everything linked to it.",
      items: [
        {
          title: "Document Explorer",
          description:
            "Search and trace any document through related transactions",
          path: `${r}/document-explorer`,
          icon: GitBranch,
          iconClass: ICON,
        },
      ],
    },
  ];
}

export function getAllReportItems(workspaceId) {
  return getReportHubSections(workspaceId).flatMap((section) =>
    section.items.map((item) => ({
      ...item,
      sectionId: section.id,
      sectionTitle: section.title,
    })),
  );
}
