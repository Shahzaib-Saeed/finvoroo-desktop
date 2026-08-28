import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { Edit3, Loader2, Mail, Trash2, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { vendorsApi } from "../api/vendors.api";
import { extractApiListItems, formatMoney } from "../constants";
import { VendorDeleteDialog } from "./VendorDeleteDialog";
import { VendorDetailsAttachments } from "./VendorDetailsAttachments";
import { VendorDetailsSidebar } from "./VendorDetailsSidebar";
import { CustomerDetailsStats as VendorDetailsStats } from "../../customers/components/CustomerDetailsStats";
import {
  VendorDetailsRecentPurchaseOrders,
  VendorDetailsRecentPayments,
} from "./VendorDetailsRecentList";
import {
  VendorDocumentTable,
  billColumns,
  billPaymentColumns,
  purchaseOrderColumns,
  vendorCreditColumns,
} from "./VendorDocumentTable";

function MetaDot() {
  return <span className="text-muted-foreground/50 mx-1.5">·</span>;
}

/**
 * Vendor details body (overview, bills, payments, purchase orders, vendor credits).
 * Used inside VendorDetailsSheet and optionally on the full show page.
 * Structurally mirrors CustomerDetailsPanel — same layout, same view.
 */
export function VendorDetailsPanel({
  vendorId,
  workspaceId,
  onClose,
  onEdit,
  onListRefresh,
  onDeleted,
  showHeaderActions = true,
}) {
  const base = `/workspace/${workspaceId}/accounting/vendors`;
  const acc = `/workspace/${workspaceId}/accounting`;

  const [vendor, setVendor] = useState(null);
  const [bills, setBills] = useState([]);
  const [payments, setPayments] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [vendorCredits, setVendorCredits] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activating, setActivating] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!vendorId) return;
    setLoading(true);
    try {
      const [vendResult, billResult, payResult, poResult, vcResult, attResult] =
        await Promise.allSettled([
        vendorsApi.show(vendorId),
        vendorsApi.listBills(vendorId),
        vendorsApi.listBillPayments(vendorId),
        vendorsApi.listPurchaseOrders(vendorId),
        vendorsApi.listVendorCredits(vendorId),
        vendorsApi.listAttachments(vendorId),
      ]);

      if (vendResult.status === "rejected") throw vendResult.reason;

      setVendor(vendResult.value.data?.data || null);
      setBills(
        billResult.status === "fulfilled" ? extractApiListItems(billResult.value) : [],
      );
      setPayments(
        payResult.status === "fulfilled" ? extractApiListItems(payResult.value) : [],
      );
      setPurchaseOrders(
        poResult.status === "fulfilled" ? extractApiListItems(poResult.value) : [],
      );
      setVendorCredits(
        vcResult.status === "fulfilled" ? extractApiListItems(vcResult.value) : [],
      );
      setAttachments(
        attResult.status === "fulfilled" ? attResult.value.data?.data || [] : [],
      );
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load vendor");
      setVendor(null);
      setAttachments([]);
    } finally {
      setLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    setActiveTab("overview");
    fetchAll();
  }, [fetchAll]);

  const handleActivate = async () => {
    setActivating(true);
    try {
      const res = await vendorsApi.activate(vendorId);
      toast.success(res?.data?.message || "Vendor activated");
      fetchAll();
      onListRefresh?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to activate vendor");
    } finally {
      setActivating(false);
    }
  };

  const handleDeleted = () => {
    onListRefresh?.();
    onDeleted?.();
    onClose?.();
  };

  if (!vendorId) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
        <p>Vendor not found</p>
        {onClose ? (
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        ) : null}
      </div>
    );
  }

  const currency = vendor.currency || "USD";
  const balanceDue = Number(vendor.balance_due ?? 0);

  const overviewStats = [
    {
      label: "Total Billed",
      value: formatMoney(vendor.total_billed, currency),
    },
    { label: "Amount Paid", value: formatMoney(vendor.total_paid, currency) },
    {
      label: "Balance Due",
      value: formatMoney(vendor.balance_due, currency),
      highlight: balanceDue > 0,
      hint: balanceDue > 0 ? "Outstanding balance" : "All clear",
    },
    {
      label: "Purchase Orders",
      value: String(purchaseOrders.length),
      hint: `${vendorCredits.length} vendor credits`,
    },
  ];

  return (
    <>
      {showHeaderActions ? (
        <div className="flex flex-col gap-4 border-b border-border px-5 py-4 lg:flex-row lg:items-start lg:justify-between shrink-0">
          <div className="flex flex-col gap-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xl lg:text-[22px] font-semibold text-foreground leading-tight truncate">
                {vendor.name}
              </span>
              <Badge
                variant="outline"
                className={
                  vendor.is_active
                    ? "rounded-full bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "rounded-full bg-muted text-muted-foreground"
                }
              >
                {vendor.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-0 gap-y-1 text-sm text-muted-foreground">
              <span>
                Vendor ID:{" "}
                <span className="font-medium text-foreground font-mono">
                  {vendor.vendor_code || "—"}
                </span>
              </span>
              {vendor.created_at ? (
                <>
                  <MetaDot />
                  <span>
                    Joined{" "}
                    <span className="font-medium text-foreground">
                      {vendor.created_at}
                    </span>
                  </span>
                </>
              ) : null}
              {vendor.email ? (
                <>
                  <MetaDot />
                  <span className="inline-flex items-center gap-1">
                    <Mail className="size-3.5" />
                    {vendor.email}
                  </span>
                </>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onClose ? (
              <Button variant="ghost" size="sm" onClick={onClose}>
                Close
              </Button>
            ) : null}
            {!vendor.is_active && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleActivate}
                disabled={activating}
              >
                {activating ? (
                  <Loader2 className="size-4 mr-1 animate-spin" />
                ) : (
                  <UserCheck className="size-4 mr-1" />
                )}
                Activate
              </Button>
            )}
            {vendor.email ? (
              <Button variant="outline" size="sm" asChild>
                <a href={`mailto:${vendor.email}`}>Send Email</a>
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="mono"
              onClick={() => onEdit?.(vendor) ?? undefined}
              asChild={!onEdit}
            >
              {onEdit ? (
                <>
                  <Edit3 className="size-4 mr-1" /> Edit Details
                </>
              ) : (
                <Link to={`${base}/${vendorId}/edit`}>
                  <Edit3 className="size-4 mr-1" /> Edit Details
                </Link>
              )}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="size-4 mr-1" /> Delete
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col lg:flex-row flex-1 min-h-0">
        <aside className="w-full shrink-0 border-b lg:border-b-0 lg:border-e border-border px-4 pt-4 pb-5 lg:w-[300px] lg:px-5">
          <VendorDetailsSidebar
            vendor={vendor}
            workspaceId={workspaceId}
            onEdit={onEdit}
            attachmentCount={attachments.length}
            onViewAttachments={() => setActiveTab("attachments")}
          />
        </aside>

        <div className="flex-1 min-w-0 flex flex-col min-h-0 pt-4 pb-5 lg:ps-5 lg:pe-5">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full flex flex-col flex-1 min-h-0"
          >
            <TabsList className="inline-flex w-auto h-auto flex-wrap justify-start gap-1 bg-transparent p-0 mb-5 shrink-0">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-muted"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger value="bills">Bills ({bills.length})</TabsTrigger>
              <TabsTrigger value="payments">
                Payments ({payments.length})
              </TabsTrigger>
              <TabsTrigger value="purchase-orders">
                Purchase Orders ({purchaseOrders.length})
              </TabsTrigger>
              <TabsTrigger value="vendor-credits">
                Vendor Credits ({vendorCredits.length})
              </TabsTrigger>
              <TabsTrigger value="attachments">
                Attachments ({attachments.length})
              </TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
            </TabsList>

            <ScrollArea
              className="flex-1 pe-2"
              viewportClassName="max-h-[calc(100dvh-16rem)]"
            >
              <TabsContent value="overview" className="mt-0 space-y-5 pb-6 pt-1">
                <VendorDetailsStats items={overviewStats} />
                <div className="grid lg:grid-cols-2 gap-5">
                  <VendorDetailsRecentPurchaseOrders
                    orders={purchaseOrders}
                    workspaceId={workspaceId}
                    onViewAll={() => setActiveTab("purchase-orders")}
                  />
                  <VendorDetailsRecentPayments
                    payments={payments}
                    workspaceId={workspaceId}
                    onViewAll={() => setActiveTab("payments")}
                  />
                </div>
              </TabsContent>

              <TabsContent value="bills" className="mt-0 space-y-5 pb-6 pt-1">
                <VendorDetailsStats
                  items={[
                    { label: "Bills", value: String(bills.length) },
                    {
                      label: "Total Billed",
                      value: formatMoney(vendor.total_billed, currency),
                    },
                    {
                      label: "Balance Due",
                      value: formatMoney(vendor.balance_due, currency),
                      highlight: balanceDue > 0,
                    },
                  ]}
                />
                <VendorDocumentTable
                  columns={billColumns(workspaceId)}
                  rows={bills}
                  emptyMessage="No bills for this vendor yet."
                  currency={currency}
                />
                <Button size="sm" variant="mono" asChild>
                  <Link to={`${acc}/bills/create?vendor_id=${vendorId}`}>
                    New Bill
                  </Link>
                </Button>
              </TabsContent>

              <TabsContent value="payments" className="mt-0 space-y-5 pb-6 pt-1">
                <VendorDetailsStats
                  items={[
                    { label: "Payments", value: String(payments.length) },
                    {
                      label: "Total Paid",
                      value: formatMoney(vendor.total_paid, currency),
                    },
                  ]}
                />
                <VendorDocumentTable
                  columns={billPaymentColumns()}
                  rows={payments}
                  emptyMessage="No payments recorded for this vendor."
                  currency={currency}
                />
                <Button size="sm" variant="outline" asChild>
                  <Link to={`${acc}/bill-payments`}>Bill Payments</Link>
                </Button>
              </TabsContent>

              <TabsContent value="purchase-orders" className="mt-0 space-y-5 pb-6 pt-1">
                <VendorDetailsStats
                  items={[
                    { label: "Orders", value: String(purchaseOrders.length) },
                    {
                      label: "Order Value",
                      value: formatMoney(
                        purchaseOrders.reduce(
                          (s, o) => s + Number(o.total || 0),
                          0,
                        ),
                        currency,
                      ),
                    },
                  ]}
                />
                <VendorDocumentTable
                  columns={purchaseOrderColumns(workspaceId)}
                  rows={purchaseOrders}
                  emptyMessage="No purchase orders for this vendor."
                  currency={currency}
                />
                <Button size="sm" variant="mono" asChild>
                  <Link
                    to={`${acc}/purchase-orders/create?vendor_id=${vendorId}`}
                  >
                    New Purchase Order
                  </Link>
                </Button>
              </TabsContent>

              <TabsContent value="vendor-credits" className="mt-0 space-y-5 pb-6 pt-1">
                <VendorDocumentTable
                  title="Vendor credits"
                  columns={vendorCreditColumns(workspaceId)}
                  rows={vendorCredits}
                  emptyMessage="No vendor credits for this vendor."
                  currency={currency}
                />
              </TabsContent>

              <TabsContent value="attachments" className="mt-0 space-y-5 pb-6 pt-1">
                <VendorDetailsAttachments
                  vendorId={vendorId}
                  attachments={attachments}
                />
              </TabsContent>

              <TabsContent value="billing" className="mt-0 space-y-5 pb-6 pt-1">
                <VendorDetailsStats
                  items={[
                    { label: "Currency", value: vendor.currency || "—" },
                    {
                      label: "Opening Balance",
                      value: formatMoney(vendor.opening_balance, currency),
                    },
                    {
                      label: "Opening Balance Due",
                      value: formatMoney(vendor.opening_balance_due, currency),
                    },
                  ]}
                />
                <Card className="shadow-none overflow-hidden">
                  <CardHeader className="px-4 pt-4 pb-2 border-b">
                    <CardTitle className="text-sm font-medium">Billing details</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pt-4 pb-5 space-y-4 text-sm">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Vendor name
                      </p>
                      <p className="font-medium">
                        {vendor.name || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Tax ID
                      </p>
                      <p>{vendor.tax_id || "—"}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-xs text-muted-foreground mb-1">
                        Address
                      </p>
                      <p>
                        {[
                          vendor.address_line1,
                          vendor.city,
                          vendor.state,
                          vendor.postal_code,
                          vendor.country,
                        ]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </p>
                    </div>
                    {vendor.notes ? (
                      <div className="sm:col-span-2">
                        <p className="text-xs text-muted-foreground mb-1">
                          Notes
                        </p>
                        <p className="text-muted-foreground whitespace-pre-wrap">
                          {vendor.notes}
                        </p>
                      </div>
                    ) : null}
                  </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>
      </div>

      {confirmDelete ? (
        <VendorDeleteDialog
          vendor={vendor}
          open
          onOpenChange={setConfirmDelete}
          onDeleted={handleDeleted}
        />
      ) : null}
    </>
  );
}
