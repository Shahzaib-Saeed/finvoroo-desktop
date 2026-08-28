import {
  BookOpen,
  Landmark,
  Package,
  TrendingDown,
  TrendingUp,
  Users,
  Warehouse,
} from 'lucide-react';

/**
 * Business-facing report topics mapped to builder dataset categories/keys.
 * Server datasets remain the source of truth — this is navigation UX only.
 */
export const REPORT_TOPICS = [
  {
    id: 'sales',
    label: 'Sales',
    description: 'Revenue, invoices, and payment activity',
    icon: TrendingUp,
    matchCategories: ['sales'],
    defaultDatasetKey: 'sales.ar_ledger',
  },
  {
    id: 'customers',
    label: 'Customers',
    description: 'Customer balances, invoices, and payments',
    icon: Users,
    matchCategories: ['sales'],
    defaultDatasetKey: 'sales.ar_ledger',
  },
  {
    id: 'products',
    label: 'Products & Inventory',
    description: 'Product stock, cost, and valuation',
    icon: Package,
    matchCategories: ['inventory'],
    defaultDatasetKey: 'inventory.stock_summary',
  },
  {
    id: 'inventory',
    label: 'Inventory',
    description: 'Stock levels, valuation, and reorder alerts',
    icon: Warehouse,
    matchCategories: ['inventory'],
    defaultDatasetKey: 'inventory.stock_summary',
  },
  {
    id: 'banking',
    label: 'Banking & Cash',
    description: 'Cash movement and account activity',
    icon: Landmark,
    matchCategories: ['accounting'],
    defaultDatasetKey: 'accounting.general_ledger',
  },
  {
    id: 'accounting',
    label: 'General Ledger & Accounting',
    description: 'General ledger, trial balance, and journal entries',
    icon: BookOpen,
    matchCategories: ['accounting'],
    defaultDatasetKey: 'accounting.general_ledger',
  },
  {
    id: 'purchasing',
    label: 'Purchasing & Vendors',
    description: 'Bills, payables, and vendor activity',
    icon: TrendingDown,
    matchCategories: ['purchasing'],
    defaultDatasetKey: 'purchasing.ap_ledger',
  },
];

export function datasetsForTopic(topic, datasets) {
  if (!topic) return [];
  return (datasets || []).filter((ds) => topic.matchCategories.includes(ds.category));
}

export function resolveDatasetKey(topic, datasets, selectedKey) {
  const list = Array.isArray(datasets) ? datasets : [];
  if (selectedKey && list.some((d) => d.key === selectedKey)) {
    return selectedKey;
  }
  const matches = datasetsForTopic(topic, list);
  if (topic?.defaultDatasetKey && matches.some((d) => d.key === topic.defaultDatasetKey)) {
    return topic.defaultDatasetKey;
  }
  if (matches[0]?.key) return matches[0].key;
  // Last resort: any loaded dataset (avoids Step 2 with an unknown key / empty fields)
  if (topic?.defaultDatasetKey && list.some((d) => d.key === topic.defaultDatasetKey)) {
    return topic.defaultDatasetKey;
  }
  return list[0]?.key || null;
}

export function starterColumnsForDataset(dataset, max = 6) {
  const fields = dataset?.fields ?? [];
  const priority = ['customer_name', 'vendor_name', 'name', 'reference_no', 'txn_date', 'entry_date', 'amount_abs', 'quantity', 'code', 'account_name'];
  const picked = [];
  for (const key of priority) {
    if (fields.some((f) => f.key === key) && !picked.includes(key)) picked.push(key);
    if (picked.length >= max) break;
  }
  if (picked.length < 3) {
    fields.slice(0, max).forEach((f) => {
      if (!picked.includes(f.key)) picked.push(f.key);
    });
  }
  return picked.slice(0, max);
}
