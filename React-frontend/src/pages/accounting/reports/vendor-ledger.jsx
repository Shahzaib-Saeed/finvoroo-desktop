import { useCallback } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";
import { reportsApi } from "./api/reports.api";
import { PartyLedgerReport } from "./components/PartyLedgerReport";
import { downloadVendorLedgerCsv } from "./customer-ledger-export";

export function VendorLedgerReportPage() {
  const { id: workspaceId } = useParams();

  const handleExport = useCallback((ctx) => {
    if (!ctx.rows.length) return;
    try {
      downloadVendorLedgerCsv({
        filename: `vendor-ledger-${ctx.period.from}-to-${ctx.period.to}.csv`,
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
      standardReportKey="vendor_ledger"
      title="Vendor Ledger"
      subtitle="Per-vendor or all-vendors statement with opening balance and running balance."
      reportHeading="Vendor Ledgers"
      columnStorageKey="vendor-ledger"
      loadData={(params) => reportsApi.vendorLedger(params)}
      partyParamKey="vendor_id"
      partyFilterLabel="Vendor"
      allPartiesLabel="All vendors"
      emptyMessage="No vendor transactions found for this period."
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
    />
  );
}
