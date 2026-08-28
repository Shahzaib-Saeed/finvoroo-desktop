import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { datasetDescription, datasetIcon } from '../dataset-meta';
import { BUILDER_COPY } from '../../lib/report-business-copy';

const CATEGORY_LABELS = {
  accounting: 'Accounting',
  sales: 'Sales',
  purchasing: 'Purchasing',
  inventory: 'Inventory',
  production: 'Production',
  pos: 'POS',
  audit: 'Audit',
  approval: 'Approvals',
};

/**
 * Dataset picker, redesigned: search box, per-dataset icon + description,
 * grouped by category. Purely presentational over the same
 * GET /workspace/reports/builder/datasets payload the old DatasetPicker used.
 */
export function DatasetExplorer({ datasets, onSelect }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return datasets;
    return datasets.filter(
      (ds) => ds.label.toLowerCase().includes(q) || datasetDescription(ds.key).toLowerCase().includes(q),
    );
  }, [datasets, query]);

  const grouped = useMemo(() => {
    return filtered.reduce((acc, ds) => {
      (acc[ds.category] ||= []).push(ds);
      return acc;
    }, {});
  }, [filtered]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-100 p-3">
        <p className="mb-2 px-1 text-xs font-semibold text-slate-700">{BUILDER_COPY.datasetExplorerTitle}</p>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={BUILDER_COPY.datasetSearchPlaceholder}
            className="h-8 w-full rounded-md border border-slate-200 bg-slate-50/60 pl-8 pr-2.5 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-100"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {Object.keys(grouped).length === 0 ? (
          <p className="px-1 py-6 text-center text-xs text-slate-400">No datasets match "{query}".</p>
        ) : (
          <div className="flex flex-col gap-4">
            {Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <h4 className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {CATEGORY_LABELS[category] || category}
                </h4>
                <div className="flex flex-col gap-1">
                  {items.map((ds) => {
                    const Icon = datasetIcon(ds.key);
                    return (
                      <button
                        key={ds.key}
                        type="button"
                        onClick={() => onSelect(ds.key)}
                        className={cn(
                          'group flex items-start gap-2.5 rounded-lg border border-transparent px-2.5 py-2.5 text-left transition-all',
                          'hover:border-slate-200 hover:bg-slate-50 hover:shadow-sm',
                        )}
                      >
                        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition-colors group-hover:border-slate-300 group-hover:text-slate-700">
                          <Icon className="size-4" strokeWidth={1.75} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-800">{ds.label}</p>
                          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
                            {datasetDescription(ds.key)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
