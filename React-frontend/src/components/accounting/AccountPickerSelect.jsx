import { useMemo, useState } from 'react';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import { CreateAccountDialog } from '@/components/workspace/create-account-dialog';
import { formatCurrencyAmount } from '@/lib/currency';
import { cn } from '@/lib/utils';

function mapAccountOption(account, { showBalance, currency }) {
  const label =
    account.label ||
    (account.code ? `${account.code} — ${account.name}` : account.name || 'Account');

  const rawBalance = account.balance ?? account.current_balance;
  const balance =
    showBalance && rawBalance != null && rawBalance !== ''
      ? Number(rawBalance)
      : null;

  return {
    value: String(account.id),
    label,
    balance: balance != null && !Number.isNaN(balance) ? balance : null,
    keywords: [account.code, account.name, account.sublabel].filter(Boolean),
  };
}

function AccountOptionRow({ option, currency }) {
  if (option.balance == null || Number.isNaN(option.balance)) {
    return <span className="truncate">{option.label}</span>;
  }

  return (
    <span className="flex w-full min-w-0 items-center justify-between gap-3">
      <span className="truncate">{option.label}</span>
      <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
        {formatCurrencyAmount(option.balance, currency)}
      </span>
    </span>
  );
}

export function AccountPickerSelect({
  value,
  onValueChange,
  accounts = [],
  groupedAccounts = [],
  placeholder = 'Select account',
  searchPlaceholder = 'Search accounts…',
  disabled = false,
  className,
  contentClassName,
  allowNone = false,
  noneValue = '_none',
  noneLabel = 'None',
  currency = 'USD',
  showBalance = true,
  canCreate = true,
  onAccountCreated,
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const useGrouped = Array.isArray(groupedAccounts) && groupedAccounts.length > 0;
  const showCreateAccount = canCreate !== false && !disabled;

  const groups = useMemo(
    () =>
      useGrouped
        ? groupedAccounts.map((group) => ({
            key: group.key,
            label: group.label,
            hint: group.hint,
            options: group.accounts.map((acc) =>
              mapAccountOption(acc, { showBalance, currency }),
            ),
          }))
        : null,
    [groupedAccounts, useGrouped, showBalance, currency],
  );

  const options = useMemo(
    () =>
      useGrouped
        ? []
        : accounts.map((account) => mapAccountOption(account, { showBalance, currency })),
    [accounts, useGrouped, showBalance, currency],
  );

  const renderAccountRow = (option) => (
    <AccountOptionRow option={option} currency={currency} />
  );

  const handleAccountCreated = async (acc) => {
    if (onAccountCreated) {
      await onAccountCreated(acc);
    }
    if (acc?.id) {
      onValueChange(String(acc.id));
    }
  };

  return (
    <>
      <SearchableCombobox
        value={value || (allowNone ? noneValue : '')}
        onValueChange={(next) => {
          if (allowNone && next === noneValue) {
            onValueChange(noneValue);
            return;
          }
          onValueChange(next);
        }}
        groups={groups}
        options={options}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        emptyText="No accounts found."
        disabled={disabled}
        triggerClassName={className}
        contentClassName={contentClassName}
        allowNone={allowNone}
        noneValue={noneValue}
        noneLabel={noneLabel}
        onCreateAccount={showCreateAccount ? () => setCreateOpen(true) : undefined}
        renderOption={renderAccountRow}
        renderValue={(option) =>
          option ? (
            <span
              className={cn(
                'flex w-full min-w-0 items-center gap-2',
                option.balance != null && !Number.isNaN(option.balance) && 'pr-1',
              )}
            >
              <span className="truncate flex-1">{option.label}</span>
              {option.balance != null && !Number.isNaN(option.balance) ? (
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {formatCurrencyAmount(option.balance, currency)}
                </span>
              ) : null}
            </span>
          ) : null
        }
      />
      {showCreateAccount ? (
        <CreateAccountDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={handleAccountCreated}
        />
      ) : null}
    </>
  );
}
