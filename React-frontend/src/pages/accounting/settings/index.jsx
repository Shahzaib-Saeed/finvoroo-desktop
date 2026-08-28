import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { History, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { settingsApi } from './api/settings.api';
import { applyPortalColor, readPortalColor } from './constants';
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
import { WorkspaceNavigationTab } from './components/WorkspaceNavigationTab';
import { PortalColorTab } from './components/PortalColorTab';
import { CustomFieldsTab } from './components/CustomFieldsTab';
import { getSettingsTabMeta } from './components/settings-ui';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';
import { setWorkspaceDefaultCurrency, resolveCurrencyCode } from '@/lib/currency';

const VALID_TABS = new Set([
  'profile',
  'footer',
  'print',
  'inventory',
  'approval',
  'posting',
  'portal-color',
  'navigation',
  'custom-fields',
]);

export function AccountingSettingsPage() {
  const { id: workspaceId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') || 'profile';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(
    VALID_TABS.has(tabFromUrl) ? tabFromUrl : 'profile',
  );
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
    if (VALID_TABS.has(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

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

  const onNavigationSaved = (prefs) => {
    const nextNav =
      typeof prefs === 'string' ? prefs : prefs?.workspace_navigation;
    const nextPos =
      typeof prefs === 'object' && prefs != null
        ? prefs.show_pos_menu
        : undefined;
    setCompany((c) =>
      c
        ? {
            ...c,
            ...(nextNav != null ? { workspace_navigation: nextNav } : {}),
            ...(nextPos !== undefined ? { show_pos_menu: !!nextPos } : {}),
          }
        : c,
    );
    const store = useAuthStore.getState();
    const active = store.activeCompany;
    if (active && String(active.id) === String(workspaceId)) {
      store.setActiveCompany({
        ...active,
        ...(nextNav != null ? { workspace_navigation: nextNav } : {}),
        ...(nextPos !== undefined ? { show_pos_menu: !!nextPos } : {}),
      });
      store.setCompanies(
        store.companies.map((c) =>
          String(c.id) === String(workspaceId)
            ? {
                ...c,
                ...(nextNav != null ? { workspace_navigation: nextNav } : {}),
                ...(nextPos !== undefined ? { show_pos_menu: !!nextPos } : {}),
              }
            : c,
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
    const parts = [
      company?.name,
      company?.country,
      company?.currency,
      autoPost ? 'Auto-posting on' : 'Manual posting',
    ].filter(Boolean);
    return parts.length
      ? parts.join(' · ')
      : 'Company profile, documents, accounting rules, and workspace preferences.';
  }, [company?.name, company?.country, company?.currency, autoPost]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-14 w-full max-w-md rounded-lg" />
        <Card className="overflow-hidden">
          <div className="flex min-h-[520px]">
            <Skeleton className="hidden lg:block h-full w-56 shrink-0 rounded-none" />
            <Skeleton className="h-full flex-1 rounded-none" />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle={pageSubtitle}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => load(true)}
              disabled={refreshing}
            >
              <RefreshCw className={cn('size-3.5', refreshing && 'animate-spin')} />
              Refresh
            </Button>
            {workspaceId ? (
              <Button variant="outline" size="sm" className="h-8 gap-1.5" asChild>
                <Link to={`${accountingBase}/audit-logs`}>
                  <History className="size-3.5" />
                  Audit history
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col lg:flex-row">
          <aside className="hidden lg:flex lg:w-48 shrink-0 flex-col border-r border-border bg-muted/10 p-2">
            <SettingsEnterpriseNav embedded activeTab={activeTab} onChange={changeTab} />
          </aside>

          <div className="flex-1 min-w-0">
            <div className="lg:hidden border-b border-border bg-muted/10 px-3 py-2">
              <SettingsEnterpriseNavMobile activeTab={activeTab} onChange={changeTab} />
            </div>

            <div className="p-4 lg:p-5">
              {activeTab === 'profile' && (
                <ProfileTab
                  company={company}
                  logoUrl={logoUrl}
                  onSaved={onProfileSaved}
                />
              )}
              {activeTab === 'print' && (
                <PrintPreferencesTab
                  title={tabMeta.title}
                  description={tabMeta.description}
                  icon={tabMeta.icon}
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
              {activeTab === 'portal-color' && (
                <PortalColorTab
                  title={tabMeta.title}
                  description={tabMeta.description}
                  icon={tabMeta.icon}
                />
              )}
              {activeTab === 'navigation' && (
                <WorkspaceNavigationTab
                  workspaceNavigation={company?.workspace_navigation}
                  showPosMenu={!!company?.show_pos_menu}
                  onSaved={onNavigationSaved}
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
      </Card>
    </div>
  );
}
