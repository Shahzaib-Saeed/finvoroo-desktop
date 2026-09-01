import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { History, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { settingsApi } from './api/settings.api';
import { applyPortalColor, getSettingsTabs, readPortalColor, resolveSettingsTab } from './constants';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  SettingsEnterpriseNav,
  SettingsEnterpriseNavMobile,
} from './components/SettingsEnterpriseNav';
import { ProfileTab } from './components/ProfileTab';
import { FooterTab } from './components/FooterTab';
import { PrintPreferencesTab } from './components/PrintPreferencesTab';
import { InventoryTab } from './components/InventoryTab';
import { ApprovalWorkflowTab } from './components/ApprovalWorkflowTab';
import { AutoPostTab } from './components/AutoPostTab';
import { CustomFieldsTab } from './components/CustomFieldsTab';
import { PharmacyTab, usePharmacyWorkspaceSettings } from './components/PharmacySettingsTabs';
import { getSettingsTabMeta } from './components/settings-ui';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/authStore';
import { resolveUiPack } from '@/industries';
import { setWorkspaceDefaultCurrency, resolveCurrencyCode } from '@/lib/currency';

export function AccountingSettingsPage() {
  const { id: workspaceId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') || 'profile';
  const activeCompany = useAuthStore((s) => s.activeCompany);
  const isPharmacy = resolveUiPack(activeCompany) === 'pharmacy';
  const settingsTabs = useMemo(() => getSettingsTabs(isPharmacy), [isPharmacy]);
  const pharmacy = usePharmacyWorkspaceSettings(isPharmacy);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(() => resolveSettingsTab(tabFromUrl, isPharmacy));
  const [company, setCompany] = useState(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [approvalModules, setApprovalModules] = useState({});
  const [approvalModuleLabels, setApprovalModuleLabels] = useState({});

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await settingsApi.get();
      const data = res.data?.data || {};
      setCompany(data.company || null);
      setLogoUrl(data.logo_url || '');
      setApprovalModules(data.company?.approval_modules || {});
      setApprovalModuleLabels(data.approval_module_labels || {});
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load settings.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    applyPortalColor(readPortalColor());
  }, [load]);

  useEffect(() => {
    setActiveTab(resolveSettingsTab(tabFromUrl, isPharmacy));
  }, [tabFromUrl, isPharmacy]);

  const changeTab = useCallback(
    (tabId) => {
      setActiveTab(tabId);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('tab', tabId);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const onProfileSaved = (updatedCompany, newLogoUrl) => {
    if (updatedCompany) {
      setCompany((c) => ({ ...c, ...updatedCompany }));
      const store = useAuthStore.getState();
      const active = store.activeCompany;
      if (active && String(active.id) === String(updatedCompany.id)) {
        store.setActiveCompany({ ...active, ...updatedCompany });
      }
      store.setCompanies(
        store.companies.map((c) =>
          String(c.id) === String(updatedCompany.id) ? { ...c, ...updatedCompany } : c,
        ),
      );
      if (updatedCompany.currency) {
        setWorkspaceDefaultCurrency(
          resolveCurrencyCode(null, updatedCompany.currency, 'USD'),
        );
      }
    }
    if (newLogoUrl !== undefined) setLogoUrl(newLogoUrl || '');
  };

  const onInventorySaved = (model) => {
    setCompany((c) => (c ? { ...c, inventory_model: model } : c));
  };

  const onApprovalSaved = (modules) => {
    setApprovalModules(modules);
    setCompany((c) => (c ? { ...c, approval_modules: modules } : c));
  };

  const onAutoPostSaved = (prefs) => {
    setCompany((c) =>
      c
        ? {
            ...c,
            auto_post_to_accounting: prefs?.auto_post_to_accounting ?? c.auto_post_to_accounting,
            offline_sync_enabled: prefs?.offline_sync_enabled ?? c.offline_sync_enabled,
            show_full_chart_of_accounts:
              prefs?.show_full_chart_of_accounts ?? c.show_full_chart_of_accounts,
            invoice_billing_mode: prefs?.invoice_billing_mode ?? c.invoice_billing_mode,
          }
        : c,
    );
  };

  /**
   * POS menu visibility, saved from the Company profile tab.
   *
   * The sidebar reads show_pos_menu from the auth store, not from this page's
   * local company state, so both have to move together — updating only the
   * local copy would leave the menu stale until a reload.
   */
  const onPosMenuSaved = (showPos) => {
    const next = !!showPos;
    setCompany((c) => (c ? { ...c, show_pos_menu: next } : c));

    const store = useAuthStore.getState();
    const active = store.activeCompany;
    if (active && String(active.id) === String(workspaceId)) {
      store.setActiveCompany({ ...active, show_pos_menu: next });
      store.setCompanies(
        store.companies.map((c) =>
          String(c.id) === String(workspaceId) ? { ...c, show_pos_menu: next } : c,
        ),
      );
    }
  };

  const onFooterSaved = (footerData) => {
    setCompany((c) =>
      c
        ? {
            ...c,
            document_footer: footerData?.document_footer ?? c.document_footer,
            document_footer_pages:
              footerData?.document_footer_pages ?? c.document_footer_pages,
            document_invoice_notice:
              footerData?.document_invoice_notice ?? c.document_invoice_notice,
            document_bill_notice:
              footerData?.document_bill_notice ?? c.document_bill_notice,
            document_closing_message:
              footerData?.document_closing_message ?? c.document_closing_message,
            document_signoff: footerData?.document_signoff ?? c.document_signoff,
          }
        : c,
    );
  };

  const autoPost = !!company?.auto_post_to_accounting;
  const tabMeta = getSettingsTabMeta(activeTab);
  const accountingBase = workspaceId ? `/workspace/${workspaceId}/accounting` : '#';

  const pageSubtitle = useMemo(() => {
    const parts = [company?.name, company?.currency].filter(Boolean);
    return parts.length ? parts.join(' · ') : 'Workspace preferences';
  }, [company?.name, company?.currency]);

  if (loading) {
    return (
      <div>
        <Skeleton className="h-10 w-48 rounded-md" />
        <div className="mt-8 flex gap-12">
          <Skeleton className="hidden lg:block h-[420px] w-52 shrink-0 rounded-md" />
          <Skeleton className="h-[420px] flex-1 max-w-3xl rounded-md" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle={pageSubtitle}
        className="mb-0"
        actions={
          <>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-muted-foreground"
              onClick={() => {
                load(true);
                if (isPharmacy) pharmacy.load();
              }}
              disabled={refreshing || pharmacy.saving}
            >
              <RefreshCw className={cn('size-3.5', refreshing && 'animate-spin')} />
              Refresh
            </Button>
            {workspaceId ? (
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground" asChild>
                <Link to={`${accountingBase}/audit-logs`}>
                  <History className="size-3.5" />
                  Audit history
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      <div className="mx-auto mt-8 flex w-full max-w-[1180px] flex-col gap-8 lg:flex-row lg:items-start lg:gap-14">
        <aside className="hidden lg:block lg:w-56 shrink-0 lg:sticky lg:top-24">
          <SettingsEnterpriseNav
            embedded
            tabs={settingsTabs}
            activeTab={activeTab}
            onChange={changeTab}
          />
        </aside>

        <div className="min-w-0 flex-1">
          <div className="lg:hidden mb-6">
            <SettingsEnterpriseNavMobile
              tabs={settingsTabs}
              activeTab={activeTab}
              onChange={changeTab}
            />
          </div>

          <div className="max-w-4xl pb-20">
              {activeTab === 'profile' && (
                <ProfileTab
                  company={company}
                  logoUrl={logoUrl}
                  onSaved={onProfileSaved}
                  onPosMenuSaved={onPosMenuSaved}
                />
              )}
              {activeTab === 'print' && (
                <PrintPreferencesTab
                  title={tabMeta.title}
                  description={tabMeta.description}
                  icon={tabMeta.icon}
                  isPharmacy={isPharmacy}
                  pharmacySettings={pharmacy.settings}
                  pharmacyLoading={pharmacy.loading}
                  pharmacySaving={pharmacy.saving}
                  onSavePharmacy={pharmacy.save}
                />
              )}
              {isPharmacy && activeTab === 'pharmacy' && (
                <PharmacyTab
                  title={tabMeta.title}
                  description={tabMeta.description}
                  settings={pharmacy.settings}
                  loading={pharmacy.loading}
                  saving={pharmacy.saving}
                  save={pharmacy.save}
                />
              )}
              {activeTab === 'footer' && (
                <FooterTab
                  company={company}
                  onSaved={onFooterSaved}
                  title={tabMeta.title}
                  description={tabMeta.description}
                  icon={tabMeta.icon}
                />
              )}
              {activeTab === 'inventory' && (
                <InventoryTab
                  inventoryModel={company?.inventory_model}
                  onSaved={onInventorySaved}
                  title={tabMeta.title}
                  description={tabMeta.description}
                  icon={tabMeta.icon}
                />
              )}
              {activeTab === 'approval' && (
                <ApprovalWorkflowTab
                  approvalModules={approvalModules}
                  approvalModuleLabels={approvalModuleLabels}
                  onSaved={onApprovalSaved}
                  title={tabMeta.title}
                  description={tabMeta.description}
                  icon={tabMeta.icon}
                />
              )}
              {activeTab === 'posting' && (
                <AutoPostTab
                  autoPost={autoPost}
                  offlineSyncEnabled={!!company?.offline_sync_enabled}
                  showFullChartOfAccounts={!!company?.show_full_chart_of_accounts}
                  invoiceBillingMode={company?.invoice_billing_mode || 'invoice_anytime'}
                  onSaved={onAutoPostSaved}
                  title={tabMeta.title}
                  description={tabMeta.description}
                  icon={tabMeta.icon}
                />
              )}
              {activeTab === 'custom-fields' && (
                <CustomFieldsTab
                  title={tabMeta.title}
                  description={tabMeta.description}
                  icon={tabMeta.icon}
                />
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
