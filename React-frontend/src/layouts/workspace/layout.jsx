import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { WorkspacePermissionGate } from '@/auth/guards/workspace-permission-gate';
import { useSettings } from '@/providers/settings-provider';
import { useIsMobile } from '@/hooks/use-mobile';
import { authService } from '@/auth/services/auth-service';
import { setWorkspaceDefaultCurrency, resolveCurrencyCode } from '@/lib/currency';
import { WorkspaceSidebar } from './components/workspace-sidebar';
import { WorkspaceHeader } from './components/workspace-header';
import { WorkspaceSectionNav } from './components/workspace-section-nav';
import { CustomerDialogProvider } from '@/components/workspace/customer/customer-dialog-provider';
import { CustomerFormLookupsProvider } from '@/components/workspace/customer/hooks/useCustomerFormLookups';
import { VendorDialogProvider } from '@/components/workspace/vendor/vendor-dialog-provider';
import { ProductDialogProvider } from '@/components/workspace/product/product-dialog-provider';
import { InvoicePreviewProvider } from '@/components/workspace/invoice/invoice-preview-provider';
import { TaxDialogProvider } from '@/components/workspace/tax/tax-dialog-provider';
import { ProductLookupsProvider } from '@/components/workspace/product/hooks/useProductLookups';
import { SuperAdminWorkspaceBanner } from './components/superadmin-workspace-banner';
import { TrialStatusBanner } from './components/trial-status-banner';
import { FinvorooFooter } from '@/components/common/finvoroo-footer';
import { DashboardRefreshProvider } from '@/pages/workspace/dashboard/DashboardRefreshContext';
import { OfflineSyncBanner } from '@/offline/OfflineSyncBanner';
import { IndustryAccentSync } from '@/components/industry/IndustryAccentSync';
import { cn } from '@/lib/utils';
import { runSyncCycle } from '@/offline/sync-manager';
import { syncApi } from '@/offline/sync.api';
import { setMeta } from '@/offline/db';
import { isOnline } from '@/offline/connectivity';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

