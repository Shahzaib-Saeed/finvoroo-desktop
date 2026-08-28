'use client';

import * as React from 'react';
import { RiCheckboxCircleFill } from '@remixicon/react';
import { cn } from '@/lib/utils';
import { Button, ButtonArrow } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

function buildSearchTerms(option) {
  return [option.label, option.value, ...(option.keywords || [])]
    .filter(Boolean)
    .map(String);
}

function ComboboxOptionRow({
  option,
  selected,
  searchQuery,
  renderOption,
  renderOptionTrailing,
}) {
  return (
    <div className="flex w-full min-w-0 items-center gap-2">
      <span className="flex min-w-0 flex-1 items-center gap-2">
        {renderOption ? (
          renderOption(option, selected, searchQuery)
        ) : (
          <span className="truncate">{option.label}</span>
        )}
      </span>
      {renderOptionTrailing ? renderOptionTrailing(option, selected) : null}
      {selected ? (
        <RiCheckboxCircleFill className="size-4 shrink-0 text-primary" />
      ) : null}
    </div>
  );
}

export function SearchableCombobox({
  value,
  onValueChange,
  options = [],
  groups = null,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyText = 'No results found.',
  disabled = false,
  className,
  triggerClassName,
  contentClassName,
  allowNone = false,
  noneValue = '_none',
  noneLabel = 'None',
  actionItems = [],
  onCreateAccount,
  createAccountLabel = '+ New account…',
  renderValue,
  renderOption,
  renderOptionTrailing,
  onOpenChange,
  onSearchChange,
  triggerProps = {},
  filter,
}) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  const normalizedValue = value != null && value !== '' ? String(value) : '';

  const handleSearchChange = (next) => {
    setSearchQuery(next);
    onSearchChange?.(next);
  };

  const flatOptions = React.useMemo(() => {
    const list = [];
    if (groups?.length) {
      groups.forEach((group) => {
        group.options.forEach((option) => {
          list.push(option);
        });
      });
    } else {
      list.push(...options);
    }
    if (allowNone && noneLabel != null) {
      list.push({ value: noneValue, label: noneLabel });
    }
    return list;
  }, [options, groups, allowNone, noneLabel, noneValue]);

  const selectedOption = flatOptions.find(
    (option) => String(option.value) === normalizedValue,
  );

  const displayValue = renderValue
    ? renderValue(selectedOption || null)
    : selectedOption?.label;

  const handleOpenChange = (next) => {
    setOpen(next);
    if (!next) setSearchQuery('');
    onOpenChange?.(next);
  };

  const selectOption = (option) => {
    if (option.value === noneValue) {
      onValueChange('');
    } else {
      onValueChange(option.value);
    }
    handleOpenChange(false);
  };

  const renderOptionItems = (items, groupKey) =>
    items.map((option) => {
      const selected = String(option.value) === normalizedValue;
      return (
        <CommandItem
          key={`${groupKey}-${option.value}`}
          value={buildSearchTerms(option).join(' ')}
          keywords={buildSearchTerms(option)}
          className={cn(
            'w-full group rounded-md py-2',
            'data-[selected=true]:bg-sky-50 data-[selected=true]:text-foreground',
            'dark:data-[selected=true]:bg-sky-950/50',
            'data-[selected=true]:ring-1 data-[selected=true]:ring-sky-200/80',
            'dark:data-[selected=true]:ring-sky-800/60',
            option.className,
          )}
          onSelect={() => selectOption(option)}
        >
          <ComboboxOptionRow
            option={option}
            selected={selected}
            searchQuery={searchQuery}
            renderOption={renderOption}
            renderOptionTrailing={renderOptionTrailing}
          />
        </CommandItem>
      );
    });

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          mode="input"
          placeholder={!displayValue}
          aria-expanded={open}
          disabled={disabled}
          className={cn('w-full justify-between font-normal', className, triggerClassName)}
          {...triggerProps}
        >
          {renderValue ? (
            <span
              className={cn(
                'flex min-w-0 flex-1 items-center text-left',
                !displayValue && 'text-muted-foreground',
              )}
            >
              {displayValue || placeholder}
            </span>
          ) : (
            <span
              className={cn(
                'truncate text-left flex-1 min-w-0',
                !displayValue && 'text-muted-foreground',
              )}
            >
              {displayValue || placeholder}
            </span>
          )}
          <ButtonArrow />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          'w-[var(--radix-popper-anchor-width)] max-w-[var(--radix-popper-anchor-width)] p-0',
          contentClassName,
        )}
        align="start"
      >
        <Command filter={filter}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={searchQuery}
            onValueChange={handleSearchChange}
          />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>

            {onCreateAccount ? (
              <>
                <CommandGroup>
                  <CommandItem
                    key="create-account-action"
                    value="create-new-coa-account"
                    keywords={['new', 'account', 'create', 'add', 'coa']}
                    className="w-full text-primary font-medium"
                    onSelect={() => {
                      handleOpenChange(false);
                      onCreateAccount();
                    }}
                  >
                    <span className="truncate">{createAccountLabel}</span>
                  </CommandItem>
                </CommandGroup>
                <CommandSeparator />
              </>
            ) : null}

            {actionItems.length > 0 ? (
              <>
                <CommandGroup>
                  {actionItems.map((item) => (
                    <CommandItem
                      key={`action-${item.value}`}
                      value={buildSearchTerms(item).join(' ')}
                      keywords={buildSearchTerms(item)}
                      className={item.className}
                      onSelect={() => {
                        item.onSelect?.();
                        if (item.closeOnSelect !== false) {
                          handleOpenChange(false);
                        }
                      }}
                    >
                      <span className="truncate">{item.label}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            ) : null}

            {allowNone && noneLabel != null ? (
              <CommandGroup>{renderOptionItems([{ value: noneValue, label: noneLabel }], 'none')}</CommandGroup>
            ) : null}

            {groups?.length ? (
              groups.map((group) => (
                <CommandGroup
                  key={group.key || group.label}
                  heading={
                    group.hint ? `${group.label} — ${group.hint}` : group.label
                  }
                >
                  {renderOptionItems(group.options, group.key || group.label)}
                </CommandGroup>
              ))
            ) : options.length > 0 ? (
              <CommandGroup>{renderOptionItems(options, 'options')}</CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
