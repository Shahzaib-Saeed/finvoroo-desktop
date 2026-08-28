import { useCallback } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";
import { reportsApi } from "./api/reports.api";
import { PartyLedgerReport } from "./components/PartyLedgerReport";
import { downloadCustomerLedgerCsv } from "./customer-ledger-export";

export function CustomerLedgerReportPage() {
  const { id: workspaceId } = useParams();

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
      toast.success("Export downloaded");
    } catch {
      toast.error("Failed to export report");
    }
  }, []);

  return (
    <PartyLedgerReport
      workspaceId={workspaceId}
      mode="customer"
      variant="peachtree"
      peachtreeColumns
      standardReportKey="customer_ledger"
      title="Customer Ledger"
      subtitle="Per-customer or all-customers statement with opening balance and running balance."
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
