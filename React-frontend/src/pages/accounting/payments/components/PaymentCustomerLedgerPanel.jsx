import { useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { reportsApi } from '@/pages/accounting/reports/api/reports.api';
import { PartyLedgerReport } from '@/pages/accounting/reports/components/PartyLedgerReport';
import { downloadCustomerLedgerCsv } from '@/pages/accounting/reports/customer-ledger-export';

/**
 * Same customer ledger report as Accounting → Reports → Customer ledger,
 * embedded inside the receive-payment sheet (swap view, not a modal).
 */
export function PaymentCustomerLedgerPanel({
  customerId,
  customerName,
  workspaceId,
  onClose,
}) {
  const handleExport = useCallback((ctx) => {
    if (!ctx.rows.length) return;
    try {
      downloadCustomerLedgerCsv({
        filename: `customer-ledger-${ctx.period.from}-to-${ctx.period.to}.csv`,
        companyName: ctx.company.name,
        period: ctx.period,
        currency: ctx.currency,
        rows: ctx.rows,
        openingBalance: ctx.openingBalance,
        totals: ctx.totals,
        isAllCustomers: ctx.isAllParties,
        customer: ctx.party,
      });
      toast.success('Export downloaded');
    } catch {
      toast.error('Failed to export report');
    }
  }, []);

  return (
    <PartyLedgerReport
      embedded
      lockedPartyId={String(customerId)}
      workspaceId={workspaceId}
      mode="customer"
      variant="peachtree"
      title="Customer Ledger"
      subtitle={
        customerName
          ? `Statement for ${customerName}`
          : 'Same layout as the Customer Ledger report'
      }
      reportHeading="Customer Ledgers"
      columnStorageKey="customer-ledger"
      loadData={(params) => reportsApi.customerLedger(params)}
      partyParamKey="customer_id"
      partyFilterLabel="Customer"
      allPartiesLabel="All customers"
      emptyMessage="No customer transactions found for this period."
      positiveBalanceLabel="Customer owes you"
      negativeBalanceLabel="Credit balance (prepaid)"
      includeAgingColumns={false}
      enableColumnReorder={false}
      onExport={handleExport}
      headerAction={
        <Button type="button" variant="outline" size="sm" className="h-8" onClick={onClose}>
          <ArrowLeft className="size-3.5 mr-1.5" />
          Back to payment
        </Button>
      }
      searchFields={(r) => [
        r.customer_name,
        r.customer_code,
        r.reference_no,
        r.description,
        r.order_number,
        r.entry_type_label,
      ]}
    />
  );
}
