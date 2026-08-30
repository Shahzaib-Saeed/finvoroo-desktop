import { cn } from '@/lib/utils';
import { toAbsoluteUrl } from '@/lib/helpers';
import { PHARMACY_BRAND_LOGO } from '../branding';

/** Same logo + title treatment as the pharmacy workspace sidebar. */
export function PharmacyBrandMark({
  compact = false,
  showPosBadge = false,
  showSubtitle = false,
  hideLabel = false,
  className,
  titleClassName,
  labelClassName,
}) {
  return (
    <span className={cn('flex min-w-0 items-center gap-2 sm:gap-2.5', className)}>
      <img
        src={toAbsoluteUrl(PHARMACY_BRAND_LOGO)}
        alt=""
        className={cn('shrink-0 object-contain', compact ? 'size-8' : 'size-10')}
      />
      {!hideLabel ? (
        <span
          className={cn(
            'min-w-0 font-bold leading-tight whitespace-nowrap transition-all duration-300 overflow-hidden',
            compact ? 'text-sm' : 'text-base',
            labelClassName,
            compact && !labelClassName && 'hidden sm:block',
          )}
        >
          <span className={cn('block truncate text-slate-900', titleClassName)}>
            Finvoroo <span className="text-emerald-700">Pharmacy</span>
            {showPosBadge ? (
              <span className="ms-1.5 text-[13px] font-semibold text-slate-500">POS</span>
            ) : null}
          </span>
          {showSubtitle ? (
            <span className="mt-0.5 hidden truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 md:block">
              Counter sale · Smart dispensing
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
