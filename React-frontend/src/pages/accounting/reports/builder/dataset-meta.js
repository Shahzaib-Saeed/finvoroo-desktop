import {
  BookOpen,
  Database,
  Receipt,
  Scale,
  TrendingDown,
  Warehouse,
} from 'lucide-react';

/**
 * Presentation-only metadata (icon + one-line description) for datasets
 * returned by GET /workspace/reports/builder/datasets. The dataset list
 * itself is entirely server-driven (App\Domain\Reporting\Support\DatasetRegistry)
 * — this map only decorates known keys and falls back gracefully for any
 * dataset added later without a matching entry here.
 */
export const DATASET_META = {
  'accounting.general_ledger': {
    icon: BookOpen,
    description: 'Every posted journal line, in order, with running account balance.',
  },
  'accounting.trial_balance': {
    icon: Scale,
    description: 'Total debits and credits per account for a period.',
  },
  'sales.ar_ledger': {
    icon: Receipt,
    description: 'Invoices, customer payments, and credit notes in one ledger.',
  },
  'purchasing.ap_ledger': {
    icon: TrendingDown,
    description: 'Bills, vendor payments, and vendor credits in one ledger.',
  },
  'inventory.stock_summary': {
    icon: Warehouse,
    description: 'On-hand quantity, unit cost, and value per product.',
  },
};

export function datasetIcon(key) {
  return DATASET_META[key]?.icon || Database;
}

export function datasetDescription(key) {
  return DATASET_META[key]?.description || 'Report on this dataset.';
}
