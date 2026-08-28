import {
  ClipboardPaste,
  Keyboard,
  Loader2,
  MoreHorizontal,
  Plus,
  Printer,
  ScanLine,
} from 'lucide-react';
import { Link } from 'react-router-dom';
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

export function PurchaseReceiveMoreMenu({
  companyId,
  onAddLine,
  onPaste,
  onPrint,
  saving = false,
  disabled = false,
  showMatchLegend = false,
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
        <DropdownMenuItem onSelect={onAddLine} disabled={disabled}>
          <Plus className="size-4 text-emerald-700" />
          Add line
          <DropdownMenuShortcut>F2</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onPaste} disabled={disabled}>
          <ClipboardPaste className="size-4" />
          Paste from Excel
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={`/workspace/${companyId}/pharmacy/purchase-entry`}>
            <ScanLine className="size-4" />
            Scan supplier bill
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onPrint} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Printer className="size-4" />}
          Print preview
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
          <Keyboard className="size-3" />
          Shortcuts
        </DropdownMenuLabel>
        <div className="pb-1">
          <ShortcutRow keys="Enter" label="Next field" />
          <ShortcutRow keys="↓ ↑" label="Next / previous item" />
          <ShortcutRow keys="F4" label="Medicine list" />
          <ShortcutRow keys="Ctrl+S" label="Save draft" />
          <ShortcutRow keys="F5" label="Post & next (sidebar)" />
          <ShortcutRow keys="Ctrl+P" label="Post with payment" />
          <ShortcutRow keys="Ctrl+D" label="Delete row" />
          <ShortcutRow keys="F2" label="Add line" />
        </div>
        {showMatchLegend ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
              Match colours
            </DropdownMenuLabel>
            <p className="px-2 pb-1 text-[11px] leading-relaxed text-slate-500">
              <span className="text-red-700">Red</span> not linked ·{' '}
              <span className="text-amber-700">Amber</span> verify ·{' '}
              <span className="text-emerald-700">Green</span> matched
            </p>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PurchaseReceiveMainActions({ onDraft, saving, disabled }) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={disabled || saving}
      onClick={onDraft}
      className={ACTION_BTN}
    >
      {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
      Save draft
    </Button>
  );
}
