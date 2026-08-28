import { useMemo, useState } from 'react';
import { Loader2, Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const FAST_OVERLAY =
  'bg-black/25 backdrop-blur-none duration-75 data-[state=open]:duration-75 data-[state=closed]:duration-75';

const FALLBACK_META = {
  recommended: 'Most teams',
  includes: 'A curated starter set of permissions you can fine-tune after applying.',
};

export function TemplatePickerDialog({
  open,
  onOpenChange,
  presets = [],
  applying,
  onApply,
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (presets || []).filter((p) => {
      if (!q) return true;
      return `${p.label || ''} ${p.key || ''} ${p.description || ''}`.toLowerCase().includes(q);
    });
  }, [presets, query]);

  const handleOpenChange = (next) => {
    if (applying) return;
    if (!next) {
      setQuery('');
      setSelected('');
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl" overlayClassName={FAST_OVERLAY}>
        <DialogHeader>
          <DialogTitle>Apply permission template</DialogTitle>
          <DialogDescription>
            Replace this role&apos;s permissions with a recommended starting set. You can fine-tune
            afterward.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search templates…"
              className="h-10 pl-9"
              autoFocus
            />
          </div>

          <div className="grid max-h-[min(50vh,420px)] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {filtered.map((preset) => {
              const isSelected = selected === preset.key;
              return (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => setSelected(preset.key)}
                  className={cn(
                    'rounded-xl border p-4 text-left transition-all',
                    isSelected
                      ? 'border-foreground/25 bg-muted/40 ring-1 ring-foreground/10 shadow-sm'
                      : 'hover:border-foreground/20 hover:bg-muted/20',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">{preset.label}</div>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {preset.description || FALLBACK_META.includes}
                      </p>
                    </div>
                    <Sparkles className="size-4 shrink-0 text-muted-foreground" />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Badge variant="secondary" className="text-[10px]">
                      Recommended for {preset.recommended_for || FALLBACK_META.recommended}
                    </Badge>
                    {preset.permission_count != null ? (
                      <Badge variant="outline" className="text-[10px] tabular-nums">
                        {preset.permission_count} permissions
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        Starter pack
                      </Badge>
                    )}
                  </div>
                </button>
              );
            })}

            {!filtered.length ? (
              <div className="col-span-full rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
                No templates match your search.
              </div>
            ) : null}
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={applying}>
            Cancel
          </Button>
          <Button
            variant="mono"
            disabled={!selected || applying}
            onClick={() => onApply(selected)}
          >
            {applying ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : null}
            Apply template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
