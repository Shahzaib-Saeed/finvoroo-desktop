import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DEFAULT_SHORTCUTS,
  SHORTCUT_LABELS,
  saveShortcuts,
} from '../lib/shortcuts';

export function PosShortcutsDialog({
  open,
  onOpenChange,
  shortcuts,
  onShortcutsChange,
  posSettings,
  onSettingsChange,
}) {
  const [draft, setDraft] = useState(shortcuts);
  const [tab, setTab] = useState('keys');

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) setDraft(shortcuts);
        onOpenChange(o);
      }}
    >
      <DialogContent data-pos-no-scan className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>POS settings</DialogTitle>
        </DialogHeader>
        <div className="mb-3 flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={tab === 'keys' ? 'default' : 'outline'}
            className="rounded-lg"
            onClick={() => setTab('keys')}
          >
            Shortcuts
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tab === 'prefs' ? 'default' : 'outline'}
            className="rounded-lg"
            onClick={() => setTab('prefs')}
          >
            Preferences
          </Button>
        </div>

        {tab === 'keys' ? (
          <div className="space-y-3">
            {SHORTCUT_LABELS.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">{s.action}</span>
                <Input
                  data-pos-typing
                  className="h-9 w-28 rounded-lg text-center font-mono text-xs"
                  value={draft[s.id] || ''}
                  onChange={(e) => setDraft((d) => ({ ...d, [s.id]: e.target.value }))}
                  onKeyDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    let label = e.key;
                    if (e.key === ' ') label = 'Space';
                    if (e.ctrlKey || e.metaKey) label = `Ctrl+${e.key.toUpperCase()}`;
                    else if (/^f\d+$/i.test(e.key)) label = e.key.toUpperCase();
                    else if (e.key === 'Escape') label = 'Escape';
                    else label = e.key.length === 1 ? e.key.toUpperCase() : e.key;
                    setDraft((d) => ({ ...d, [s.id]: label }));
                  }}
                />
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1 rounded-xl"
                onClick={() => setDraft({ ...DEFAULT_SHORTCUTS })}
              >
                Reset
              </Button>
              <Button
                type="button"
                className="h-11 flex-1 rounded-xl bg-foreground text-background"
                onClick={() => {
                  saveShortcuts(draft);
                  onShortcutsChange(draft);
                  onOpenChange(false);
                }}
              >
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>Auto-print receipt after sale</span>
              <input
                type="checkbox"
                checked={Boolean(posSettings?.autoPrint)}
                onChange={(e) => onSettingsChange({ autoPrint: e.target.checked })}
              />
            </label>
            <div>
              <Label className="text-xs text-muted-foreground">
                Hardware bridge URL (optional local agent)
              </Label>
              <Input
                data-pos-typing
                className="mt-1 h-11 rounded-xl"
                placeholder="http://127.0.0.1:9100/print"
                defaultValue={localStorage.getItem('finvoroo.pos.bridge_url') || ''}
                onBlur={(e) => {
                  localStorage.setItem('finvoroo.pos.bridge_url', e.target.value.trim());
                }}
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
