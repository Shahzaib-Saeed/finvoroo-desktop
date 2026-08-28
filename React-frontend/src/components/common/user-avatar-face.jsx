import { useState } from 'react';
import { getInitials, resolveUserAvatarUrl } from '@/lib/helpers';
import { cn } from '@/lib/utils';

/**
 * Circular user face for top-bar / menus.
 * Shows the profile photo when available, otherwise name initials.
 */
export function UserAvatarFace({
  user,
  className,
  sizeClass = 'size-9',
  textClass = 'text-xs',
  alt,
}) {
  const [broken, setBroken] = useState(false);
  const src = resolveUserAvatarUrl(user);
  const name = user?.name || user?.username || '';
  const initials = getInitials(name, 2) || '?';

  if (src && !broken) {
    return (
      <img
        src={src}
        alt={alt || name || 'User'}
        className={cn(
          sizeClass,
          'rounded-full border-2 border-green-500 object-cover bg-muted shrink-0',
          className,
        )}
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <span
      aria-hidden={alt ? undefined : true}
      className={cn(
        sizeClass,
        textClass,
        'inline-flex items-center justify-center rounded-full border-2 border-green-500 bg-primary text-primary-foreground font-semibold shrink-0 select-none',
        className,
      )}
    >
      {initials}
    </span>
  );
}
