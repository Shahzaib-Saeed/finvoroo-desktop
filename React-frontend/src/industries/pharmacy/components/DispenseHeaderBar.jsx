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
    <header className="relative shrink-0 bg-white">
      <div className="grid min-h-[56px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-1.5 lg:grid-cols-[auto_minmax(0,1fr)_auto_auto]">
        {/* Brand */}
        <div className="flex min-w-0 items-center gap-2">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  asChild
                  variant="outline"
                  size="icon"
                  className="size-10 shrink-0 rounded-xl border-slate-200 bg-white shadow-sm hover:bg-slate-50"
                >
                  <Link to={`/workspace/${companyId}/pharmacy`} aria-label="Back to Operations">
                    <ArrowLeft className="size-4 text-slate-600" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Back to Operations</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-800 text-white shadow-sm">
              <Pill className="size-4" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-[15px] font-semibold leading-tight tracking-tight text-slate-900">
                Finvoroo
              </h1>
              <p className="truncate text-[11px] font-medium text-slate-500">Pharmacy POS</p>
            </div>
          </div>
        </div>

        {/* Center actions — true center column */}
        <div className="col-span-3 flex justify-center lg:col-span-1 lg:col-start-2">
          <DispenseMainActions {...toolbarProps} />
        </div>

        {/* Store / register */}
        <div className="hidden min-w-0 text-right lg:block">
          <div className="flex items-center justify-end gap-1.5">
            <p className="truncate text-[13px] font-semibold text-slate-900">{companyName}</p>
            {!online && offlineSyncEnabled ? (
              <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 ring-1 ring-amber-100">
                Offline
              </span>
            ) : null}
            {terminalCode ? (
              <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-200">
                {terminalCode}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500">
            {terminalLabel}
            {shiftOpen && shiftId ? (
              <>
                <span className="mx-1.5 text-slate-300">·</span>
                <span className="font-semibold text-emerald-700">Shift #{shiftId} open</span>
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

        {/* Clock + user */}
        <div className="flex items-center justify-end gap-2 sm:gap-2.5">
          <div className="hidden text-right xl:block">
            <p className="text-[12px] font-semibold tabular-nums leading-tight text-slate-900">
              {formatClock(now)}
            </p>
            <p className="text-[10px] font-medium text-slate-500">{formatDate(now)}</p>
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
              className="size-10 rounded-xl border-slate-200 bg-white p-0 shadow-sm"
              onClick={toolbarProps?.onSearch}
            >
              <Pill className="size-4 text-emerald-600" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
