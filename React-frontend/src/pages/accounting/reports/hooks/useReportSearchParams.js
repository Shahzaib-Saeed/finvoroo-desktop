import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { defaultReportPeriod } from '../constants';

/**
 * Apply ?account_id=&from=&to= from report drill-down links on first load.
 */
export function useReportSearchParams({ onApply }) {
  const [searchParams] = useSearchParams();
  const appliedKey = useRef('');

  useEffect(() => {
    const accountId = searchParams.get('account_id') || '';
    const customerId = searchParams.get('customer_id') || '';
    const vendorId = searchParams.get('vendor_id') || '';
    const from = searchParams.get('from') || '';
    const to = searchParams.get('to') || '';

    if (!accountId && !customerId && !vendorId && !from && !to) return;

    // Account links navigate within the same mounted report component. Apply
    // each distinct URL, not only the first URL seen during the component's
    // lifetime, otherwise clicking another account appears to do nothing.
    const key = [accountId, customerId, vendorId, from, to].join('|');
    if (appliedKey.current === key) return;
    appliedKey.current = key;

    const defaults = defaultReportPeriod();
    onApply({
      accountId,
      customerId,
      vendorId,
      period: {
        from: from || defaults.from,
        to: to || defaults.to,
      },
    });
  }, [searchParams, onApply]);
}
