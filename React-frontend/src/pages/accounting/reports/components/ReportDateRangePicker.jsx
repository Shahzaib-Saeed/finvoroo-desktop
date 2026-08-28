'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  endOfYear,
  format,
  isEqual,
  isValid,
  parse,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subQuarters,
  subWeeks,
  subYears,
} from 'date-fns';
import { Calendar as CalendarIcon, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DISPLAY_DATE_FORMAT,
  DISPLAY_DATE_SHORT_FORMAT,
} from '@/lib/format-datetime';
import { cn } from '@/lib/utils';

const WEEK_OPTS = { weekStartsOn: 1 };

function parseIsoDate(value) {
  if (!value) return undefined;
  const parsed = parse(String(value).slice(0, 10), 'yyyy-MM-dd', new Date());
  return isValid(parsed) ? parsed : undefined;
}

function toIsoDate(date) {
  return date ? format(date, 'yyyy-MM-dd') : '';
}

function shortRange(from, to) {
  return `${format(from, DISPLAY_DATE_SHORT_FORMAT)} – ${format(to, DISPLAY_DATE_SHORT_FORMAT)}`;
}

/**
 * Peachtree/Sage-style detailed preset list, grouped for easy scanning.
 * Each preset carries a `group` for section headers and an optional `sub`
 * caption showing its resolved date range.
 */
export function getReportDatePresets(today = new Date()) {
  const withSub = (label, group, from, to) => ({
    label,
    group,
    range: { from, to },
    sub: shortRange(from, to),
  });

  // Individual months, most recent first (last 18 months, no future months).
  const months = [];
  for (let i = 0; i < 18; i += 1) {
    const start = startOfMonth(subMonths(today, i));
    const end = endOfMonth(start);
    months.push(withSub(format(start, 'MMMM yyyy'), 'By month', start, end));
  }

  return [
    withSub('Today', 'Day', today, today),
    withSub('Yesterday', 'Day', subDays(today, 1), subDays(today, 1)),
    withSub('Last 7 Days', 'Day', subDays(today, 6), today),
    withSub('Last 30 Days', 'Day', subDays(today, 29), today),

    withSub('This Week', 'Week', startOfWeek(today, WEEK_OPTS), endOfWeek(today, WEEK_OPTS)),
    withSub('This Week to Date', 'Week', startOfWeek(today, WEEK_OPTS), today),
    withSub(
      'Last Week',
      'Week',
      startOfWeek(subWeeks(today, 1), WEEK_OPTS),
      endOfWeek(subWeeks(today, 1), WEEK_OPTS),
    ),

    withSub('This Month', 'Month', startOfMonth(today), endOfMonth(today)),
    withSub('Month to Date', 'Month', startOfMonth(today), today),
    withSub(
      'Last Month',
      'Month',
      startOfMonth(subMonths(today, 1)),
      endOfMonth(subMonths(today, 1)),
    ),

    withSub('This Quarter', 'Quarter', startOfQuarter(today), endOfQuarter(today)),
    withSub('Quarter to Date', 'Quarter', startOfQuarter(today), today),
    withSub(
      'Last Quarter',
      'Quarter',
      startOfQuarter(subQuarters(today, 1)),
      endOfQuarter(subQuarters(today, 1)),
    ),

    withSub('This Year', 'Year', startOfYear(today), endOfYear(today)),
    withSub('Year to Date', 'Year', startOfYear(today), today),
    withSub(
      'Last Year',
      'Year',
      startOfYear(subYears(today, 1)),
      endOfYear(subYears(today, 1)),
    ),

    ...months,
  ];
}

const GROUP_ORDER = ['Day', 'Week', 'Month', 'Quarter', 'Year', 'By month'];

function groupPresets(presets) {
  const map = new Map();
  presets.forEach((preset) => {
    if (!map.has(preset.group)) map.set(preset.group, []);
    map.get(preset.group).push(preset);
  });
  return GROUP_ORDER.filter((group) => map.has(group)).map((group) => ({
    group,
    items: map.get(group),
  }));
}

function rangeFromPeriod(from, to) {
  const fromDate = parseIsoDate(from);
  const toDate = parseIsoDate(to);
  if (!fromDate && !toDate) return undefined;
  return { from: fromDate, to: toDate };
}

function periodFromRange(range) {
  return {
    from: toIsoDate(range?.from),
    to: toIsoDate(range?.to || range?.from),
  };
}

function matchPresetLabel(range, presets) {
  if (!range?.from || !range?.to) return null;
  const matched = presets.find(
    (preset) =>
      isEqual(startOfDay(preset.range.from), startOfDay(range.from)) &&
      isEqual(startOfDay(preset.range.to), startOfDay(range.to)),
  );
  return matched?.label || null;
}

