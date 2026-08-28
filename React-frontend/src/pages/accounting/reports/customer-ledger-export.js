import { getReportDisplayReference } from "./report-reference";
import {
  formatPaidReferenceExport,
  isPaidPartyLedgerEntry,
} from "./ledger-paid-marker";
import { getLedgerEntryTypeMeta } from "./journal-type-codes";

function formatAmount(value) {
  const n = Number(value) || 0;
  if (!n || Math.abs(n) < 0.005) return "";
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(n));
}

function formatBalance(value) {
  const n = Number(value) || 0;
  const text = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(n));
  return n < 0 ? `-${text}` : text;
}

function formatAge(entry) {
  if (entry?.age_days !== null && entry?.age_days !== undefined) {
    return String(entry.age_days);
  }
  if (entry?.days_late !== null && entry?.days_late !== undefined) {
    return String(Math.max(0, Number(entry.days_late)));
  }
  return "";
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export function downloadCustomerLedgerCsv({
  filename,
  companyName,
  period,
  currency,
  rows,
  openingBalance,
  totals,
  isAllCustomers,
  customer,
}) {
  const out = [];
  out.push(["Customer Ledger Report"]);
  out.push([`Company: ${companyName || ""}`]);
  out.push([`Period: ${period?.from || ""} to ${period?.to || ""}`]);
  out.push([`Currency: ${currency || ""}`]);
  if (customer) {
    out.push([
      `Customer: ${customer.name || ""}${
        customer.customer_code ? ` (${customer.customer_code})` : ""
      }`,
    ]);
    out.push([`Opening Balance: ${formatBalance(openingBalance)}`]);
  }
  out.push([]);
  out.push([
    "Customer",
    "Date",
    "Paid",
    "Trans No",
    "Type",
    "Purch Order #",
    "Sales Rep",
    "Debit Amt",
    "Credit Amt",
    "Balance",
  ]);

  for (const row of rows) {
    const paid = isPaidPartyLedgerEntry(row);
    const ref = getReportDisplayReference(row) || "";
    const type = getLedgerEntryTypeMeta(row, "ar");
    out.push([
      row.customer_name || customer?.name || "",
      row.txn_date || "",
      paid ? "*" : "",
      formatPaidReferenceExport(ref, paid).trim(),
      type.code,
      row.order_number || "",
      row.description || "",
      Number(row.debit || 0).toFixed(2),
      Number(row.credit || 0).toFixed(2),
      Number(row.running_balance || 0).toFixed(2),
    ]);
  }

  out.push([]);
  out.push([
    "REPORT TOTAL",
    "",
    "",
    "",
    "",
    "",
    "",
    Number(totals.total_debit || 0).toFixed(2),
    Number(totals.total_credit || 0).toFixed(2),
    Number(totals.closing_balance || 0).toFixed(2),
  ]);
  if (!isAllCustomers) {
    out.push([
      "Outstanding Position",
      totals.closing_balance < 0 ? "Payable Balance" : "Receivable Balance",
    ]);
  }

  const csv = out.map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadVendorLedgerCsv({
  filename,
  companyName,
  period,
  currency,
  rows,
  openingBalance,
  totals,
  isAllVendors,
  vendor,
}) {
  const out = [];
  out.push(["Vendor Ledger Report"]);
  out.push([`Company: ${companyName || ""}`]);
  out.push([`Period: ${period?.from || ""} to ${period?.to || ""}`]);
  out.push([`Currency: ${currency || ""}`]);
  if (vendor) {
    out.push([
      `Vendor: ${vendor.name || ""}${
        vendor.vendor_code ? ` (${vendor.vendor_code})` : ""
      }`,
    ]);
    out.push([`Opening Balance: ${formatBalance(openingBalance)}`]);
  }
  out.push([]);
  out.push([
    "Vendor",
    "Date",
    "Paid",
    "Trans No",
    "Type",
    "Order #",
    "Description",
    "Debit Amt",
    "Credit Amt",
    "Balance",
  ]);

  for (const row of rows) {
    const paid = isPaidPartyLedgerEntry(row);
    const ref = getReportDisplayReference(row) || "";
    const type = getLedgerEntryTypeMeta(row, "ap");
    out.push([
      row.vendor_name || vendor?.name || "",
      row.txn_date || "",
      paid ? "*" : "",
      formatPaidReferenceExport(ref, paid).trim(),
      type.code,
      row.order_number || "",
      row.description || "",
      Number(row.debit || 0).toFixed(2),
      Number(row.credit || 0).toFixed(2),
      Number(row.running_balance || 0).toFixed(2),
    ]);
  }

  out.push([]);
  out.push([
    "REPORT TOTAL",
    "",
    "",
    "",
    "",
    "",
    "",
    Number(totals.total_debit || 0).toFixed(2),
    Number(totals.total_credit || 0).toFixed(2),
    Number(totals.closing_balance || 0).toFixed(2),
  ]);
  if (!isAllVendors) {
    out.push([
      "Outstanding Position",
      totals.closing_balance < 0 ? "Credit balance (prepaid)" : "You owe vendor",
    ]);
  }

  const csv = out.map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export { formatAmount, formatBalance, formatAge };
