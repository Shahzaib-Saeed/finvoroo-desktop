import { Link, useParams } from "react-router";
import { reportsApi } from "./api/reports.api";
import { PartyLedgerReport } from "./components/PartyLedgerReport";
import { Button } from "@/components/ui/button";

export function AccountsReceivableReportPage() {
  const { id: workspaceId } = useParams();
  const base = `/workspace/${workspaceId}/accounting`;

  return (
    <PartyLedgerReport
      workspaceId={workspaceId}
      mode="customer"
      variant="peachtree"
      title="Accounts Receivable"
      subtitle="Customer ledger detail — invoices, payments, and credit notes."
      reportHeading="Accounts Receivable"
      columnStorageKey="accounts-receivable-v2"
      loadData={(params) => reportsApi.customerLedger(params)}
      partyParamKey="customer_id"
      partyFilterLabel="Customer"
      allPartiesLabel="All customers"
      emptyMessage="No receivable transactions for this period."
      positiveBalanceLabel="Customer owes you"
      negativeBalanceLabel="Credit balance (overpaid)"
      enableColumnReorder={false}
      searchFields={(r) => [
        r.customer_name,
        r.customer_code,
        r.reference_no,
        r.description,
        r.order_number,
        r.entry_type_label,
      ]}
      headerAction={
        <Button variant="outline" size="sm" asChild className="h-8 px-3 text-xs">
          <Link to={`${base}/reports/accounts-payable`}>Accounts payable</Link>
        </Button>
      }
    />
  );
}
