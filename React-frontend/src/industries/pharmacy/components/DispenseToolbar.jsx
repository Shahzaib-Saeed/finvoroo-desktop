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

function ShortcutRow({ keys, label }) {
  return (
    <div className="flex items-center justify-between gap-3 px-2 py-1 text-[12px]">
      <span className="text-slate-600">{label}</span>
      <span className="shrink-0 font-medium tabular-nums tracking-wide text-slate-500">{keys}</span>
    </div>
  );
}

function ActionKbd({ children }) {
  return (
    <span className="ms-1 rounded border border-slate-200 bg-slate-50 px-1 py-px text-[10px] font-medium tabular-nums text-slate-500">
      {children}
    </span>
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

const ACTION_BTN =
  'h-9 gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-700 shadow-none hover:border-emerald-300 hover:bg-emerald-50/60 hover:text-emerald-900';

export function DispenseMainActions({
  onSave,
  onRecall,
  onSearch,
  checkingOut,
  holdsCount,
  disabled,
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled || checkingOut}
        onClick={onSave}
        className={ACTION_BTN}
      >
        <Save className="size-3.5 text-emerald-600" />
        Hold Sale
        <ActionKbd>F1</ActionKbd>
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onRecall}
        className={cn(ACTION_BTN, 'relative')}
      >
        <RotateCcw className="size-3.5 text-slate-500" />
        Recall
        <ActionKbd>F2</ActionKbd>
        {holdsCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-emerald-600 text-[9px] font-bold text-white ring-2 ring-white">
            {holdsCount}
          </span>
        ) : null}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onSearch}
        className={ACTION_BTN}
      >
        <Pill className="size-3.5 text-emerald-600" />
        Medicines
        <ActionKbd>F4</ActionKbd>
      </Button>
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
          className="h-9 w-9 shrink-0 border-slate-200 bg-white p-0 text-slate-600 shadow-none hover:border-slate-300 hover:bg-slate-50"
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
          className="flex h-10 max-w-[200px] items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-left transition-colors hover:border-slate-300 hover:bg-slate-50"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-emerald-800">
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
