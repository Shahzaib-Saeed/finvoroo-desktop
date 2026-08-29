import { WORKSPACE_MENU } from '@/config/menu.workspace';

const TAIL_LABELS = {
  create: 'Create',
  edit: 'Edit',
  trash: 'Trash',
};

/** Human-readable titles for accounting report URL slugs. */
const ACCOUNTING_REPORT_LABELS = {
  'financial-summary': 'Financial Summary',
  'category-trading': 'Category Sales & Purchases',
  'income-statement': 'Income Statement',
  'profit-loss': 'Profit & Loss',
  'profit-loss-by-job': 'Profit & Loss by Job',
  'balance-sheet': 'Balance Sheet',
  'cash-flow': 'Cash Flow',
  'trial-balance': 'Trial Balance',
  'general-ledger': 'General Ledger',
  'account-balances': 'Account Balances',
  'account-statement': 'Account Statement',
  'customer-ledger': 'Customer Ledger',
  'vendor-ledger': 'Vendor Ledger',
  'aged-receivables': 'Aged Receivables',
  'customer-aging': 'Customer Aging',
  'aged-payables': 'Aged Payables',
  'vendor-aging': 'Aged Payables',
  'accounts-receivable': 'Accounts Receivable',
  'accounts-payable': 'Accounts Payable',
  'tax-summary': 'VAT / Tax Summary',
  'document-explorer': 'Document Explorer',
  builder: 'Report Builder',
  view: 'Custom Report',
};

const INVENTORY_REPORT_LABELS = {
  'stock-summary': 'Stock Summary',
  valuation: 'Inventory Valuation',
  movements: 'Inventory Activity',
  'low-stock': 'Low Stock',
};

function humanizeSlug(slug) {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function resolvePath(path, companyId) {
  return path ? path.replace(':id', String(companyId)) : null;
}

function getAccountingReportsBreadcrumb(pathname, companyId) {
  const reportsHub = `/workspace/${companyId}/accounting/reports`;
  const invReportsHub = `/workspace/${companyId}/accounting/inventory/reports`;

  if (pathname === reportsHub) {
    return [{ label: 'Reports' }];
  }

  if (pathname.startsWith(`${reportsHub}/`)) {
    const tail = pathname.slice(reportsHub.length + 1).split('/').filter(Boolean);
    const slug = tail[0];
    if (!slug) return [{ label: 'Reports' }];

    const label =
      slug === 'document-explorer' && tail.length > 1
        ? 'Document Details'
        : ACCOUNTING_REPORT_LABELS[slug] || humanizeSlug(slug);

    return [{ label: 'Reports', href: reportsHub }, { label }];
  }

  if (pathname === invReportsHub) {
    return [
      { label: 'Reports', href: reportsHub },
      { label: 'Inventory Reports' },
    ];
  }

  if (pathname.startsWith(`${invReportsHub}/`)) {
    const slug = pathname.slice(invReportsHub.length + 1).split('/').filter(Boolean)[0];
    const label = INVENTORY_REPORT_LABELS[slug] || humanizeSlug(slug || 'report');
    return [
      { label: 'Reports', href: reportsHub },
      { label: 'Inventory Reports', href: invReportsHub },
      { label },
    ];
  }

  return null;
}

const PHARMACY_REPORT_LABELS = {
  'item-sales': 'Item-wise POS Sales',
  'manufacturer-expiry': 'Manufacturer-wise Expiry',
  'stock-valuation': 'Stock Valuation',
};

function getPharmacyReportsBreadcrumb(pathname, companyId) {
  const hub = `/workspace/${companyId}/pharmacy/reports`;
  const alias = `/workspace/${companyId}/pharmacy/medicine-reports`;

  if (pathname === hub || pathname === alias) {
    return [{ label: 'Pharmacy reports' }];
  }

  if (pathname.startsWith(`${hub}/`)) {
    const slug = pathname.slice(hub.length + 1).split('/').filter(Boolean)[0];
    const label = PHARMACY_REPORT_LABELS[slug] || humanizeSlug(slug || 'report');
    return [{ label: 'Pharmacy reports', href: hub }, { label }];
  }

  return null;
}

/**
 * Build breadcrumb items for the current workspace route from sidebar menu + URL tail.
 */
export function getWorkspaceBreadcrumb(pathname, companyId) {
  if (!companyId) return [];

  const reportCrumb = getAccountingReportsBreadcrumb(pathname, companyId);
  if (reportCrumb) return reportCrumb;

  const pharmacyReportCrumb = getPharmacyReportsBreadcrumb(pathname, companyId);
  if (pharmacyReportCrumb) return pharmacyReportCrumb;

  let bestChain = [];
  let bestLen = 0;

  const consider = (chain, path) => {
    if (!path) return;
    if (pathname === path || (path.length > 1 && pathname.startsWith(`${path}/`))) {
      if (path.length > bestLen) {
        bestChain = chain;
        bestLen = path.length;
      }
    }
  };

  for (const item of WORKSPACE_MENU) {
    const parentPath = resolvePath(item.path, companyId);
    const parentLink = parentPath ? { label: item.title, href: parentPath } : null;

    if (item.children?.length) {
      for (const child of item.children) {
        const childPath = resolvePath(child.path, companyId);
        const chain = parentLink
          ? [parentLink, { label: child.title, href: childPath }]
          : [{ label: child.title, href: childPath }];
        consider(chain, childPath);
      }
    } else if (parentLink) {
      consider([parentLink], parentPath);
    }
  }

  if (!bestChain.length) {
    const base = `/workspace/${companyId}`;
    if (pathname === base) {
      return [{ label: 'Dashboard' }];
    }
    return [{ label: 'Workspace', href: base }];
  }

  const lastHref = bestChain[bestChain.length - 1]?.href;
  if (!lastHref || pathname === lastHref) {
    return bestChain.map((item, i, arr) =>
      i === arr.length - 1 ? { label: item.label } : item,
    );
  }

  const tail = pathname.slice(lastHref.length).split('/').filter(Boolean);
  const result = [...bestChain];

  for (const seg of tail) {
    if (/^\d+$/.test(seg)) {
      result.push({ label: 'Details' });
      break;
    }
    if (TAIL_LABELS[seg]) {
      result.push({ label: TAIL_LABELS[seg] });
    }
  }

  return result.map((item, i, arr) =>
    i === arr.length - 1 && !item.href ? { label: item.label } : item,
  );
}
