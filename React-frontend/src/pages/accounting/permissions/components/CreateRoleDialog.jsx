import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Copy, FilePlus2, Loader2, Sparkles } from 'lucide-react';
import { ROLE_TEMPLATE_VISUALS, formatRoleLabel } from '../constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const FAST_OVERLAY =
  'bg-black/25 backdrop-blur-none duration-75 data-[state=open]:duration-75 data-[state=closed]:duration-75';

const TONE = {
  emerald: 'from-muted/40 to-transparent border-border',
  sky: 'from-muted/40 to-transparent border-border',
  amber: 'from-muted/40 to-transparent border-border',
  violet: 'from-muted/40 to-transparent border-border',
  zinc: 'from-muted/30 to-transparent border-border',
};

function PreviewChips({ nodes }) {
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-1">
      {(nodes || []).map((node, i) => (
        <div key={`${node}-${i}`} className="flex items-center gap-1">
          <span className="rounded-md border bg-background/80 px-1.5 py-0.5 text-[10px] font-medium">
            {node}
          </span>
          {i < nodes.length - 1 && <ArrowRight className="size-2.5 text-muted-foreground" />}
        </div>
      ))}
    </div>
  );
}

export function CreateRoleDialog({
  open,
  onOpenChange,
  creating,
  templates = [],
  roles = [],
  createMode,
  createName,
  createTemplate,
  createSourceId,
  onModeChange,
  onNameChange,
  onTemplateChange,
  onSourceChange,
  onSubmit,
}) {
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (open) setStep(1);
  }, [open]);

  const cards = useMemo(() => {
    return (templates || []).map((t) => {
      const visual = ROLE_TEMPLATE_VISUALS[t.key] || {
        title: t.label || t.key,
        blurb: t.description || 'Recommended starter permissions for this role type.',
        tone: 'zinc',
        preview: ['View', 'Create', 'Edit'],
      };
      return { key: t.key, label: t.label, ...visual };
    });
  }, [templates]);

  const handleOpenChange = (next) => {
    if (creating) return;
    if (!next) setStep(1);
    onOpenChange(next);
  };

  const canContinue =
    createMode === 'blank' ||
    (createMode === 'template' && !!createTemplate) ||
    (createMode === 'duplicate' && !!createSourceId);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl" overlayClassName={FAST_OVERLAY}>
        <DialogHeader>
          <DialogTitle>Create a company role</DialogTitle>
          <DialogDescription>
            {step === 1
              ? 'Pick a starting point — you can fine-tune every permission after.'
              : 'Name the role so people know who it is for.'}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
            <span
              className={cn(
                'inline-flex size-5 items-center justify-center rounded-full border text-[10px]',
                step === 1 ? 'border-foreground bg-foreground text-background' : 'border-border',
              )}
            >
              1
            </span>
            Starting point
            <span className="text-muted-foreground/40">→</span>
            <span
              className={cn(
                'inline-flex size-5 items-center justify-center rounded-full border text-[10px]',
                step === 2 ? 'border-foreground bg-foreground text-background' : 'border-border',
              )}
            >
              2
            </span>
            Name
          </div>

          {step === 1 && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  onModeChange('blank');
                  onTemplateChange('');
                  onSourceChange('');
                }}
                className={cn(
                  'w-full rounded-2xl border bg-gradient-to-br from-muted/40 to-transparent p-3.5 text-left transition-all',
                  createMode === 'blank'
                    ? 'border-foreground/25 ring-1 ring-foreground/10'
                    : 'border-border hover:border-foreground/20',
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="inline-flex size-9 items-center justify-center rounded-xl border bg-background">
                    <FilePlus2 className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">Start blank</div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      No permissions yet — build access from the matrix.
                    </p>
                  </div>
                </div>
              </button>

              {cards.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <Sparkles className="size-3.5" />
                    Templates
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {cards.map((card) => {
                      const selected = createMode === 'template' && createTemplate === card.key;
                      return (
                        <button
                          key={card.key}
                          type="button"
                          onClick={() => {
                            onModeChange('template');
                            onTemplateChange(card.key);
                            onSourceChange('');
                            if (!createName.trim()) onNameChange(card.title);
                          }}
                          className={cn(
                            'rounded-2xl border bg-gradient-to-br p-3 text-left transition-all',
                            TONE[card.tone] || TONE.zinc,
                            selected
                              ? 'ring-1 ring-foreground/15 border-foreground/25'
                              : 'hover:border-foreground/20',
                          )}
                        >
                          <div className="text-sm font-semibold">{card.title}</div>
                          <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                            {card.blurb}
                          </p>
                          <PreviewChips nodes={card.preview} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  onModeChange('duplicate');
                  onTemplateChange('');
                }}
                className={cn(
                  'w-full rounded-2xl border p-3.5 text-left transition-all',
                  createMode === 'duplicate'
                    ? 'border-foreground/25 ring-1 ring-foreground/10 bg-muted/30'
                    : 'border-border hover:border-foreground/20',
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="inline-flex size-9 items-center justify-center rounded-xl border bg-background">
                    <Copy className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div>
                      <div className="text-sm font-semibold">Duplicate existing role</div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Copy permissions from a role you already trust.
                      </p>
                    </div>
                    {createMode === 'duplicate' && (
                      <Select value={createSourceId} onValueChange={onSourceChange}>
                        <SelectTrigger className="h-9 bg-background" onClick={(e) => e.stopPropagation()}>
                          <SelectValue placeholder="Choose role…" />
                        </SelectTrigger>
                        <SelectContent>
                          {roles
                            .filter((r) => r.is_active !== false)
                            .map((r) => (
                              <SelectItem key={r.id} value={String(r.id)}>
                                {formatRoleLabel(r.label || r.name)}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="rounded-xl border bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
                Starting from{' '}
                <span className="font-medium text-foreground">
                  {createMode === 'blank' && 'blank'}
                  {createMode === 'template' &&
                    (cards.find((c) => c.key === createTemplate)?.title || 'template')}
                  {createMode === 'duplicate' &&
                    formatRoleLabel(
                      roles.find((r) => String(r.id) === String(createSourceId))?.label ||
                        roles.find((r) => String(r.id) === String(createSourceId))?.name ||
                        'existing role',
                    )}
                </span>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-role-name">Role name</Label>
                <Input
                  id="create-role-name"
                  value={createName}
                  onChange={(e) => onNameChange(e.target.value)}
                  placeholder="e.g. Sales Manager"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && createName.trim()) onSubmit();
                  }}
                />
                <p className="text-[11px] text-muted-foreground">
                  Shown to admins when assigning people. Keep it clear and short.
                </p>
              </div>
            </div>
          )}
        </DialogBody>

        <DialogFooter className="gap-2 sm:gap-2">
          {step === 1 ? (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={creating}>
                Cancel
              </Button>
              <Button variant="mono" disabled={!canContinue} onClick={() => setStep(2)}>
                Continue
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)} disabled={creating}>
                Back
              </Button>
              <Button
                variant="mono"
                onClick={onSubmit}
                disabled={creating || !createName.trim()}
              >
                {creating ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : null}
                Create role
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
