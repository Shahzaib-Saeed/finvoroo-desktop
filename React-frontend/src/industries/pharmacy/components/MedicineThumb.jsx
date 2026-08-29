import { memo } from 'react';
import { Pill } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Catalog thumbnail with calm pill fallback when no photo. */
export const MedicineThumb = memo(function MedicineThumb({
  src,
  alt = '',
  size = 'md',
  className,
  letter = '',
}) {
  const dim =
    size === 'lg' ? 'size-14' : size === 'sm' ? 'size-8' : size === 'xl' ? 'size-16' : 'size-11';
  const mark = String(letter || alt || '')
    .replace(/[^A-Za-z0-9]/g, '')
    .charAt(0)
    .toUpperCase();

  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={cn(
          dim,
          'shrink-0 rounded-lg object-cover ring-1 ring-slate-200/90 bg-slate-50',
          className,
        )}
      />
    );
  }

  if (mark) {
    return (
      <div
        className={cn(
          dim,
          'flex shrink-0 items-center justify-center rounded-lg bg-slate-100 font-semibold text-slate-600 ring-1 ring-slate-200/80',
          size === 'sm' ? 'text-[10px]' : 'text-sm',
          className,
        )}
        aria-hidden
      >
        {mark}
      </div>
    );
  }

  return (
    <div
      className={cn(
        dim,
        'flex shrink-0 items-center justify-center rounded-lg bg-slate-100 ring-1 ring-slate-200/90',
        className,
      )}
      aria-hidden
    >
      <Pill
        className={cn(
          'text-slate-400',
          size === 'sm' ? 'size-3.5' : size === 'lg' || size === 'xl' ? 'size-6' : 'size-5',
        )}
      />
    </div>
  );
});
