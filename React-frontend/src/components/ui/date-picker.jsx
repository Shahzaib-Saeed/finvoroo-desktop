'use client';

import * as React from 'react';
import { format, isValid, parse } from 'date-fns';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DISPLAY_DATE_FORMAT } from '@/lib/format-datetime';
import { cn } from '@/lib/utils';

function parseDateValue(value) {
  if (!value || typeof value !== 'string') return undefined;
  const parsed = parse(value, 'yyyy-MM-dd', new Date());
  return isValid(parsed) ? parsed : undefined;
}

function calendarBounds(anchorDate, yearsBefore = 25, yearsAfter = 15) {
  const anchor = anchorDate ?? new Date();
  const year = anchor.getFullYear();
  return {
    startMonth: new Date(year - yearsBefore, 0, 1),
    endMonth: new Date(year + yearsAfter, 11, 31),
  };
}

export function DatePicker({
  value,
  onChange,
  disabled = false,
  placeholder = 'Pick a date',
  className,
  allowClear = true,
  id,
  captionLayout = 'dropdown',
  yearsBefore = 25,
  yearsAfter = 15,
  triggerProps = {},
}) {
  const [open, setOpen] = React.useState(false);
  const date = parseDateValue(value);
  const [month, setMonth] = React.useState(() => date ?? new Date());

  React.useEffect(() => {
    if (!open) return;
    setMonth(parseDateValue(value) ?? new Date());
  }, [open, value]);

  const { startMonth, endMonth } = calendarBounds(month, yearsBefore, yearsAfter);

  const handleSelect = (selected) => {
    if (!selected) return;
    onChange(format(selected, 'yyyy-MM-dd'));
    setOpen(false);
  };

  const handleReset = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onChange('');
  };

  const { className: triggerClassName, ...restTriggerProps } = triggerProps;

  return (
    <Popover open={open} onOpenChange={(next) => !disabled && setOpen(next)}>
      <PopoverTrigger asChild>
        <div className={cn('relative min-w-0', className)}>
          <Button
            type="button"
            variant="outline"
            mode="input"
            placeholder={!date}
            disabled={disabled}
            id={id}
            className={cn(
              'h-9 w-full min-w-[9.5rem] justify-start gap-2 font-normal text-sm',
              allowClear && date && 'pe-9',
              triggerClassName,
            )}
            {...restTriggerProps}
          >
            <CalendarIcon className="size-4 shrink-0 opacity-60" />
            <span className="truncate">
              {date ? (
                format(date, DISPLAY_DATE_FORMAT)
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </span>
          </Button>
          {allowClear && date && !disabled && (
            <Button
              type="button"
              variant="dim"
              size="sm"
              className="absolute end-0.5 top-1/2 size-7 -translate-y-1/2"
              onClick={handleReset}
              aria-label="Clear date"
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="start"
        onPointerDownOutside={(event) => {
          const target = event.target;
          if (
            target instanceof Element &&
            target.closest(
              '[data-slot="select-content"], [data-slot="select-trigger"]',
            )
          ) {
            event.preventDefault();
          }
        }}
        onFocusOutside={(event) => {
          const target = event.target;
          if (
            target instanceof Element &&
            target.closest(
              '[data-slot="select-content"], [data-slot="select-trigger"]',
            )
          ) {
            event.preventDefault();
          }
        }}
      >
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          autoFocus
          captionLayout={captionLayout}
          month={month}
          onMonthChange={setMonth}
          startMonth={startMonth}
          endMonth={endMonth}
          defaultMonth={date}
        />
      </PopoverContent>
    </Popover>
  );
}
