import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatMoney } from '../lib/cart-math';

export function PosShiftDialog({
  open,
  onOpenChange,
  shift,
  currency,
  onOpenShift,
  onCloseShift,
  onLoadXReport,
  onLoadHistory,
  xReport,
  history,
  canOpen,
  canClose,
}) {
  const [openingCash, setOpeningCash] = useState('0');
  const [closingCash, setClosingCash] = useState('');
  const [notes, setNotes] = useState('');
  const [zResult, setZResult] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      onLoadHistory?.();
      if (shift?.id) onLoadXReport?.();
      setZResult(null);
    }
  }, [open, shift?.id, onLoadHistory, onLoadXReport]);

  const report = zResult?.z_report || xReport?.x_report;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-pos-no-scan className="max-w-lg gap-0 overflow-hidden rounded-2xl p-0">
        <DialogHeader className="border-b border-foreground/10 px-5 py-4">
          <DialogTitle className="text-lg font-semibold">Cash register</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {shift?.id
              ? `Shift #${shift.id} open · ${shift.cashier || 'Cashier'}`
              : 'No open shift — open before selling'}
          </p>
        </DialogHeader>

        <div className="space-y-4 px-5 py-4">
          {!shift?.id ? (
            <div className="space-y-3">
              <div>
                <Label>Opening cash</Label>
                <Input
                  data-pos-typing
                  className="mt-1 h-12 rounded-xl tabular-nums"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                />
              </div>
              <Textarea
                data-pos-typing
                placeholder="Opening notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="rounded-xl"
              />
              <Button
                type="button"
                className="h-12 w-full rounded-xl bg-foreground text-background"
                disabled={!canOpen || busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await onOpenShift({
                      opening_cash: Number(openingCash) || 0,
                      opening_notes: notes,
                    });
                    setNotes('');
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Open shift
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {report && (
                <div className="rounded-xl border border-foreground/10 bg-muted/30 p-3 text-sm">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {zResult ? 'Z report' : 'X report'}
                  </p>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Opening cash</span>
                      <span className="tabular-nums">
                        {formatMoney(report.opening_cash, currency)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cash sales</span>
                      <span className="tabular-nums">
                        {formatMoney(report.cash_sales, currency)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Expected cash</span>
                      <span className="tabular-nums font-semibold">
                        {formatMoney(report.expected_cash, currency)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Transactions</span>
                      <span className="tabular-nums">{report.transaction_count}</span>
                    </div>
                    {Object.entries(report.tenders_by_method || {}).map(([m, amt]) => (
                      <div key={m} className="flex justify-between text-xs">
                        <span className="capitalize text-muted-foreground">{m}</span>
                        <span className="tabular-nums">{formatMoney(amt, currency)}</span>
                      </div>
                    ))}
                    {zResult?.z_report?.cash_difference != null && (
                      <div className="flex justify-between border-t border-foreground/10 pt-1 font-semibold">
                        <span>Cash difference</span>
                        <span className="tabular-nums">
                          {formatMoney(zResult.z_report.cash_difference, currency)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Button type="button" variant="outline" className="h-11 w-full rounded-xl" onClick={onLoadXReport}>
                Refresh X report
              </Button>

              <div>
                <Label>Closing cash (counted)</Label>
                <Input
                  data-pos-typing
                  className="mt-1 h-12 rounded-xl tabular-nums"
                  value={closingCash}
                  onChange={(e) => setClosingCash(e.target.value)}
                  placeholder={String(report?.expected_cash ?? '')}
                />
              </div>
              <Button
                type="button"
                className="h-12 w-full rounded-xl bg-foreground text-background"
                disabled={!canClose || busy || closingCash === ''}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const res = await onCloseShift({
                      closing_cash: Number(closingCash) || 0,
                      closing_notes: notes,
                    });
                    if (res) setZResult(res);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Close shift (Z report)
              </Button>
            </div>
          )}

          {history?.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Recent shifts
              </p>
              <ul className="max-h-36 space-y-1 overflow-y-auto text-xs">
                {history.slice(0, 10).map((h) => (
                  <li
                    key={h.id}
                    className="flex justify-between rounded-lg px-2 py-1.5 hover:bg-muted/50"
                  >
                    <span>
                      #{h.id} · {h.status}
                      {h.z_number ? ` · Z${h.z_number}` : ''}
                    </span>
                    <span className="text-muted-foreground">
                      {h.opened_at ? new Date(h.opened_at).toLocaleString() : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
