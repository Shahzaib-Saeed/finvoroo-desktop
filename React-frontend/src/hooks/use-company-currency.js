import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  formatCurrencyAmount,
  getCurrencySymbol,
  getWorkspaceDefaultCurrency,
  resolveCurrencyCode,
} from '@/lib/currency';
import { useAuthStore } from '@/store/authStore';

/**
 * Company functional currency from the active workspace (company profile setting).
 */
export function useCompanyCurrency(overrideCompanyId) {
  const { id: routeCompanyId } = useParams();
  const companies = useAuthStore((s) => s.companies);
  const activeCompany = useAuthStore((s) => s.activeCompany);

  const companyId = overrideCompanyId ?? routeCompanyId ?? activeCompany?.id;

  const currency = useMemo(() => {
    const fromList = companies.find((c) => String(c.id) === String(companyId));
    return resolveCurrencyCode(
      null,
      fromList?.currency || activeCompany?.currency,
      getWorkspaceDefaultCurrency(),
    );
  }, [companies, companyId, activeCompany?.currency]);

  const symbol = useMemo(() => getCurrencySymbol(currency), [currency]);

  const formatMoney = useMemo(
    () => (value, documentCurrency) =>
      formatCurrencyAmount(value, resolveCurrencyCode(documentCurrency, currency)),
    [currency],
  );

  return {
    companyId,
    currency,
    symbol,
    formatMoney,
    formatCurrency: formatMoney,
    resolveCurrency: (documentCurrency) => resolveCurrencyCode(documentCurrency, currency),
  };
}
