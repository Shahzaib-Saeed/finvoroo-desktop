import {
  companyDocumentFooterFor,
  splitDocumentNotice,
} from '@/pages/accounting/lib/documentFooter';
import { cn } from '@/lib/utils';

function parseFooterLines(text) {
  if (!text) return [];
  return String(text)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[•\-]\s*/, ''));
}

function BankLegalFooterPreview({ companyFooter, templateFooter, enabled }) {
  const lines = [
    ...parseFooterLines(companyFooter),
    ...parseFooterLines(templateFooter),
  ];

  if (!enabled) {
    return (
      <div className="rounded-md border border-dashed border-border/60 bg-muted/20 px-3 py-4 text-center">
        <p className="text-[11px] text-muted-foreground">Footer disabled for invoices</p>
      </div>
    );
  }

  if (!lines.length) {
    return (
      <div className="rounded-md border border-dashed border-border/60 bg-muted/20 px-3 py-4 text-center">
        <p className="text-[11px] italic text-muted-foreground/70">No bank or legal lines configured</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border/50 bg-[#eef1f5] dark:bg-muted/40 overflow-hidden">
      <div className="max-h-[220px] overflow-y-auto overscroll-contain px-3.5 py-3 space-y-1.5">
        {lines.map((line, index) => {
          const isIban = /iban/i.test(line);
          const isLegal =
            /dispute|notify|computer-generated|signature|vessel|complaint|terms/i.test(line);
          return (
            <p
              key={`${index}-${line.slice(0, 24)}`}
              className={cn(
                'text-[11px] leading-[1.65] text-foreground/88',
                isIban && 'font-mono text-[10.5px] tracking-tight',
                isLegal && 'text-[10.5px] text-muted-foreground italic',
              )}
            >
              {line}
            </p>
          );
        })}
      </div>
    </div>
  );
}

function PreviewSection({ title, children, className }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

export function InvoiceSettingsFooterPreview({
  company,
  templateFooter = '',
  invoiceNotes = '',
  className,
}) {
  const mergedCompany = company || {};
  const companyFooter = companyDocumentFooterFor(mergedCompany, 'invoice');
  const footerEnabled = !!mergedCompany.document_footer_pages?.invoice;
  const notice = splitDocumentNotice(mergedCompany.document_invoice_notice);
  const closing = (mergedCompany.document_closing_message || '').trim();
  const signoff = (mergedCompany.document_signoff || '').trim();
  const templateText = (templateFooter || '').trim();
  const noteText = (invoiceNotes || '').trim();

  return (
    <aside className={cn('flex flex-col min-h-0', className)}>
      <div className="shrink-0 mb-2.5">
        <p className="text-[12px] font-semibold text-foreground">Live preview</p>
        <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
          Printed invoice footer blocks update as you edit.
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain rounded-lg border border-border/70 bg-muted/10 p-3 space-y-3">
        <PreviewSection title="Bank & legal footer">
          <BankLegalFooterPreview
            companyFooter={companyFooter}
            templateFooter={templateText}
            enabled={footerEnabled}
          />
        </PreviewSection>

        {(notice?.title || notice?.body || noteText) ? (
          <PreviewSection title="Footer notes & notice">
            <div className="rounded-md border border-border/50 bg-background px-3 py-2.5 space-y-2">
              {notice?.title ? (
                <div className="text-right max-w-[140px] ml-auto">
                  <p className="text-[11px] font-semibold text-foreground leading-snug">{notice.title}</p>
                  {notice.body ? (
                    <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed whitespace-pre-wrap">
                      {notice.body}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {noteText ? (
                <p className="text-[11px] leading-relaxed text-foreground/85 whitespace-pre-wrap">{noteText}</p>
              ) : null}
            </div>
          </PreviewSection>
        ) : null}

        <PreviewSection title="Closing line">
          <div className="rounded-md border border-border/50 bg-background px-3 py-3 text-center">
            {closing ? (
              <p className="text-[11px] text-foreground/90 italic leading-relaxed">{closing}</p>
            ) : (
              <p className="text-[11px] italic text-muted-foreground/70">No closing message</p>
            )}
            {signoff ? (
              <p className="text-[11px] font-semibold text-primary mt-1.5">{signoff}</p>
            ) : null}
            <div className="mt-3 border-t border-border/50 pt-2.5">
              <div className="mx-auto h-px w-28 bg-border" />
              <p className="text-[9px] text-muted-foreground mt-1.5 uppercase tracking-wide">
                Authorized signature
              </p>
            </div>
          </div>
        </PreviewSection>
      </div>
    </aside>
  );
}
