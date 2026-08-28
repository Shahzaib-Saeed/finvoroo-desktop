import { useMemo, useState } from "react";
import { RiCheckboxCircleFill } from "@remixicon/react";
import { Button, ButtonArrow } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function buildSearchTerms(option) {
  return [option.label, option.value, ...(option.keywords || [])]
    .filter(Boolean)
    .map(String);
}

function groupAccounts(accounts = []) {
  const groups = new Map();
  accounts.forEach((account) => {
    const type = account.account_type || "Other";
    if (!groups.has(type)) {
      groups.set(type, []);
    }
    groups.get(type).push(account);
  });
  return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
}

export function ReportAccountMultiPicker({
  accounts = [],
  selectedIds = [],
  onChange,
  disabled = false,
  className,
  showCountBadge = false,
  inline = false,
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedSet = useMemo(
    () => new Set(selectedIds.map(String)),
    [selectedIds],
  );

  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const groups = groupAccounts(accounts);
    if (!q) {
      return groups.map(([type, items]) => [
        type,
        items.map((item) => ({
          value: String(item.account_id),
          label: `${item.code || ""} — ${item.name || ""}`.trim(),
          keywords: [
            item.code,
            item.name,
            item.account_type,
            item.account_subtype,
          ].filter(Boolean),
        })),
      ]);
    }

    return groups
      .map(([type, items]) => [
        type,
        items
          .filter((item) => {
            const hay = `${item.code || ""} ${item.name || ""} ${item.account_subtype || ""}`.toLowerCase();
            return hay.includes(q);
          })
          .map((item) => ({
            value: String(item.account_id),
            label: `${item.code || ""} — ${item.name || ""}`.trim(),
            keywords: [
              item.code,
              item.name,
              item.account_type,
              item.account_subtype,
            ].filter(Boolean),
          })),
      ])
      .filter(([, items]) => items.length > 0);
  }, [accounts, searchQuery]);

  const toggleAccount = (accountId) => {
    const id = String(accountId);
    const next = new Set(selectedSet);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onChange?.(Array.from(next).map(Number));
  };

  const selectAll = () => {
    onChange?.(accounts.map((a) => a.account_id));
  };

  const clearAll = () => onChange?.([]);

  const label =
    selectedIds.length === 0
      ? "Select accounts…"
      : selectedIds.length === accounts.length && accounts.length > 0
        ? `All accounts (${accounts.length})`
        : `${selectedIds.length} account${selectedIds.length === 1 ? "" : "s"} selected`;

  const handleOpenChange = (next) => {
    setOpen(next);
    if (!next) setSearchQuery("");
  };

  return (
    <div className={cn(inline ? "min-w-0 w-full" : "flex w-full flex-col gap-1.5", className)}>
      {!inline ? (
        <label className="text-xs font-medium text-muted-foreground">Accounts</label>
      ) : null}
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            mode="input"
            placeholder={selectedIds.length === 0}
            aria-expanded={open}
            aria-label="Select accounts"
            disabled={disabled || accounts.length === 0}
            className={cn(
              "h-8 w-full justify-between border-border/80 bg-background text-xs font-normal shadow-none",
            )}
          >
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-left",
                selectedIds.length === 0 && "text-muted-foreground",
              )}
            >
              {label}
            </span>
            <ButtonArrow />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[min(420px,calc(100vw-2rem))] p-0"
          align="start"
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search account…"
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList className="max-h-[min(320px,50vh)]">
              <CommandEmpty>No matching account.</CommandEmpty>

              <CommandGroup>
                <CommandItem
                  value="select-all-accounts"
                  keywords={["select", "all"]}
                  className="text-xs font-medium"
                  onSelect={selectAll}
                >
                  Select all ({accounts.length})
                </CommandItem>
                <CommandItem
                  value="clear-all-accounts"
                  keywords={["clear"]}
                  className="text-xs"
                  onSelect={clearAll}
                >
                  Clear selection
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />

              {filteredGroups.map(([type, items]) => (
                <CommandGroup key={type} heading={type}>
                  {items.map((option) => {
                    const selected = selectedSet.has(option.value);
                    return (
                      <CommandItem
                        key={option.value}
                        value={buildSearchTerms(option).join(" ")}
                        keywords={buildSearchTerms(option)}
                        className={cn(
                          "w-full rounded-md py-2",
                          "data-[selected=true]:bg-sky-50 data-[selected=true]:text-foreground",
                          "data-[selected=true]:ring-1 data-[selected=true]:ring-sky-200/80",
                        )}
                        onSelect={() => toggleAccount(option.value)}
                      >
                        <span className="flex min-w-0 flex-1 items-center gap-2">
                          <span className="truncate text-sm">{option.label}</span>
                          {selected ? (
                            <RiCheckboxCircleFill className="size-4 shrink-0 text-primary" />
                          ) : null}
                        </span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {showCountBadge && selectedIds.length > 0 ? (
        <p className="text-[11px] text-muted-foreground">
          {selectedIds.length} selected
        </p>
      ) : null}
    </div>
  );
}

export function loadPersistedAccountSelection(workspaceId) {
  if (!workspaceId) return [];
  try {
    const raw = localStorage.getItem(
      `erp:account-balances:selected:${workspaceId}`,
    );
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(Number).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function persistAccountSelection(workspaceId, accountIds) {
  if (!workspaceId) return;
  try {
    localStorage.setItem(
      `erp:account-balances:selected:${workspaceId}`,
      JSON.stringify(accountIds || []),
    );
  } catch {
    // ignore quota errors
  }
}
