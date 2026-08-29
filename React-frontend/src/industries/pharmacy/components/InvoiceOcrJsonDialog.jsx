import { useMemo, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

function pretty(value) {
  try {
    return JSON.stringify(value ?? null, null, 2);
  } catch {
    return String(value ?? '');
  }
}

/**
 * Shows the structured JSON Mistral (or Gemini) returned for the last scan,
 * so a pharmacist can see exactly what the engine extracted for expiry/batch.
 */
export function InvoiceOcrJsonDialog({ open, onOpenChange, debug }) {
  const [copied, setCopied] = useState(false);
  const payload = debug && typeof debug === 'object' ? debug : null;
  const json = useMemo(() => pretty(payload?.annotation ?? payload), [payload]);
  const lines = Array.isArray(payload?.lines) ? payload.lines : [];
  const engine = [payload?.provider, payload?.model].filter(Boolean).join(' · ') || 'OCR';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      toast.success('OCR JSON copied');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        variant="fullscreen"
        className="flex max-h-[90vh] max-w-4xl flex-col gap-3 overflow-hidden p-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <DialogTitle className="text-base">OCR JSON</DialogTitle>
            <DialogDescription className="text-[12px] text-slate-600">
              What {engine} extracted from this page — including expiry as the model returned it.
            </DialogDescription>
          </div>
          <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5" onClick={copy}>
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            Copy JSON
          </Button>
        </div>

        {lines.length ? (
          <div className="max-h-40 overflow-auto rounded-md border border-slate-200">
            <table className="w-full text-left text-[11px]">
              <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-2 py-1 font-semibold">#</th>
                  <th className="px-2 py-1 font-semibold">Product</th>
                  <th className="px-2 py-1 font-semibold">Batch</th>
                  <th className="px-2 py-1 font-semibold">Expiry (OCR)</th>
                  <th className="px-2 py-1 font-semibold">Qty</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.row} className="border-t border-slate-100">
                    <td className="px-2 py-1 tabular-nums text-slate-500">{line.row}</td>
                    <td className="px-2 py-1 font-medium text-slate-800">{line.product || '—'}</td>
                    <td className="px-2 py-1 font-mono">{line.batch || '—'}</td>
                    <td
                      className={cn(
                        'px-2 py-1 font-mono',
                        line.expiry ? 'text-emerald-800' : 'text-red-700',
                      )}
                    >
                      {line.expiry == null || line.expiry === '' ? 'null' : String(line.expiry)}
                    </td>
                    <td className="px-2 py-1 tabular-nums">{line.qty ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <pre className="min-h-0 flex-1 overflow-auto rounded-md border border-slate-200 bg-slate-950 p-3 text-[11px] leading-relaxed text-emerald-100">
          {json || 'No OCR JSON for this scan yet. Scan a bill first.'}
        </pre>
      </DialogContent>
    </Dialog>
  );
}
