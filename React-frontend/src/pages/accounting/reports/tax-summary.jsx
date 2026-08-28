import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { format, parseISO } from 'date-fns';
import {
  FileText,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { reportsApi } from './api/reports.api';
import { defaultReportPeriod, formatCurrency } from './constants';
import { ReportDateFilter } from './components/ReportDateFilter';
import { ReportPageShell } from './components/ReportPageShell';
import { ReportActionBar } from './components/ReportActionBar';
import { ReportSummaryStrip } from './components/ReportSummaryStrip';

function reportDate(value) {
  if (!value) return '—';
  try {
    return format(parseISO(value), 'dd/MM/yyyy');
  } catch {
    return value;
  }
}

function documentPath(workspaceId, row) {
  const base = `/workspace/${workspaceId}/accounting`;
  const map = {
    invoice: 'invoices',
    credit_note: 'credit-notes',
    bill: 'bills',
    vendor_credit: 'vendor-credits',
  };
  return `${base}/${map[row.document_type]}/${row.source_id}`;
}

function signedMoney(value, currency) {
  const amount = Number(value) || 0;
  if (amount < 0) return `(${formatCurrency(Math.abs(amount), currency)})`;
  return formatCurrency(amount, currency);
}

export function TaxSummaryReportPage() {
  const { id: workspaceId } = useParams();
  const initialPeriod = useMemo(() => defaultReportPeriod(), []);
  const [draft, setDraft] = useState({ ...initialPeriod, scope: 'all' });
  const [filters, setFilters] = useState({ ...initialPeriod, scope: 'all' });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await reportsApi.taxSummary(filters);
      setData(response.data?.data || null);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not load VAT / tax summary');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const response = await reportsApi.taxSummaryExport(filters);
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `vat-tax-summary-${filters.from}-to-${filters.to}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not export VAT report');
    } finally {
      setExporting(false);
    }
  };

  const summary = data?.summary || {};
  const currency = data?.currency || 'USD';
  const payable = Number(summary.net_tax_payable || 0);

  return (
    <ReportPageShell
      workspaceId={workspaceId}
      title="VAT / Tax Summary"
      subtitle="Accrual-basis output and input tax from posted sales and purchase documents."
      contentClassName="space-y-5"
      actions={
        <ReportActionBar
          onExport={exportCsv}
          exportLabel={exporting ? 'Exporting…' : 'Export'}
          exportDisabled={exporting || loading}
          onPdf={() => window.print()}
          pdfDisabled={loading}
          onPrint={() => window.print()}
          printDisabled={loading}
        />
      }
    >
      <div className="no-print">
          <ReportDateFilter
            compact
            from={draft.from}
            to={draft.to}
            onFromChange={(from) => setDraft((current) => ({ ...current, from }))}
            onToChange={(to) => setDraft((current) => ({ ...current, to }))}
            onApply={() => setFilters({ ...draft })}
            onReset={() => setDraft({ ...initialPeriod, scope: 'all' })}
            loading={loading}
            currency={currency}
          >
            <Select
              value={draft.scope}
              onValueChange={(scope) => setDraft((current) => ({ ...current, scope }))}
            >
              <SelectTrigger className="h-8 w-[170px] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Sales and purchases</SelectItem>
                <SelectItem value="sales">Sales / output VAT</SelectItem>
                <SelectItem value="purchases">Purchases / input VAT</SelectItem>
              </SelectContent>
            </Select>
          </ReportDateFilter>
      </div>

      {loading && !data ? (
        <div className="flex min-h-80 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <Loader2 className="size-7 animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          <ReportSummaryStrip
            items={[
              {
                label: 'Net taxable sales',
                value: formatCurrency(summary.net_taxable_sales, currency),
              },
              {
                label: 'Net output VAT',
                value: formatCurrency(summary.net_output_tax, currency),
                tone: 'negative',
              },
              {
                label: 'Net input VAT',
                value: formatCurrency(summary.net_input_tax, currency),
                tone: 'positive',
              },
              {
                label: payable >= 0 ? 'VAT payable' : 'VAT refundable',
                value: formatCurrency(Math.abs(payable), currency),
                tone: payable >= 0 ? 'negative' : 'positive',
              },
            ]}
            context={`${summary.document_count || 0} documents`}
          />

          <Card className="report-print-sheet overflow-visible rounded-2xl border-slate-200 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-200 bg-white px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-950">
                    VAT reconciliation
                  </CardTitle>
                  <p className="mt-1 text-xs text-slate-500">
                    {data?.company?.name || 'Company'} · {reportDate(data?.period?.from)} to{' '}
                    {reportDate(data?.period?.to)} · {currency} · Accrual basis
                  </p>
                </div>
                <span
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-semibold',
                    payable >= 0
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-700',
                  )}
                >
                  {payable >= 0 ? 'Payable' : 'Refundable'}{' '}
                  {formatCurrency(Math.abs(payable), currency)}
                </span>
              </div>
            </CardHeader>

            <Tabs defaultValue="rates">
              <div className="no-print border-b border-slate-100 px-5 pt-3">
                <TabsList>
                  <TabsTrigger value="rates">By tax rate</TabsTrigger>
                  <TabsTrigger value="documents">
                    Source documents ({summary.document_count || 0})
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="rates" className="m-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px] text-sm">
                    <thead className="sticky top-0 z-10">
                      <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <th className="px-5 py-3 text-left">Tax rate</th>
                        <th className="px-3 py-3 text-right">Taxable sales</th>
                        <th className="px-3 py-3 text-right">Output VAT</th>
                        <th className="px-3 py-3 text-right">Taxable purchases</th>
                        <th className="px-3 py-3 text-right">Input VAT</th>
                        <th className="px-5 py-3 text-right">Net VAT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(data?.tax_rates || []).map((row) => (
                        <tr key={row.rate_key} className="even:bg-muted/30 hover:bg-primary/5">
                          <td className="px-5 py-3">
                            <p className="font-semibold text-slate-900">{row.name}</p>
                            <p className="text-xs text-slate-500">
                              {row.rate !== null ? `${row.rate}%` : 'No rate snapshot'} ·{' '}
                              {row.document_count} documents
                            </p>
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums text-slate-600">
                            {signedMoney(row.taxable_sales, currency)}
                          </td>
                          <td className="px-3 py-3 text-right font-semibold tabular-nums text-red-600">
                            {signedMoney(row.output_tax, currency)}
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums text-slate-600">
                            {signedMoney(row.taxable_purchases, currency)}
                          </td>
                          <td className="px-3 py-3 text-right font-semibold tabular-nums text-emerald-700">
                            {signedMoney(row.input_tax, currency)}
                          </td>
                          <td className="px-5 py-3 text-right font-bold tabular-nums text-slate-950">
                            {signedMoney(row.net_tax, currency)}
                          </td>
                        </tr>
                      ))}
                      {!data?.tax_rates?.length ? (
                        <tr>
                          <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                            No posted tax activity for this period.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              <TabsContent value="documents" className="m-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead className="sticky top-0 z-10">
                      <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <th className="px-5 py-3 text-left">Document</th>
                        <th className="px-3 py-3 text-left">Date</th>
                        <th className="px-3 py-3 text-left">Customer / vendor</th>
                        <th className="px-3 py-3 text-left">Status</th>
                        <th className="px-3 py-3 text-right">Taxable amount</th>
                        <th className="px-5 py-3 text-right">VAT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(data?.documents || []).map((row) => (
                        <tr key={row.row_key} className="even:bg-muted/30 hover:bg-primary/5">
                          <td className="px-5 py-3">
                            <Link
                              to={documentPath(workspaceId, row)}
                              className="font-semibold text-primary hover:underline"
                            >
                              {row.number}
                            </Link>
                            <p className="mt-0.5 text-xs capitalize text-slate-500">
                              {row.document_type.replaceAll('_', ' ')}
                            </p>
                          </td>
                          <td className="px-3 py-3 text-slate-600">{reportDate(row.date)}</td>
                          <td className="px-3 py-3 font-medium text-slate-700">
                            {row.party?.name || '—'}
                          </td>
                          <td className="px-3 py-3">
                            <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-semibold capitalize text-slate-600">
                              {row.status}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums text-slate-700">
                            {signedMoney(row.taxable_amount, currency)}
                          </td>
                          <td
                            className={cn(
                              'px-5 py-3 text-right font-bold tabular-nums',
                              row.side === 'sales' ? 'text-red-600' : 'text-emerald-700',
                            )}
                          >
                            {signedMoney(row.tax_amount, currency)}
                          </td>
                        </tr>
                      ))}
                      {!data?.documents?.length ? (
                        <tr>
                          <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                            No posted source documents for this period.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
            </Tabs>

            <div className="grid gap-px border-t border-slate-200 bg-slate-200 sm:grid-cols-3">
              <div className="bg-white px-5 py-4">
                <p className="text-xs font-semibold text-slate-500">Net output VAT</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-red-600">
                  {formatCurrency(summary.net_output_tax, currency)}
                </p>
              </div>
              <div className="bg-white px-5 py-4">
                <p className="text-xs font-semibold text-slate-500">Net input VAT</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-emerald-700">
                  {formatCurrency(summary.net_input_tax, currency)}
                </p>
              </div>
              <div className="bg-white px-5 py-4">
                <p className="text-xs font-semibold text-slate-500">
                  Net VAT {payable >= 0 ? 'payable' : 'refundable'}
                </p>
                <p className="mt-1 text-lg font-bold tabular-nums text-slate-950">
                  {formatCurrency(Math.abs(payable), currency)}
                </p>
              </div>
            </div>
          </Card>

          <div className="no-print flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-800">
            <FileText className="mt-0.5 size-4 shrink-0" />
            Only documents linked to posted journal entries are included. Draft and cancelled
            documents are excluded. Historical credits without a saved tax-rate snapshot are
            shown as manual / unclassified tax.
          </div>
        </>
      )}
    </ReportPageShell>
  );
}