export function ReportDateRangePicker({
  from,
  to,
  onChange,
  className,
  defaultPresetLabel = 'Year to Date',
  disabled = false,
}) {
  const today = useMemo(() => new Date(), []);
  const presets = useMemo(() => getReportDatePresets(today), [today]);
  const defaultPreset =
    presets.find((preset) => preset.label === defaultPresetLabel) || presets[0];

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState(() => parseIsoDate(from) || today);
  const [draftRange, setDraftRange] = useState(
    () => rangeFromPeriod(from, to) || defaultPreset.range,
  );
  const [selectedPreset, setSelectedPreset] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      const next = rangeFromPeriod(from, to) || defaultPreset.range;
      setDraftRange(next);
      setMonth(next.from || today);
      setSelectedPreset(matchPresetLabel(next, presets));
    }
  }, [isOpen, from, to, defaultPreset.range, presets, today]);

  useEffect(() => {
    const external = rangeFromPeriod(from, to);
    if (!isOpen && external) {
      setSelectedPreset(matchPresetLabel(external, presets));
    }
  }, [from, to, isOpen, presets]);

  const filteredGroups = useMemo(() => {
    const term = search.trim().toLowerCase();
    const matched = term
      ? presets.filter(
          (preset) =>
            preset.label.toLowerCase().includes(term) ||
            preset.sub?.toLowerCase().includes(term),
        )
      : presets;
    return groupPresets(matched);
  }, [presets, search]);

  const handleApply = () => {
    if (draftRange?.from) {
      onChange?.(periodFromRange(draftRange));
    }
    setIsOpen(false);
  };

  const handleReset = () => {
    setDraftRange(defaultPreset.range);
    setSelectedPreset(defaultPreset.label);
    setMonth(defaultPreset.range.from || today);
    onChange?.(periodFromRange(defaultPreset.range));
    setIsOpen(false);
  };

  const handleSelect = (selected) => {
    setDraftRange({
      from: selected?.from || undefined,
      to: selected?.to || undefined,
    });
    setSelectedPreset(null);
  };

  const applyPreset = (preset) => {
    setDraftRange(preset.range);
    setMonth(preset.range.from || today);
    setSelectedPreset(preset.label);
  };

  const displayFrom = parseIsoDate(from);
  const displayTo = parseIsoDate(to);

  return (
    <Popover open={isOpen} onOpenChange={(next) => !disabled && setIsOpen(next)}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          mode="input"
          disabled={disabled}
          placeholder={!displayFrom && !displayTo}
          className={cn('w-[250px] justify-start font-normal', className)}
        >
          <CalendarIcon className="size-4 shrink-0 opacity-60" />
          {displayFrom ? (
            displayTo ? (
              <>
                {format(displayFrom, DISPLAY_DATE_FORMAT)} – {format(displayTo, DISPLAY_DATE_FORMAT)}
              </>
            ) : (
              format(displayFrom, DISPLAY_DATE_FORMAT)
            )
          ) : (
            <span className="text-muted-foreground">Pick a date range</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex max-sm:flex-col">
          <div className="flex flex-col border-border max-sm:order-1 max-sm:border-t sm:w-60 sm:border-e">
            <div className="border-b border-border p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search date ranges…"
                  className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                />
              </div>
            </div>
            <div className="max-h-[320px] overflow-y-auto p-2">
              {filteredGroups.length === 0 ? (
                <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                  No matching ranges
                </p>
              ) : (
                filteredGroups.map((group) => (
                  <div key={group.group} className="mb-2 last:mb-0">
                    <div className="px-2 pb-1 pt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {group.group}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {group.items.map((preset) => (
                        <Button
                          key={preset.label}
                          type="button"
                          variant="ghost"
                          size="sm"
                          className={cn(
                            'h-auto w-full justify-between gap-2 py-1.5 text-left text-xs font-normal',
                            selectedPreset === preset.label && 'bg-accent',
                          )}
                          onClick={() => applyPreset(preset)}
                        >
                          <span className="truncate">{preset.label}</span>
                          {preset.sub && (
                            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                              {preset.sub}
                            </span>
                          )}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <Calendar
            autoFocus
            mode="range"
            month={month}
            onMonthChange={setMonth}
            showOutsideDays={false}
            selected={draftRange}
            onSelect={handleSelect}
            numberOfMonths={2}
          />
        </div>
        <div className="flex items-center justify-between gap-1.5 border-t border-border p-3">
          <span className="text-xs text-muted-foreground">
            {draftRange?.from
              ? `${format(draftRange.from, DISPLAY_DATE_FORMAT)}${
                  draftRange.to ? ` – ${format(draftRange.to, DISPLAY_DATE_FORMAT)}` : ''
                }`
              : 'Select a range'}
          </span>
          <div className="flex items-center gap-1.5">
            <Button type="button" variant="outline" size="sm" onClick={handleReset}>
              Reset
            </Button>
            <Button type="button" size="sm" onClick={handleApply} disabled={!draftRange?.from}>
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
