import {
  BarChart2,
  Briefcase,
  ClipboardList,
  Factory,
  Landmark,
  LayoutDashboard,
  Package,
  Settings,
  ShieldCheck,
  ShoppingCart,
  TrendingUp,
  Users,
  Warehouse,
} from 'lucide-react';

/** Shared core sidebar tree — Universal pack base (paths use :id). */
export const BASE_SIDEBAR_MENU = [
  {
    title: 'Dashboard',
    path: '/workspace/:id',
    icon: LayoutDashboard,
    permission: 'dashboard.view',
  },
  {
    title: 'Sales',
    path: '/workspace/:id/accounting/sales',
    icon: TrendingUp,
    children: [
      {
        title: 'Point of Sale',
        path: '/workspace/:id/accounting/pos',
        permission: 'pos.view',
        feature: 'pos_menu',
      },
      {
        title: 'Create Invoice',
        path: '/workspace/:id/accounting/invoices/create',
        permission: 'invoices.create',
      },
      {
        title: 'Invoices',
        path: '/workspace/:id/accounting/invoices',
        permission: 'invoices.view',
      },
      {
        title: 'Quotations',
        path: '/workspace/:id/accounting/quotations',
        permission: 'quotations.view',
      },
      {
        title: 'Sales Orders',
        path: '/workspace/:id/accounting/sales-orders',
        permission: 'sales_orders.view',
      },
      {
        title: 'Receipts',
        path: '/workspace/:id/accounting/payments',
        permission: 'payments.view',
      },
      {
        title: 'Credit Notes',
        path: '/workspace/:id/accounting/credit-notes',
        permission: 'credit_notes.view',
      },
      {
        title: 'Customers',
        path: '/workspace/:id/accounting/customers',
        permission: 'customers.view',
      },
    ],
  },
  {
    title: 'Purchases',
    path: '/workspace/:id/accounting/purchases',
    icon: ShoppingCart,
    children: [
      {
        title: 'Create Bill',
        path: '/workspace/:id/accounting/bills/create',
        permission: 'bills.create',
      },
      {
        title: 'Bills',
        path: '/workspace/:id/accounting/bills',
        permission: 'bills.view',
      },
      {
        title: 'Purchase Orders',
        path: '/workspace/:id/accounting/purchase-orders',
        permission: 'purchase_orders.view',
      },
      {
        title: 'Bill Payments',
        path: '/workspace/:id/accounting/bill-payments',
        permission: 'bill_payments.view',
      },
      {
        title: 'Debit Notes',
        path: '/workspace/:id/accounting/vendor-credits',
        permission: 'vendor_credits.view',
      },
      {
        title: 'Vendors',
        path: '/workspace/:id/accounting/vendors',
        permission: 'vendors.view',
      },
    ],
  },
  {
    title: 'Job Orders',
    path: '/workspace/:id/accounting/job-orders',
    icon: Briefcase,
    children: [
      {
        title: 'Jobs',
        path: '/workspace/:id/accounting/job-orders',
        permission: 'job_orders.view',
      },
      {
        title: 'Create job',
        path: '/workspace/:id/accounting/job-orders/create',
        permission: 'job_orders.create',
      },
    ],
  },
  {
    title: 'Products',
    path: '/workspace/:id/accounting/products',
    icon: Package,
    permission: 'products.view',
  },
  {
    title: 'Inventory',
    path: '/workspace/:id/accounting/inventory',
    icon: Warehouse,
    permission: 'inventory_dashboard.view',
  },
  {
    title: 'Production',
    path: '/workspace/:id/production-orders',
    icon: Factory,
    permission: 'production_orders.view',
  },
  {
    title: 'Banking',
    path: '/workspace/:id/accounting/bank-accounts',
    icon: Landmark,
    permission: 'bank_accounts.view',
  },
  {
    title: 'General Ledger',
    path: '/workspace/:id/accounting/journal',
    icon: ClipboardList,
    permission: 'journal_entries.view',
  },
  {
    title: 'Reports',
    path: '/workspace/:id/accounting/reports',
    icon: BarChart2,
    permission: 'reports.view',
  },
  {
    title: 'Employees',
    path: '/workspace/:id/employee',
    icon: Users,
    permission: 'employees.view',
  },
  {
    title: 'Roles & access',
    path: '/workspace/:id/accounting/permissions',
    icon: ShieldCheck,
    permission: 'permissions.view',
  },
  {
    title: 'Settings',
    path: '/workspace/:id/accounting/settings',
    icon: Settings,
    permission: 'accounting_settings.view',
  },
];

export function cloneMenu(menu) {
  return (menu ?? []).map((item) => ({
    ...item,
    children: item.children ? cloneMenu(item.children) : undefined,
  }));
}
