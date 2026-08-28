import { useRef } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  MoreHorizontal,
  Settings2,
  Shield,
} from 'lucide-react';
import {
  MAIN_ACTIONS,
  RBAC_ACTION_LABELS,
  countAdvancedForModule,
  countColumnGranted,
  getCellState,
  permissionTooltip,
} from '../constants';
import { HighlightText } from './HighlightText';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const CELL = 'w-[4.5rem] sm:w-[5rem] shrink-0';
const NAME = 'w-[14rem] sm:w-[17rem] lg:w-[20rem] shrink-0';
const ROW_H = 'h-11';
function colTint(colIndex) {
  return Number(colIndex) % 2 === 1 ? 'bg-muted/25' : '';
}

function focusMatrixCell(root, row, col) {
  if (!root) return;
  const el = root.querySelector(`[data-matrix-row="${row}"][data-matrix-col="${col}"]`);
  if (el && !el.disabled) {
    el.focus();
    return true;
  }
  return false;
}

function ToggleCell({
  checked,
  disabled,
  busy,
  readOnly,
  label,
  tooltip,
  onToggle,
  flash,
  rowIndex,
  colIndex,
}) {
  const interactive = !disabled && !busy && !readOnly;

  if (disabled) {
    return (
      <div
        className={cn(
          'flex items-center justify-center border-l border-border/60',
          ROW_H,
          CELL,
          colTint(colIndex),
        )}
        data-matrix-col={colIndex}
        aria-hidden
      >
        <span className="text-sm text-muted-foreground/30">—</span>
      </div>
    );
  }

  const lines = String(tooltip || label).split('\n');

  return (
    <Tooltip delayDuration={180}>
      <TooltipTrigger asChild>
        <button
          type="button"
          disabled={busy || readOnly}
          data-matrix-row={rowIndex}
          data-matrix-col={colIndex}
          onClick={interactive ? onToggle : undefined}
          onKeyDown={(e) => {
            const root = e.currentTarget.closest('[data-permission-matrix]');
            if (e.key === ' ' || e.key === 'Enter') {
              if (!interactive) return;
              e.preventDefault();
              onToggle?.();
              return;
            }
            if (!root) return;
            const r = Number(rowIndex);
            const c = Number(colIndex);
            if (e.key === 'ArrowRight') {
              e.preventDefault();
              for (let next = c + 1; next < MAIN_ACTIONS.length; next += 1) {
                if (focusMatrixCell(root, r, next)) break;
              }
            } else if (e.key === 'ArrowLeft') {
              e.preventDefault();
              for (let next = c - 1; next >= 0; next -= 1) {
                if (focusMatrixCell(root, r, next)) break;
              }
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              for (let next = r + 1; next < 400; next += 1) {
                if (focusMatrixCell(root, next, c)) break;
              }
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              for (let next = r - 1; next >= 0; next -= 1) {
                if (focusMatrixCell(root, next, c)) break;
              }
            }
          }}
          aria-label={label}
          aria-pressed={checked === true}
          className={cn(
            'group/cell flex items-center justify-center border-l border-border/60 transition-all duration-150',
            ROW_H,
            CELL,
            colTint(colIndex),
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:z-10',
            interactive && 'cursor-pointer hover:bg-muted/55',
            checked === true && 'bg-muted/45',
            readOnly && 'cursor-default',
            flash && 'animate-in zoom-in-95 duration-200',
          )}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : (
            <Checkbox
              checked={checked}
              size="md"
              tabIndex={-1}
              className={cn(
                'pointer-events-none size-[1.125rem] rounded-[4px] shadow-sm transition-transform duration-150',
                'group-hover/cell:scale-105 group-focus-visible/cell:scale-105',
              )}
              aria-hidden
            />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[280px] space-y-1">
        <p className="font-semibold">{lines[0]}</p>
        {lines[1] ? <p className="text-xs opacity-90">{lines[1]}</p> : null}
      </TooltipContent>
    </Tooltip>
  );
}

function ActionCols({ children }) {
  return <div className="flex shrink-0 items-stretch">{children}</div>;
}

export function PermissionMatrix({
  modules,
  permissionSet,
  canEdit,
  busyCell,
  bulkBusy,
  expandedModules,
  searchQuery = '',
  flashCellKey = null,
  onToggleExpanded,
  onExpandAll,
  onCollapseAll,
  onCellToggle,
  onConfirmBulk,
  onOpenAdvanced,
}) {
  const listRef = useRef(null);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b bg-muted/25 px-4 py-2.5 sm:px-5">
        <span className="text-sm font-medium text-foreground/80">Permission matrix</span>
        <div className="flex items-center gap-3 text-sm">
          <button
            type="button"
            onClick={onExpandAll}
            className="font-medium text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            Expand all
          </button>
          <span className="text-muted-foreground/40">·</span>
          <button
            type="button"
            onClick={onCollapseAll}
            className="text-muted-foreground hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            Collapse all
          </button>
        </div>
      </div>

      <div
        ref={listRef}
        data-permission-matrix
        className="min-h-0 flex-1 overflow-auto overscroll-contain"
        role="grid"
        aria-label="Role permissions"
      >
        <div className="min-w-[820px]">
          {/* Sticky column headers — always visible while scrolling */}
          <div className="sticky top-0 z-30 flex items-stretch gap-0 border-b border-border bg-background">
            <div
              className={cn(
                NAME,
                'flex items-center px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:px-5',
              )}
            >
              Module / page
            </div>
            <ActionCols>
              {MAIN_ACTIONS.map((action) => {
                const { granted, total } = countColumnGranted(modules, action, permissionSet);
                return (
                  <div
                    key={action}
                    className={cn(
                      'flex flex-col items-center justify-center gap-1 border-l border-border/60 px-0.5 py-3',
                      CELL,
                      colTint(MAIN_ACTIONS.indexOf(action)),
                    )}
                  >
                    <Tooltip delayDuration={120}>
                      <TooltipTrigger asChild>
                        <span className="cursor-default text-xs font-semibold tracking-wide text-foreground/80">
                          {RBAC_ACTION_LABELS[action]}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {RBAC_ACTION_LABELS[action]} · {granted}/{total}
                      </TooltipContent>
                    </Tooltip>
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      {granted}/{total}
                    </span>
                    {canEdit && total > 0 ? (
                      <div className="flex items-center gap-1 text-[11px] leading-none">
                        <button
                          type="button"
                          disabled={bulkBusy || granted === total}
                          className="font-medium text-foreground hover:underline disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                          onClick={() =>
                            onConfirmBulk({
                              type: 'column',
                              action,
                              grant: true,
                              title: `Grant all ${RBAC_ACTION_LABELS[action]}?`,
                              description: `Enable ${RBAC_ACTION_LABELS[action]} on every matching page.`,
                            })
                          }
                        >
                          All
                        </button>
                        <span className="text-muted-foreground/40">/</span>
                        <button
                          type="button"
                          disabled={bulkBusy || granted === 0}
                          className="text-muted-foreground hover:underline disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                          onClick={() =>
                            onConfirmBulk({
                              type: 'column',
                              action,
                              grant: false,
                              title: `Clear all ${RBAC_ACTION_LABELS[action]}?`,
                              description: `Remove ${RBAC_ACTION_LABELS[action]} from every matching page.`,
                            })
                          }
                        >
                          None
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            <div className="flex w-11 shrink-0 items-center justify-center border-l border-border/50 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              More
            </div>
            </ActionCols>
          </div>

          {modules.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <Shield className="size-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No permissions match your filter.</p>
            </div>
          ) : (
            modules.map((mod, modIndex) => {
              const expanded = expandedModules[mod.key] !== false;
              const pages = mod.pages || [];
              const advanced = countAdvancedForModule(mod, permissionSet);
              const hasPages = pages.length > 0;
              // Stable row indices across expanded tree for arrow-key navigation
              let rowCursor = 0;
              for (let i = 0; i < modIndex; i += 1) {
                const m = modules[i];
                rowCursor += 1;
                if ((m.pages || []).length && expandedModules[m.key] !== false) {
                  rowCursor += (m.pages || []).length;
                }
              }
              const moduleRowIndex = rowCursor;

              return (
                <div key={mod.key} className="border-b border-border/50 last:border-0">
                  <div
                    className={cn(
                      'group/row flex items-stretch transition-all duration-150',
                      'bg-muted/30 hover:bg-muted/60 hover:shadow-[inset_3px_0_0_0_hsl(var(--foreground)/0.12)]',
                    )}
                  >
                    <button
                      type="button"
                      className={cn(
                        NAME,
                        'flex items-center gap-2 px-4 py-2.5 text-left sm:px-5',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                      )}
                      onClick={() => hasPages && onToggleExpanded(mod.key)}
                      aria-expanded={hasPages ? expanded : undefined}
                    >
                      <span
                        className="inline-flex size-6 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground shadow-xs"
                        aria-hidden
                      >
                        {hasPages ? (
                          expanded ? (
                            <ChevronDown className="size-3.5" />
                          ) : (
                            <ChevronRight className="size-3.5" />
                          )
                        ) : (
                          <span className="size-3.5" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold tracking-tight">
                          <HighlightText text={mod.label} query={searchQuery} />
                        </span>
                        {mod.description ? (
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            {mod.description}
                          </span>
                        ) : null}
                      </span>
                      {hasPages ? (
                        <span className="ml-auto shrink-0 rounded-md bg-background px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground ring-1 ring-border/70">
                          {pages.length}
                        </span>
                      ) : null}
                    </button>

                    <ActionCols>
                      {MAIN_ACTIONS.map((action, colIndex) => {
                        const ids = mod.cells?.[action]?.ids || [];
                        const cellKey = `${mod.key}::${action}`;
                        const { checked, disabled } = getCellState(ids, permissionSet);
                        return (
                          <ToggleCell
                            key={cellKey}
                            checked={checked}
                            disabled={disabled}
                            busy={busyCell === cellKey || bulkBusy}
                            readOnly={!canEdit}
                            label={`${mod.label} — ${RBAC_ACTION_LABELS[action]}`}
                            tooltip={permissionTooltip(mod.label, action)}
                            flash={flashCellKey === cellKey}
                            rowIndex={moduleRowIndex}
                            colIndex={colIndex}
                            onToggle={() => onCellToggle(mod.key, action, ids, checked)}
                          />
                        );
                      })}

                      <div className={cn('flex w-11 shrink-0 items-center justify-center border-l border-border/50', ROW_H)}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-9"
                              aria-label={`More actions for ${mod.label}`}
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => onOpenAdvanced(mod)}>
                              <Settings2 className="mr-2 size-4" />
                              Advanced
                              {advanced.total > 0 ? (
                                <span className="ml-auto text-xs text-muted-foreground">
                                  {advanced.granted}/{advanced.total}
                                </span>
                              ) : null}
                            </DropdownMenuItem>
                            {canEdit ? (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  disabled={bulkBusy}
                                  onClick={() =>
                                    onConfirmBulk({
                                      type: 'module',
                                      mod,
                                      grant: true,
                                      title: `Select all in ${mod.label}?`,
                                      description:
                                        'Grants core actions for every page in this module.',
                                    })
                                  }
                                >
                                  Select module
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  disabled={bulkBusy}
                                  onClick={() =>
                                    onConfirmBulk({
                                      type: 'module',
                                      mod,
                                      grant: false,
                                      title: `Clear ${mod.label}?`,
                                      description:
                                        'Removes core permissions for every page in this module.',
                                    })
                                  }
                                >
                                  Clear module
                                </DropdownMenuItem>
                              </>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </ActionCols>
                  </div>

                  {/* Animated expand */}
                  <div
                    className={cn(
                      'grid transition-[grid-template-rows] duration-200 ease-out',
                      hasPages && expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                    )}
                  >
                    <div className="overflow-hidden">
                      {hasPages && expanded
                        ? pages.map((page, idx) => (
                            <div
                              key={page.key}
                              className={cn(
                                'group/row flex items-stretch border-t border-border/40 transition-colors duration-150',
                                idx % 2 === 1 ? 'bg-muted/10' : 'bg-background',
                                'hover:bg-muted/35 hover:shadow-[inset_3px_0_0_0_hsl(var(--foreground)/0.08)]',
                              )}
                            >
                              <div className={cn(NAME, 'flex items-center py-2 pl-11 pr-4 sm:pl-12 sm:pr-5')}>
                                <span className="block truncate text-sm text-foreground/90">
                                  <HighlightText text={page.label} query={searchQuery} />
                                </span>
                              </div>
                              <ActionCols>
                                {MAIN_ACTIONS.map((action, colIndex) => {
                                  const ids = page.cells?.[action]?.ids || [];
                                  const cellKey = `${mod.key}:${page.key}:${action}`;
                                  const { checked, disabled } = getCellState(ids, permissionSet);
                                  return (
                                    <ToggleCell
                                      key={cellKey}
                                      checked={checked}
                                      disabled={disabled}
                                      busy={busyCell === cellKey || bulkBusy}
                                      readOnly={!canEdit}
                                      label={`${page.label} — ${RBAC_ACTION_LABELS[action]}`}
                                      tooltip={permissionTooltip(page.label, action)}
                                      flash={flashCellKey === cellKey}
                                      rowIndex={moduleRowIndex + 1 + idx}
                                      colIndex={colIndex}
                                      onToggle={() =>
                                        onCellToggle(mod.key, action, ids, checked, {
                                          pageKey: page.key,
                                        })
                                      }
                                    />
                                  );
                                })}
                                <div className={cn('w-11 shrink-0 border-l border-border/50', ROW_H)} />
                              </ActionCols>
                            </div>
                          ))
                        : null}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
