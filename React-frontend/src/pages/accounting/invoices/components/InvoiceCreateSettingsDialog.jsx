import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ExternalLink,
  Info,
  Layers,
  Loader2,
  PanelBottom,
  PenSquare,
  Printer,
  Receipt,
  Settings,
  X,
  Zap,
} from 'lucide-react';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import { settingsApi } from '@/pages/accounting/settings/api/settings.api';
import {
  getSettingsApiErrorMessage,
  mapCompanyToFooterForm,
} from '@/pages/accounting/settings/constants';
import { companyDocumentFooterFor } from '@/pages/accounting/lib/documentFooter';
import { invoiceTemplatesApi } from '@/pages/accounting/invoice-templates/api/invoice-templates.api';
import {
  documentOutputApi,
  unwrapDoc,
} from '@/pages/accounting/document-output/api/document-output.api';
import { useCan } from '@/hooks/use-can';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { BILLING_MODE_OPTIONS } from './invoice-settings.constants';
import { InvoiceSettingsFooterPreview } from './InvoiceSettingsFooterPreview';

const TAB_ITEMS = [
  { id: 'footer', label: 'Footer', icon: PanelBottom },
  { id: 'posting', label: 'Posting', icon: Zap },
  { id: 'billing', label: 'Billing', icon: Receipt },
  { id: 'print', label: 'Print', icon: Printer },
];

