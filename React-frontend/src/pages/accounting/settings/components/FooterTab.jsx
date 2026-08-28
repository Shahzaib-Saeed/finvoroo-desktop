import { useEffect, useMemo, useState } from 'react';
import { FileText, PanelBottom } from 'lucide-react';
import { toast } from 'sonner';
import { settingsApi } from '../api/settings.api';
import {
  DOCUMENT_FOOTER_PAGE_OPTIONS,
  getSettingsApiErrorMessage,
  mapCompanyToFooterForm,
} from '../constants';
import { SettingsCard } from './SettingsCard';
import { SettingsFormSection, useSettingsFormDirty } from './settings-ui';
import { SettingsStickyActionBar } from './SettingsStickyActionBar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

export function FooterTab({ company, onSaved, title, description, icon = 'footer' }) {
  const baseline = useMemo(() => mapCompanyToFooterForm(company), [company]);
  const [form, setForm] = useState(() => mapCompanyToFooterForm(company));
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const dirty = useSettingsFormDirty(baseline, form);

  useEffect(() => {
    setForm(mapCompanyToFooterForm(company));
  }, [company]);

  useEffect(() => {
    if (!justSaved) return;
    const t = setTimeout(() => setJustSaved(false), 2500);
    return () => clearTimeout(t);
  }, [justSaved]);

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const setPage = (key, value) => {
    setForm((f) => ({
      ...f,
      document_footer_pages: {
        ...f.document_footer_pages,
        [key]: value,
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await settingsApi.updateDocumentFooter({
        document_footer: form.document_footer || '',
        document_footer_pages: form.document_footer_pages,
        document_invoice_notice: form.document_invoice_notice || '',
        document_bill_notice: form.document_bill_notice || '',
        document_closing_message: form.document_closing_message || '',
        document_signoff: form.document_signoff || '',
      });
      const data = res.data?.data || {};
      toast.success(res.data?.message || 'Footer settings updated.');
      onSaved?.(data);
      setJustSaved(true);
    } catch (err) {
      toast.error(getSettingsApiErrorMessage(err, 'Failed to update footer settings.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsCard
      title={title || 'Footer settings'}
      description={description}
      icon={icon}
      useStickyFooter
      contentClassName="pb-0"
    >
      <form id="settings-footer-form" onSubmit={handleSubmit} className="space-y-4 pb-1">
        <SettingsFormSection
          icon={PanelBottom}
          title="Bank & legal footer"
          description="Default text shown in the document footer block."
        >
          <div>
            <Label className="text-sm mb-1.5 block">Default text on selected documents</Label>
            <Textarea
              rows={6}
              value={form.document_footer}
              onChange={(e) => setField('document_footer', e.target.value)}
              placeholder={`Bank details, IBAN, legal lines…\nExample:\nIBAN : PK00 BANK 0000 0000 0000 0000 — Bank Name, Branch, City`}
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Shown in the gray footer block on documents you enable below.
            </p>
          </div>
        </SettingsFormSection>

        <SettingsFormSection
          title="Show bank & legal footer on"
          description="Enable the footer on each document type."
        >
          <p className="text-xs text-muted-foreground mb-3">
            Turn on each document type that should display the bank &amp; legal footer.
          </p>
          <div className="space-y-2">
            {DOCUMENT_FOOTER_PAGE_OPTIONS.map((opt) => (
              <div
                key={opt.key}
                className="flex items-start gap-3 rounded-md border p-3 bg-background"
              >
                <Switch
                  id={`footer-page-${opt.key}`}
                  checked={!!form.document_footer_pages?.[opt.key]}
                  onCheckedChange={(v) => setPage(opt.key, v)}
                />
                <div className="min-w-0">
                  <Label
                    htmlFor={`footer-page-${opt.key}`}
                    className="text-sm font-medium flex items-center gap-1.5"
                  >
                    <FileText className="size-3.5 text-muted-foreground" />
                    {opt.label}
                  </Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{opt.description}</p>
                </div>
              </div>
            ))}
          </div>
        </SettingsFormSection>

        <SettingsFormSection title="Invoice notice" description="Right-side notice on customer invoices.">
          <div>
            <Label className="text-sm mb-1.5 block">
              Right-side notice on invoices (complaints / terms)
            </Label>
            <Textarea
              rows={5}
              value={form.document_invoice_notice}
              onChange={(e) => setField('document_invoice_notice', e.target.value)}
              placeholder={`For Invoice Complaints;\nplease notify us within five days of vessel sailing at accounts@yourcompany.com`}
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              First line is the bold title; the rest is the body. Leave empty to hide this block.
              Each company writes its own wording.
            </p>
          </div>
        </SettingsFormSection>

        <SettingsFormSection title="Bill notice" description="Right-side notice on vendor bills.">
          <div>
            <Label className="text-sm mb-1.5 block">
              Right-side notice on vendor bills
            </Label>
            <Textarea
              rows={5}
              value={form.document_bill_notice}
              onChange={(e) => setField('document_bill_notice', e.target.value)}
              placeholder={`Accounts payable notice\nPlease remit payment to the vendor by the due date. Retain this document for AP records.`}
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Same layout as the invoice notice. Leave empty to hide.
            </p>
          </div>
        </SettingsFormSection>

        <SettingsFormSection title="Closing line" description="Thank-you message and sign-off on documents.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label className="text-sm mb-1.5 block">Thank-you message</Label>
              <Textarea
                rows={2}
                value={form.document_closing_message}
                onChange={(e) => setField('document_closing_message', e.target.value)}
                placeholder="Thanks you for your business. It's pleasure to work with you,"
              />
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">Sign-off label</Label>
              <Input
                value={form.document_signoff}
                onChange={(e) => setField('document_signoff', e.target.value)}
                placeholder="Accounts Department"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Shown in blue under the thank-you line on invoices and bills.
              </p>
            </div>
          </div>
        </SettingsFormSection>

        <SettingsStickyActionBar
          dirty={dirty}
          saving={saving}
          justSaved={justSaved}
          formId="settings-footer-form"
          onReset={() => setForm(baseline)}
          onCancel={() => setForm(baseline)}
          saveLabel="Save changes"
        />
      </form>
    </SettingsCard>
  );
}
