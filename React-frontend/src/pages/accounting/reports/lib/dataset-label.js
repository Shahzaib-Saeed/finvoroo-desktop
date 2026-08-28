const DATASET_LABELS = {
  'accounting.general_ledger': 'General Ledger',
  'accounting.trial_balance': 'Trial Balance',
  'sales.ar_ledger': 'AR Ledger',
  'purchasing.ap_ledger': 'AP Ledger',
  'inventory.stock_summary': 'Inventory',
};

export function datasetLabel(datasetKey) {
  if (datasetKey && DATASET_LABELS[datasetKey]) return DATASET_LABELS[datasetKey];
  if (!datasetKey) return 'Custom Report';
  const part = datasetKey.split('.').pop() || datasetKey;
  return part
    .split('_')
    .map((w) => (w.length <= 3 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}
