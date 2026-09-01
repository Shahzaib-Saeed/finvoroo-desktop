import {
  Activity,
  Pill,
} from 'lucide-react';
import { BASE_SIDEBAR_MENU, cloneMenu } from '../nav/base-sidebar';
import { getBaseMegaMenuColumns } from '../nav/base-mega-menu';
import { BASE_SECTION_NAV, cloneSections } from '../nav/base-section-nav';
import { resolveMegaPath } from '../nav/paths';
import { PHARMACY_COPY } from './copy';

/** Paths hidden from pharmacy workspaces (manufacturing / job costing). */
const PHARMACY_HIDDEN_PATHS = new Set([
  '/workspace/:id/accounting/job-orders',
  '/workspace/:id/production-orders',
]);

const COUNTER_SALE = {
  title: 'Counter sale',
  path: '/workspace/:id/pharmacy/pos',
  permission: 'pos.view',
  feature: 'pos_menu',
  industryZone: 'pharmacy',
};

const SALE_RETURN = {
  title: 'Sale return',
  path: '/workspace/:id/pharmacy/loose-sale-return',
  permission: 'credit_notes.create',
  feature: 'batch_expiry',
  industryZone: 'pharmacy',
};

const NEW_PURCHASE = {
  title: 'New purchase',
  path: '/workspace/:id/pharmacy/receive',
  permission: 'bills.create',
  feature: 'batch_expiry',
  industryZone: 'pharmacy',
};

const CREATE_PO = {
  title: 'Create purchase order',
  path: '/workspace/:id/accounting/purchase-orders/create',
  permission: 'purchase_orders.create',
  feature: 'pharmacy_shell',
  industryZone: 'pharmacy',
};

const SCAN_SUPPLIER_BILL = {
  title: 'Scan supplier bill',
  path: '/workspace/:id/pharmacy/purchase-entry',
  permission: 'bills.create',
  feature: 'pharmacy_shell',
  industryZone: 'pharmacy',
};

const OPEN_PURCHASE = {
  title: 'Open purchase',
  path: '/workspace/:id/pharmacy/loose-purchase',
  permission: 'bills.create',
  feature: 'batch_expiry',
  industryZone: 'pharmacy',
};

const IMPORT_PURCHASE = {
  title: 'Import purchase',
  path: '/workspace/:id/pharmacy/import',
  permission: 'bills.view',
  feature: 'pharmacy_shell',
  industryZone: 'pharmacy',
};

const MEDICINES_ITEM = {
  title: PHARMACY_COPY.products,
  path: '/workspace/:id/pharmacy/medicines',
  icon: Pill,
  permission: 'products.view',
  feature: 'pharmacy_shell',
  industryZone: 'pharmacy',
};

const PHARMACY_SECTION = {
  title: 'Pharmacy',
  path: '/workspace/:id/pharmacy-ops',
  icon: Activity,
  feature: 'pharmacy_shell',
  industryZone: 'pharmacy',
  children: [
    {
      title: 'Batch & expiry',
      path: '/workspace/:id/pharmacy/batch-expiry',
      permission: 'dashboard.view',
      feature: 'batch_expiry',
    },
    {
      title: 'Pharmacy reports',
      path: '/workspace/:id/pharmacy/reports',
      permission: 'reports.view',
      feature: 'pharmacy_shell',
    },
    {
      title: 'Item-wise POS sales',
      path: '/workspace/:id/pharmacy/reports/item-sales',
      permission: 'reports.view',
      feature: 'pharmacy_shell',
    },
    {
      title: 'Employee POS sales',
      path: '/workspace/:id/pharmacy/reports/employee-sales',
      permission: 'reports.view',
      feature: 'pharmacy_shell',
    },
    {
      title: 'Manufacturer-wise expiry',
      path: '/workspace/:id/pharmacy/reports/manufacturer-expiry',
      permission: 'reports.view',
      feature: 'batch_expiry',
    },
    {
      title: 'Stock valuation',
      path: '/workspace/:id/pharmacy/reports/stock-valuation',
      permission: 'reports.view',
      feature: 'pharmacy_shell',
    },
    {
      title: 'Investors',
      path: '/workspace/:id/pharmacy/investors',
      permission: 'investors.view',
      feature: 'pharmacy_shell',
    },
    {
      title: 'Expenses',
      path: '/workspace/:id/pharmacy/expenses',
      permission: 'expenses.view',
      feature: 'pharmacy_shell',
    },
  ],
};

