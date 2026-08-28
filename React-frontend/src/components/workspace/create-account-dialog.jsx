import { useEffect, useState, useCallback, useRef } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const EMPTY_FORM = {
  account_number: '',
  name: '',
  coa2_subtype_id: '',
  description: '',
  opening_balance: '',
  opening_balance_type: 'debit',
  is_active: true,
  is_postable: true,
};

/**
 * CreateAccountDialog — global reusable component.
 *
 * Props:
 *   trigger    – custom trigger element. Defaults to a "+ New Account" button.
 *   open       – controlled open state (optional).
 *   onOpenChange – controlled open change handler (optional).
 *   onCreated  – callback fired after a successful create (receives the new account data).
 */

export function CreateAccountDialog({ trigger, open: openProp, onOpenChange, onCreated }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;
  const setOpen = (val) => {
    if (!isControlled) setInternalOpen(val);
    onOpenChange?.(val);
  };

  const [saving, setSaving] = useState(false);
  const [subtypeOptions, setSubtypeOptions] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const [suggestions, setSuggestions] = useState([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const suggestTimerRef = useRef(null);
  const suggestAbortRef = useRef(null);
  const inputRef = useRef(null);

  const loadSubtypes = useCallback(async () => {
    try {
      const res = await api.get('/workspace/coa-subtypes');
      setSubtypeOptions(res.data.data?.options || []);
    } catch {}
  }, []);

  useEffect(() => {
    if (open) {
      loadSubtypes();
    } else {
      setSuggestions([]);
      setSuggestOpen(false);
      clearTimeout(suggestTimerRef.current);
      suggestAbortRef.current?.abort();
    }
  }, [open, loadSubtypes]);

  const set = (field, val) => {
    setForm((f) => ({ ...f, [field]: val }));
    setErrors((e) => { const n = { ...e }; delete n[field]; return n; });
  };

  const searchAccounts = useCallback(async (q) => {
    suggestAbortRef.current?.abort();
    const controller = new AbortController();
    suggestAbortRef.current = controller;
    setSuggestLoading(true);
    setSuggestOpen(true);
    try {
      const res = await api.get('/workspace/chart-of-accounts', {
        params: { search: q, per_page: 14 },
        signal: controller.signal,
      });
      const items = Array.isArray(res.data.data) ? res.data.data : [];
      setSuggestions(items);
      setSuggestOpen(items.length > 0);
    } catch (err) {
      if (err?.code !== 'ERR_CANCELED') setSuggestions([]);
    } finally {
      setSuggestLoading(false);
    }
  }, []);

  const handleAccountNumberChange = (e) => {
    const val = e.target.value;
    set('account_number', val);
    clearTimeout(suggestTimerRef.current);
    if (!val.trim()) { setSuggestOpen(false); setSuggestions([]); return; }
    setSuggestLoading(true);
    setSuggestOpen(true);
    suggestTimerRef.current = setTimeout(() => searchAccounts(val.trim()), 300);
  };

  const pickSuggestion = (acc) => {
    setForm((f) => ({
      ...f,
      account_number: acc.account_number || '',
      name: acc.name || '',
      coa2_subtype_id: acc.coa2_subtype_id ? String(acc.coa2_subtype_id) : f.coa2_subtype_id,
    }));
    setErrors({});
    setSuggestOpen(false);
    setSuggestions([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const payload = {
        account_number: form.account_number,
        name: form.name,
        coa2_subtype_id: parseInt(form.coa2_subtype_id),
        description: form.description || undefined,
        is_active: form.is_active,
        is_postable: form.is_postable,
      };
      if (form.opening_balance) {
        payload.opening_balance = parseFloat(form.opening_balance);
        payload.opening_balance_type = form.opening_balance_type;
      }
      const res = await api.post('/workspace/chart-of-accounts', payload);
      toast.success('Account created successfully.');
      setOpen(false);
      setForm(EMPTY_FORM);
      onCreated?.(res.data.data);
    } catch (err) {
      const errs = err?.response?.data?.errors || {};
      setErrors(errs);
      toast.error(err?.response?.data?.message || 'Failed to create account.');
    } finally {
      setSaving(false);
    }
  };

  const defaultTrigger = (
    <Button size="sm" className="gap-1.5">
      <Plus className="size-4" />
      New Account
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled ? (
        <DialogTrigger asChild>{trigger ?? defaultTrigger}</DialogTrigger>
      ) : null}
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Account</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <form id="create-account-dialog-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Account ID <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Input
                    ref={inputRef}
                    value={form.account_number}
                    onChange={handleAccountNumberChange}
                    onFocus={() => { if (form.account_number.trim()) searchAccounts(form.account_number.trim()); }}
                    onBlur={() => setTimeout(() => setSuggestOpen(false), 200)}
                    placeholder="e.g. 1000"
                    autoComplete="off"
                    className="text-left"
                  />
                  {suggestOpen && (
                    <div className="absolute left-0 top-full z-50 mt-1 w-72 max-h-64 overflow-y-auto rounded-md border border-border bg-popover shadow-md shadow-black/5">
                      {suggestLoading ? (
                        <div className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground">
                          <Loader2 className="size-3 animate-spin" /> Loading accounts…
                        </div>
                      ) : suggestions.length === 0 ? (
                        <div className="px-3 py-3 text-xs text-muted-foreground">No matching accounts</div>
                      ) : (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-b border-border">
                            Matching accounts
                          </div>
                          {suggestions.map((acc) => (
                            <button
                              key={acc.id}
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); pickSuggestion(acc); }}
                              className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-accent transition-colors"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-mono text-xs font-semibold text-foreground shrink-0">
                                  {acc.account_number}
                                </span>
                                <span className="text-sm text-foreground truncate">{acc.name}</span>
                              </div>
                              {acc.account_subtype && (
                                <span className="text-xs text-muted-foreground shrink-0">{acc.account_subtype}</span>
                              )}
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
                {errors.account_number && (
                  <p className="text-xs text-destructive">{errors.account_number[0]}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Account Name <span className="text-destructive">*</span></Label>
                <Input
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="e.g. Cash"
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name[0]}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Account Type <span className="text-destructive">*</span></Label>
              <Select modal={false} value={form.coa2_subtype_id} onValueChange={(v) => set('coa2_subtype_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type…" />
                </SelectTrigger>
                <SelectContent>
                  {subtypeOptions.map((opt) =>
                    opt.type === 'group' ? (
                      <div
                        key={`grp-${opt.label}`}
                        className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                      >
                        {opt.label}
                      </div>
                    ) : (
                      <SelectItem key={opt.id} value={String(opt.id)}>
                        {opt.label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
              {errors.coa2_subtype_id && (
                <p className="text-xs text-destructive">{errors.coa2_subtype_id[0]}</p>
              )}
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-xs text-muted-foreground">Account is available for use</p>
              </div>
              <Switch checked={form.is_active} onCheckedChange={(v) => set('is_active', v)} />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Allow Posting</p>
                <p className="text-xs text-muted-foreground">Allow journal entries to post to this account</p>
              </div>
              <Switch checked={form.is_postable} onCheckedChange={(v) => set('is_postable', v)} />
            </div>
          </form>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="create-account-dialog-form" disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="size-4 animate-spin" />}
            Create Account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
