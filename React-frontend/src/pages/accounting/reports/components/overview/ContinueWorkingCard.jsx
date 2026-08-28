import { Link } from 'react-router-dom';
import { Copy, Edit3, ExternalLink, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { datasetIcon } from '../../builder/dataset-meta';
import { definitionEditPath, definitionOpenPath } from '../../lib/report-definition-links';
import { ReportFavoriteToggle } from '../ReportFavoriteToggle';
import { ReportMiniPreview } from './ReportMiniPreview';
import { datasetDisplayName } from './overview-theme';
import { formatRelativeTime } from './format-relative-time';
import { TEMPLATE_CATEGORY_COLORS } from './overview-theme';

function accentForDataset(key) {
  if (key?.startsWith('sales')) return TEMPLATE_CATEGORY_COLORS.sales.bar;
  if (key?.startsWith('inventory')) return TEMPLATE_CATEGORY_COLORS.inventory.bar;
  if (key?.startsWith('purchasing')) return TEMPLATE_CATEGORY_COLORS.purchasing.bar;
  return TEMPLATE_CATEGORY_COLORS.accounting.bar;
}

export function ContinueWorkingCard({
  title,
  datasetKey,
  viewedAt,
  openPath,
  editPath,
  isCustom,
  definitionId,
  isFavorited,
  onFavoriteChange,
  onDuplicate,
  onOpen,
  className,
}) {
  const Icon = datasetIcon(datasetKey);
  const accent = accentForDataset(datasetKey);
  const previewVariant = datasetKey?.includes('ledger') || datasetKey?.includes('balance') ? 'table' : 'chart';

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-gray-200/70 bg-white',
        'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.04)]',
        'transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_8px_rgba(0,0,0,0.04),0_12px_32px_rgba(0,0,0,0.06)]',
        className,
      )}
    >
      <div className="absolute inset-0 bg-primary/[0.03]" />

      <div className="relative grid gap-6 p-5 sm:grid-cols-[1fr_minmax(180px,240px)] sm:p-6 lg:grid-cols-[1fr_minmax(220px,280px)]">
        <div className="flex min-w-0 flex-col">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
            Continue where you left off
          </p>

          <div className="mt-3 flex items-start gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-gray-200/80 bg-white shadow-sm transition-transform duration-300 group-hover:scale-105">
              <Icon className="size-5 text-gray-700" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-xl font-semibold tracking-tight text-gray-900">{title}</h3>
              <p className="mt-1 text-sm text-gray-500">
                Last opened{' '}
                <span className="font-medium text-gray-700">{formatRelativeTime(viewedAt)}</span>
              </p>
              <p className="mt-2 text-xs text-gray-400">
                Dataset ·{' '}
                <span className="font-medium text-gray-600">{datasetDisplayName(datasetKey)}</span>
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Button size="sm" className="h-9 gap-1.5 rounded-xl px-4 shadow-sm" asChild>
              <Link to={openPath} onClick={onOpen}>
                <Play className="size-3.5 fill-current" />
                Run report
              </Link>
            </Button>
            {isCustom && editPath ? (
              <Button size="sm" variant="outline" className="h-9 rounded-xl" asChild>
                <Link to={editPath}>
                  <Edit3 className="size-3.5" />
                  Edit
                </Link>
              </Button>
            ) : null}
            {isCustom && onDuplicate ? (
              <Button size="sm" variant="outline" className="h-9 rounded-xl" onClick={onDuplicate}>
                <Copy className="size-3.5" />
                Duplicate
              </Button>
            ) : null}
            {isCustom && definitionId ? (
              <ReportFavoriteToggle
                favoritableKind="definition"
                reportDefinitionId={definitionId}
                isFavorited={isFavorited}
                onChange={onFavoriteChange}
                className="size-9 rounded-xl border border-gray-200/80 bg-white"
              />
            ) : null}
            <Button size="sm" variant="ghost" className="h-9 rounded-xl text-gray-500" asChild>
              <Link to={openPath} onClick={onOpen}>
                <ExternalLink className="size-3.5" />
                Open
              </Link>
            </Button>
          </div>
        </div>

        <ReportMiniPreview
          variant={previewVariant}
          accentClass={accent}
          className="h-full min-h-[120px] transition-transform duration-500 group-hover:scale-[1.02]"
        />
      </div>
    </div>
  );
}

export function ContinueWorkingSkeleton() {
  return (
    <div className="h-[200px] animate-pulse rounded-2xl border border-gray-100 bg-gray-50/80" />
  );
}
