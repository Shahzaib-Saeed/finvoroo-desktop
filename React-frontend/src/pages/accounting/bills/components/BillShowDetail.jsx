import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { DocumentAttachmentsReadOnly } from "@/components/accounting/DocumentAttachmentsSection";
import {
  APPROVAL_COLORS,
  BILL_STATUSES,
  formatCurrency,
  formatLineQtyWithUnit,
  STATUS_COLORS,
} from "../constants";

function MetricChip({ label, value, tone = "slate" }) {
  const tones = {
    slate: {
      bg: "rgba(148, 163, 184, 0.1)",
      label: "text-slate-500",
      value: "text-slate-900",
    },
    emerald: {
      bg: "rgba(16, 185, 129, 0.08)",
      label: "text-emerald-700/80",
      value: "text-emerald-800",
    },
    amber: {
      bg: "rgba(245, 158, 11, 0.1)",
      label: "text-amber-700/80",
      value: "text-amber-800",
    },
  };
  const t = tones[tone] || tones.slate;

  return (
    <div
      className="min-w-[7.5rem] rounded-lg px-3.5 py-2.5"
      style={{ backgroundColor: t.bg }}
    >
      <p
        className={cn(
          "text-[10px] font-bold uppercase tracking-wider",
          t.label,
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 text-sm font-semibold tabular-nums sm:text-base",
          t.value,
        )}
      >
        {value}
      </p>
    </div>
  );
}

function MetaCell({ label, children }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <div className="mt-1.5 text-sm font-semibold text-slate-800">
        {children}
      </div>
    </div>
  );
}

/**
 * Executive document-style bill detail — one unified canvas, no boarding pass.
 */
