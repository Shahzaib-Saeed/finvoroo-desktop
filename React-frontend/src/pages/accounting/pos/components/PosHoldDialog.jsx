import { useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { formatMoney } from '../lib/cart-math';

export function PosHoldDialog({
  open,
  onOpenChange,
  holds,
  currency,
  canHold,
  onHoldCurrent,
  onResume,
  onDiscard,
  hasCart,
}) {
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-pos-no-scan
        className="max-w-lg gap-0 overflow-hidden rounded-2xl p-0"
      >
        <DialogHeader className="border-b border-foreground/10 px-5 py-4">
          <DialogTitle className="text-lg font-semibold">Held sales</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Park the current cart or resume a previous hold
          </p>
        </DialogHeader>

        {canHold && hasCart && (
          <div className="flex gap-2 border-b border-foreground/8 px-5 py-4">
            <Input
              data-pos-typing
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Optional label (table, name…)"
              className="h-11 rounded-xl"
            />
            <Button
              type="button"
              className="h-11 shrink-0 rounded-xl bg-foreground text-background"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                try {
                  await onHoldCurrent(label);
                  setLabel('');
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : 'Hold cart'}
            </Button>
          </div>
        )}

        <div className="max-h-80 space-y-1 overflow-y-auto px-3 py-3">
          {holds.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No held sales
            </p>
          ) : (
            holds.map((h) => (
              <div
                key={h.id}
                className="flex items-center gap-2 rounded-xl px-3 py-3 hover:bg-muted/50"
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => onResume(h.id, h)}
                >
                  <p className="truncate text-sm font-semibold">
                    {h.label || h.hold_number}
                    {h.local ? ' (local)' : ''}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {h.customer?.name || 'Walk-in'} · {h.line_count || 0} lines ·{' '}
                    {formatMoney(h.total, currency)}
                  </p>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-10 text-muted-foreground hover:text-destructive"
                  onClick={() => onDiscard(h.id, h)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
