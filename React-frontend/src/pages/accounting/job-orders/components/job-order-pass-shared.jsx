import { useMemo } from 'react';

export function PassMicro({ children, className = '' }) {
  return (
    <p
      className={
        'text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 ' + className
      }
    >
      {children}
    </p>
  );
}

export function PassField({ label, value, sub, big, mono, compact }) {
  return (
    <div className="min-w-0">
      <PassMicro>{label}</PassMicro>
      <p
        className={
          'mt-1 font-bold text-slate-900 leading-tight wrap-break-word ' +
          (big && !compact ? 'text-2xl tracking-tight ' : compact ? 'text-xs ' : 'text-sm ') +
          (mono ? 'font-mono ' : '')
        }
      >
        {value || '—'}
      </p>
      {sub ? (
        <p className="text-[11px] text-slate-500 mt-0.5 uppercase tracking-wide line-clamp-1">
          {sub}
        </p>
      ) : null}
    </div>
  );
}

export function PassStubField({ label, value }) {
  return (
    <div>
      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="text-sm font-bold text-slate-900 leading-tight wrap-break-word truncate">
        {value || '—'}
      </p>
    </div>
  );
}

export function PassScheduleCell({ icon: Icon, label, value, compact }) {
  return (
    <div className={compact ? 'px-2 py-2 flex items-start gap-1.5 min-w-0' : 'px-3 py-3 flex items-start gap-2 min-w-0'}>
      <Icon className={compact ? 'size-3.5 mt-0.5 text-slate-500 shrink-0' : 'size-4 mt-0.5 text-slate-500 shrink-0'} />
      <div className="min-w-0">
        <PassMicro className={compact ? 'text-[8px]' : ''}>{label}</PassMicro>
        <p
          className={
            (compact ? 'text-xs' : 'text-sm') +
            ' font-bold text-slate-900 leading-tight mt-0.5 wrap-break-word truncate'
          }
        >
          {value || '—'}
        </p>
      </div>
    </div>
  );
}

export function PassHeaderPattern({ id = 'jo-dots' }) {
  return (
    <svg
      className="absolute inset-0 w-full h-full opacity-40 pointer-events-none"
      aria-hidden
    >
      <defs>
        <pattern id={id} x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1" fill="rgba(255,255,255,0.35)" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

export function usePassBarcodeStripes(value) {
  return useMemo(() => {
    const s = String(value || 'JO-00-0000');
    const stripes = [];
    for (let i = 0; i < s.length; i++) {
      const code = s.charCodeAt(i);
      stripes.push({ w: 1 + (code % 3), c: true });
      stripes.push({ w: 1 + ((code >> 1) % 2), c: false });
      stripes.push({ w: 1 + ((code >> 2) % 3), c: true });
      stripes.push({ w: 1 + ((code >> 3) % 2), c: false });
    }
    stripes.unshift({ w: 3, c: false });
    stripes.push({ w: 3, c: false });
    return stripes;
  }, [value]);
}

export function PassBarcode({ value, height = 44, className = '' }) {
  const stripes = usePassBarcodeStripes(value);
  return (
    <div className={'flex items-stretch ' + className} style={{ height }}>
      {stripes.map((s, i) => (
        <div
          key={i}
          style={{ width: `${s.w}px`, background: s.c ? '#0f172a' : 'transparent' }}
        />
      ))}
    </div>
  );
}

export function PassPerforation({ vertical = true }) {
  if (vertical) {
    return (
      <div className="relative hidden md:block w-0 shrink-0 self-stretch">
        <div className="absolute inset-y-0 -left-px w-px border-l-2 border-dashed border-slate-300" />
        <div className="absolute -top-2.5 -left-2.5 size-5 rounded-full bg-slate-50 ring-1 ring-slate-200" />
        <div className="absolute -bottom-2.5 -left-2.5 size-5 rounded-full bg-slate-50 ring-1 ring-slate-200" />
      </div>
    );
  }
  return (
    <div className="md:hidden border-t-2 border-dashed border-slate-300 relative mx-3">
      <div className="absolute -left-3 -top-2.5 size-5 rounded-full bg-slate-50 ring-1 ring-slate-200" />
      <div className="absolute -right-3 -top-2.5 size-5 rounded-full bg-slate-50 ring-1 ring-slate-200" />
    </div>
  );
}
