import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { pharmacyApi } from '../../api/pharmacy.api';
import { ReportPageShell } from '@/pages/accounting/reports/components/ReportPageShell';
import { ReportDateFilter } from '@/pages/accounting/reports/components/ReportDateFilter';
import { ReportActionBar } from '@/pages/accounting/reports/components/ReportActionBar';
import { ReportSummaryStrip } from '@/pages/accounting/reports/components/ReportSummaryStrip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

function todayPeriod() {
  const d = format(new Date(), 'yyyy-MM-dd');
  return { from: d, to: d };
}

function formatAmount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0.00';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function EmployeeSalesReportPage() {
  const [period, setPeriod] = useState(todayPeriod);
  const [draft, setDraft] = useState(todayPeriod);
  const [employeeId, setEmployeeId] = useState('all');
  const [terminalId, setTerminalId] = useState('all');
  const [shiftId, setShiftId] = useState('all');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    pharmacyApi
      .employeeSalesReport({
        from: period.from,
        to: period.to,
        employee_id: employeeId !== 'all' ? employeeId : undefined,
        terminal_id: terminalId !== 'all' ? terminalId : undefined,
        shift_id: shiftId !== 'all' ? shiftId : undefined,
      })
      .then((res) => setData(res.data?.data || null))
      .catch((err) => {
        toast.error(err?.response?.data?.message || 'Failed to load employee sales');
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [period, employeeId, terminalId, shiftId]);

  useEffect(() => {
    load();
  }, [load]);

  const currency = data?.base_currency || 'USD';
  const rows = data?.rows || [];
  const totals = data?.totals || {};
  const filters = data?.filters || {};

  const summary = useMemo(
    () => [
      { label: 'Sales', value: String(totals.sales_count ?? 0) },
      { label: 'Gross', value: formatAmount(totals.gross) },
      { label: 'Returns', value: formatAmount(totals.returns) },
      { label: 'Discounts', value: formatAmount(totals.discounts) },
      { label: 'Net', value: formatAmount(totals.net) },
    ],
    [totals],
  );

  return (
    <ReportPageShell
      title="Employee POS sales"
      subtitle="Who completed each counter sale. Cash and the shift stay centralized."
      contentClassName="w-full min-w-0 max-w-full mx-auto space-y-4 lg:max-w-[1100px]"
    >
      <ReportDateFilter
        from={draft.from}
        to={draft.to}
        onFromChange={(from) => setDraft((p) => ({ ...p, from }))}
        onToChange={(to) => setDraft((p) => ({ ...p, to }))}
        onApply={() => setPeriod(draft)}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Select value={employeeId} onValueChange={setEmployeeId}>
          <SelectTrigger>
            <SelectValue placeholder="All employees" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All employees</SelectItem>
            {(filters.employees || []).map((e) => (
              <SelectItem key={e.id} value={String(e.id)}>
                {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={terminalId} onValueChange={setTerminalId}>
          <SelectTrigger>
            <SelectValue placeholder="All terminals" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All terminals</SelectItem>
            {(filters.terminals || []).map((t) => (
              <SelectItem key={t.id} value={String(t.id)}>
                {t.code || t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={shiftId} onValueChange={setShiftId}>
          <SelectTrigger>
            <SelectValue placeholder="All shifts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All shifts</SelectItem>
            {(filters.shifts || []).map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ReportActionBar onExport={undefined} />
      <ReportSummaryStrip items={summary} context={currency} />

      {loading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Employee</th>
                <th className="px-3 py-2 text-right font-medium">Sales</th>
                <th className="px-3 py-2 text-right font-medium">Gross</th>
                <th className="px-3 py-2 text-right font-medium">Returns</th>
                <th className="px-3 py-2 text-right font-medium">Discounts</th>
                <th className="px-3 py-2 text-right font-medium">Net ({currency})</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">
                    No POS sales in this period.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.employee_id || row.employee} className="border-t">
                    <td className="px-3 py-2 font-medium">{row.employee}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.sales_count}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatAmount(row.gross)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatAmount(row.returns)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatAmount(row.discounts)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">
                      {formatAmount(row.net)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {rows.length > 0 ? (
              <tfoot>
                <tr className="border-t bg-slate-50 font-semibold">
                  <td className="px-3 py-2">Total</td>
                  <td className="px-3 py-2 text-right tabular-nums">{totals.sales_count}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatAmount(totals.gross)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatAmount(totals.returns)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatAmount(totals.discounts)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatAmount(totals.net)}</td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      )}
    </ReportPageShell>
  );
}
