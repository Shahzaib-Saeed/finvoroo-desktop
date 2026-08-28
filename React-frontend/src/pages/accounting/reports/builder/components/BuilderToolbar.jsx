import {
  Check,
  Copy,
  Download,
  Loader2,
  Play,
  Redo2,
  RotateCcw,
  Save,
  Share2,
  Undo2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Kbd } from '@/components/ui/kbd';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { ReportShareModal } from '../../components/ReportShareModal';

function ToolbarIconButton({ icon: Icon, label, shortcut, onClick, disabled, spinning }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className={cn(
            'inline-flex size-8 items-center justify-center rounded-lg text-slate-500 transition-all',
            'hover:bg-slate-100 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-30',
          )}
          aria-label={label}
        >
          <Icon className={cn('size-3.5', spinning && 'animate-spin')} strokeWidth={1.75} />
        </button>
      </TooltipTrigger>
      <TooltipContent className="flex items-center gap-1.5">
        {label}
        {shortcut ? <Kbd size="xs" variant="outline">{shortcut}</Kbd> : null}
      </TooltipContent>
    </Tooltip>
  );
}

function AutoSaveIndicator({ saving, lastSavedAt, hasSavedDefinition }) {
  if (!hasSavedDefinition) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
        Draft
      </span>
    );
  }
  if (saving) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-600">
        <Loader2 className="size-3 animate-spin" />
        Saving…
      </span>
    );
  }
  if (lastSavedAt) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
        <Check className="size-3" strokeWidth={2.5} />
        Saved {lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    );
  }
  return null;
}

export function BuilderToolbar({
  name,
  onNameChange,
  datasetLabel,
  onSave,
  onSaveAs,
  onDuplicate,
  onRun,
  onExport,
  onReset,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  savedDefinitionId,
  saving,
  running,
  lastSavedAt,
  autoSaving,
  canSave = true,
  canShare = true,
  canExport = true,
}) {
  return (
    <div className="border-b border-slate-200/80 bg-white">
      <div className="flex flex-wrap items-center gap-3 px-5 py-3.5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[15px] font-semibold tracking-tight text-slate-900">
              Custom Report Builder
            </h1>
            {datasetLabel ? (
              <span className="inline-flex items-center rounded-full border border-blue-200/80 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
                {datasetLabel}
              </span>
            ) : null}
            <AutoSaveIndicator
              saving={autoSaving}
              lastSavedAt={lastSavedAt}
              hasSavedDefinition={Boolean(savedDefinitionId)}
            />
          </div>
          <Input
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Untitled report"
            className="mt-1.5 h-8 max-w-md border-transparent bg-transparent px-0 text-sm font-medium text-slate-700 shadow-none placeholder:text-slate-400 hover:border-slate-200 hover:bg-slate-50 hover:px-2.5 focus:border-blue-300 focus:bg-white focus:px-2.5 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <div className="mr-1 hidden items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-50/80 p-0.5 sm:flex">
            <ToolbarIconButton icon={Undo2} label="Undo" shortcut="⌘Z" onClick={onUndo} disabled={!canUndo} />
            <ToolbarIconButton icon={Redo2} label="Redo" shortcut="⌘⇧Z" onClick={onRedo} disabled={!canRedo} />
            <ToolbarIconButton icon={RotateCcw} label="Reset report" onClick={onReset} />
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 rounded-lg border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50"
            onClick={onRun}
            disabled={running}
          >
            {running ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
            Run
          </Button>

          {savedDefinitionId && canExport ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 rounded-lg border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50"
                >
                  <Download className="size-3.5" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => onExport('csv')}>CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport('xlsx')}>Excel</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport('pdf')}>PDF</DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.print()}>Print</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          {savedDefinitionId ? (
            <ToolbarIconButton icon={Copy} label="Duplicate" onClick={onDuplicate} />
          ) : null}

          {savedDefinitionId && canShare ? (
            <ReportShareModal
              definitionId={savedDefinitionId}
              trigger={
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 rounded-lg border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm"
                >
                  <Share2 className="size-3.5" />
                  Share
                </Button>
              }
            />
          ) : null}

          {savedDefinitionId ? (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 rounded-lg border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm"
              onClick={onSaveAs}
              disabled={saving}
            >
              Save As
            </Button>
          ) : null}

          {canSave ? (
            <Button
              size="sm"
              className="h-8 gap-1.5 rounded-lg bg-blue-600 px-3.5 text-xs font-semibold text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700"
              onClick={onSave}
              disabled={saving || !name.trim()}
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              Save layout
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
