import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  Loader2,
  Pencil,
  Trash2,
  Wallet,
  CalendarDays,
  CreditCard,
  Hash,
  FileText,
  Building2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { billPaymentsApi } from "./api/bill-payments.api";
import { formatCurrency, APPROVAL_COLORS, PAYMENT_METHODS, unwrapResourceList } from "./constants";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { BillPaymentOffcanvas } from "./components/BillPaymentOffcanvas";
import { DocumentCompanyFooter } from "@/pages/accounting/components/DocumentCompanyFooter";
import { documentNumberLabel } from "@/pages/accounting/lib/documentNumber";
import { hasPrepaidCash, prepaidCashAmount } from "../shared/prepaid-cash";
import { ApplyVendorUnappliedDialog } from "./components/ApplyVendorUnappliedDialog";
import { cn } from "@/lib/utils";

/* ─── tiny primitives ─────────────────────────────────────── */

function StatCard({ label, value, sub, icon: Icon, variant = "default" }) {
  const variants = {
    default: "bg-muted/30 border-border",
    primary:
      "bg-blue-50/70 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900/40",
    success:
      "bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/40",
  };
  const valueColors = {
    default: "text-foreground",
    primary: "text-blue-700 dark:text-blue-400",
    success: "text-emerald-700 dark:text-emerald-400",
  };
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3.5 flex gap-3.5 items-start",
        variants[variant],
      )}
    >
      {Icon && (
        <div className="mt-0.5 size-8 rounded-lg bg-background/70 border border-border flex items-center justify-center shrink-0">
          <Icon className="size-3.5 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
          {label}
        </p>
        <p
          className={cn(
            "text-xl font-semibold tabular-nums leading-none",
            valueColors[variant],
          )}
        >
          {value}
        </p>
        {sub && <p className="text-xs text-muted-foreground mt-1.5">{sub}</p>}
      </div>
    </div>
  );
}

function InfoRow({ label, value, icon: Icon }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      {Icon && (
        <Icon className="size-3.5 mt-0.5 text-muted-foreground shrink-0" />
      )}
      <span className="text-sm text-muted-foreground w-36 shrink-0">
        {label}
      </span>
      <span className="text-sm font-medium text-foreground break-words">
        {value || "—"}
      </span>
    </div>
  );
}

/* ─── main page ────────────────────────────────────────────── */

