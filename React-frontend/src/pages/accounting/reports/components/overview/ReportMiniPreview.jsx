import { cn } from '@/lib/utils';

const PREVIEW_VARIANTS = {
  chart: [38, 62, 45, 78, 55, 70, 48],
  table: null,
};

export function ReportMiniPreview({ variant = 'chart', accentClass = 'bg-blue-500', className }) {
  const bars = PREVIEW_VARIANTS[variant] || PREVIEW_VARIANTS.chart;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-gray-200/80 bg-gradient-to-br from-white to-gray-50/80 p-3',
        className,
      )}
      aria-hidden
    >
      <div className="mb-2 flex items-center gap-1.5">
        <div className={cn('size-1.5 rounded-full', accentClass, 'opacity-80')} />
        <div className="h-1.5 w-12 rounded-full bg-gray-200" />
        <div className="h-1.5 w-8 rounded-full bg-gray-100" />
      </div>

      {variant === 'table' ? (
        <div className="space-y-1.5">
          {[0.9, 0.75, 0.85, 0.6, 0.7].map((w, i) => (
            <div key={i} className="flex gap-1.5">
              <div className="h-2 flex-1 rounded-sm bg-gray-100" style={{ maxWidth: `${w * 100}%` }} />
              <div className="h-2 w-6 rounded-sm bg-gray-50" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex h-16 items-end gap-1 px-0.5">
          {bars.map((h, i) => (
            <div
              key={i}
              className={cn('flex-1 rounded-sm opacity-90 transition-all', accentClass)}
              style={{ height: `${h}%`, opacity: 0.15 + (i % 3) * 0.12 }}
            />
          ))}
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white/90 to-transparent" />
    </div>
  );
}