function filterPharmacySidebarItem(item) {
  if (PHARMACY_HIDDEN_PATHS.has(item.path)) return null;
  if (item.title === 'Job Orders' || item.title === 'Production') return null;

  let next = { ...item };

  if (next.path === '/workspace/:id') {
    next = {
      ...next,
      title: 'Dashboard',
      path: '/workspace/:id/pharmacy',
      feature: 'pharmacy_shell',
      industryZone: 'pharmacy',
    };
  }

  if (next.path === '/workspace/:id/accounting/products') {
    return null;
  }

  if (next.path === '/workspace/:id/accounting/expenses') {
    return {
      ...next,
      title: 'Expenses',
      path: '/workspace/:id/pharmacy/expenses',
      feature: 'pharmacy_shell',
      industryZone: 'pharmacy',
    };
  }

  if (next.children?.length) {
    const children = next.children
      .map((child) => {
        if (child.path === '/workspace/:id/accounting/pos') return null;
        if (child.path === '/workspace/:id/accounting/bills/create') return null;
        if (child.path === '/workspace/:id/accounting/invoices/create') return null;
        return child;
      })
      .filter(Boolean);
    next = { ...next, children: children.length ? children : undefined };
  }

  if (next.path === '/workspace/:id/accounting/sales' && next.children) {
    next = {
      ...next,
      children: [COUNTER_SALE, SALE_RETURN, ...next.children],
    };
  }

  if (next.path === '/workspace/:id/accounting/purchases' && next.children) {
    next = {
      ...next,
      children: [
        NEW_PURCHASE,
        CREATE_PO,
        SCAN_SUPPLIER_BILL,
        OPEN_PURCHASE,
        IMPORT_PURCHASE,
        ...next.children,
      ],
    };
  }

  return next;
}

export function getPharmacySidebarMenu() {
  const menu = cloneMenu(BASE_SIDEBAR_MENU)
    .map(filterPharmacySidebarItem)
    .filter(Boolean);

  const purchasesIdx = menu.findIndex((item) =>
    item.path?.includes('/accounting/purchases'),
  );
  if (purchasesIdx >= 0) {
    menu.splice(purchasesIdx + 1, 0, MEDICINES_ITEM);
  }

  const inventoryIdx = menu.findIndex((item) =>
    item.path?.includes('/accounting/inventory'),
  );
  menu.splice(inventoryIdx >= 0 ? inventoryIdx + 1 : menu.length, 0, PHARMACY_SECTION);

  return menu;
}

function filterMegaLinks(links = []) {
  return links.filter(
    (link) =>
      !link.path?.includes('/job-orders') &&
      !link.path?.includes('/production-orders') &&
      link.title !== 'Job Orders' &&
      link.title !== 'Create Job Order' &&
      link.title !== 'Production Orders',
  );
}

function toMegaLink(item, companyId) {
  return {
    title: item.title,
    path: resolveMegaPath(item.path, companyId),
    permission: item.permission,
    feature: item.feature,
  };
}

