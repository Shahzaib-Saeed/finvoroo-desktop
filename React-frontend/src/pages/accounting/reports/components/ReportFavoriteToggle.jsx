import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { reportCenterApi } from '../api/report-center.api';

/**
 * Star toggle for favoriting a standard report or a saved report
 * definition. Optimistically updates, reverts on request failure.
 */
export function ReportFavoriteToggle({
  favoritableKind = 'standard',
  standardReportKey,
  reportDefinitionId,
  isFavorited = false,
  onChange,
  className,
}) {
  const [favorited, setFavorited] = useState(isFavorited);
  const [busy, setBusy] = useState(false);

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;

    const next = !favorited;
    setFavorited(next);
    setBusy(true);
    try {
      const { data } = await reportCenterApi.toggleFavorite({
        favoritable_kind: favoritableKind,
        standard_report_key: favoritableKind === 'standard' ? standardReportKey : undefined,
        report_definition_id: favoritableKind === 'definition' ? reportDefinitionId : undefined,
      });
      const resolved = data?.data?.is_favorited ?? next;
      setFavorited(resolved);
      onChange?.(resolved);
    } catch {
      setFavorited(!next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-pressed={favorited}
      aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
      className={cn(
        'inline-flex size-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:text-slate-700',
        favorited && 'text-amber-500 hover:text-amber-600',
        className,
      )}
    >
      <Star className="size-4" strokeWidth={1.75} fill={favorited ? 'currentColor' : 'none'} />
    </button>
  );
}
