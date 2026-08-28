import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Pill } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { DispenseMainActions, DispenseMoreMenu, DispenseUserChip } from './DispenseToolbar';

function formatClock(now) {
  return now.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function formatDate(now) {
  return now.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function DispenseHeaderBar({
  companyId,
  companyName,
  terminalLabel,
  terminalCode,
  shiftId,
  cashierName,
  userRole,
  shiftOpen,
  onOpenShift,
  toolbarProps,
  online = true,
  offlineSyncEnabled = false,
}) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="flex min-h-[64px] shrink-0 items-center gap-4 border-b border-slate-200/80 bg-white px-4 py-2.5">
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="size-9 shrink-0 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <Link to={`/workspace/${companyId}/pharmacy`} aria-label="Back to Operations">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Back to Operations</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <div className="flex shrink-0 items-center gap-2.5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-800 text-white">
          <Pill className="size-4" />
        </div>
        <div>
          <h1 className="text-[16px] font-bold tracking-tight text-black">Finvoroo</h1>
          <p className="text-[11px] font-bold text-black">Pharmacy POS</p>
        </div>
      </div>

      <div className="hidden min-w-0 flex-1 justify-center px-2 md:flex">
        <DispenseMainActions {...toolbarProps} />
      </div>

      <div className="hidden shrink-0 border-l border-slate-200 pl-4 text-right lg:block">
        <div className="flex items-center justify-end gap-2">
          <p className="truncate text-[13px] font-bold text-black">{companyName}</p>
          {!online && offlineSyncEnabled ? (
            <span className="shrink-0 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
              Offline
            </span>
          ) : null}
          {terminalCode ? (
            <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-black">
              {terminalCode}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-[11px] font-medium text-black">
          {terminalLabel}
          {shiftOpen && shiftId ? (
            <>
              <span className="mx-1.5 text-slate-300">·</span>
              <span className="font-medium text-emerald-700">Shift #{shiftId} open</span>
            </>
          ) : (
            <>
              <span className="mx-1.5 text-slate-300">·</span>
              <button
                type="button"
                onClick={onOpenShift}
                className="font-semibold text-amber-700 hover:underline"
              >
                Open shift
              </button>
            </>
          )}
        </p>
      </div>

      <div className="ms-auto flex shrink-0 items-center gap-3 border-l border-slate-200 pl-4">
        <div className="hidden text-right xl:block">
          <p className="text-[14px] font-bold tabular-nums leading-tight text-black">
            {formatClock(now)}
          </p>
          <p className="text-[10px] font-semibold text-black">{formatDate(now)}</p>
        </div>

        <DispenseUserChip
          cashierName={cashierName}
          userRole={userRole}
          onShift={toolbarProps?.onShift || onOpenShift}
          shiftOpen={shiftOpen}
        />

        <DispenseMoreMenu {...toolbarProps} />

        <div className="flex md:hidden">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 border-slate-200 px-2"
            onClick={toolbarProps?.onSearch}
          >
            <Pill className="size-4 text-emerald-600" />
          </Button>
        </div>
      </div>
    </header>
  );
}
