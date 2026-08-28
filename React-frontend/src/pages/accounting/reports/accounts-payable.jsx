import { Link, useParams } from "react-router";
import { useCallback } from "react";
import { toast } from "sonner";
import { reportsApi } from "./api/reports.api";
import { PartyLedgerReport } from "./components/PartyLedgerReport";
import { downloadVendorLedgerCsv } from "./customer-ledger-export";
import { Button } from "@/components/ui/button";

export function AccountsPayableReportPage() {
  const { id: workspaceId } = useParams();
  const base = `/workspace/${workspaceId}/accounting`;

  const handleExport = useCallback((ctx) => {
    if (!ctx.rows.length) return;
    try {
      downloadVendorLedgerCsv({
        filename: `accounts-payable-${ctx.period.from}-to-${ctx.period.to}.csv`,
        companyName: ctx.company.name,
        period: ctx.period,
        currency: ctx.currency,
        rows: ctx.rows,
        openingBalance: ctx.openingBalance,
        totals: ctx.totals,
        isAllVendors: ctx.isAllParties,
        vendor: ctx.party,
      });
      toast.success("Export downloaded");
    } catch {
      toast.error("Failed to export report");
    }
  }, []);

  return (
    <PartyLedgerReport
      workspaceId={workspaceId}
      mode="vendor"
      variant="peachtree"
      peachtreeColumns
      standardReportKey="accounts_payable"
      title="Accounts Payable"
      subtitle="Vendor ledger detail — bills, payments, and vendor credits."
      reportHeading="Accounts Payable"
      columnStorageKey="accounts-payable"
      loadData={(params) => reportsApi.vendorLedger(params)}
      partyParamKey="vendor_id"
      partyFilterLabel="Vendor"
      allPartiesLabel="All vendors"
      emptyMessage="No payable transactions for this period."
      positiveBalanceLabel="You owe vendor"
      negativeBalanceLabel="Credit balance (prepaid)"
      includeAgingColumns={false}
      enableColumnReorder={false}
      onExport={handleExport}
      searchFields={(r) => [
        r.vendor_name,
        r.vendor_code,
        r.reference_no,
        r.description,
        r.order_number,
        r.entry_type_label,
      ]}
      headerAction={
        <Button variant="outline" size="sm" asChild className="h-8 px-3 text-xs">
          <Link to={`${base}/reports/accounts-receivable`}>Accounts receivable</Link>
        </Button>
      }
    />
  );
}