export function BillShowDetail({ bill, workspaceId }) {
  const currency = bill.currency || "USD";
  const status = bill.status || "draft";
  const approval = bill.approval_status || "approved";
  const statusLabel =
    BILL_STATUSES.find((s) => s.value === status)?.label || status;
  const balanceDue = Number(bill.balance_due) || 0;
  const lines = Array.isArray(bill.lines) ? bill.lines : [];
  const payments = bill.payment_applications || [];
  const customFields = bill.custom_fields_display || [];

  const vendorBase = `/workspace/${workspaceId}/accounting/vendors`;
  const customerBase = `/workspace/${workspaceId}/accounting/customers`;
  const jobBase = `/workspace/${workspaceId}/accounting/job-orders`;
  const journalBase = `/workspace/${workspaceId}/accounting/journal`;
  const paymentBase = `/workspace/${workspaceId}/accounting/bill-payments`;

  const warehouseLabel = bill.warehouse?.name
    ? `${currency} · ${bill.warehouse.name}${bill.warehouse.code ? ` (${bill.warehouse.code})` : ""}`
    : currency;

  const related = [
    bill.vendor?.id
      ? {
          to: `${vendorBase}/${bill.vendor.id}/edit`,
          label: bill.vendor.name,
          meta: "Vendor",
        }
      : null,
    bill.job_order?.id
      ? {
          to: `${jobBase}/${bill.job_order.id}`,
          label: bill.job_order.job_number || `JO-${bill.job_order.id}`,
          meta: "Job",
        }
      : null,
    bill.is_drop_ship && bill.drop_ship_customer?.id
      ? {
          to: `${customerBase}/${bill.drop_ship_customer.id}/edit`,
          label: bill.drop_ship_customer.name,
          meta: "Drop ship",
        }
      : null,
    bill.journal_entry_id
      ? {
          to: `${journalBase}/${bill.journal_entry_id}`,
          label: `Journal #${bill.journal_entry_id}`,
          meta: bill.is_posted ? "Posted" : "Draft",
        }
      : null,
  ].filter(Boolean);

  return (
    <div className="space-y-5">
      {/* Upper document header */}
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-sm sm:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Vendor Bill
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              {bill.bill_number || "—"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {bill.vendor?.name || "No vendor"}
              {bill.reference ? (
                <span className="font-mono text-slate-400">
                  {" "}
                  · {bill.reference}
                </span>
              ) : null}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span
                className={cn(
                  "inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize",
                  STATUS_COLORS[status],
                )}
              >
                {statusLabel}
              </span>
              {approval !== "approved" ? (
                <span
                  className={cn(
                    "inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize",
                    APPROVAL_COLORS[approval],
                  )}
                >
                  {approval}
                </span>
              ) : null}
              {bill.is_posted ? (
                <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                  Posted
                </span>
              ) : (
                <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">
                  Unposted
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 lg:justify-end">
            <MetricChip
              label="Total"
              value={formatCurrency(bill.total, currency)}
              tone="slate"
            />
            <MetricChip
              label="Paid"
              value={formatCurrency(bill.amount_paid, currency)}
              tone="emerald"
            />
            <MetricChip
              label="Due"
              value={formatCurrency(balanceDue, currency)}
              tone={balanceDue > 0.001 ? "amber" : "emerald"}
            />
          </div>
        </div>
      </div>

      {/* Main document canvas — unified sheet */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        {/* 4-column metadata */}
        <div className="grid grid-cols-1 gap-6 border-b border-slate-100 pb-6 sm:grid-cols-2 lg:grid-cols-4">
          <MetaCell label="Vendor">
            {bill.vendor?.id ? (
              <Link
                to={`${vendorBase}/${bill.vendor.id}/edit`}
                className="hover:text-blue-600 hover:underline"
              >
                {bill.vendor.name}
              </Link>
            ) : (
              "—"
            )}
            {bill.vendor_address ? (
              <p className="mt-1 whitespace-pre-line text-xs font-normal leading-relaxed text-slate-500">
                {bill.vendor_address}
              </p>
            ) : null}
          </MetaCell>
          <MetaCell label="Bill Date">
            {bill.bill_date_display || bill.bill_date || "—"}
          </MetaCell>
          <MetaCell label="Due Date">
            {bill.due_date_display || bill.due_date || "—"}
          </MetaCell>
          <MetaCell label="Currency / Warehouse">{warehouseLabel}</MetaCell>
        </div>

        {/* Line items */}
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Line items
            </h3>
            <span className="text-[10px] tabular-nums text-slate-400">
              {lines.length} {lines.length === 1 ? "item" : "items"}
            </span>
          </div>

          {lines.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
              No line items on this bill.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-t border-slate-200 bg-[#F8FAFC]">
                    <th className="border-r border-slate-100 px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Description
                    </th>
                    <th className="border-r border-slate-100 px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Qty
                    </th>
                    <th className="border-r border-slate-100 px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Rate
                    </th>
                    <th className="border-r border-slate-100 px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Tax
                    </th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, idx) => {
                    const lineTax =
                      Number(line.tax_amount || 0) +
                      Number(line.sale_tax_amount || 0);
                    const title = line.product_name || line.description || "—";
                    const code =
                      line.product_sku ||
                      (line.product_name &&
                      line.description !== line.product_name
                        ? line.description
                        : null);

                    return (
                      <tr
                        key={line.id || idx}
                        className="border-b border-slate-100 last:border-b-0"
                      >
                        <td className="border-r border-slate-100 px-4 py-3.5 align-top">
                          <p className="font-semibold text-slate-800">
                            {title}
                          </p>
                          {code ? (
                            <p className="mt-0.5 text-xs text-slate-400">
                              {code}
                            </p>
                          ) : null}
                        </td>
                        <td className="border-r border-slate-100 px-3 py-3.5 text-right tabular-nums text-slate-700">
                          {formatLineQtyWithUnit(line)}
                        </td>
                        <td className="border-r border-slate-100 px-3 py-3.5 text-right tabular-nums text-slate-700">
                          {formatCurrency(line.unit_price, currency)}
                        </td>
                        <td className="border-r border-slate-100 px-3 py-3.5 text-right tabular-nums text-slate-700">
                          {lineTax > 0
                            ? formatCurrency(lineTax, currency)
                            : "—"}
                        </td>
                        <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-slate-900">
                          {formatCurrency(line.amount, currency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Technical specs + financial summary */}
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_280px]">
          <div className="min-w-0 space-y-6">
            {customFields.length > 0 ? (
              <div>
                <h3 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Technical Specifications
                </h3>
                <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-3">
                  {customFields.map((field) => (
                    <div key={field.id} className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {field.label}
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-800">
                        {field.value || "—"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {bill.notes?.trim() ? (
              <div>
                <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Notes
                </h3>
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
                  {bill.notes}
                </p>
              </div>
            ) : null}

            {!customFields.length && !bill.notes?.trim() ? (
              <p className="text-sm text-slate-400">
                No additional specifications.
              </p>
            ) : null}
          </div>

          <div className="w-full lg:justify-self-end">
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-6">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium tabular-nums text-slate-800">
                  {formatCurrency(bill.subtotal, currency)}
                </span>
              </div>
              {Number(bill.discount_amount) > 0 ? (
                <div className="flex items-center justify-between gap-6">
                  <span className="text-slate-500">Discount</span>
                  <span className="font-medium tabular-nums text-rose-600">
                    −{formatCurrency(bill.discount_amount, currency)}
                  </span>
                </div>
              ) : null}
              {Number(bill.tax_amount) > 0 ? (
                <div className="flex items-center justify-between gap-6">
                  <span className="text-slate-500">Tax</span>
                  <span className="font-medium tabular-nums text-slate-800">
                    {formatCurrency(bill.tax_amount, currency)}
                  </span>
                </div>
              ) : null}
              {Number(bill.other_charges) > 0 ? (
                <div className="flex items-center justify-between gap-6">
                  <span className="text-slate-500">Other charges</span>
                  <span className="font-medium tabular-nums text-slate-800">
                    {formatCurrency(bill.other_charges, currency)}
                  </span>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-6 border-t border-slate-200 pt-3">
                <span className="font-semibold text-slate-900">Total</span>
                <span className="font-bold tabular-nums text-slate-900">
                  {formatCurrency(bill.total, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-6">
                <span className="text-slate-500">Paid</span>
                <span className="font-medium tabular-nums text-slate-700">
                  {formatCurrency(bill.amount_paid, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-6 border-t border-slate-200 pt-3">
                <span className="text-sm font-semibold text-slate-900">
                  Balance due
                </span>
                <span className="text-lg font-bold tabular-nums text-slate-900">
                  {formatCurrency(balanceDue, currency)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related */}
      {related.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-sm print:hidden sm:px-8">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Related
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {related.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="inline-flex flex-col rounded-lg border border-slate-200 px-3 py-2 transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  {item.meta}
                </span>
                <span className="text-sm font-medium text-slate-800">
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {/* Payments */}
      {payments.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm print:hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-3 sm:px-8">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Payments applied
            </h3>
            <span className="text-xs tabular-nums text-slate-400">
              {payments.length}
            </span>
          </div>
          <ul className="divide-y divide-slate-100">
            {payments.map((p) => (
              <li key={p.id}>
                <Link
                  to={`${paymentBase}/${p.bill_payment_id}`}
                  className="flex items-center justify-between gap-4 px-6 py-3.5 transition-colors hover:bg-slate-50 sm:px-8"
                >
                  <span className="text-sm font-medium text-slate-700">
                    {p.payment_number || p.payment_reference || '—'}
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-slate-900">
                    {formatCurrency(p.amount_applied, currency)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Attachments */}
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-sm print:hidden sm:px-8">
        {bill.attachments?.length > 0 ? (
          <DocumentAttachmentsReadOnly
            documentType="bill"
            documentId={bill.id}
            attachments={bill.attachments}
          />
        ) : (
          <div className="py-8 text-center text-sm text-slate-500">
            No attachments available.
          </div>
        )}
      </div>
    </div>
  );
}
