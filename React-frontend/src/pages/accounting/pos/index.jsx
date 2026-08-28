import { Navigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { PosTopBar } from './components/PosTopBar';
import { PosCategoryRail } from './components/PosCategoryRail';
import { PosProductGrid } from './components/PosProductGrid';
import { PosCartPanel } from './components/PosCartPanel';
import { PosPaymentSheet } from './components/PosPaymentSheet';
import { PosCustomerDialog } from './components/PosCustomerDialog';
import { PosHoldDialog } from './components/PosHoldDialog';
import { PosSuccessDialog } from './components/PosSuccessDialog';
import { PosShortcutsDialog } from './components/PosShortcutsDialog';
import { PosShiftDialog } from './components/PosShiftDialog';
import { PosReturnDialog } from './components/PosReturnDialog';
import { PosManagerDialog } from './components/PosManagerDialog';
import { usePosSession } from './hooks/usePosSession';
import { formatMoney } from './lib/cart-math';
import { resolveUiPack } from '@/industries';
import { useAuthStore } from '@/store/authStore';

export function PosPage() {
  const { id: workspaceId } = useParams();
  const activeCompany = useAuthStore((s) => s.activeCompany);
  // Pharmacy companies use the dedicated Dispense screen; Universal POS stays for other packs.
  if (resolveUiPack(activeCompany) === 'pharmacy') {
    return <Navigate to={`/workspace/${workspaceId}/pharmacy/pos`} replace />;
  }
  return <UniversalPosPage workspaceId={workspaceId} />;
}

function UniversalPosPage({ workspaceId }) {
  const pos = usePosSession();

  if (pos.bootLoading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="size-8 animate-spin" />
          <p className="text-sm">Starting Point of Sale…</p>
        </div>
      </div>
    );
  }

  const cartProps = {
    customer: pos.customer,
    lines: pos.lines,
    currency: pos.currency,
    taxRatesById: pos.taxRatesById,
    totals: pos.totals,
    invoiceDiscount: pos.invoiceDiscount,
    onInvoiceDiscount: pos.setInvoiceDiscount,
    notes: pos.notes,
    onNotes: pos.setNotes,
    permissions: pos.permissions,
    onUpdateLine: pos.updateLine,
    onRemoveLine: pos.removeLine,
    onOpenCustomer: () => pos.setCustomerOpen(true),
    onOpenPayment: pos.openPayment,
    onHold: () => pos.setHoldOpen(true),
    onClear: pos.clearCart,
    checkingOut: pos.checkingOut,
    cartFocus: pos.cartFocus,
    onCartFocus: pos.setCartFocus,
    panelRef: pos.cartPanelRef,
    online: pos.online,
    shiftOpen: Boolean(pos.shift?.id),
  };

  return (
    <div className="flex h-[100dvh] w-full min-w-0 flex-col bg-background text-foreground">
      <PosTopBar
        workspaceId={workspaceId}
        search={pos.search}
        onSearchChange={pos.setSearch}
        searchRef={pos.searchRef}
        barcodeRef={pos.barcodeRef}
        onBarcodeSubmit={pos.scanBarcode}
        customer={pos.customer}
        onOpenCustomer={() => pos.setCustomerOpen(true)}
        warehouses={pos.bootstrap?.warehouses}
        warehouseId={pos.warehouseId}
        onWarehouseChange={pos.setWarehouseId}
        salespeople={pos.bootstrap?.salespeople}
        salesperson={pos.salesperson}
        onSalespersonChange={pos.setSalesperson}
        shift={pos.shift}
        terminal={pos.bootstrap?.terminal}
        canChangeWarehouse={pos.permissions.can_change_warehouse}
        onOpenShortcuts={() => pos.setSettingsOpen(true)}
        onOpenSettings={() => pos.setSettingsOpen(true)}
        onOpenShift={() => pos.setShiftOpen(true)}
        onOpenReturns={() => pos.setReturnOpen(true)}
        online={pos.online}
        managerActive={pos.managerActive}
      />

      <div className="flex min-h-0 flex-1">
        <div className="hidden md:flex">
          <PosCategoryRail
            railFilter={pos.railFilter}
            onRailFilter={pos.setRailFilter}
            categories={pos.bootstrap?.categories}
            categoryId={pos.categoryId}
            onCategory={pos.setCategoryId}
            brands={pos.bootstrap?.brands}
            brandId={pos.brandId}
            onBrand={pos.setBrandId}
          />
        </div>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-foreground/8 px-4 py-2 lg:px-5">
            <p className="text-sm font-semibold tracking-tight">
              Products
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {pos.catalogMeta.total || pos.products.length}
              </span>
            </p>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Scanner focused · Arrows navigate · Enter adds
            </p>
          </div>
          <PosProductGrid
            products={pos.products}
            loading={pos.catalogLoading}
            currency={pos.currency}
            favorites={pos.favorites}
            onToggleFavorite={pos.toggleFavorite}
            onAdd={pos.addProduct}
            hasMore={pos.catalogMeta.page < pos.catalogMeta.last}
            onLoadMore={() =>
              pos.loadCatalog({ page: pos.catalogMeta.page + 1, append: true })
            }
            gridFocus={pos.gridFocus}
            onGridFocus={pos.setGridFocus}
          />
        </main>

        <div className="hidden w-full max-w-[26rem] lg:flex">
          <PosCartPanel {...cartProps} />
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-foreground/10 bg-background p-3 lg:hidden">
        <Button
          type="button"
          variant="outline"
          className="h-12 flex-1 rounded-xl"
          onClick={() => pos.setMobileCartOpen(true)}
        >
          Cart · {pos.lines.length}
        </Button>
        <Button
          type="button"
          className="h-12 flex-[1.4] rounded-xl bg-foreground text-background"
          onClick={pos.openPayment}
        >
          Charge {formatMoney(pos.totals.total, pos.currency)}
        </Button>
      </div>

      <Sheet open={pos.mobileCartOpen} onOpenChange={pos.setMobileCartOpen}>
        <SheetContent side="right" className="w-full max-w-md p-0 sm:max-w-md">
          <SheetHeader className="sr-only">
            <SheetTitle>Cart</SheetTitle>
          </SheetHeader>
          <PosCartPanel
            {...cartProps}
            onOpenPayment={() => {
              pos.setMobileCartOpen(false);
              pos.openPayment();
            }}
          />
        </SheetContent>
      </Sheet>

      <PosPaymentSheet
        open={pos.paymentOpen}
        onOpenChange={pos.setPaymentOpen}
        currency={pos.currency}
        totals={pos.totals}
        payments={pos.payments}
        onPaymentsChange={pos.setPayments}
        paymentMethods={pos.bootstrap?.payment_methods}
        remaining={pos.remaining}
        changeDue={pos.changeDue}
        allowCredit={pos.allowCredit}
        onAllowCredit={pos.setAllowCredit}
        canCredit={pos.permissions.can_credit_sale}
        checkingOut={pos.checkingOut}
        onComplete={pos.completeSale}
        tenderRef={pos.tenderRef}
        lines={pos.lines}
      />

      <PosCustomerDialog
        open={pos.customerOpen}
        onOpenChange={pos.setCustomerOpen}
        walkIn={pos.bootstrap?.walk_in_customer}
        currency={pos.currency}
        current={pos.customer}
        onSelect={pos.setCustomer}
        onSearch={pos.searchCustomers}
        onQuickCreate={pos.createQuickCustomer}
      />

      <PosHoldDialog
        open={pos.holdOpen}
        onOpenChange={pos.setHoldOpen}
        holds={pos.holds}
        currency={pos.currency}
        canHold={pos.permissions.can_hold}
        onHoldCurrent={pos.holdSale}
        onResume={(id, row) => pos.resumeHold(id, row)}
        onDiscard={(id, row) => pos.discardHold(id, row)}
        hasCart={pos.lines.length > 0}
      />

      <PosShiftDialog
        open={pos.shiftOpen}
        onOpenChange={pos.setShiftOpen}
        shift={pos.shift}
        currency={pos.currency}
        onOpenShift={pos.openShift}
        onCloseShift={pos.closeShift}
        onLoadXReport={pos.loadXReport}
        onLoadHistory={pos.loadShiftHistory}
        xReport={pos.xReport}
        history={pos.shiftHistory}
        canOpen={pos.permissions.can_open_shift}
        canClose={pos.permissions.can_close_shift}
      />

      <PosReturnDialog
        open={pos.returnOpen}
        onOpenChange={pos.setReturnOpen}
        currency={pos.currency}
        canRefund={pos.permissions.can_refund || pos.managerActive}
        requireManager={false}
        managerActive={pos.managerActive}
        onRequestManager={() => pos.setManagerOpen(true)}
        onExchangeStart={(invoice) => {
          pos.setReturnOpen(false);
          pos.clearCart();
          pos.setNotes(`Exchange for ${invoice.invoice_number}`);
        }}
      />

      <PosManagerDialog
        open={pos.managerOpen}
        onOpenChange={pos.setManagerOpen}
        onUnlock={pos.unlockManager}
      />

      <PosSuccessDialog
        open={Boolean(pos.receipt)}
        onOpenChange={(o) => {
          if (!o) pos.setReceipt(null);
        }}
        receipt={pos.receipt}
        currency={pos.currency}
        company={pos.bootstrap?.company}
      />

      <PosShortcutsDialog
        open={pos.settingsOpen}
        onOpenChange={pos.setSettingsOpen}
        shortcuts={pos.shortcuts}
        onShortcutsChange={pos.setShortcuts}
        posSettings={pos.posSettings}
        onSettingsChange={pos.updateSettings}
      />
    </div>
  );
}