function SettingsField({ label, hint, children, className }) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label className="text-[13px] font-medium text-foreground">{label}</Label>
      {children}
      {hint ? <p className="text-[11px] leading-relaxed text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function SettingsSection({ title, description, children, className, defaultOpen = true, collapsible = false }) {
  const [open, setOpen] = useState(defaultOpen);

  const body = <div className="space-y-3.5">{children}</div>;

  if (!collapsible) {
    return (
      <section
        className={cn(
          'rounded-lg border border-border/70 bg-card px-4 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
          className,
        )}
      >
        {title ? (
          <div className="mb-3 border-b border-border/50 pb-2.5">
            <h4 className="text-[13px] font-semibold text-foreground">{title}</h4>
            {description ? (
              <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>
            ) : null}
          </div>
        ) : null}
        {body}
      </section>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <section
        className={cn(
          'rounded-lg border border-border/70 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
          className,
        )}
      >
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-4 py-3 text-start hover:bg-muted/20 transition-colors rounded-lg">
          <div>
            <h4 className="text-[13px] font-semibold text-foreground">{title}</h4>
            {description ? (
              <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <ChevronDown
            className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-3.5 pt-0">{body}</CollapsibleContent>
      </section>
    </Collapsible>
  );
}

function ToggleRow({ id, checked, onCheckedChange, title, description, disabled = false }) {
  return (
    <div className="flex items-start gap-3">
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="mt-0.5"
      />
      <div className="min-w-0 flex-1">
        <Label
          htmlFor={id}
          className={cn('text-[13px] font-medium leading-snug', !disabled && 'cursor-pointer')}
        >
          {title}
        </Label>
        {description ? (
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </div>
  );
}

function HierarchyStrip({ templateName, workspaceId, templateId }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
      <Layers className="size-3.5 shrink-0 text-primary/70 mt-0.5" />
      <div className="min-w-0 flex-1 text-[11px] leading-relaxed text-muted-foreground">
        <span className="font-medium text-foreground">Footer layers:</span>{' '}
        Workspace default →{' '}
        {templateName ? (
          <span className="text-foreground">{templateName}</span>
        ) : (
          'Template'
        )}{' '}
        → Invoice notes field
        {templateId ? (
          <>
            {' · '}
            <Link
              to={`/workspace/${workspaceId}/accounting/invoice-templates/${templateId}`}
              target="_blank"
              rel="noopener"
              className="text-primary hover:underline inline-flex items-center gap-0.5"
            >
              Edit template
              <ExternalLink className="size-3" />
            </Link>
          </>
        ) : null}
      </div>
    </div>
  );
}

export function InvoiceSettingsDialog({
  company,
  autoPostEnabled = false,
  invoiceBillingMode,
  selectedTemplate,
  templateId,
  invoiceNotes = '',
  disabled = false,
  onSaved,
  onApplyToInvoice,
  onTemplateFooterUpdated,
}) {
  const { id: workspaceId } = useParams();
  const canEdit = useCan([
    'accounting_settings.edit',
    'document_layouts.manage',
    'document_layouts.edit',
  ]);

  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('footer');
  const [saving, setSaving] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [remoteCompany, setRemoteCompany] = useState(null);
  const [approvalModules, setApprovalModules] = useState({});
  const [templateDetail, setTemplateDetail] = useState(null);
  const [templateFooter, setTemplateFooter] = useState('');
  const [templateFooterBaseline, setTemplateFooterBaseline] = useState('');
  const [printLoading, setPrintLoading] = useState(false);
  const [printLayouts, setPrintLayouts] = useState([]);
  const [printLayoutId, setPrintLayoutId] = useState('');
  const [printLayoutBaseline, setPrintLayoutBaseline] = useState('');

  const effectiveCompany = remoteCompany || company || {};
  const footerBaseline = useMemo(() => mapCompanyToFooterForm(effectiveCompany), [effectiveCompany]);
  const [footerForm, setFooterForm] = useState(footerBaseline);
  const [autoPost, setAutoPost] = useState(!!autoPostEnabled);
  const [billingMode, setBillingMode] = useState(
    invoiceBillingMode || effectiveCompany.invoice_billing_mode || 'invoice_anytime',
  );

  const loadDialogData = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const [settingsRes, templateRes] = await Promise.all([
        settingsApi.get(),
        templateId ? invoiceTemplatesApi.show(templateId) : Promise.resolve(null),
      ]);

      const settingsPayload = settingsRes.data?.data || {};
      const loadedCompany = settingsPayload.company || company || {};
      setRemoteCompany(loadedCompany);
      setApprovalModules(loadedCompany.approval_modules || {});

      const tpl = templateRes?.data?.data || null;
      setTemplateDetail(tpl);
      const footer = (tpl?.footer_content ?? selectedTemplate?.footer_content ?? '').trim();
      setTemplateFooter(footer);
      setTemplateFooterBaseline(footer);
    } catch {
      setRemoteCompany(company || null);
      setApprovalModules({});
    } finally {
      setSettingsLoading(false);
    }
  }, [company, templateId, selectedTemplate?.footer_content]);

  const loadPrintPreferences = useCallback(async () => {
    setPrintLoading(true);
    try {
      const [layoutsRes, prefsRes] = await Promise.all([
        documentOutputApi.layouts({ document_type: 'invoice' }),
        documentOutputApi.preferences(),
      ]);
      const layouts = unwrapDoc(layoutsRes) || [];
      const prefs = unwrapDoc(prefsRes);
      const defaultId = String(
        prefs?.defaults?.invoice?.id ||
          prefs?.preferences?.find((x) => x.document_type === 'invoice')?.default_layout_id ||
          '',
      );
      setPrintLayouts(Array.isArray(layouts) ? layouts : []);
      setPrintLayoutId(defaultId);
      setPrintLayoutBaseline(defaultId);
    } catch {
      setPrintLayouts([]);
    } finally {
      setPrintLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setFooterForm(mapCompanyToFooterForm(effectiveCompany));
    setAutoPost(!!autoPostEnabled);
    setBillingMode(
      invoiceBillingMode || effectiveCompany.invoice_billing_mode || 'invoice_anytime',
    );
    setActiveTab('footer');
    loadDialogData();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open || activeTab !== 'print') return;
    loadPrintPreferences();
  }, [open, activeTab, loadPrintPreferences]);

  useEffect(() => {
    if (!open || !remoteCompany) return;
    setFooterForm(mapCompanyToFooterForm(remoteCompany));
    setAutoPost(!!remoteCompany.auto_post_to_accounting);
    setBillingMode(remoteCompany.invoice_billing_mode || 'invoice_anytime');
  }, [open, remoteCompany]);

  const footerDirty = useMemo(
    () => JSON.stringify(footerForm) !== JSON.stringify(footerBaseline),
    [footerForm, footerBaseline],
  );
  const autoPostBaseline =
    remoteCompany?.auto_post_to_accounting ?? autoPostEnabled;
  const postingDirty = autoPost !== !!autoPostBaseline;
  const billingBaseline =
    remoteCompany?.invoice_billing_mode ||
    invoiceBillingMode ||
    effectiveCompany.invoice_billing_mode ||
    'invoice_anytime';
  const billingDirty = billingMode !== billingBaseline;
  const templateFooterDirty = templateFooter !== templateFooterBaseline;
  const printDirty = printLayoutId !== printLayoutBaseline;
  const dirty = footerDirty || postingDirty || billingDirty || templateFooterDirty || printDirty;

  const invoiceFooterEnabled = !!footerForm.document_footer_pages?.invoice;
  const invoiceApprovalEnabled = !!approvalModules.invoice;

  const previewCompany = useMemo(
    () => ({ ...effectiveCompany, ...footerForm }),
    [effectiveCompany, footerForm],
  );

  const applyNotesValue = companyDocumentFooterFor(previewCompany, 'invoice');

  const setFooterField = (key, value) => {
    setFooterForm((current) => ({ ...current, [key]: value }));
  };

  const setInvoiceFooterEnabled = (enabled) => {
    setFooterForm((current) => ({
      ...current,
      document_footer_pages: {
        ...current.document_footer_pages,
        invoice: enabled,
      },
    }));
  };

  const handleSaveWorkspace = useCallback(async () => {
    if (saving || !dirty || !canEdit) return;
    setSaving(true);
    try {
      const requests = [];

      if (footerDirty) {
        requests.push(
          settingsApi.updateDocumentFooter({
            document_footer: footerForm.document_footer || '',
            document_footer_pages: footerForm.document_footer_pages,
            document_invoice_notice: footerForm.document_invoice_notice || '',
            document_bill_notice: effectiveCompany.document_bill_notice || '',
            document_closing_message: footerForm.document_closing_message || '',
            document_signoff: footerForm.document_signoff || '',
          }),
        );
      }
      if (postingDirty) {
        requests.push(settingsApi.updateAutoPost({ auto_post_to_accounting: autoPost }));
      }
      if (billingDirty) {
        requests.push(settingsApi.updateInvoiceBillingMode({ invoice_billing_mode: billingMode }));
      }
      if (templateFooterDirty && templateId) {
        requests.push(invoiceTemplatesApi.updateFooter(templateId, { footer_content: templateFooter }));
      }
      if (printDirty) {
        requests.push(
          documentOutputApi.updatePreferences({
            document_type: 'invoice',
            default_layout_id: printLayoutId ? Number(printLayoutId) : null,
            default_adapter: 'browser',
          }),
        );
      }

      const results = await Promise.all(requests);
      let idx = 0;
      const footerData = footerDirty ? results[idx++]?.data?.data || {} : null;
      const autoPostData = postingDirty ? results[idx++]?.data?.data || {} : null;
      const billingData = billingDirty ? results[idx++]?.data?.data || {} : null;

      if (templateFooterDirty) {
        setTemplateFooterBaseline(templateFooter);
        onTemplateFooterUpdated?.(templateId, templateFooter);
      }
      if (printDirty) {
        setPrintLayoutBaseline(printLayoutId);
      }

      toast.success('Workspace settings saved.');
      onSaved?.({
        company: footerData || undefined,
        auto_post_to_accounting: autoPostData?.auto_post_to_accounting ?? autoPost,
        invoice_billing_mode: billingData?.invoice_billing_mode ?? billingMode,
      });
      setOpen(false);
    } catch (err) {
      toast.error(getSettingsApiErrorMessage(err, 'Failed to save settings.'));
    } finally {
      setSaving(false);
    }
  }, [
    saving,
    dirty,
    canEdit,
    footerDirty,
    footerForm,
    effectiveCompany.document_bill_notice,
    postingDirty,
    autoPost,
    billingDirty,
    billingMode,
    templateFooterDirty,
    templateId,
    templateFooter,
    printDirty,
    printLayoutId,
    onSaved,
    onTemplateFooterUpdated,
  ]);

  const handleApplyToInvoice = () => {
    onApplyToInvoice?.(applyNotesValue);
    toast.success('Applied workspace footer to this invoice.');
  };

  const requestClose = useCallback(() => {
    if (dirty) {
      setConfirmDiscard(true);
      return;
    }
    setOpen(false);
  }, [dirty]);

  const handleOpenChange = (next) => {
    if (next) {
      setOpen(true);
      return;
    }
    requestClose();
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (dirty && canEdit) handleSaveWorkspace();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, dirty, canEdit, handleSaveWorkspace]);

  const statusTooltip = [
    autoPostEnabled ? 'Auto-post on' : 'Auto-post off',
    invoiceFooterEnabled ? 'Invoice footer on' : 'Invoice footer off',
    invoiceApprovalEnabled ? 'Approval required' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const templateName = templateDetail?.name || selectedTemplate?.name;

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 shrink-0"
            disabled={disabled || !company}
            onClick={() => setOpen(true)}
            aria-label="Invoice settings"
          >
            <Settings className="size-3.5" />
            <span className="hidden sm:inline">Settings</span>
            <span className="hidden md:inline-flex items-center gap-1 ml-0.5">
              {autoPostEnabled ? (
                <Badge variant="success" appearance="light" size="sm" className="h-5 px-1.5 text-[10px]">
                  Auto-post
                </Badge>
              ) : null}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {statusTooltip}
        </TooltipContent>
      </Tooltip>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={false}
          overlayClassName="bg-slate-900/10 backdrop-blur-none"
          className={cn(
            'gap-0 overflow-hidden p-0',
            'w-[calc(100vw-1.5rem)] max-h-[92vh] sm:max-w-[980px]',
            'rounded-xl border border-border/80 bg-background',
            'shadow-[0_20px_50px_-12px_rgba(15,23,42,0.16)]',
          )}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            requestClose();
          }}
        >
          <DialogDescription className="sr-only">
            Configure invoice footer, posting, billing, and print defaults for this workspace.
          </DialogDescription>
          {/* Header */}
          <div className="shrink-0 flex items-start gap-3 border-b border-border/70 bg-muted/20 px-5 py-4">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-inset ring-primary/15">
              <Settings className="size-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 pr-8">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold tracking-tight text-foreground">
                  Invoice settings
                </h2>
                {autoPost ? (
                  <Badge variant="success" appearance="light" size="sm" className="h-5 text-[10px]">
                    Auto-post enabled
                  </Badge>
                ) : null}
                {!canEdit ? (
                  <Badge variant="secondary" size="sm" className="h-5 text-[10px]">
                    View only
                  </Badge>
                ) : null}
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Workspace defaults for footers, posting, billing rules, and print layout.
              </p>
            </div>
            <DialogClose
              onClick={requestClose}
              className="absolute end-4 top-4 flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </div>

          {/* Tabs */}
          <div className="shrink-0 border-b border-border/60 bg-background px-5 pt-3 pb-3">
            <div className="inline-flex rounded-lg border border-border/70 bg-muted/30 p-0.5">
              {TAB_ITEMS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                      activeTab === tab.id
                        ? 'bg-background text-foreground shadow-sm ring-1 ring-border/60'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <Icon className="size-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Body */}
          <div className="overflow-y-auto overscroll-contain max-h-[calc(92vh-12.5rem)] min-h-[400px]">
            <DialogBody className="px-5 py-4 min-h-[420px]">
              {settingsLoading && activeTab === 'footer' ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Loading settings…
                </div>
              ) : (
                <div
                  className={cn(
                    'gap-5',
                    activeTab === 'footer'
                      ? 'grid lg:grid-cols-[minmax(0,1fr)_minmax(280px,320px)] lg:items-start'
                      : 'max-w-2xl',
                  )}
                >
                  <div className="space-y-3 min-w-0">
                    {activeTab === 'footer' ? (
                      <>
                        <HierarchyStrip
                          templateName={templateName}
                          workspaceId={workspaceId}
                          templateId={templateId}
                        />

                        <SettingsSection title="Document footer">
                          <ToggleRow
                            id="invoice-footer-enabled"
                            checked={invoiceFooterEnabled}
                            onCheckedChange={setInvoiceFooterEnabled}
                            disabled={!canEdit}
                            title="Show bank & legal footer on invoices"
                            description="Prefills payment & banking details on new invoices when enabled."
                          />

                          <SettingsField
                            label="Bank & legal footer"
                            hint="Workspace-wide bank and legal lines for printed invoices."
                          >
                            <Textarea
                              rows={7}
                              value={footerForm.document_footer}
                              onChange={(e) => setFooterField('document_footer', e.target.value)}
                              placeholder="IBAN, bank name, branch, and legal lines…"
                              disabled={!canEdit || !invoiceFooterEnabled}
                              className={cn(
                                'min-h-[160px] max-h-[280px] resize-y text-sm leading-relaxed font-mono text-[13px]',
                                !invoiceFooterEnabled && 'opacity-50',
                              )}
                            />
                          </SettingsField>

                          {templateId ? (
                            <SettingsField
                              label="Template footer"
                              hint={`Additional footer text for "${templateName || 'selected'}" template.`}
                            >
                              <Textarea
                                rows={4}
                                value={templateFooter}
                                onChange={(e) => setTemplateFooter(e.target.value)}
                                placeholder="Template-specific payment instructions…"
                                disabled={!canEdit}
                                className="min-h-[96px] max-h-[200px] resize-y text-sm leading-relaxed"
                              />
                            </SettingsField>
                          ) : null}
                        </SettingsSection>

                        <SettingsSection
                          title="Printed invoice notices"
                          description="Right-side notice block on customer invoices."
                          collapsible
                          defaultOpen={false}
                        >
                          <SettingsField
                            label="Invoice notice"
                            hint="Line 1 = bold title · Lines 2+ = body · Leave empty to hide."
                          >
                            <Textarea
                              rows={3}
                              value={footerForm.document_invoice_notice}
                              onChange={(e) => setFooterField('document_invoice_notice', e.target.value)}
                              placeholder="Complaints, terms, or payment instructions…"
                              disabled={!canEdit}
                              className="min-h-[72px] resize-y text-sm"
                            />
                          </SettingsField>
                        </SettingsSection>

                        <SettingsSection
                          title="Closing line"
                          description="Thank-you message and sign-off on printed documents."
                          collapsible
                          defaultOpen={false}
                        >
                          <SettingsField
                            label="Thank-you message"
                            hint="Displayed above the sign-off on invoices."
                          >
                            <Textarea
                              rows={2}
                              value={footerForm.document_closing_message}
                              onChange={(e) => setFooterField('document_closing_message', e.target.value)}
                              placeholder="Thank you for your business."
                              disabled={!canEdit}
                              className="min-h-[56px] resize-y text-sm"
                            />
                          </SettingsField>

                          <SettingsField label="Sign-off label" hint="Shown in primary color under the closing line.">
                            <Input
                              value={footerForm.document_signoff}
                              onChange={(e) => setFooterField('document_signoff', e.target.value)}
                              placeholder="Accounts Department"
                              disabled={!canEdit}
                              className="h-9 text-sm"
                            />
                          </SettingsField>

                          {(footerForm.document_closing_message || footerForm.document_signoff) ? (
                            <div className="rounded-md border border-border/50 bg-muted/20 px-3 py-2 text-center">
                              {footerForm.document_closing_message ? (
                                <p className="text-xs italic text-foreground/85">
                                  {footerForm.document_closing_message}
                                </p>
                              ) : null}
                              {footerForm.document_signoff ? (
                                <p className="text-xs font-medium text-primary mt-1">
                                  {footerForm.document_signoff}
                                </p>
                              ) : null}
                            </div>
                          ) : null}
                        </SettingsSection>

                        <InvoiceSettingsFooterPreview
                          company={previewCompany}
                          templateFooter={templateFooter}
                          invoiceNotes={invoiceNotes}
                          className="lg:hidden"
                        />
                      </>
                    ) : null}

                    {activeTab === 'posting' ? (
                      <SettingsSection
                        title="Automatic posting"
                        description="Control whether invoices post to the general ledger on save."
                      >
                        <div className="flex gap-2 rounded-md border border-border/60 bg-muted/25 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
                          <Info className="size-3.5 shrink-0 text-primary/70 mt-0.5" />
                          <p>
                            When enabled, saved invoices and bills create journal entries immediately.
                            Manual posting is skipped for those documents.
                          </p>
                        </div>

                        <ToggleRow
                          id="invoice-auto-post"
                          checked={autoPost}
                          onCheckedChange={setAutoPost}
                          disabled={!canEdit}
                          title="Automatically post invoices to accounting"
                          description={
                            autoPost
                              ? 'Invoices will post to the general ledger when you save.'
                              : 'Invoices remain drafts until posted manually.'
                          }
                        />

                        {invoiceApprovalEnabled ? (
                          <div className="rounded-md border border-amber-500/25 bg-amber-500/5 px-3 py-2.5 text-[11px] text-amber-800 dark:text-amber-200">
                            Invoice approval is enabled in this workspace. Posted invoices may still
                            require manager approval before sending.
                          </div>
                        ) : null}
                      </SettingsSection>
                    ) : null}

                    {activeTab === 'billing' ? (
                      <SettingsSection
                        title="Sales order billing"
                        description="How strictly invoice quantities follow delivery progress."
                      >
                        <div className="grid gap-2">
                          {BILLING_MODE_OPTIONS.map((option) => {
                            const selected = billingMode === option.value;
                            return (
                              <label
                                key={option.value}
                                className={cn(
                                  'block rounded-lg border p-3 transition-colors',
                                  !canEdit && 'opacity-70 cursor-not-allowed',
                                  canEdit && 'cursor-pointer',
                                  selected
                                    ? 'border-primary bg-primary/5 shadow-sm'
                                    : 'border-border/80 hover:border-primary/30',
                                )}
                              >
                                <input
                                  type="radio"
                                  name="invoice_billing_mode"
                                  value={option.value}
                                  checked={selected}
                                  disabled={!canEdit}
                                  onChange={() => setBillingMode(option.value)}
                                  className="sr-only"
                                />
                                <span className="block text-sm font-medium">{option.title}</span>
                                <span className="mt-1 block text-xs text-muted-foreground">
                                  {option.description}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </SettingsSection>
                    ) : null}

                    {activeTab === 'print' ? (
                      <>
                        <SettingsSection
                          title="Default print layout"
                          description="Used when printing or exporting invoices from this workspace."
                        >
                          {printLoading ? (
                            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                              <Loader2 className="size-4 animate-spin" />
                              Loading layouts…
                            </div>
                          ) : (
                            <SettingsField
                              label="Invoice layout"
                              hint="Users can still pick a different layout when printing."
                            >
                              <Select
                                value={printLayoutId || undefined}
                                onValueChange={setPrintLayoutId}
                                disabled={!canEdit || printLayouts.length === 0}
                              >
                                <SelectTrigger className="h-9 text-sm">
                                  <SelectValue placeholder="Select default layout" />
                                </SelectTrigger>
                                <SelectContent>
                                  {printLayouts.map((layout) => (
                                    <SelectItem key={layout.id} value={String(layout.id)}>
                                      {layout.name}
                                      {layout.is_default ? ' (system default)' : ''}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </SettingsField>
                          )}
                        </SettingsSection>

                        <SettingsSection
                          title="Visual print designer"
                          description="Design invoice print layouts (logo, fields, items table, totals) like Canva."
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <Button type="button" size="sm" className="gap-1.5 h-9" asChild>
                              <Link
                                to={`/workspace/${workspaceId}/accounting/document-output/designer`}
                                target="_blank"
                                rel="noopener"
                              >
                                <PenSquare className="size-3.5" />
                                Open print designer
                              </Link>
                            </Button>
                            {printLayoutId ? (
                              <Button type="button" size="sm" variant="outline" className="gap-1.5 h-9" asChild>
                                <Link
                                  to={`/workspace/${workspaceId}/accounting/document-output/designer/${printLayoutId}/edit`}
                                  target="_blank"
                                  rel="noopener"
                                >
                                  <ExternalLink className="size-3.5" />
                                  Edit selected layout
                                </Link>
                              </Button>
                            ) : null}
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            This is separate from form templates (custom fields on Create Invoice). Use the designer for how
                            invoices look when printed.
                          </p>
                        </SettingsSection>
                      </>
                    ) : null}
                  </div>

                  {activeTab === 'footer' ? (
                    <InvoiceSettingsFooterPreview
                      company={previewCompany}
                      templateFooter={templateFooter}
                      invoiceNotes={invoiceNotes}
                      className="hidden lg:flex lg:max-h-[min(62vh,560px)]"
                    />
                  ) : null}
                </div>
              )}
            </DialogBody>
          </div>

          <DialogFooter className="shrink-0 mb-0 flex-col gap-3 border-t border-border/70 bg-muted/15 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground self-start sm:self-auto"
              asChild
            >
              <Link
                to={`/workspace/${workspaceId}/accounting/settings?tab=footer`}
                target="_blank"
                rel="noopener"
              >
                <ExternalLink className="size-3.5 mr-1.5" />
                All workspace settings
              </Link>
            </Button>

            <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
              {!canEdit ? (
                <p className="text-[11px] text-muted-foreground mr-auto sm:mr-2">
                  Contact an admin to change workspace defaults.
                </p>
              ) : null}
              {onApplyToInvoice && canEdit ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-8"
                  disabled={!applyNotesValue}
                  onClick={handleApplyToInvoice}
                >
                  Apply to this invoice
                </Button>
              ) : null}
              <Button type="button" variant="outline" size="sm" className="h-8" onClick={requestClose}>
                Cancel
              </Button>
              {canEdit ? (
                <Button
                  type="button"
                  size="sm"
                  className="h-8 min-w-[132px]"
                  disabled={!dirty || saving}
                  onClick={handleSaveWorkspace}
                >
                  {saving ? <Loader2 className="size-3.5 animate-spin" /> : 'Save workspace'}
                </Button>
              ) : null}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDiscard}
        title="Discard unsaved changes?"
        description="You have unsaved invoice settings. Close without saving?"
        confirmLabel="Discard"
        confirmVariant="destructive"
        onConfirm={() => {
          setConfirmDiscard(false);
          setOpen(false);
        }}
        onCancel={() => setConfirmDiscard(false)}
      />
    </>
  );
}

/** @deprecated Use InvoiceSettingsDialog */
export const InvoiceCreateSettingsDialog = InvoiceSettingsDialog;
