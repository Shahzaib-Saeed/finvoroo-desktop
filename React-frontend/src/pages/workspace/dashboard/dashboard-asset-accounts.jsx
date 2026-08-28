import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpDown,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  GripVertical,
  Landmark,
  PiggyBank,
  Wallet,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Sortable, SortableItem, SortableItemHandle } from '@/components/ui/sortable';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { buildAccountStatementUrl } from '@/pages/accounting/reports/report-drilldown';
import {
  sortIdsByAccountCode,
  sortRowsByAccountCode,
} from '@/pages/accounting/reports/report-account-sort';
import { fmtCurrency } from './dashboard-ui';
import {
  DASHBOARD_PIN_SORT,
  useDashboardPinnedAccounts,
} from './useDashboardPinnedAccounts';

/** Rotating icon + color pairs so each pinned account gets a distinct identity. */
const ROW_STYLES = [
  { icon: Landmark, dot: 'bg-blue-500' },
  { icon: BookOpen, dot: 'bg-emerald-500' },
  { icon: Wallet, dot: 'bg-violet-500' },
  { icon: PiggyBank, dot: 'bg-amber-500' },
];

function buildDisplayRow(acc, index, companyId) {
  return {
    id: acc.id,
    icon: ROW_STYLES[index % ROW_STYLES.length].icon,
    dot: ROW_STYLES[index % ROW_STYLES.length].dot,
    code: acc.code || '',
    name: acc.name || acc.code || 'Account',
    type: acc.account_type || acc.account_type_code || '',
    balance: Number(acc.balance) || 0,
    to: buildAccountStatementUrl(companyId, { accountId: acc.id }),
  };
}

function AccountBalanceRow({ row, currency, total, sortMode, canReorder }) {
  const Icon = row.icon;
  const share = total > 0 ? Math.round((row.balance / total) * 100) : 0;

  return (
    <div className="group flex flex-wrap items-center justify-between gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        {canReorder ? (
          <SortableItemHandle className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100">
            <GripVertical className="size-3.5" aria-hidden />
            <span className="sr-only">Drag to reorder {row.name}</span>
          </SortableItemHandle>
        ) : null}
        <Link
          to={row.to}
          className="flex min-w-0 flex-1 items-center justify-between gap-3 transition-opacity hover:opacity-80"
          title="View account statement"
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <span className={cn('size-2 shrink-0 rounded-full', row.dot)} />
            <Icon className="size-4.5 shrink-0 text-muted-foreground" />
            <span className="truncate text-sm font-normal text-mono">
              {row.code ? `${row.code} · ` : ''}
              {row.name}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-6 text-sm font-medium text-foreground">
            <span className="tabular-nums lg:text-right">
              {fmtCurrency(row.balance, currency)}
            </span>
            <span className="flex w-10 items-center justify-end gap-0.5 tabular-nums text-muted-foreground">
              {share}%
              <ArrowUpRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
            </span>
          </span>
        </Link>
      </div>
      {sortMode === DASHBOARD_PIN_SORT.CUSTOM ? (
        <span className="sr-only">Custom order</span>
      ) : null}
    </div>
  );
}