export function getPharmacyMegaMenuColumns(companyId) {
  const columns = getBaseMegaMenuColumns(companyId);
  const p = (path) => resolveMegaPath(path, companyId);

  const pharmacySection = {
    id: 'pharmacy',
    title: 'Pharmacy',
    links: [
      toMegaLink(MEDICINES_ITEM, companyId),
      ...PHARMACY_SECTION.children.map((c) => toMegaLink(c, companyId)),
    ],
  };

  const next = columns.map((column) => ({
    ...column,
    sections: (column.sections || []).map((section) => {
      let links = filterMegaLinks(section.links || []).map((link) => {
        if (link.path?.includes('/accounting/pos')) {
          return toMegaLink(COUNTER_SALE, companyId);
        }
        if (link.path?.includes('/accounting/bills/create')) {
          return toMegaLink(NEW_PURCHASE, companyId);
        }
        if (link.path?.includes('/accounting/invoices/create')) {
          return toMegaLink(COUNTER_SALE, companyId);
        }
        if (
          link.path?.includes('/accounting/products') ||
          link.title === 'Products & services' ||
          link.title === 'Products & Services Catalog'
        ) {
          return toMegaLink(MEDICINES_ITEM, companyId);
        }
        return link;
      });

      if (section.id === 'setup') {
        const settingsPath = p('/workspace/:id/accounting/settings');
        const alreadyHasPharmacy = links.some((l) =>
          l.path?.includes('tab=pharmacy'),
        );
        if (!alreadyHasPharmacy) {
          const settingsIdx = links.findIndex((l) => l.path === settingsPath);
          const pharmacyLinks = [
            {
              title: 'Pharmacy',
              path: `${settingsPath}?tab=pharmacy`,
              permission: 'accounting_settings.view',
              feature: 'pharmacy_shell',
            },
          ];
          if (settingsIdx >= 0) {
            links = [
              ...links.slice(0, settingsIdx + 1),
              ...pharmacyLinks,
              ...links.slice(settingsIdx + 1),
            ];
          } else {
            links = [...pharmacyLinks, ...links];
          }
        }
      }

      if (section.id === 'sales') {
        const unique = links.filter(
          (l, i, arr) => arr.findIndex((x) => x.path === l.path) === i,
        );
        links = [
          toMegaLink(COUNTER_SALE, companyId),
          toMegaLink(SALE_RETURN, companyId),
          ...unique.filter(
            (l) =>
              l.path !== p(COUNTER_SALE.path) &&
              l.path !== p(SALE_RETURN.path),
          ),
        ];
      }

      if (section.id === 'purchasing') {
        const unique = links.filter(
          (l, i, arr) => arr.findIndex((x) => x.path === l.path) === i,
        );
        links = [
          toMegaLink(NEW_PURCHASE, companyId),
          toMegaLink(CREATE_PO, companyId),
          toMegaLink(SCAN_SUPPLIER_BILL, companyId),
          toMegaLink(OPEN_PURCHASE, companyId),
          toMegaLink(IMPORT_PURCHASE, companyId),
          ...unique.filter(
            (l) =>
              l.path !== p(NEW_PURCHASE.path) &&
              l.path !== p(CREATE_PO.path) &&
              l.path !== p(SCAN_SUPPLIER_BILL.path) &&
              l.path !== p(OPEN_PURCHASE.path) &&
              l.path !== p(IMPORT_PURCHASE.path),
          ),
        ];
      }

      if (
        section.id === 'inventory' ||
        section.title === 'Products & catalog' ||
        section.title === 'Inventory & operations'
      ) {
        return {
          ...section,
          title: PHARMACY_COPY.productsCatalog,
          links,
        };
      }

      return { ...section, links };
    }),
  }));

  if (next[0]?.sections) {
    const sections = [...next[0].sections];
    const mainIdx = sections.findIndex(
      (s) => s.id === 'core' || s.title === 'Main' || s.title === 'Core & system',
    );
    sections.splice(mainIdx >= 0 ? mainIdx + 1 : 0, 0, pharmacySection);
    next[0] = { ...next[0], sections };
  }

  return next;
}