export function WorkspaceLayout() {
  const { id: companyId } = useParams();
  const { pathname } = useLocation();
  const { settings } = useSettings();
  const isMobile = useIsMobile();
  const collapsed = settings.layouts.demo1.sidebarCollapse;
  const sidebarWidth = collapsed ? '80px' : '240px';
  const inPosMode = /^\/workspace\/[^/]+\/accounting\/pos\/?$/.test(pathname);
  const inPharmacyPos = /^\/workspace\/[^/]+\/pharmacy\/pos\/?$/.test(pathname);
  const inPharmacyReceive = /^\/workspace\/[^/]+\/pharmacy\/receive\/?$/.test(pathname);
  const inPharmacyPurchaseEntry = /^\/workspace\/[^/]+\/pharmacy\/purchase-entry\/?$/.test(pathname);
  // POS / purchase entry stay chrome-less (full page).
  const fullscreenWorkspace =
    inPosMode || inPharmacyPos || inPharmacyReceive || inPharmacyPurchaseEntry;

  const [companyName, setCompanyName] = useState('');
  const [companyContextReady, setCompanyContextReady] = useState(false);
  const [entitlement, setEntitlement] = useState(null);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    setCompanyContextReady(false);
    if (!companyId) return;

    // Establish X-Company-ID's cookie source before mounting any workspace
    // child. Child effects frequently request data as soon as they mount.
    authService.setCompanyId(companyId);
    const companies = authService.getCompanies();
    const match = companies.find((c) => String(c.id) === String(companyId));
    setCompanyName(match?.name || '');
    setWorkspaceDefaultCurrency(
      resolveCurrencyCode(
        null,
        match?.currency,
        'USD',
      ),
    );
    setCompanyContextReady(true);
  }, [companyId]);

  useEffect(() => {
    if (!companyId || fullscreenWorkspace) {
      setEntitlement(user?.entitlement || null);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        if ((user?.role ?? '') === 'company_owner') {
          const res = await api.get('/account/overview');
          const ent = res?.data?.data?.account?.entitlement || user?.entitlement || null;
          if (!cancelled) setEntitlement(ent);
          return;
        }
        if (!cancelled) setEntitlement(user?.entitlement || null);
      } catch {
        if (!cancelled) setEntitlement(user?.entitlement || null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId, user, fullscreenWorkspace]);

  // Phase 1: when offline sync is enabled, bootstrap masters into Dexie on workspace entry.
  useEffect(() => {
    if (!companyId || !isOnline() || fullscreenWorkspace) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const statusRes = await syncApi.status();
        const enabled = Boolean(statusRes?.data?.data?.offline_sync_enabled);
        if (cancelled) return;
        await setMeta(companyId, 'offline_sync_enabled', enabled);
        if (!enabled) return;
        await runSyncCycle(companyId, { reason: 'workspace-entry' });
      } catch {
        /* ignore — banner/sync cycle will retry */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId, fullscreenWorkspace]);

  // Holds a reference to the dashboard's silentRefresh function.
  // WorkspaceDashboardPage registers it; other pages call it via context.
  const dashRefreshRef = useRef(null);
  const registerDashRefresh = useCallback((fn) => { dashRefreshRef.current = fn; }, []);
  const triggerDashboardRefresh = useCallback(() => { dashRefreshRef.current?.(); }, []);

  if (!companyContextReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <DashboardRefreshProvider
      onRefresh={triggerDashboardRefresh}
      onRegister={registerDashRefresh}
    >
    <IndustryAccentSync />
    <CustomerFormLookupsProvider skipInitialLoad={fullscreenWorkspace}>
    <CustomerDialogProvider>
      <VendorDialogProvider>
      <TaxDialogProvider>
      <ProductLookupsProvider skipInitialLoad={fullscreenWorkspace}>
      <ProductDialogProvider>
      <InvoicePreviewProvider workspaceId={companyId}>
      {!isMobile && !fullscreenWorkspace && (
        <div className="no-print">
          <WorkspaceSidebar companyName={companyName} />
        </div>
      )}

      <div
        className={cn(
          'workspace-shell flex w-full flex-col transition-[padding-inline-start] duration-300 ease-in-out',
          fullscreenWorkspace ? 'h-screen min-h-0 overflow-hidden' : 'min-h-screen grow',
        )}
        style={!isMobile && !fullscreenWorkspace ? { paddingInlineStart: sidebarWidth } : undefined}
      >
        {!fullscreenWorkspace ? (
          <div className="no-print">
            <WorkspaceHeader
              sidebarWidth={sidebarWidth}
              isMobile={isMobile}
              companyName={companyName}
            />
          </div>
        ) : null}

        <main
          className={
            fullscreenWorkspace
              ? 'flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden'
              : 'grow pt-21.5 pb-10 px-5 lg:px-8 max-w-[2500px]'
          }
          role="content"
        >
          {!fullscreenWorkspace ? <WorkspaceSectionNav /> : null}
          {!fullscreenWorkspace ? <div className="no-print"><SuperAdminWorkspaceBanner /></div> : null}
          {!fullscreenWorkspace ? (
            <div className="no-print mb-4">
              <TrialStatusBanner entitlement={entitlement} />
            </div>
          ) : null}
          {!fullscreenWorkspace ? (
            <div className="no-print">
              <OfflineSyncBanner companyId={companyId} />
            </div>
          ) : null}
          <div
            className={cn(
              fullscreenWorkspace && 'flex min-h-0 flex-1 flex-col overflow-hidden',
            )}
          >
            <WorkspacePermissionGate context={{ companyId, companyName }} />
          </div>
        </main>

        {!fullscreenWorkspace ? (
          <div className="no-print">
            <FinvorooFooter />
          </div>
        ) : null}
      </div>
      </InvoicePreviewProvider>
      </ProductDialogProvider>
      </ProductLookupsProvider>
      </TaxDialogProvider>
      </VendorDialogProvider>
    </CustomerDialogProvider>
    </CustomerFormLookupsProvider>
    </DashboardRefreshProvider>
  );
}
