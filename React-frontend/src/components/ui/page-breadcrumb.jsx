import { Fragment } from 'react';
import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Inline breadcrumb trail (store-inventory header style).
 *
 * items: [{ label: 'Accounting', href: '/...' }, { label: 'Products' }]
 */
export function PageBreadcrumb({ items = [], className }) {
  if (!items.length) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        'flex items-center gap-1.5 text-xs lg:text-sm font-medium min-w-0 flex-wrap',
        className,
      )}
    >
      {items.map((item, index) => {
        const last = index === items.length - 1;
        const content =
          item.href && !last ? (
            <Link
              to={item.href}
              className="text-muted-foreground hover:text-foreground transition-colors truncate"
            >
              {item.label}
            </Link>
          ) : (
            <span
              className={cn(
                'truncate',
                last ? 'text-primary font-medium' : 'text-muted-foreground',
              )}
            >
              {item.label}
            </span>
          );

        return (
          <Fragment key={`${item.label}-${index}`}>
            {content}
            {!last && (
              <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
