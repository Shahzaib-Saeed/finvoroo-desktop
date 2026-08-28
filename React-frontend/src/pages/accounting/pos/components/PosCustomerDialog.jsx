import { useEffect, useRef, useState } from 'react';
import { Loader2, Search, UserPlus, UserRound, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { formatMoney } from '../lib/cart-math';

function customerBalance(c) {
  const due = Number(c?.balance_due ?? c?.outstanding_balance ?? 0);
  return Number.isFinite(due) ? due : 0;
}

function customerMetaLine(c) {
  return [c?.customer_code, c?.phone].filter(Boolean).join(' · ');
}

export function PosCustomerDialog({
  open,
  onOpenChange,
  walkIn,
  currency,
  current,
  onSelect,
  onSearch,
  onQuickCreate,
  variant = 'default',
}) {
  const pharmacy = variant === 'pharmacy';
  const searchRef = useRef(null);
  const [q, setQ] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('search');
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMode('search');
    setQ('');
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await onSearch('');
        if (!cancelled) setRows(Array.isArray(data) ? data : []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    const t = setTimeout(() => searchRef.current?.focus(), 80);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [open, onSearch]);

  useEffect(() => {
    if (!open || mode !== 'search') return undefined;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await onSearch(q);
        setRows(Array.isArray(data) ? data : []);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q, open, mode, onSearch]);

  const pickCustomer = (c) => {
    onSelect(c);
    onOpenChange(false);
  };

  const currentDue = customerBalance(current);
  const isCurrentRow = (c) =>
    current?.id != null && c?.id != null && String(c.id) === String(current.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-pos-no-scan
        data-pharmacy-typing
        className={cn(
          'gap-0 overflow-hidden rounded-xl border p-0 shadow-xl sm:max-w-md',
          pharmacy ? 'border-slate-200' : 'border-foreground/10 rounded-2xl sm:max-w-xl',
        )}
      >
        <DialogHeader
          className={cn(
            'space-y-0 border-b px-4 py-3 text-left',
            pharmacy ? 'border-slate-200 bg-slate-50/80' : 'border-foreground/10 px-5 py-4',
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle
                className={cn(
                  'font-bold tracking-tight text-slate-900',
                  pharmacy ? 'text-[15px]' : 'text-lg font-semibold',
                )}
              >
                {mode === 'create' ? 'New customer' : 'Select customer'}
              </DialogTitle>
              {pharmacy && mode === 'search' ? (
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Search or pick ·{' '}
                  <kbd className="rounded border border-slate-200 bg-white px-1 py-px font-mono text-[10px] text-slate-600">
                    Alt+C
                  </kbd>{' '}
                  anytime
                </p>
              ) : null}
            </div>
            {mode === 'search' ? (
              <div className="flex shrink-0 rounded-lg border border-slate-200 bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => setMode('search')}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors',
                    mode === 'search'
                      ? pharmacy
                        ? 'bg-emerald-700 text-white'
                        : 'bg-foreground text-background'
                      : 'text-slate-600 hover:bg-slate-50',
                  )}
                >
                  Search
                </button>
                <button
                  type="button"
                  onClick={() => setMode('create')}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors',
                    mode === 'create'
                      ? pharmacy
                        ? 'bg-emerald-700 text-white'
                        : 'bg-foreground text-background'
                      : 'text-slate-600 hover:bg-slate-50',
                  )}
                >
                  New
                </button>
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 shrink-0 text-[11px] font-semibold text-slate-600"
                onClick={() => setMode('search')}
              >
                Back to search
              </Button>
            )}
          </div>
        </DialogHeader>

        {mode === 'search' && current?.name ? (
          <div
            className={cn(
              'flex items-center gap-2.5 border-b px-4 py-2.5',
              pharmacy ? 'border-slate-100 bg-white' : 'border-foreground/8 px-5',
            )}
          >
            <span
              className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-full',
                pharmacy ? 'bg-emerald-100 text-emerald-800' : 'bg-muted text-foreground',
              )}
            >
              <UserRound className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-bold text-slate-900">{current.name}</p>
              <p className="truncate text-[10px] font-medium text-slate-500">
                {customerMetaLine(current) || 'Selected for this sale'}
              </p>
            </div>
            {currentDue > 0.009 ? (
              <span className="shrink-0 rounded-md bg-amber-50 px-2 py-1 text-[10px] font-bold tabular-nums text-amber-800">
                Due {formatMoney(currentDue, currency)}
              </span>
            ) : (
              <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
                Active
              </span>
            )}
          </div>
        ) : null}

        {mode === 'search' ? (
          <div className={cn('px-4 py-3', !pharmacy && 'px-5 py-4')}>
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  ref={searchRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Name, phone, or code…"
                  className={cn(
                    'h-10 rounded-lg border-slate-200 bg-white pl-9 text-[13px] shadow-none',
                    pharmacy &&
                      'focus-visible:border-emerald-600 focus-visible:ring-emerald-600/30',
                  )}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && rows.length === 1) {
                      e.preventDefault();
                      pickCustomer(rows[0]);
                    }
                  }}
                />
              </div>
              {walkIn ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 shrink-0 rounded-lg border-slate-200 px-3 text-[12px] font-semibold"
                  onClick={() => pickCustomer(walkIn)}
                >
                  <Users className="mr-1.5 size-3.5" />
                  Walk-in
                </Button>
              ) : null}
            </div>

            <div
              className={cn(
                'mt-2.5 overflow-hidden rounded-lg border border-slate-200 bg-white',
                pharmacy ? 'max-h-[min(320px,50vh)]' : 'max-h-72',
              )}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-slate-500">
                  <Loader2 className="size-4 animate-spin" />
                  <span className="text-[12px] font-medium">Searching…</span>
                </div>
              ) : rows.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <p className="text-[13px] font-semibold text-slate-700">No customers found</p>
                  <p className="mt-1 text-[11px] text-slate-500">Try another name or create one</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3 h-9 rounded-lg text-[12px] font-semibold"
                    onClick={() => setMode('create')}
                  >
                    <UserPlus className="mr-1.5 size-3.5" />
                    Quick create
                  </Button>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100 overflow-y-auto">
                  {rows.map((c) => {
                    const due = customerBalance(c);
                    const selected = isCurrentRow(c);
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => pickCustomer(c)}
                          className={cn(
                            'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors',
                            selected
                              ? pharmacy
                                ? 'bg-emerald-50 hover:bg-emerald-50/90'
                                : 'bg-muted/70 hover:bg-muted/80'
                              : 'hover:bg-slate-50',
                          )}
                        >
                          <span
                            className={cn(
                              'flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold uppercase',
                              selected
                                ? 'bg-emerald-700 text-white'
                                : 'bg-slate-100 text-slate-600',
                            )}
                          >
                            {(c.name || '?').trim().charAt(0)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-semibold text-slate-900">
                              {c.name}
                            </p>
                            <p className="truncate text-[10px] text-slate-500">
                              {customerMetaLine(c) || '—'}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            {due > 0.009 ? (
                              <p className="text-[11px] font-bold tabular-nums text-amber-700">
                                {formatMoney(due, currency)}
                              </p>
                            ) : (
                              <p className="text-[10px] font-medium text-slate-400">—</p>
                            )}
                            {selected ? (
                              <p
                                className={cn(
                                  'text-[9px] font-bold uppercase tracking-wide',
                                  pharmacy ? 'text-emerald-700' : 'text-foreground',
                                )}
                              >
                                Selected
                              </p>
                            ) : null}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <form
            className="space-y-3 px-4 py-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setSaving(true);
              try {
                await onQuickCreate(form);
                setForm({ name: '', phone: '', email: '' });
                setMode('search');
              } finally {
                setSaving(false);
              }
            }}
          >
            <div>
              <Label className="text-[11px] font-semibold text-slate-600">Name</Label>
              <Input
                required
                autoFocus
                className={cn(
                  'mt-1 h-10 rounded-lg text-[13px]',
                  pharmacy &&
                    'focus-visible:border-emerald-600 focus-visible:ring-emerald-600/30',
                )}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Customer name"
              />
            </div>
            <div>
              <Label className="text-[11px] font-semibold text-slate-600">Phone</Label>
              <Input
                className={cn(
                  'mt-1 h-10 rounded-lg text-[13px]',
                  pharmacy &&
                    'focus-visible:border-emerald-600 focus-visible:ring-emerald-600/30',
                )}
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div>
              <Label className="text-[11px] font-semibold text-slate-600">Email</Label>
              <Input
                type="email"
                className={cn(
                  'mt-1 h-10 rounded-lg text-[13px]',
                  pharmacy &&
                    'focus-visible:border-emerald-600 focus-visible:ring-emerald-600/30',
                )}
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            <Button
              type="submit"
              className={cn(
                'h-10 w-full rounded-lg text-[13px] font-bold',
                pharmacy
                  ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                  : 'bg-foreground text-background',
              )}
              disabled={saving}
            >
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Create & select
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
