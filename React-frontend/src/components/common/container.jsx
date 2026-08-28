import { cn } from '@/lib/utils';

/**
 * Profile-style content width wrapper (matches Metronic demo Container).
 */
export function Container({ children, className = '' }) {
  return (
    <div
      data-slot="container"
      className={cn('w-full max-w-[1320px] mx-auto px-4 lg:px-6', className)}
    >
      {children}
    </div>
  );
}
