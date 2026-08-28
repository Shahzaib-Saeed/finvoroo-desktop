import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { creditNotesApi } from '@/pages/accounting/credit-notes/api/credit-notes.api';
import {
  buildCreditNotePayload,
  lineFromInvoiceApi,
} from '@/pages/accounting/credit-notes/constants';
import { invoicesApi } from '@/pages/accounting/invoices/api/invoices.api';
import { posApi } from '../api/pos.api';
import { formatMoney } from '../lib/cart-math';

function unwrap(res) {
  return res?.data?.data ?? res?.data ?? null;
}

/** Invoice-linked return — embeddable panel (no dialog wrapper). */
export function PosReturnInvoicePanel({
  currency,
  canRefund,
  onExchangeStart,
  managerActive,
  onRequestManager,
  onComplete,
}) {
  const [sales, setSales] = useState([]);
  const [query, setQuery] = useState('');
  const [invoice, setInvoice] = useState(null);
  const [lines, setLines] = useState([]);
  const [qtys, setQtys] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState('return');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = unwrap(await posApi.recentSales({ limit: 30 })) || [];
        if (!cancelled) setSales(Array.isArray(data) ? data : []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadInvoice = async (id) => {
    setLoading(true);
    try {
      const inv = unwrap(await invoicesApi.show(id));
      const cnLines = unwrap(await creditNotesApi.invoiceLines(id)) || [];
      setInvoice(inv);
      const raw = Array.isArray(cnLines) ? cnLines : cnLines?.lines || [];
      const rows = raw.map(lineFromInvoiceApi);
      setLines(rows);
      const init = {};
      rows.forEach((l) => {
        init[l.invoice_line_id] = String(l.remaining_quantity || '');
      });
      setQtys(init);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Could not load invoice');
    } finally {
      setLoading(false);
    }
  };

  const searchInvoice = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    try {
      const res = await invoicesApi.list({ search: q, per_page: 5 });
      const rows = unwrap(res) || [];
      const list = Array.isArray(rows) ? rows : [];
      const hit =
        list.find((i) => String(i.invoice_number).toLowerCase() === q.toLowerCase()) ||
        list[0];
      if (hit) await loadInvoice(hit.id);
      else toast.error('Invoice not found');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    if (!canRefund && !managerActive) {
      onRequestManager?.();
      toast.message('Manager approval required for returns');
      return;
    }
    if (!invoice?.id) return;
    const formLines = lines
      .map((l) => {
        const qty = Number(qtys[l.invoice_line_id]) || 0;
        if (qty <= 0) return null;
        return { ...l, quantity: String(qty) };
      })
      .filter(Boolean);

    if (!formLines.length) {
      toast.error('Select return quantities');
      return;
    }

    setSaving(true);
    try {
      const payload = buildCreditNotePayload(
        {
          customer_id: invoice.customer_id,
          invoice_id: invoice.id,
          credit_note_date: new Date().toISOString().slice(0, 10),
          reason:
            mode === 'exchange'
              ? `POS exchange EXCH-${invoice.invoice_number}`
              : 'POS return',
          amount: '',
        },
        formLines,
      );
      const cn = unwrap(await creditNotesApi.create(payload));
      toast.success(`Credit note ${cn?.credit_note_number || cn?.id || ''} created`);
      if (mode === 'exchange') {
        onExchangeStart?.(invoice, formLines);
      }
      onComplete?.();
      setInvoice(null);
      setLines([]);
      setQuery('');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Return failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === 'return' ? 'default' : 'outline'}
          className={mode === 'return' ? 'bg-emerald-800 hover:bg-emerald-900' : ''}
          onClick={() => setMode('return')}
        >
          Return
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === 'exchange' ? 'default' : 'outline'}
          className={mode === 'exchange' ? 'bg-emerald-800 hover:bg-emerald-900' : ''}
          onClick={() => setMode('exchange')}
        >
          Exchange
        </Button>
      </div>

      <div className="flex gap-2">
        <Input
          data-pos-typing
          className="h-10 border-slate-400"
          placeholder="Invoice number"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && searchInvoice()}
        />
        <Button
          type="button"
          className="h-10 bg-emerald-800 hover:bg-emerald-900"
          onClick={searchInvoice}
        >
          Find
        </Button>
      </div>

      {!invoice ? (
        <div className="max-h-52 space-y-1 overflow-y-auto rounded-lg border border-slate-300">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-5 animate-spin text-emerald-700" />
            </div>
          ) : sales.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-slate-500">No recent sales</p>
          ) : (
            sales.map((s) => (
              <button
                key={s.id}
                type="button"
                className="flex w-full items-center justify-between border-b border-slate-200 px-3 py-2.5 text-left text-sm last:border-b-0 hover:bg-emerald-50"
                onClick={() => loadInvoice(s.id)}
              >
                <span className="font-semibold text-slate-900">{s.invoice_number}</span>
                <span className="tabular-nums text-slate-600">
                  {formatMoney(s.total, currency)}
                </span>
              </button>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-900">
            {invoice.invoice_number} · {invoice.customer?.name || ''}
          </p>
          <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-slate-300 p-2">
            {lines.map((l) => {
              const key = l.invoice_line_id;
              return (
                <div key={key} className="grid grid-cols-[1fr_4.5rem] items-center gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{l.description}</p>
                    <p className="text-xs text-slate-500">Returnable {l.remaining_quantity}</p>
                  </div>
                  <div>
                    <Label className="sr-only">Qty</Label>
                    <Input
                      data-pos-typing
                      className="h-9 border-slate-400 text-center tabular-nums"
                      value={qtys[key] ?? ''}
                      onChange={(e) => setQtys((q) => ({ ...q, [key]: e.target.value }))}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 flex-1 border-slate-400"
              onClick={() => {
                setInvoice(null);
                setLines([]);
              }}
            >
              Back
            </Button>
            <Button
              type="button"
              className="h-10 flex-[1.4] bg-emerald-800 hover:bg-emerald-900"
              disabled={saving}
              onClick={submit}
            >
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {mode === 'exchange' ? 'Return & exchange' : 'Complete return'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
