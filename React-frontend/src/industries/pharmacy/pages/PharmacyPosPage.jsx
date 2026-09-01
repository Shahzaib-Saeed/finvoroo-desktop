import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PosCustomerDialog } from '@/pages/accounting/pos/components/PosCustomerDialog';
import { PosShiftDialog } from '@/pages/accounting/pos/components/PosShiftDialog';
import { PharmacyReturnDialog } from '../components/PharmacyReturnDialog';
import { PosManagerDialog } from '@/pages/accounting/pos/components/PosManagerDialog';
import { EmployeePinDialog } from '../components/EmployeePinDialog';
import { getStatus as getPrintAgentStatus } from '@/lib/print-agent';
import { DispensePayDialog } from '../components/DispensePayDialog';
import { DispenseTopShell } from '../components/DispenseTopShell';
import { MedicinePickSheet } from '../components/MedicinePickSheet';
import { ProductSaleHistorySheet } from '../components/ProductSaleHistorySheet';
import { DispenseCartGrid } from '../components/DispenseCartGrid';
import { DispenseSaleRail } from '../components/DispenseSaleRail';
import { prefetchMedicineCatalog } from '../lib/medicine-catalog-cache';
import { usePharmacyDispense } from '../hooks/usePharmacyDispense';
import { useAuthStore } from '@/store/authStore';
import { releaseModalPointerLockSoon } from '@/lib/modal-lock';
import '../pharmacy-density.css';

