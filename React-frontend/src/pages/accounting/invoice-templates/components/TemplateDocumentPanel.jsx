import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export function TemplateDocumentPanel({
  name,
  footerContent,
  onNameChange,
  onFooterChange,
  onSaveName,
  onSaveFooter,
  savingName,
  savingFooter,
}) {
  return (
    <div className="space-y-4">
      <PanelIntro
        title="Document"
        subtitle="Name and footer on the printed invoice."
      />

      <section className="rounded-xl border bg-card p-4 space-y-3">
        <div>
          <p className="text-sm font-semibold">Template display name</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Used in lists, the template picker, and internal references.
          </p>
        </div>
        <Input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          maxLength={255}
          placeholder="e.g. Standard sales invoice"
        />
        <Button type="button" size="sm" onClick={onSaveName} disabled={savingName}>
          {savingName ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save name
        </Button>
      </section>

      <section className="rounded-xl border bg-card p-4 space-y-3">
        <div>
          <p className="text-sm font-semibold">Default payment & banking footer</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Template-specific text for invoices using this template. Prefer Settings → Profile →
            Document footer for company-wide bank/legal lines that should appear on all documents.
            Per-invoice “Payment & banking details” still append when filled in.
          </p>
        </div>
        <Textarea
          rows={10}
          value={footerContent ?? ''}
          onChange={(e) => onFooterChange(e.target.value)}
          maxLength={65535}
          placeholder={`In case of disputes, please notify us within five days…\nPayment can be made via bank cheque or transfer in favor of your company.\nIBAN : PK00 BANK 0000 0000 0000 0000 — Bank Name, Branch, City`}
        />
        <Button type="button" size="sm" variant="secondary" onClick={onSaveFooter} disabled={savingFooter}>
          {savingFooter ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save footer
        </Button>
      </section>
    </div>
  );
}

function PanelIntro({ title, subtitle }) {
  return (
    <div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
    </div>
  );
}
