import { Layers3, Loader2, Printer, Sparkles } from 'lucide-react';
import {
  ADVANCED_ACTIONS,
  FUTURE_ADVANCED,
  RBAC_ACTION_LABELS,
  getCellState,
  permissionTooltip,
} from '../constants';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const ACTION_ICON = {
  manage: Layers3,
  print: Printer,
  export: Sparkles,
  import: Sparkles,
};

function AdvancedToggle({ checked, disabled, busy, readOnly, label, tooltip, onToggle }) {
  const interactive = !disabled && !busy && !readOnly;
  const lines = String(tooltip || label).split('\n');

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <button
          type="button"
          disabled={!interactive}
          onClick={interactive ? onToggle : undefined}
          onKeyDown={(e) => {
            if (!interactive) return;
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              onToggle?.();
            }
          }}
          aria-label={label}
          aria-pressed={checked === true}
          className={cn(
            'flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-all duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            disabled && 'opacity-45',
            interactive && 'cursor-pointer hover:bg-muted/50 hover:border-foreground/15',
            checked === true && 'border-foreground/15 bg-muted/30 shadow-xs',
            !checked && 'border-border',
            readOnly && 'cursor-default',
          )}
        >
          {busy ? (
            <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
          ) : (
            <Checkbox
              checked={checked}
              size="md"
              tabIndex={-1}
              className="pointer-events-none size-[1.125rem] shrink-0 rounded-[4px]"
              aria-hidden
            />
          )}
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">{label}</span>
            <span className="block text-xs text-muted-foreground line-clamp-2">
              {lines[1] || lines[0]}
            </span>
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="left" className="max-w-xs space-y-1">
        <p className="font-semibold">{lines[0]}</p>
        {lines[1] ? <p className="text-xs opacity-90">{lines[1]}</p> : null}
      </TooltipContent>
    </Tooltip>
  );
}

export function AdvancedPermissionsDrawer({
  open,
  onOpenChange,
  module: mod,
  permissionSet,
  canEdit,
  busyCell,
  bulkBusy,
  onToggle,
}) {
  if (!mod) return null;

  const pages = mod.pages?.length
    ? mod.pages
    : [{ key: mod.key, label: mod.label, cells: mod.cells }];

  const grantedCount = pages.reduce((acc, page) => {
    return (
      acc +
      ADVANCED_ACTIONS.filter((action) => {
        const ids = page.cells?.[action]?.ids || [];
        return ids.length > 0 && getCellState(ids, permissionSet).checked === true;
      }).length
    );
  }, 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 gap-0 overflow-hidden duration-200 data-[state=open]:duration-200"
        overlayClassName="duration-150 data-[state=open]:duration-150"
      >
        <SheetHeader className="border-b bg-muted/20 px-5 py-4 text-left space-y-1">
          <div className="flex items-center gap-2 pr-8">
            <span className="inline-flex size-8 items-center justify-center rounded-lg border bg-background">
              <Layers3 className="size-4" />
            </span>
            <SheetTitle className="text-base">Advanced permissions</SheetTitle>
          </div>
          <SheetDescription>
            Extra capabilities for{' '}
            <span className="font-medium text-foreground">{mod.label}</span>. Core
            View/Create/Edit/Delete stay in the main matrix.
          </SheetDescription>
          <div className="pt-1">
            <Badge variant="secondary" className="text-[10px]">
              {grantedCount} enabled
            </Badge>
          </div>
        </SheetHeader>

        <SheetBody className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {pages.map((page) => {
            const available = ADVANCED_ACTIONS.filter(
              (action) => (page.cells?.[action]?.ids || []).length > 0,
            );
            if (!available.length) return null;

            return (
              <div key={page.key} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">{page.label}</h3>
                  <Badge variant="outline" className="text-[10px]">
                    {available.length} options
                  </Badge>
                </div>
                <div className="space-y-2">
                  {available.map((action) => {
                    const ids = page.cells?.[action]?.ids || [];
                    const { checked, disabled } = getCellState(ids, permissionSet);
                    const cellKey = `${mod.key}:${page.key}:${action}`;
                    const tip = permissionTooltip(page.label, action);
                    const Icon = ACTION_ICON[action];
                    return (
                      <div key={cellKey} className="relative">
                        {Icon ? (
                          <Icon className="pointer-events-none absolute right-3 top-3 size-3.5 text-muted-foreground/50" />
                        ) : null}
                        <AdvancedToggle
                          checked={checked}
                          disabled={disabled}
                          busy={busyCell === cellKey || bulkBusy}
                          readOnly={!canEdit}
                          label={RBAC_ACTION_LABELS[action]}
                          tooltip={tip}
                          onToggle={() =>
                            onToggle(mod.key, action, ids, checked, { pageKey: page.key })
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="space-y-2 rounded-2xl border border-dashed bg-muted/15 p-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground">Coming soon</h3>
              <Badge variant="outline" className="text-[10px]">
                Roadmap
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Field-level and scope rules will appear here without crowding the main matrix.
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {FUTURE_ADVANCED.slice(0, 8).map((item) => (
                <div
                  key={item.key}
                  className="rounded-lg border border-dashed bg-background/60 px-2.5 py-2 opacity-65"
                  title={item.hint}
                >
                  <div className="text-xs font-medium">{item.label}</div>
                  <div className="text-[10px] text-muted-foreground line-clamp-1">{item.hint}</div>
                </div>
              ))}
            </div>
          </div>
        </SheetBody>

        <div className="border-t border-border px-5 py-3">
          <Button type="button" variant="mono" className="w-full" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
