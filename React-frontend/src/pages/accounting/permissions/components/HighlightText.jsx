import { splitHighlight } from '../constants';
import { cn } from '@/lib/utils';

export function HighlightText({ text, query, className }) {
  const parts = splitHighlight(text, query);
  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.match ? (
          <mark
            key={`${i}-${part.text}`}
            className="rounded-sm bg-foreground/10 px-0.5 text-inherit ring-1 ring-foreground/15"
          >
            {part.text}
          </mark>
        ) : (
          <span key={`${i}-${part.text}`}>{part.text}</span>
        ),
      )}
    </span>
  );
}

export function MatchCount({ count, query, className }) {
  if (!String(query || '').trim()) return null;
  return (
    <span className={cn('text-sm text-muted-foreground', className)}>
      <span className="font-semibold tabular-nums text-foreground">{count}</span>{' '}
      matching {count === 1 ? 'module' : 'modules'}
    </span>
  );
}
