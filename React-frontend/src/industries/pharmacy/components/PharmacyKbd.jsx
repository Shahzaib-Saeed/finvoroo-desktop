import { cn } from '@/lib/utils';

export function PharmacyKbd({ children, className }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-md px-1.5',
        'border border-zinc-400 bg-white text-[10px] font-bold tracking-wide',
        'text-black shadow-none',
        className,
      )}
    >
      {children}
    </kbd>
  );
}

export function PharmacyShortcutHint({ keys = [], label, className }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-medium text-black', className)}>
      {keys.map((k) => (
        <PharmacyKbd key={k}>{k}</PharmacyKbd>
      ))}
      {label ? <span>{label}</span> : null}
    </span>
  );
}
