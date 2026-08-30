import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toAbsoluteUrl } from '@/lib/helpers';
import { cn } from '@/lib/utils';
import {
  DispenseMainActions,
  DispenseMoreMenu,
  DispenseUserChip,
} from './DispenseToolbar';
import { PHARMACY_BRAND_LOGO } from '../branding';

const PHARMACY_POS_LOGO = PHARMACY_BRAND_LOGO;

function formatClock(now) {
  return now.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatDate(now) {
  return now.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function BrandBlock({ companyId, compact = false }) {
  return (
    <Link
      to={`/workspace/${companyId}/pharmacy`}
      className="group flex min-w-0 items-center gap-2 rounded-lg py-0.5 transition-colors hover:opacity-95 sm:gap-3"
      aria-label="Finvoroo Pharmacy POS — back to operations"
    >
      <img
        src={toAbsoluteUrl(PHARMACY_POS_LOGO)}
        alt=""
        className={cn(
          'w-auto shrink-0 object-contain object-left',
          compact
            ? 'h-8 max-w-[108px] sm:h-9 sm:max-w-[140px]'
            : 'h-10 max-w-[160px] sm:h-11 sm:max-w-[200px] lg:h-12 lg:max-w-[240px]',
        )}
      />
      <span
        className={cn(
          'hidden min-w-0 border-s border-slate-200 ps-2 sm:block sm:ps-3',
          compact && 'max-lg:hidden',
        )}
      >
        <span className="block truncate text-[14px] font-bold leading-tight tracking-tight text-slate-900 sm:text-[15px]">
          Finvoroo{' '}
          <span className="text-emerald-700">Pharmacy</span>{' '}
          <span className="font-semibold text-slate-600">POS</span>
        </span>
        <span className="mt-0.5 hidden truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 md:block">
          Counter sale · Smart dispensing
        </span>
      </span>
    </Link>
  );
}

function HeaderSessionBar({
  companyName,
  terminalLabel,
  terminalCode,
  shiftId,
  shiftOpen,
  onOpenShift,
  online,
  offlineSyncEnabled,
  now,
  cashierName,
  userRole,
  toolbarProps,
}) {
  return (
    <div className="hidden items-stretch overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-100 lg:flex">
      <div className="flex min-w-0 max-w-[260px] items-center gap-2.5 px-3 py-2">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100/80">
          <Store className="size-4" strokeWidth={2.25} />
        </span>
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-1.5">
            <p className="truncate text-[13px] font-semibold leading-tight text-slate-900">
              {companyName}
            </p>
            {terminalCode ? (
              <span className="shrink-0 rounded-md bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                {terminalCode}
              </span>
            ) : null}
            {!online && offlineSyncEnabled ? (
              <span className="shrink-0 rounded-md bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                Off
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500">
            {terminalLabel}
            <span className="mx-1 text-slate-300">·</span>
            {shiftOpen && shiftId ? (
              <span className="font-semibold text-emerald-700">Shift #{shiftId}</span>
            ) : (
              <button
                type="button"
                onClick={onOpenShift}
                className="font-semibold text-amber-700 hover:underline"
              >
                Open shift
              </button>
            )}
          </p>
        </div>
      </div>

      <span className="w-px self-stretch bg-slate-200" aria-hidden />

      <div className="flex min-w-[4.5rem] flex-col justify-center px-3 py-2 text-center">
        <p className="text-[13px] font-bold tabular-nums leading-tight text-slate-900">
          {formatClock(now)}
        </p>
        <p className="text-[10px] font-medium text-slate-500">{formatDate(now)}</p>
      </div>

      <span className="w-px self-stretch bg-slate-200" aria-hidden />

      <div className="flex items-center gap-0.5 pe-1.5 ps-1">
        <DispenseUserChip
          embedded
          cashierName={cashierName}
          userRole={userRole}
          onShift={toolbarProps?.onShift || onOpenShift}
          shiftOpen={shiftOpen}
        />
        <DispenseMoreMenu embedded {...toolbarProps} />
      </div>
    </div>
  );
}

function MobileSessionStrip({
  companyName,
  terminalCode,
  shiftId,
  shiftOpen,
  onOpenShift,
  now,
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-3 py-1.5 lg:hidden">
      <p className="min-w-0 truncate text-[11px] font-semibold text-slate-800">{companyName}</p>
      <div className="flex shrink-0 items-center gap-2 text-[10px] font-medium text-slate-500">
        <span className="tabular-nums text-slate-700">{formatClock(now)}</span>
        <span className="text-slate-300">·</span>
        {terminalCode ? <span>{terminalCode}</span> : null}
        {terminalCode ? <span className="text-slate-300">·</span> : null}
        {shiftOpen && shiftId ? (
          <span className="text-emerald-700">Shift #{shiftId}</span>
        ) : (
          <button type="button" onClick={onOpenShift} className="text-amber-700">
            Open shift
          </button>
        )}
      </div>
    </div>
  );
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
    const id = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="relative shrink-0 border-b border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500" />

      {/* Mobile + tablet top row */}
      <div className="flex min-h-[52px] items-center gap-2 px-3 py-2 sm:px-4 lg:hidden">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                asChild
                variant="outline"
                size="icon"
                className="size-9 shrink-0 rounded-xl border-slate-200 bg-white shadow-sm hover:bg-slate-50"
              >
                <Link to={`/workspace/${companyId}/pharmacy`} aria-label="Back to Operations">
                  <ArrowLeft className="size-4 text-slate-600" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Back to Operations</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <BrandBlock companyId={companyId} compact />

        <div className="ms-auto flex shrink-0 items-center gap-1">
          <DispenseUserChip
            embedded
            compact
            cashierName={cashierName}
            userRole={userRole}
            onShift={toolbarProps?.onShift || onOpenShift}
            shiftOpen={shiftOpen}
          />
          <DispenseMoreMenu embedded {...toolbarProps} />
        </div>
      </div>

      {/* Desktop top row */}
      <div className="hidden min-h-[60px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 px-4 py-2 lg:grid">
        <div className="flex min-w-0 items-center gap-2 justify-self-start pe-2">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  asChild
                  variant="outline"
                  size="icon"
                  className="size-9 shrink-0 rounded-xl border-slate-200 bg-white shadow-sm hover:bg-slate-50"
                >
                  <Link to={`/workspace/${companyId}/pharmacy`} aria-label="Back to Operations">
                    <ArrowLeft className="size-4 text-slate-600" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Back to Operations</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <BrandBlock companyId={companyId} />
        </div>

        <div className="justify-self-center">
          <DispenseMainActions {...toolbarProps} />
        </div>

        <div className="flex min-w-0 items-center justify-self-end">
          <HeaderSessionBar
            companyName={companyName}
            terminalLabel={terminalLabel}
            terminalCode={terminalCode}
            shiftId={shiftId}
            shiftOpen={shiftOpen}
            onOpenShift={onOpenShift}
            online={online}
            offlineSyncEnabled={offlineSyncEnabled}
            now={now}
            cashierName={cashierName}
            userRole={userRole}
            toolbarProps={toolbarProps}
          />
        </div>
      </div>

      {/* Mobile / tablet actions — horizontal scroll */}
      <div className="border-t border-slate-100 bg-slate-50/40 px-3 py-2 lg:hidden">
        <div className="-mx-1 overflow-x-auto px-1 pb-0.5">
          <DispenseMainActions compact {...toolbarProps} />
        </div>
      </div>

      <MobileSessionStrip
        companyName={companyName}
        terminalCode={terminalCode}
        shiftId={shiftId}
        shiftOpen={shiftOpen}
        onOpenShift={onOpenShift}
        now={now}
      />
    </header>
  );
}
