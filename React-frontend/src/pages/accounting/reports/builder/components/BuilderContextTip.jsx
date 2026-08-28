import { Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

const TIPS = {
  noDataset: 'Start by choosing what you want to report on — Sales, Customers, Inventory, and more.',
  noColumns: "You haven't added any columns yet. Start by selecting Customer or Date on the left.",
  hasGroupNoAgg: 'Tip: Grouping by Customer creates a customer sales summary. Add a Total to summarize amounts.',
  hasFilters: 'Filters update your preview instantly. Remove a filter anytime to see more data.',
  hasPreview: 'Looking good! Save this report to access it from My Reports anytime.',
  wizardTopic: 'Start by choosing what you want to report on — Sales, Customers, Inventory, and more.',
  wizardFields: 'Pick standard columns and your custom fields. Custom field values appear on invoice, bill, and ledger rows when available.',
  wizardFilters: 'Filters are optional — skip this step if you want to see everything first.',
  wizardReorder: 'Use the arrows to move columns up or down. This controls how they appear left-to-right.',
  wizardSave: 'Give your report a clear name so you and your team can find it later.',
};

export function getBuilderTip({ datasetKey, columns, groupBy, filters, mode }) {
  if (mode === 'wizard-topic') return TIPS.wizardTopic;
  if (mode === 'wizard-fields') return TIPS.wizardFields;
  if (mode === 'wizard-filters') return TIPS.wizardFilters;
  if (mode === 'wizard-reorder') return TIPS.wizardReorder;
  if (mode === 'wizard-save') return TIPS.wizardSave;
  if (!datasetKey) return TIPS.noDataset;
  if (!columns?.length) return TIPS.noColumns;
  if (groupBy?.length && !filters) return TIPS.hasGroupNoAgg;
  if (filters) return TIPS.hasFilters;
  return TIPS.hasPreview;
}

export function BuilderContextTip({ tip, className }) {
  if (!tip) return null;
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border border-blue-200/70 bg-gradient-to-r from-blue-50 to-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.03)]',
        className,
      )}
    >
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
        <Lightbulb className="size-3.5" strokeWidth={1.75} />
      </span>
      <p className="pt-0.5 font-medium">{tip}</p>
    </div>
  );
}