export function PharmacyPosPage() {
  const navigate = useNavigate();
  const pos = usePharmacyDispense();
  const authUser = useAuthStore((s) => s.user);
  const effectiveRole = useAuthStore((s) => s.effectiveRole);

  useEffect(() => {
    prefetchMedicineCatalog();
    void getPrintAgentStatus();
  }, []);
  const companyName =
    pos.bootstrap?.company?.name ||
    pos.bootstrap?.company?.trading_name ||
    'Finvoroo Pharma';
  const terminalLabel =
    pos.bootstrap?.terminal?.name ||
    pos.bootstrap?.terminal?.code ||
    pos.bootstrap?.shift?.terminal_name ||
    'Terminal #01';
  const cashierName =
    pos.shift?.cashier ||
    pos.shift?.opener?.name ||
    authUser?.name ||
    'Cashier';
  const userRole = effectiveRole || authUser?.role || 'Staff';
  const terminalCode =
    pos.bootstrap?.terminal?.code ||
    pos.shift?.terminal?.code ||
    null;
  const shiftId = pos.shift?.id || null;

  if (pos.bootLoading) {
    return (
      <div className="flex h-full min-h-0 w-full flex-1 items-center justify-center bg-slate-100">
        <Loader2 className="size-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div
      data-pharmacy-density
      className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden bg-white text-slate-900 antialiased"
    >
      <DispenseTopShell
        headerProps={{
          companyId: pos.companyId,
          companyName,
          terminalLabel,
          terminalCode,
          shiftId,
          cashierName,
          userRole,
          shiftOpen: !!pos.shift?.id,
          online: pos.online,
          offlineSyncEnabled: pos.offlineSyncEnabled,
          onOpenShift: () => pos.setShiftOpen(true),
          toolbarProps: {
            onShift: () => pos.setShiftOpen(true),
            onSave: pos.saveSale,
            onRecall: () => {
              pos.refreshHolds();
              pos.setHoldPanelOpen(true);
            },
            onReturn: () => pos.setReturnOpen(true),
            onSearch: pos.openMedicineList,
            onPrintSetup: () => {
              navigate(`/workspace/${pos.companyId}/accounting/settings?tab=print`);
            },
            onClear: pos.clearCart,
            checkingOut: pos.checkingOut,
            shiftOpen: !!pos.shift?.id,
            holdsCount: pos.holds.length,
            disabled: !pos.lines.length,
          },
        }}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-slate-200 lg:border-e">
          <DispenseCartGrid
            lines={pos.lines}
            cartFocus={pos.cartFocus}
            entryRowVisible={pos.entryRowVisible}
            maxCartRowIndex={pos.maxCartRowIndex}
            taxRatesById={pos.taxRatesById}
            permissions={pos.permissions}
            formatMoney={pos.formatMoney}
            unitLabel={pos.unitLabel}
            itemSearchRef={pos.scanRef}
            onSelectRow={pos.setCartFocus}
            onShowEntryRow={pos.showEntryRow}
            onUpdateLine={pos.updateLine}
            onUpdateDiscPercent={pos.updateLineDiscountPercent}
            onRemoveLine={pos.removeLine}
            onPickProduct={pos.addProduct}
            onSetLineProduct={pos.setLineProduct}
            onSubmitRaw={pos.scanOrSearch}
            getAvailableStock={pos.getAvailableStock}
            warehouseId={pos.warehouseId}
            onViewHistory={pos.openSaleHistory}
          />
        </div>

        <div className="flex min-h-0 w-full shrink-0 flex-col overflow-hidden lg:w-[340px]">
          <DispenseSaleRail
            totals={pos.totals}
            formatMoney={pos.formatMoney}
            unitLabel={pos.unitLabel}
            customer={pos.customer}
            onOpenCustomer={() => pos.setCustomerOpen(true)}
            needsRxNote={pos.needsRxNote}
            rxNote={pos.rxNote}
            onRxNoteChange={pos.setRxNote}
            onPostAndPrint={pos.completeAndPrint}
            checkingOut={pos.checkingOut}
            shiftOpen={!!pos.shift?.id || pos.canCheckoutOffline}
            disabled={!pos.lines.length}
          />
        </div>
      </div>

      <MedicinePickSheet
        open={pos.pickSheetOpen}
        onOpenChange={pos.setPickSheetOpen}
        rows={pos.pickSheetRows}
        query={pos.pickSearchTerm}
        focusIdx={0}
        onFocusIdx={() => {}}
        onPick={pos.pickProduct}
        onViewHistory={pos.openSaleHistory}
        posSale
      />

      <ProductSaleHistorySheet
        open={pos.saleHistoryOpen}
        onOpenChange={pos.setSaleHistoryOpen}
        productId={pos.saleHistoryProduct?.id}
        productName={pos.saleHistoryProduct?.name}
        companyId={pos.companyId}
        formatMoney={pos.formatMoney}
      />

      <DispensePayDialog
        open={pos.payDialogOpen}
        onOpenChange={pos.setPayDialogOpen}
        total={pos.totals.total}
        subtotal={pos.totals.subtotal}
        formatMoney={pos.formatMoney}
        printAfterPost={pos.payDialogPrint}
        checkingOut={pos.checkingOut}
        invoiceDiscountAmount={pos.invoiceDiscountAmount}
        invoiceDiscountPercent={pos.invoiceDiscountPercent}
        invoiceDiscountType={pos.invoiceDiscountType}
        onInvoiceDiscountAmountChange={pos.setInvoiceDiscountAmount}
        onInvoiceDiscountPercentChange={pos.setInvoiceDiscountPercent}
        onInvoiceDiscountTypeChange={pos.setInvoiceDiscountType}
        canDiscount={pos.permissions.can_discount}
        isWalkIn={!pos.customer?.id || pos.customer?.id === pos.walkIn?.id}
        canCredit={pos.permissions.can_credit_sale !== false}
        customerName={pos.customer?.name || ''}
        customerBalance={Number(pos.customer?.balance_due ?? pos.customer?.outstanding_balance ?? 0)}
        onConfirm={pos.confirmPayDialog}
        onUnpaid={pos.confirmUnpaidPayDialog}
      />

      <PosCustomerDialog
        open={pos.customerOpen}
        onOpenChange={pos.setCustomerOpen}
        walkIn={pos.walkIn}
        currency={pos.currency}
        current={pos.customer}
        variant="pharmacy"
        onSelect={pos.selectCustomer}
        onSearch={pos.searchCustomers}
        onQuickCreate={pos.createQuickCustomer}
      />

      <PosShiftDialog
        open={pos.shiftOpen}
        onOpenChange={(next) => {
          pos.setShiftOpen(next);
          if (!next) releaseModalPointerLockSoon();
        }}
        shift={pos.shift}
        currency={pos.currency}
        onOpenShift={pos.openShift}
        onCloseShift={pos.closeShift}
        onLoadXReport={pos.loadXReport}
        onLoadHistory={pos.loadShiftHistory}
        xReport={pos.xReport}
        history={pos.shiftHistory}
        canOpen={pos.permissions.can_open_shift !== false}
        canClose={pos.permissions.can_close_shift !== false}
      />

      <PharmacyReturnDialog
        open={pos.returnOpen}
        onOpenChange={pos.setReturnOpen}
        currency={pos.currency}
        canRefund={pos.permissions.can_refund || pos.managerActive}
        managerActive={pos.managerActive}
        onRequestManager={() => pos.setManagerOpen(true)}
        posCustomer={pos.customer}
        walkIn={pos.walkIn}
        onExchangeStart={(invoice) => {
          pos.setReturnOpen(false);
          pos.clearCart();
          toast.message(`Exchange for ${invoice.invoice_number} — add the replacement items`);
        }}
      />

      <PosManagerDialog
        open={pos.managerOpen}
        onOpenChange={pos.setManagerOpen}
        onUnlock={pos.unlockManager}
      />

      <EmployeePinDialog
        open={pos.pinOpen}
        error={pos.pinError}
        submitting={pos.checkingOut}
        onSubmit={(pin) => pos.resolveEmployeePin(pin)}
        onCancel={() => pos.resolveEmployeePin(null)}
      />

      <Dialog open={pos.holdPanelOpen} onOpenChange={pos.setHoldPanelOpen}>
        <DialogContent className="sm:max-w-md" data-pharmacy-typing>
          <DialogHeader>
            <DialogTitle>Saved sales</DialogTitle>
          </DialogHeader>
          <ul className="max-h-64 divide-y divide-border overflow-auto">
            {pos.holds.length === 0 ? (
              <li className="py-8 text-center text-sm text-muted-foreground">None saved</li>
            ) : (
              pos.holds.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {h.hold_number || `Save #${h.id}`}
                    </p>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {pos.formatMoney(h.total)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => pos.resumeHold(h.id)}>
                      Load
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => pos.discardHold(h.id)}>
                      Delete
                    </Button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}