export function getPharmacySectionNav() {
  const sections = cloneSections(BASE_SECTION_NAV).filter(
    (section) => section.key !== 'job-orders',
  );

  return sections.map((section) => {
    if (section.key === 'sales') {
      const links = (section.links || []).filter(
        (link) =>
          link.path !== '/accounting/pos' &&
          link.path !== '/accounting/invoices/create',
      );
      return {
        ...section,
        matches: [
          ...(section.matches || []),
          '/pharmacy/pos',
          '/pharmacy/loose-sale-return',
        ],
        links: [
          {
            title: COUNTER_SALE.title,
            path: '/pharmacy/pos',
            permission: COUNTER_SALE.permission,
            feature: COUNTER_SALE.feature,
          },
          {
            title: SALE_RETURN.title,
            path: '/pharmacy/loose-sale-return',
            permission: SALE_RETURN.permission,
            feature: SALE_RETURN.feature,
          },
          ...links,
        ],
      };
    }

    if (section.key === 'purchases') {
      const links = (section.links || []).filter(
        (link) => link.path !== '/accounting/bills/create',
      );
      return {
        ...section,
        matches: [
          ...(section.matches || []),
          '/pharmacy/receive',
          '/pharmacy/purchase-entry',
          '/pharmacy/loose-purchase',
          '/pharmacy/import',
        ],
        links: [
          {
            title: NEW_PURCHASE.title,
            path: '/pharmacy/receive',
            permission: NEW_PURCHASE.permission,
            feature: NEW_PURCHASE.feature,
          },
          {
            title: CREATE_PO.title,
            path: '/accounting/purchase-orders/create',
            permission: CREATE_PO.permission,
            feature: CREATE_PO.feature,
          },
          {
            title: SCAN_SUPPLIER_BILL.title,
            path: '/pharmacy/purchase-entry',
            permission: SCAN_SUPPLIER_BILL.permission,
            feature: SCAN_SUPPLIER_BILL.feature,
          },
          {
            title: OPEN_PURCHASE.title,
            path: '/pharmacy/loose-purchase',
            permission: OPEN_PURCHASE.permission,
            feature: OPEN_PURCHASE.feature,
          },
          {
            title: IMPORT_PURCHASE.title,
            path: '/pharmacy/import',
            permission: IMPORT_PURCHASE.permission,
            feature: IMPORT_PURCHASE.feature,
          },
          ...links,
        ],
      };
    }

    if (section.key === 'reports') {
      return {
        ...section,
        matches: [
          ...(section.matches || []),
          '/pharmacy/reports',
          '/pharmacy/medicine-reports',
        ],
        links: [],
        groups: [
          {
            title: 'Pharmacy',
            links: [
              {
                title: 'Pharmacy reports',
                path: '/pharmacy/reports',
                permission: 'reports.view',
                feature: 'pharmacy_shell',
              },
              {
                title: 'Category Sales & Purchases',
                path: '/accounting/reports/category-trading',
                permission: 'reports.view',
                feature: 'pharmacy_shell',
              },
              {
                title: 'Item-wise POS sales',
                path: '/pharmacy/reports/item-sales',
                permission: 'reports.view',
                feature: 'pharmacy_shell',
              },
              {
                title: 'Employee POS sales',
                path: '/pharmacy/reports/employee-sales',
                permission: 'reports.view',
                feature: 'pharmacy_shell',
              },
              {
                title: 'Manufacturer-wise expiry',
                path: '/pharmacy/reports/manufacturer-expiry',
                permission: 'reports.view',
                feature: 'batch_expiry',
              },
              {
                title: 'Stock valuation',
                path: '/pharmacy/reports/stock-valuation',
                permission: 'reports.view',
                feature: 'pharmacy_shell',
              },
            ],
          },
          ...(section.groups || []),
        ],
      };
    }

    if (section.links) {
      const links = section.links
        .map((link) => {
          if (link.path === '/accounting/products') {
            return { ...link, title: PHARMACY_COPY.products, path: '/pharmacy/medicines' };
          }
          return link;
        })
        .filter(
          (link) =>
            link.path !== '/accounting/job-orders' &&
            link.path !== '/accounting/job-orders/create',
        );
      return { ...section, links };
    }
    return section;
  });
}