export function DashboardAssetAccounts({
  companyId,
  accounts = [],
  currency = 'USD',
  loading: overviewLoading,
}) {
  const defaultIds = useMemo(
    () => (Array.isArray(accounts) ? accounts.map((a) => a.id).filter(Boolean) : []),
    [accounts],
  );
  const {
    selectedIds,
    sortMode,
    setPinnedAccountIds,
    setPinnedSortMode,
    reorderPinnedAccountIds,
    ready: pinsReady,
  } = useDashboardPinnedAccounts(companyId, defaultIds);

  const [coaAccounts, setCoaAccounts] = useState([]);
  const [coaLoading, setCoaLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadCoa() {
      setCoaLoading(true);
      try {
        const res = await api.get('/workspace/dashboard/coa-accounts');
        const items = res.data?.data?.accounts ?? [];
        if (!cancelled) {
          setCoaAccounts(Array.isArray(items) ? items : []);
        }
      } catch {
        if (!cancelled) setCoaAccounts([]);
      } finally {
        if (!cancelled) setCoaLoading(false);
      }
    }

    loadCoa();

    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const accountMap = useMemo(() => {
    const map = new Map();
    coaAccounts.forEach((acc) => map.set(Number(acc.id), acc));
    return map;
  }, [coaAccounts]);

  const codeById = useMemo(() => {
    const map = new Map();
    coaAccounts.forEach((acc) => map.set(Number(acc.id), acc.code || ''));
    return map;
  }, [coaAccounts]);

  const orderedIds = useMemo(() => {
    if (sortMode === DASHBOARD_PIN_SORT.CUSTOM) {
      return selectedIds;
    }
    return sortIdsByAccountCode(selectedIds, codeById);
  }, [selectedIds, sortMode, codeById]);

  const displayRows = useMemo(() => {
    return orderedIds
      .map((id) => accountMap.get(Number(id)))
      .filter(Boolean)
      .map((acc, index) => buildDisplayRow(acc, index, companyId));
  }, [orderedIds, accountMap, companyId]);

  const total = displayRows.reduce((sum, row) => sum + row.balance, 0);
  const loading = overviewLoading || coaLoading || !pinsReady;
  const selectedSet = useMemo(() => new Set(selectedIds.map(Number)), [selectedIds]);
  const canReorder = displayRows.length > 1;

  const toggleAccount = (id) => {
    const numId = Number(id);
    if (selectedSet.has(numId)) {
      setPinnedAccountIds(selectedIds.filter((x) => Number(x) !== numId));
      return;
    }
    if (selectedIds.length >= 24) return;
    setPinnedAccountIds([...selectedIds, numId]);
  };

  const groupedAccounts = useMemo(() => {
    const groups = new Map();
    coaAccounts.forEach((acc) => {
      const key = acc.account_type || acc.account_type_code || 'Other';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(acc);
    });
    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([groupName, items]) => [groupName, sortRowsByAccountCode(items)]);
  }, [coaAccounts]);

  const handleReorder = (rows) => {
    reorderPinnedAccountIds(rows.map((row) => row.id));
  };

  return (
    <Card className="h-full">
      <CardHeader className="min-h-0 flex flex-row items-start justify-between gap-3 py-5">
        <div className="min-w-0">
          <CardTitle>Account balances</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Pin chart-of-accounts balances ·{' '}
            {sortMode === DASHBOARD_PIN_SORT.CUSTOM
              ? 'custom order (drag to rearrange)'
              : 'sorted by account code'}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" asChild>
            <Link to={`/workspace/${companyId}/accounting/reports/account-balances`}>
              All balances
              <ArrowUpRight className="size-3.5" />
            </Link>
          </Button>
          {sortMode === DASHBOARD_PIN_SORT.CUSTOM && selectedIds.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs text-slate-600"
              onClick={() => setPinnedSortMode(DASHBOARD_PIN_SORT.CODE)}
            >
              <ArrowUpDown className="size-3.5" />
              Sort by code
            </Button>
          ) : null}
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={loading}
              >
                Choose accounts
                <ChevronDown className="size-3.5 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <Command>
                <CommandInput placeholder="Search accounts…" />
                <CommandList>
                  <CommandEmpty>No accounts found.</CommandEmpty>
                  {groupedAccounts.map(([groupName, items]) => (
                    <CommandGroup key={groupName} heading={groupName}>
                      {items.map((acc) => {
                        const isSelected = selectedSet.has(Number(acc.id));
                        return (
                          <CommandItem
                            key={acc.id}
                            value={`${acc.code} ${acc.name} ${acc.account_type_code}`}
                            onSelect={() => toggleAccount(acc.id)}
                          >
                            <div
                              className={cn(
                                'me-2 flex size-4 items-center justify-center rounded-sm border border-primary',
                                isSelected
                                  ? 'bg-primary text-primary-foreground'
                                  : 'opacity-50 [&_svg]:invisible',
                              )}
                            >
                              <Check className="size-3.5" />
                            </div>
                            <div className="flex min-w-0 flex-1 flex-col">
                              <span className="truncate font-mono text-sm">
                                {acc.code} · {acc.name}
                              </span>
                            </div>
                            <span className="ms-2 shrink-0 text-xs tabular-nums text-muted-foreground">
                              {fmtCurrency(Number(acc.balance) || 0, currency)}
                            </span>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  ))}
                  {selectedIds.length > 0 ? (
                    <>
                      <CommandSeparator />
                      <CommandGroup>
                        <CommandItem
                          onSelect={() => setPinnedAccountIds([])}
                          className="justify-center text-center text-muted-foreground"
                        >
                          Clear selection
                        </CommandItem>
                      </CommandGroup>
                    </>
                  ) : null}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 lg:pt-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-normal text-secondary-foreground">
            Selected total
          </span>
          {loading ? (
            <Skeleton className="h-9 w-36" />
          ) : (
            <div className="flex items-center gap-2.5">
              <span className="text-3xl font-semibold text-mono tabular-nums">
                {fmtCurrency(total, currency)}
              </span>
              {displayRows.length > 0 && (
                <Badge size="sm" variant="secondary" appearance="light">
                  {displayRows.length} account{displayRows.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          )}
        </div>

        {!loading && displayRows.length > 0 && total > 0 && (
          <div className="mb-1 flex items-center gap-1">
            {displayRows.map((row) => {
              const share = Math.max(0, (row.balance / total) * 100);
              if (share <= 0) return null;
              return (
                <div
                  key={row.id}
                  className={cn('h-2 rounded-xs', row.dot)}
                  style={{ width: `${Math.max(share, 4)}%` }}
                  title={`${row.name} · ${Math.round(share)}%`}
                />
              );
            })}
          </div>
        )}

        <div className="border-b border-input" />

        <div className="grid gap-3">
          {loading ? (
            <>
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
            </>
          ) : displayRows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-6 text-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                <Landmark className="size-5 text-muted-foreground" />
              </div>
              <p className="max-w-60 text-sm text-muted-foreground">
                No accounts selected. Use &quot;Choose accounts&quot; to pin
                chart-of-accounts balances here.
              </p>
            </div>
          ) : canReorder ? (
            <Sortable
              value={displayRows}
              onValueChange={handleReorder}
              getItemValue={(row) => String(row.id)}
            >
              {displayRows.map((row) => (
                <SortableItem key={row.id} value={String(row.id)}>
                  <AccountBalanceRow
                    row={row}
                    currency={currency}
                    total={total}
                    sortMode={sortMode}
                    canReorder
                  />
                </SortableItem>
              ))}
            </Sortable>
          ) : (
            displayRows.map((row) => (
              <AccountBalanceRow
                key={row.id}
                row={row}
                currency={currency}
                total={total}
                sortMode={sortMode}
                canReorder={false}
              />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
