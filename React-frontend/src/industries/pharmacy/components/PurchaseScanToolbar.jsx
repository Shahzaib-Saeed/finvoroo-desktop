import {
  Keyboard,
  Loader2,
  MoreHorizontal,
  Plus,
  Printer,
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

function ShortcutRow({ keys, label }) {
  return (
    <div className="flex items-center justify-between gap-3 px-2 py-1 text-[12px]">
      <span className="text-slate-600">{label}</span>
      <span className="shrink-0 font-medium tabular-nums tracking-wide text-slate-500">{keys}</span>
    </div>
  );
}

const ACTION_BTN =
  'h-9 gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-700 shadow-none hover:border-emerald-300 hover:bg-emerald-50/60 hover:text-emerald-900';

export function PurchaseScanMainActions({ onContinue, saving, disabled, lineCount = 0 }) {
  return (
    <Button
      type="button"
      size="sm"
      disabled={disabled || saving || lineCount < 1}
      onClick={onContinue}
      className="h-9 bg-emerald-700 px-4 font-semibold hover:bg-emerald-800"
    >
      {saving ? <Loader2 className="size-4 animate-spin" /> : null}
      Continue to Receive
    </Button>
  );
}

export function PurchaseScanMoreMenu({ onAddRow, onPrint, disabled = false }) {
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
        <DropdownMenuItem onSelect={onAddRow} disabled={disabled}>
          <Plus className="size-4 text-emerald-700" />
          Add row
          <DropdownMenuShortcut>F2</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onPrint} disabled={disabled}>
          <Printer className="size-4" />
          Print preview
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
          <Keyboard className="size-3" />
          Shortcuts
        </DropdownMenuLabel>
        <div className="pb-1">
          <ShortcutRow keys="Ctrl+Enter" label="Continue to Receive" />
          <ShortcutRow keys="Enter" label="Match catalog" />
          <ShortcutRow keys="↑ ↓" label="Move between rows" />
          <ShortcutRow keys="F4" label="Medicine list" />
          <ShortcutRow keys="Ctrl+D" label="Delete row" />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { ACTION_BTN };
