import api from '@/lib/api';
import { authCookies } from '@/auth/auth-cookies';
import { getApiBaseUrl } from '@/lib/desktop-app';

export async function downloadProductionOrdersCsv(params = {}) {
  const base = getApiBaseUrl();
  const qs = new URLSearchParams(params).toString();
  const url = `${base}/workspace/production-orders/export/csv${qs ? `?${qs}` : ''}`;
  const token = authCookies.getToken();
  const companyId = authCookies.getCompanyId();

  const res = await fetch(url, {
    headers: {
      Accept: 'text/csv',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(companyId ? { 'X-Company-ID': String(companyId) } : {}),
    },
  });

  if (!res.ok) {
    throw new Error('Export failed');
  }

  const blob = await res.blob();
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `production_orders_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}
