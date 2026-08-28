import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { Edit3, Loader2, Mail, Trash2, UserCheck, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { customersApi } from "../api/customers.api";
import { extractApiListItems, formatMoney } from "../constants";
import { CustomerDeleteDialog } from "./CustomerDeleteDialog";
import { CustomerDetailsAttachments } from "./CustomerDetailsAttachments";
import { CustomerDetailsSidebar } from "./CustomerDetailsSidebar";
import { CustomerDetailsStats } from "./CustomerDetailsStats";
import {
  CustomerDetailsRecentOrders,
  CustomerDetailsRecentReceipts,
} from "./CustomerDetailsRecentList";
import {
  CustomerDocumentTable,
  creditNoteColumns,
  invoiceColumns,
  paymentColumns,
  quotationColumns,
  salesOrderColumns,
} from "./CustomerDocumentTable";
import { CustomerDetailsLedger } from "./CustomerDetailsLedger";

function MetaDot() {
  return <span className="text-muted-foreground/50 mx-1.5">·</span>;
}

/**
 * Customer details body (overview, invoices, receipts, orders, quotations).
 * Used inside CustomerDetailsSheet and optionally on the full show page.
 */
export function CustomerDetailsPanel({
  customerId,
  workspaceId,
  onClose,
  onEdit,
  onListRefresh,
  onDeleted,
  showHeaderActions = true,
  embeddedInSheet = false,
}) {
  const base = `/workspace/${workspaceId}/accounting/customers`;
  const acc = `/workspace/${workspaceId}/accounting`;

  const [customer, setCustomer] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [creditNotes, setCreditNotes] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activating, setActivating] = useState(false);
  const [vendorLinkBusy, setVendorLinkBusy] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const [custRes, invRes, payRes, soRes, qtRes, cnRes, attRes] =
        await Promise.all([
        customersApi.show(customerId),
        customersApi.listInvoices(customerId),
        customersApi.listPayments(customerId),
        customersApi.listSalesOrders(customerId),
        customersApi.listQuotations(customerId),
        customersApi.listCreditNotes(customerId),
        customersApi.listAttachments(customerId),
      ]);
      setCustomer(custRes.data?.data || null);
      setInvoices(extractApiListItems(invRes));
      setPayments(extractApiListItems(payRes));
      setSalesOrders(extractApiListItems(soRes));
      setQuotations(extractApiListItems(qtRes));
      setCreditNotes(extractApiListItems(cnRes));
      setAttachments(attRes.data?.data || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load customer");
      setCustomer(null);
      setAttachments([]);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    setActiveTab("overview");
    fetchAll();
  }, [fetchAll]);

  const handleActivate = async () => {
    setActivating(true);
    try {
      const res = await customersApi.activate(customerId);
      toast.success(res?.data?.message || "Customer activated");
      fetchAll();
      onListRefresh?.();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to activate customer",
      );
    } finally {
      setActivating(false);
    }
  };

  const handleDeleted = () => {
    onListRefresh?.();
    onDeleted?.();
    onClose?.();
  };

  const handleVendorLinkChange = async (enabled) => {
    if (!customerId) return;
    setVendorLinkBusy(true);
    try {
      const res = await customersApi.updateVendorLink(customerId, enabled);
      const payload = res.data?.data || {};
      setCustomer((prev) =>
        prev
          ? {
              ...prev,
              also_use_as_vendor: !!payload.also_use_as_vendor,
              linked_vendor: payload.linked_vendor ?? prev.linked_vendor,
            }
          : prev,
      );
      toast.success(
        res.data?.message ||
          (enabled
            ? 'Customer is now available as a vendor / supplier.'
            : 'Vendor link removed for this customer.'),
      );
      onListRefresh?.();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || 'Failed to update vendor link',
      );
    } finally {
      setVendorLinkBusy(false);
    }
  };

  if (!customerId) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
        <p>Customer not found</p>
        {onClose ? (
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        ) : null}
      </div>
    );
  }

  const currency = customer.currency || "USD";
  const balanceDue = Number(customer.balance_due ?? 0);

  const overviewStats = [
    {
      label: "Total Invoiced",
      value: formatMoney(customer.total_invoiced, currency),
    },
    { label: "Amount Paid", value: formatMoney(customer.total_paid, currency) },
    {
      label: "Balance Due",
      value: formatMoney(customer.balance_due, currency),
      highlight: balanceDue > 0,
      hint: balanceDue > 0 ? "Outstanding balance" : "All clear",
    },
    {
      label: "Sales Orders",
      value: String(salesOrders.length),
      hint: `${quotations.length} quotations`,
    },
  ];

  return (
    <>
      {showHeaderActions ? (
        <div className="flex flex-col gap-3 border-b border-border bg-muted/20 px-5 py-4 lg:flex-row lg:items-start lg:justify-between shrink-0">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5 pe-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-lg font-semibold text-foreground leading-tight truncate lg:text-xl">
                {customer.name}
              </h2>
              <Badge
                variant="outline"
                className={
                  customer.is_active
                    ? "rounded-full bg-emerald-50 text-emerald-700 border-emerald-200/80 text-[11px] font-medium"
                    : "rounded-full bg-muted text-muted-foreground text-[11px]"
                }
              >
                {customer.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-0 gap-y-1 text-xs text-muted-foreground">
              <span>
                ID{" "}
                <span className="font-medium text-foreground font-mono">
                  {customer.customer_code || "—"}
                </span>
              </span>
              {customer.created_at ? (
                <>
                  <MetaDot />
                  <span>Joined {customer.created_at}</span>
                </>
              ) : null}
              {customer.email ? (
                <>
                  <MetaDot />
                  <span className="inline-flex items-center gap-1">
                    <Mail className="size-3" />
                    {customer.email}
                  </span>
                </>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start">
            <div className="flex flex-wrap items-center gap-2">
              {!customer.is_active && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={handleActivate}
                  disabled={activating}
                >
                  {activating ? (
                    <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <UserCheck className="size-3.5 mr-1.5" />
                  )}
                  Activate
                </Button>
              )}
              {customer.email ? (
                <Button variant="outline" size="sm" className="h-8" asChild>
                  <a href={`mailto:${customer.email}`}>Email</a>
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="mono"
                className="h-8"
                onClick={() => onEdit?.(customer) ?? undefined}
                asChild={!onEdit}
              >
                {onEdit ? (
                  <>
                    <Edit3 className="size-3.5 mr-1.5" /> Edit
                  </>
                ) : (
                  <Link to={`${base}/${customerId}/edit`}>
                    <Edit3 className="size-3.5 mr-1.5" /> Edit
                  </Link>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-destructive hover:text-destructive hover:bg-destructive/5 border-destructive/30"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="size-3.5 mr-1.5" /> Delete
              </Button>
              {!embeddedInSheet && onClose ? (
                <Button variant="ghost" size="sm" className="h-8" onClick={onClose}>
                  Close
                </Button>
              ) : null}
            </div>
            {embeddedInSheet && onClose ? (
              <>
                <div className="hidden sm:block h-6 w-px bg-border shrink-0" aria-hidden />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={onClose}
                  aria-label="Close customer details"
                >
                  <X className="size-4" />
                </Button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col lg:flex-row flex-1 min-h-0">
        <aside className="w-full shrink-0 border-b lg:border-b-0 lg:border-e border-border bg-muted/10 px-4 pt-4 pb-5 lg:w-[280px] lg:px-4">
          <CustomerDetailsSidebar
            customer={customer}
            workspaceId={workspaceId}
            vendorLinkBusy={vendorLinkBusy}
            onVendorLinkChange={handleVendorLinkChange}
            onEdit={embeddedInSheet ? undefined : onEdit}
            attachmentCount={attachments.length}
            onViewAttachments={() => setActiveTab("attachments")}
          />
        </aside>

        <div className="flex-1 min-w-0 flex flex-col min-h-0 pt-3 pb-5 lg:ps-5 lg:pe-5">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full flex flex-col flex-1 min-h-0"
          >
            <TabsList className="inline-flex w-full h-auto flex-wrap justify-start gap-0 rounded-none border-b border-border bg-transparent p-0 mb-4 shrink-0">
              <TabsTrigger
                value="overview"
                className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="invoices"
                className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                Invoices ({invoices.length})
              </TabsTrigger>
              <TabsTrigger
                value="receipts"
                className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                Receipts ({payments.length})
              </TabsTrigger>
              <TabsTrigger
                value="sales-orders"
                className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                Sales Orders ({salesOrders.length})
              </TabsTrigger>
              <TabsTrigger
                value="quotations"
                className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                Quotations ({quotations.length})
              </TabsTrigger>
              <TabsTrigger
                value="credit-notes"
                className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                Credit Notes ({creditNotes.length})
              </TabsTrigger>
              <TabsTrigger
                value="attachments"
                className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                Attachments ({attachments.length})
              </TabsTrigger>
              <TabsTrigger
                value="billing"
                className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                Billing
              </TabsTrigger>
            </TabsList>

            <ScrollArea
              className="flex-1 pe-2"
              viewportClassName="max-h-[calc(100dvh-16rem)]"
            >
              <TabsContent value="overview" className="mt-0 space-y-5 pb-6 pt-1">
                <CustomerDetailsStats items={overviewStats} />
                <CustomerDetailsLedger
                  customerId={customerId}
                  workspaceId={workspaceId}
                  currency={currency}
                />
                <div className="grid lg:grid-cols-2 gap-5">
                  <CustomerDetailsRecentOrders
                    orders={salesOrders}
                    workspaceId={workspaceId}
                    onViewAll={() => setActiveTab("sales-orders")}
                  />
                  <CustomerDetailsRecentReceipts
                    payments={payments}
                    workspaceId={workspaceId}
                    onViewAll={() => setActiveTab("receipts")}
                  />
                </div>
              </TabsContent>

              <TabsContent value="invoices" className="mt-0 space-y-5 pb-6 pt-1">
                <CustomerDetailsStats
                  items={[
                    { label: "Invoices", value: String(invoices.length) },
                    {
                      label: "Total Invoiced",
                      value: formatMoney(customer.total_invoiced, currency),
                    },
                    {
                      label: "Balance Due",
                      value: formatMoney(customer.balance_due, currency),
                      highlight: balanceDue > 0,
                    },
                  ]}
                />
                <CustomerDocumentTable
                  columns={invoiceColumns(workspaceId)}
                  rows={invoices}
                  emptyMessage="No invoices for this customer yet."
                  currency={currency}
                />
                <Button size="sm" variant="mono" asChild>
                  <Link to={`${acc}/invoices/create?customer_id=${customerId}`}>
                    New Invoice
                  </Link>
                </Button>
              </TabsContent>

              <TabsContent value="receipts" className="mt-0 space-y-5 pb-6 pt-1">
                <CustomerDetailsStats
                  items={[
                    { label: "Receipts", value: String(payments.length) },
                    {
                      label: "Total Paid",
                      value: formatMoney(customer.total_paid, currency),
                    },
                  ]}
                />
                <CustomerDocumentTable
                  columns={paymentColumns()}
                  rows={payments}
                  emptyMessage="No receipts recorded for this customer."
                  currency={currency}
                />
                <Button size="sm" variant="outline" asChild>
                  <Link to={`${acc}/payments`}>Customer Payments</Link>
                </Button>
              </TabsContent>

              <TabsContent value="sales-orders" className="mt-0 space-y-5 pb-6 pt-1">
                <CustomerDetailsStats
                  items={[
                    { label: "Orders", value: String(salesOrders.length) },
                    {
                      label: "Order Value",
                      value: formatMoney(
                        salesOrders.reduce(
                          (s, o) => s + Number(o.total || 0),
                          0,
                        ),
                        currency,
                      ),
                    },
                  ]}
                />
                <CustomerDocumentTable
                  columns={salesOrderColumns(workspaceId)}
                  rows={salesOrders}
                  emptyMessage="No sales orders for this customer."
                  currency={currency}
                />
                <Button size="sm" variant="mono" asChild>
                  <Link
                    to={`${acc}/sales-orders/create?customer_id=${customerId}`}
                  >
                    New Sales Order
                  </Link>
                </Button>
              </TabsContent>

              <TabsContent value="quotations" className="mt-0 space-y-5 pb-6 pt-1">
                <CustomerDetailsStats
                  items={[
                    { label: "Quotations", value: String(quotations.length) },
                    {
                      label: "Quoted Value",
                      value: formatMoney(
                        quotations.reduce(
                          (s, q) => s + Number(q.total || 0),
                          0,
                        ),
                        currency,
                      ),
                    },
                  ]}
                />
                <CustomerDocumentTable
                  columns={quotationColumns(workspaceId)}
                  rows={quotations}
                  emptyMessage="No quotations for this customer."
                  currency={currency}
                />
                <Button size="sm" variant="mono" asChild>
                  <Link
                    to={`${acc}/quotations/create?customer_id=${customerId}`}
                  >
                    New Quotation
                  </Link>
                </Button>
              </TabsContent>

              <TabsContent value="credit-notes" className="mt-0 space-y-5 pb-6 pt-1">
                <CustomerDocumentTable
                  title="Credit notes"
                  columns={creditNoteColumns(workspaceId)}
                  rows={creditNotes}
                  emptyMessage="No credit notes for this customer."
                  currency={currency}
                />
              </TabsContent>

              <TabsContent value="attachments" className="mt-0 space-y-5 pb-6 pt-1">
                <CustomerDetailsAttachments
                  customerId={customerId}
                  attachments={attachments}
                />
              </TabsContent>

              <TabsContent value="billing" className="mt-0 space-y-5 pb-6 pt-1">
                <CustomerDetailsStats
                  items={[
                    { label: "Currency", value: customer.currency || "—" },
                    {
                      label: "Credit Limit",
                      value: customer.credit_limit
                        ? formatMoney(customer.credit_limit, currency)
                        : "—",
                    },
                    {
                      label: "Opening Balance",
                      value: formatMoney(customer.opening_balance, currency),
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
                        Bill to name
                      </p>
                      <p className="font-medium">
                        {customer.bill_name || customer.name || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Account number
                      </p>
                      <p>{customer.customer_account_number || "—"}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-xs text-muted-foreground mb-1">
                        Billing address
                      </p>
                      <p>
                        {[
                          customer.bill_address1 || customer.address_line1,
                          customer.city,
                          customer.state,
                          customer.postal_code,
                          customer.country,
                        ]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </p>
                    </div>
                    {customer.notes ? (
                      <div className="sm:col-span-2">
                        <p className="text-xs text-muted-foreground mb-1">
                          Notes
                        </p>
                        <p className="text-muted-foreground whitespace-pre-wrap">
                          {customer.notes}
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
        <CustomerDeleteDialog
          customer={customer}
          open
          onOpenChange={setConfirmDelete}
          onDeleted={handleDeleted}
        />
      ) : null}
    </>
  );
}
