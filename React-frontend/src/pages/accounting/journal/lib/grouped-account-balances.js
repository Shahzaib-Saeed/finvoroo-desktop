import { chartOfAccountsApi } from '@/pages/accounting/chart-of-accounts/api/chart-of-accounts.api';

/**
 * Load id → balance for all chart accounts (paginated COA index).
 */
export async function fetchAccountBalanceMap() {
  const balanceById = {};
  let page = 1;
  let lastPage = 1;

  do {
    const res = await chartOfAccountsApi.list({ per_page: 100, page });
    const rows = res.data?.data ?? [];
    const meta = res.data?.meta ?? {};
    lastPage = meta.last_page ?? 1;

    rows.forEach((acc) => {
      const raw = acc.current_balance ?? acc.balance;
      if (raw != null && raw !== '') {
        balanceById[acc.id] = Number(raw);
      }
    });

    page += 1;
  } while (page <= lastPage);

  return balanceById;
}

/**
 * Ensure every grouped picker account carries balance + current_balance.
 */
export function mergeGroupedAccountBalances(groupedAccounts = [], balanceById = {}) {
  return groupedAccounts.map((group) => ({
    ...group,
    accounts: (group.accounts ?? []).map((acc) => {
      const id = Number(acc.id);
      const balance =
        acc.balance != null
          ? Number(acc.balance)
          : acc.current_balance != null
            ? Number(acc.current_balance)
            : balanceById[id] != null
              ? Number(balanceById[id])
              : 0;

      return {
        ...acc,
        balance: Number.isNaN(balance) ? 0 : balance,
        current_balance: Number.isNaN(balance) ? 0 : balance,
      };
    }),
  }));
}

export async function fetchJournalGroupedAccounts() {
  const { journalsApi } = await import('@/pages/accounting/journal/api/journals.api');
  const [res, balanceById] = await Promise.all([
    journalsApi.formOptions(),
    fetchAccountBalanceMap().catch(() => ({})),
  ]);
  const data = res.data?.data || {};
  return {
    grouped_accounts: mergeGroupedAccountBalances(data.grouped_accounts ?? [], balanceById),
    can_create_coa: data.can_create_coa !== false,
  };
}

