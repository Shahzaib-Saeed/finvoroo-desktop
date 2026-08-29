import { lazy, Suspense } from 'react';
import { Route } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { IndustryModuleGate } from '../IndustryModuleGate';
import { prefetchMedicineCatalog } from './lib/medicine-catalog-cache';

const PharmacyDashboardPage = lazy(() =>
  import('./pages/PharmacyDashboardPage').then((m) => ({ default: m.PharmacyDashboardPage })),
);
const MedicinesPage = lazy(() =>
  import('./pages/MedicinesPage').then((m) => ({ default: m.MedicinesPage })),
);
const ReceiveGrnPage = lazy(() =>
  import('./pages/ReceiveGrnPage').then((m) => ({ default: m.ReceiveGrnPage })),
);
const PharmacyPosPage = lazy(() => {
  prefetchMedicineCatalog();
  return import('./pages/PharmacyPosPage').then((m) => ({ default: m.PharmacyPosPage }));
});
const BatchExpiryPage = lazy(() =>
  import('./pages/BatchExpiryPage').then((m) => ({ default: m.BatchExpiryPage })),
);
const MedicineReportsPage = lazy(() =>
  import('./pages/MedicineReportsPage').then((m) => ({ default: m.MedicineReportsPage })),
);
const PosItemSalesReportPage = lazy(() =>
  import('./pages/reports/PosItemSalesReportPage').then((m) => ({
    default: m.PosItemSalesReportPage,
  })),
);
const ManufacturerExpiryReportPage = lazy(() =>
  import('./pages/reports/ManufacturerExpiryReportPage').then((m) => ({
    default: m.ManufacturerExpiryReportPage,
  })),
);
const StockValuationReportPage = lazy(() =>
  import('./pages/reports/StockValuationReportPage').then((m) => ({
    default: m.StockValuationReportPage,
  })),
);
const PharmacySettingsPage = lazy(() =>
  import('./pages/PharmacySettingsPage').then((m) => ({ default: m.PharmacySettingsPage })),
);
const PurchaseImportPage = lazy(() =>
  import('./pages/PurchaseImportPage').then((m) => ({ default: m.PurchaseImportPage })),
);
const LoosePurchasePage = lazy(() =>
  import('./pages/LoosePurchasePage').then((m) => ({ default: m.LoosePurchasePage })),
);
const LooseSaleReturnPage = lazy(() =>
  import('./pages/LooseSaleReturnPage').then((m) => ({ default: m.LooseSaleReturnPage })),
);
const PurchaseEntryPage = lazy(() =>
  import('./pages/PurchaseEntry').then((m) => ({ default: m.PurchaseEntryPage })),
);

function PharmacyRouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Loader2 className="size-8 animate-spin text-primary" />
    </div>
  );
}

function Lazy({ children }) {
  return <Suspense fallback={<PharmacyRouteFallback />}>{children}</Suspense>;
}

/** Extra workspace routes for the Pharmacy UI pack. */
export function PharmacyIndustryRoutes() {
  return (
    <>
      <Route
        path="/workspace/:id/pharmacy"
        element={
          <IndustryModuleGate feature="pharmacy_shell">
            <Lazy>
              <PharmacyDashboardPage />
            </Lazy>
          </IndustryModuleGate>
        }
      />
      <Route
        path="/workspace/:id/pharmacy/medicines"
        element={
          <IndustryModuleGate feature="pharmacy_shell">
            <Lazy>
              <MedicinesPage />
            </Lazy>
          </IndustryModuleGate>
        }
      />
      <Route
        path="/workspace/:id/pharmacy/receive/:billId"
        element={
          <IndustryModuleGate feature="pharmacy_shell">
            <Lazy>
              <ReceiveGrnPage />
            </Lazy>
          </IndustryModuleGate>
        }
      />
      <Route
        path="/workspace/:id/pharmacy/receive"
        element={
          <IndustryModuleGate feature="pharmacy_shell">
            <Lazy>
              <ReceiveGrnPage />
            </Lazy>
          </IndustryModuleGate>
        }
      />
      <Route
        path="/workspace/:id/pharmacy/pos"
        element={
          <IndustryModuleGate feature="pharmacy_shell">
            <Lazy>
              <PharmacyPosPage />
            </Lazy>
          </IndustryModuleGate>
        }
      />
      <Route
        path="/workspace/:id/pharmacy/batch-expiry"
        element={
          <IndustryModuleGate feature="batch_expiry">
            <Lazy>
              <BatchExpiryPage />
            </Lazy>
          </IndustryModuleGate>
        }
      />
      <Route
        path="/workspace/:id/pharmacy/reports"
        element={
          <IndustryModuleGate feature="pharmacy_shell">
            <Lazy>
              <MedicineReportsPage />
            </Lazy>
          </IndustryModuleGate>
        }
      />
      <Route
        path="/workspace/:id/pharmacy/reports/item-sales"
        element={
          <IndustryModuleGate feature="pharmacy_shell">
            <Lazy>
              <PosItemSalesReportPage />
            </Lazy>
          </IndustryModuleGate>
        }
      />
      <Route
        path="/workspace/:id/pharmacy/reports/manufacturer-expiry"
        element={
          <IndustryModuleGate feature="batch_expiry">
            <Lazy>
              <ManufacturerExpiryReportPage />
            </Lazy>
          </IndustryModuleGate>
        }
      />
      <Route
        path="/workspace/:id/pharmacy/reports/stock-valuation"
        element={
          <IndustryModuleGate feature="pharmacy_shell">
            <Lazy>
              <StockValuationReportPage />
            </Lazy>
          </IndustryModuleGate>
        }
      />
      <Route
        path="/workspace/:id/pharmacy/medicine-reports"
        element={
          <IndustryModuleGate feature="pharmacy_shell">
            <Lazy>
              <MedicineReportsPage />
            </Lazy>
          </IndustryModuleGate>
        }
      />
      <Route
        path="/workspace/:id/pharmacy/settings"
        element={
          <IndustryModuleGate feature="pharmacy_shell">
            <Lazy>
              <PharmacySettingsPage />
            </Lazy>
          </IndustryModuleGate>
        }
      />
      <Route
        path="/workspace/:id/pharmacy/import"
        element={
          <IndustryModuleGate feature="pharmacy_shell">
            <Lazy>
              <PurchaseImportPage />
            </Lazy>
          </IndustryModuleGate>
        }
      />
      <Route
        path="/workspace/:id/pharmacy/loose-purchase"
        element={
          <IndustryModuleGate feature="pharmacy_shell">
            <Lazy>
              <LoosePurchasePage />
            </Lazy>
          </IndustryModuleGate>
        }
      />
      <Route
        path="/workspace/:id/pharmacy/loose-sale-return"
        element={
          <IndustryModuleGate feature="pharmacy_shell">
            <Lazy>
              <LooseSaleReturnPage />
            </Lazy>
          </IndustryModuleGate>
        }
      />
      <Route
        path="/workspace/:id/pharmacy/purchase-entry"
        element={
          <IndustryModuleGate feature="pharmacy_shell">
            <Lazy>
              <PurchaseEntryPage />
            </Lazy>
          </IndustryModuleGate>
        }
      />
    </>
  );
}