export function BillPaymentShowPage() {
  const { id: workspaceId, paymentId } = useParams();
  const navigate = useNavigate();
  const base = `/workspace/${workspaceId}/accounting/bill-payments`;
  const billsBase = `/workspace/${workspaceId}/accounting/bills`;

  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmVoid, setConfirmVoid] = useState(false);
  const [isVoiding, setIsVoiding] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);

  const reloadPayment = () => {
    setLoading(true);
    billPaymentsApi
      .show(paymentId)
      .then((res) => setPayment(res.data?.data || null))
      .catch((err) => {
        toast.error(
          err?.response?.data?.message || "Failed to load bill payment",
        );
        setPayment(null);
      })
      .finally(() => setLoading(false));
  };

  const handleVoid = async () => {
    setIsVoiding(true);
    try {
      const res = await billPaymentsApi.remove(paymentId);
      toast.success(res.data?.message || "Bill payment deleted.");
      navigate(base);
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to delete bill payment",
      );
    } finally {
      setIsVoiding(false);
      setConfirmVoid(false);
    }
  };

  useEffect(() => {
    reloadPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on paymentId only
  }, [paymentId]);

  const totalApplied = useMemo(() => {
    const apps = unwrapResourceList(payment?.applications);
    if (!apps.length) return 0;
    return apps.reduce(
      (sum, app) => sum + (Number(app.amount_applied) || 0),
      0,
    );
  }, [payment]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-muted-foreground text-sm">Payment not found.</p>
        <Button variant="outline" size="sm" asChild>
          <Link to={base}>
            <ArrowLeft className="size-4 mr-1.5" />
            Back to payments
          </Link>
        </Button>
      </div>
    );
  }

  const currency = payment.currency || "USD";
  const methodLabel =
    PAYMENT_METHODS.find((m) => m.value === payment.payment_method)?.label ||
    payment.payment_method;
  const approval = payment.approval_status || "approved";
  const paymentApplications = unwrapResourceList(payment?.applications);
  const cashApplied = paymentApplications.filter((a) => !a.vendor_credit_id);
  const creditApplied = paymentApplications.filter((a) => !!a.vendor_credit_id);

  const paymentLabel = documentNumberLabel(payment.payment_number, payment.reference);
  const prepaidAmount = prepaidCashAmount(payment);
  const isPrepaid = hasPrepaidCash(payment);
  const canApplyPrepaid = payment.flags?.can_apply_unapplied;

  return (
    <div className="w-full min-w-0 max-w-4xl mx-auto space-y-6">
      {/* ── header ── */}
      <PageHeader
        title={paymentLabel}
        subtitle={payment.vendor?.name || "Vendor payment"}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={base}>
                <ArrowLeft className="size-4 mr-1.5" />
                Back
              </Link>
            </Button>
            {canApplyPrepaid ? (
              <Button size="sm" variant="outline" onClick={() => setApplyOpen(true)}>
                Apply prepaid
              </Button>
            ) : null}
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="size-4 mr-1.5" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
              onClick={() => setConfirmVoid(true)}
            >
              <Trash2 className="size-4 mr-1.5" />
              Delete
            </Button>
          </div>
        }
      />

      {isPrepaid ? (
        <div
          className={cn(
            "rounded-lg border px-4 py-2.5 text-sm",
            "flex flex-wrap items-center justify-between gap-3",
            "border-amber-200/80 bg-amber-50/50",
          )}
        >
          <p>
            <span className="font-medium text-amber-900">Prepaid balance:</span>{" "}
            <span className="font-semibold tabular-nums text-amber-800">
              {formatCurrency(prepaidAmount, currency)}
            </span>{" "}
            <span className="text-muted-foreground">
              not yet applied to a bill.
            </span>
          </p>
          {canApplyPrepaid ? (
            <Button size="sm" variant="outline" onClick={() => setApplyOpen(true)}>
              Apply now
            </Button>
          ) : null}
        </div>
      ) : null}

      {/* ── stat row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          label="Cash / bank"
          value={formatCurrency(payment.amount, currency)}
          sub={`${currency} · ${methodLabel || "Payment"}`}
          icon={CreditCard}
          variant="primary"
        />
        <StatCard
          label="Total applied"
          value={formatCurrency(totalApplied, currency)}
          sub={`${paymentApplications.length} allocation(s)`}
          icon={Wallet}
          variant="success"
        />
        <StatCard
          label="Payment date"
          value={payment.payment_date_display || payment.payment_date || "—"}
          sub={payment.is_posted ? "Posted to ledger" : "Not yet posted"}
          icon={CalendarDays}
        />
      </div>

      {/* ── main card ── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* card header */}
        <div className="px-5 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-600 mb-1">
              Vendor payment
            </p>
            <p className="text-lg font-semibold leading-none">
              {paymentLabel}
            </p>
            {payment.vendor?.name && (
              <p className="text-sm text-muted-foreground mt-1">
                {payment.vendor.name}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className={cn(
                "capitalize text-xs px-2.5 py-0.5 rounded-full",
                APPROVAL_COLORS[approval] || "",
              )}
            >
              {approval}
            </Badge>
            {isPrepaid ? (
              <Badge
                variant="outline"
                className="text-xs px-2.5 py-0.5 rounded-full text-amber-800 border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900/40"
              >
                Prepaid
              </Badge>
            ) : null}
            {payment.is_posted && (
              <Badge
                variant="outline"
                className="text-xs px-2.5 py-0.5 rounded-full text-emerald-700 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900/40"
              >
                <CheckCircle2 className="size-3 mr-1" />
                Posted
              </Badge>
            )}
            {methodLabel && (
              <Badge
                variant="secondary"
                className="text-xs px-2.5 py-0.5 rounded-full capitalize"
              >
                {methodLabel}
              </Badge>
            )}
          </div>
        </div>

        {/* payment details */}
        <div className="px-5 py-4 border-b border-border">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Payment details
          </p>
          <InfoRow
            label="Payment date"
            value={payment.payment_date_display || payment.payment_date}
            icon={CalendarDays}
          />
          <InfoRow
            label="Payment method"
            value={methodLabel}
            icon={CreditCard}
          />
          {payment.reference && (
            <InfoRow label="Reference" value={payment.reference} icon={Hash} />
          )}
          {payment.vendor?.name && (
            <InfoRow
              label="Vendor"
              value={payment.vendor.name}
              icon={Building2}
            />
          )}
          {payment.memo && (
            <InfoRow label="Memo" value={payment.memo} icon={FileText} />
          )}
        </div>

        <DocumentCompanyFooter
          company={payment.company}
          page="bill_payment"
          className="mx-5 mb-4 rounded-md border bg-muted/30 px-4 py-3"
          textClassName="text-sm text-foreground"
          showLabel
        />

        {/* bills applied table */}
        <div className="px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Bills settled
          </p>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left px-3 py-2.5 bg-muted/40 border-b border-border text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Bill
                  </th>
                  <th className="text-left px-3 py-2.5 bg-muted/40 border-b border-border text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Source
                  </th>
                  <th className="text-right px-3 py-2.5 bg-muted/40 border-b border-border text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Applied
                  </th>
                </tr>
              </thead>
              <tbody>
                {paymentApplications.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-3 py-10 text-center text-sm text-muted-foreground"
                    >
                      No bills applied to this payment.
                    </td>
                  </tr>
                ) : (
                  paymentApplications.map((app) => (
                    <tr
                      key={app.id}
                      className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-3 py-2.5">
                        {app.bill_id ? (
                          <Link
                            to={`${billsBase}/${app.bill_id}`}
                            className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                          >
                        {documentNumberLabel(app.bill_number)}
                          </Link>
                        ) : app.is_unapplied || app.bill_number === "Prepaid" || app.bill_number === "On account" ? (
                          <span className="inline-flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/40"
                            >
                              Prepaid
                            </Badge>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            {app.bill_number || "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {app.vendor_credit_id ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant="outline"
                              className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/40"
                            >
                              Vendor credit
                            </Badge>
                            {app.vendor_credit_number && (
                              <span className="text-xs text-muted-foreground">
                                {app.vendor_credit_number}
                              </span>
                            )}
                          </div>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/40"
                          >
                            Cash / bank
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-medium">
                        {formatCurrency(app.amount_applied, currency)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {/* totals footer */}
              {paymentApplications.length > 0 && (
                <tfoot>
                  {creditApplied.length > 0 && (
                    <tr className="border-t border-border bg-muted/20">
                      <td
                        colSpan={2}
                        className="px-3 py-2 text-right text-xs text-muted-foreground"
                      >
                        Vendor credits
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-xs text-amber-700 dark:text-amber-400 font-medium">
                        {formatCurrency(
                          creditApplied.reduce(
                            (s, a) => s + (Number(a.amount_applied) || 0),
                            0,
                          ),
                          currency,
                        )}
                      </td>
                    </tr>
                  )}
                  <tr className="border-t border-border bg-muted/30">
                    <td
                      colSpan={2}
                      className="px-3 py-2.5 text-right text-sm font-medium"
                    >
                      Total applied
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(totalApplied, currency)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmVoid}
        title="Delete this payment?"
        description={`Permanently delete ${paymentLabel} (${formatCurrency(payment.display_amount ?? payment.amount, currency)})? This purges its journal entry, restores all applied bill balances, and returns any vendor credits. This cannot be undone.`}
        confirmLabel="Delete payment"
        confirmVariant="destructive"
        isLoading={isVoiding}
        onConfirm={handleVoid}
        onCancel={() => setConfirmVoid(false)}
      />

      <BillPaymentOffcanvas
        open={editOpen}
        onOpenChange={setEditOpen}
        editPaymentId={paymentId}
        onSuccess={(updated) => {
          setPayment(updated || null);
          if (!updated) {
            billPaymentsApi
              .show(paymentId)
              .then((res) => setPayment(res.data?.data || null))
              .catch(() => {});
          }
        }}
      />

      <ApplyVendorUnappliedDialog
        open={applyOpen}
        paymentId={paymentId}
        onOpenChange={setApplyOpen}
        onApplied={() => reloadPayment()}
      />
    </div>
  );
}
