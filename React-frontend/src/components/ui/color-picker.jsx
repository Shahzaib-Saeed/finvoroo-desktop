import * as React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const SWATCHES = [
  '#000000',
  '#374151',
  '#6b7280',
  '#ffffff',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#0ea5e9',
  '#6366f1',
  '#a855f7',
  '#ec4899',
];

const HEX_PATTERN = /^#[0-9a-fA-F]{3,8}$/;

/**
 * A small hex color picker built from the existing Popover/Input
 * primitives (no third-party color-picker dependency) — used by the
 * Invoice Form Designer's Properties panel for `color`/`background`/
 * `fill` style properties, which the backend's CanvasConfigValidator
 * only accepts as `#rgb`/`#rrggbb`/`#rrggbbaa` hex strings.
 *
 * @param {{value?: string|null, onChange: (hex: string|null) => void, allowNone?: boolean, className?: string}} props
 */
export function ColorPicker({ value, onChange, allowNone = false, className }) {
  const [draft, setDraft] = React.useState(value || '');

  React.useEffect(() => {
    setDraft(value || '');
  }, [value]);

  const commit = (next) => {
    if (next === '' || next === 'none') {
      if (allowNone) onChange(null);
      return;
    }
    if (HEX_PATTERN.test(next)) {
      onChange(next);
    }
  };

  const swatchValue = HEX_PATTERN.test(value || '') ? value : '#000000';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-8.5 w-full items-center gap-2 rounded-md border border-input bg-background px-2 text-xs shadow-xs',
            className,
          )}
        >
          <span
            className="size-4 shrink-0 rounded border border-input"
            style={{ background: HEX_PATTERN.test(value || '') ? value : 'transparent' }}
          />
          <span className="truncate text-muted-foreground">{value || (allowNone ? 'None' : '#000000')}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 space-y-3">
        <input
          type="color"
          value={swatchValue}
          onChange={(e) => commit(e.target.value)}
          className="h-9 w-full cursor-pointer rounded border border-input bg-transparent p-0"
        />
        <Input
          variant="sm"
          value={draft}
          placeholder="#000000"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => commit(draft.trim())}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit(draft.trim());
          }}
        />
        <div className="grid grid-cols-6 gap-1.5">
          {SWATCHES.map((sw) => (
            <button
              key={sw}
              type="button"
              title={sw}
              onClick={() => {
                setDraft(sw);
                commit(sw);
              }}
              className={cn(
                'size-6 rounded border border-input',
                value === sw && 'ring-2 ring-ring ring-offset-1',
              )}
              style={{ background: sw }}
            />
          ))}
        </div>
        {allowNone && (
          <button
            type="button"
            className="text-xs text-muted-foreground underline"
            onClick={() => {
              setDraft('');
              onChange(null);
            }}
          >
            Clear (none)
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
