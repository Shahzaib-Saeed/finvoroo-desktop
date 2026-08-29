import {
  ChevronDown,
  Keyboard,
  Loader2,
  MoreHorizontal,
  Pill,
  Printer,
  RotateCcw,
  Save,
  Trash2,
  Undo2,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { PharmacyKbd } from './PharmacyKbd';

function ShortcutRow({ keys, label }) {
  return (
    <div className="flex items-center justify-between gap-3 px-2 py-1 text-[12px]">
      <span className="text-slate-600">{label}</span>
      <span className="shrink-0 font-medium tabular-nums tracking-wide text-slate-500">{keys}</span>
    </div>
  );
}

function initialsFromName(name) {
  return (name || 'U')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export function formatDispenseRole(role) {
  if (!role) return 'Staff';
  return String(role)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const TOOLBAR_ACTIONS = [
  {
    key: 'hold',
    label: 'Hold Sale',
    shortcut: 'F1',
    icon: Save,
    iconClass: 'text-emerald-600',
    onProp: 'onSave',
    disabledWhen: (p) => p.disabled || p.checkingOut,
  },
  {
    key: 'recall',
    label: 'Recall',
    shortcut: 'F2',
    icon: RotateCcw,
    iconClass: 'text-slate-500',
    onProp: 'onRecall',
    badge: (p) => p.holdsCount,
  },
  {
    key: 'medicines',
    label: 'Medicines',
    shortcut: 'F4',
    icon: Pill,
    iconClass: 'text-emerald-600',
    onProp: 'onSearch',
  },
];

export function DispenseMainActions({
  onSave,
  onRecall,
  onSearch,
  checkingOut,
  holdsCount,
  disabled,
}) {
  const props = { onSave, onRecall, onSearch, checkingOut, holdsCount, disabled };

  return (
    <div
      className="inline-flex items-stretch overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
      role="toolbar"
      aria-label="Sale actions"
    >
      {TOOLBAR_ACTIONS.map((action, index) => {
        const Icon = action.icon;
        const handler = props[action.onProp];
        const isDisabled = action.disabledWhen?.(props);
        const badge = action.badge?.(props);

        return (
          <div key={action.key} className="flex items-stretch">
            {index > 0 ? <span className="w-px self-stretch bg-slate-200" aria-hidden /> : null}
            <Button
              type="button"
              variant="ghost"
              disabled={isDisabled}
              onClick={handler}
              className={cn(
                'relative h-9 min-w-[7.5rem] gap-1.5 rounded-none bg-transparent px-3 text-[12px] font-semibold text-slate-700 shadow-none',
                'hover:bg-emerald-50 hover:text-emerald-900',
                'disabled:opacity-45',
              )}
            >
              <Icon className={cn('size-3.5 shrink-0', action.iconClass)} />
              <span className="truncate">{action.label}</span>
              <PharmacyKbd className="ms-0.5 h-4 min-w-4 border-slate-200 px-1 text-[9px] font-bold text-slate-500">
                {action.shortcut}
              </PharmacyKbd>
              {badge > 0 ? (
                <span className="absolute right-1.5 top-1 flex size-4 items-center justify-center rounded-full bg-emerald-600 text-[9px] font-bold text-white ring-2 ring-white">
                  {badge}
                </span>
              ) : null}
            </Button>
          </div>
        );
      })}
    </div>
  );
}

export function DispenseMoreMenu({
  onShift,
  onReturn,
  onPrintSetup,
  onClear,
  checkingOut,
  shiftOpen,
  disabled,
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="size-10 shrink-0 rounded-xl border-slate-200 bg-white p-0 text-slate-600 shadow-sm hover:border-slate-300 hover:bg-slate-50"
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-1.5" data-pharmacy-typing>
        <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
          More actions
        </DropdownMenuLabel>
        <DropdownMenuItem onSelect={onShift}>
          <Wallet className="size-4 text-emerald-700" />
          {shiftOpen ? 'Shift' : 'Open shift'}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onReturn}>
          <Undo2 className="size-4" />
          Return
          <DropdownMenuShortcut>F7</DropdownMenuShortcut>
        </DropdownMenuItem>
        {onPrintSetup ? (
          <DropdownMenuItem onSelect={onPrintSetup}>
            <Printer className="size-4" />
            Print setup
          </DropdownMenuItem>
        ) : null}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          variant="destructive"
          disabled={disabled}
          onSelect={onClear}
          className="text-rose-600 focus:bg-rose-50 focus:text-rose-700"
        >
          {checkingOut ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
          Clear all
          <DropdownMenuShortcut className="text-rose-400">F10</DropdownMenuShortcut>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
          <Keyboard className="size-3" />
          Shortcuts
        </DropdownMenuLabel>
        <div className={cn('pb-1')}>
          <ShortcutRow keys="Enter" label="Next field / add line" />
          <ShortcutRow keys="↑ ↓" label="Move between rows" />
          <ShortcutRow keys="Esc" label="Close medicine list" />
          <ShortcutRow keys="Ctrl+D" label="Delete row" />
          <ShortcutRow keys="Ctrl+S" label="Custom tender / change" />
          <ShortcutRow keys="Ctrl+P" label="Complete & print now" />
          <ShortcutRow keys="F9" label="Custom tender" />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DispenseUserChip({ cashierName, userRole, onShift, shiftOpen }) {
  const initials = initialsFromName(cashierName);
  const roleLabel = formatDispenseRole(userRole);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-9 max-w-[11rem] items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 text-left shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[10px] font-bold text-emerald-800 ring-1 ring-emerald-100">
            {initials}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12px] font-semibold leading-tight text-slate-900">
              {cashierName || 'Cashier'}
            </span>
            <span className="block truncate text-[10px] font-medium text-slate-500">{roleLabel}</span>
          </span>
          <ChevronDown className="size-3.5 shrink-0 text-slate-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-semibold text-slate-900">{cashierName}</p>
          <p className="text-xs text-slate-500">{roleLabel}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onShift}>
          <Wallet className="size-4" />
          {shiftOpen ? 'Manage shift' : 'Open shift'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** @deprecated use DispenseMainActions + DispenseMoreMenu in header */
export function DispenseToolbar(props) {
  return (
    <div className="flex items-center gap-2">
      <DispenseMainActions {...props} />
      <DispenseMoreMenu {...props} />
    </div>
  );
}
