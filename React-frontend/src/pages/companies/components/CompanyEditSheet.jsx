import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { companiesApi } from '../api/companies.api';
import {
  COMPANY_TYPES,
  CURRENCIES,
  DEFAULT_COMPANY_TYPE,
  DEFAULT_INDUSTRY_KEY,
  INDUSTRY_OPTIONS,
} from '../constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

function FieldGroup({ label, error, children, required }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <Label className="text-sm font-medium">
          {label}
          {required ? <span className="text-destructive ml-0.5">*</span> : null}
        </Label>
      ) : null}
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

const EMPTY = {
  name: '',
  type: DEFAULT_COMPANY_TYPE,
  currency: 'USD',
  tax_id: '',
  registration_number: '',
  industry: '',
  industry_key: DEFAULT_INDUSTRY_KEY,
  email: '',
  phone: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  postal_code: '',
  country: '',
  notes: '',
  is_active: '1',
};

export function CompanyEditSheet({ companyId, open, onOpenChange, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open || !companyId) return;

    setLoading(true);
    setErrors({});
    companiesApi
      .show(companyId)
      .then((res) => {
        const row = res.data?.data || {};
        setForm({
          name: row.name || '',
          type: row.type || DEFAULT_COMPANY_TYPE,
          currency: row.currency || 'USD',
          tax_id: row.tax_id || '',
          registration_number: row.registration_number || '',
          industry: row.industry || '',
          industry_key: row.industry_key || DEFAULT_INDUSTRY_KEY,
          email: row.email || '',
          phone: row.phone || '',
          address_line1: row.address_line1 || '',
          address_line2: row.address_line2 || '',
          city: row.city || '',
          state: row.state || '',
          postal_code: row.postal_code || '',
          country: row.country || '',
          notes: row.notes || '',
          is_active: row.is_active === false || row.is_active === 0 ? '0' : '1',
        });
      })
      .catch((err) => {
        toast.error(err?.response?.data?.message || 'Failed to load company');
        onOpenChange(false);
      })
      .finally(() => setLoading(false));
  }, [open, companyId, onOpenChange]);

  const set = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    const payload = { ...form, is_active: form.is_active === '1' };
    Object.keys(payload).forEach((k) => {
      if (payload[k] === '') payload[k] = null;
    });

    try {
      await companiesApi.update(companyId, payload);
      toast.success('Company updated');
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      const apiErrors = err?.response?.data?.errors || {};
      if (typeof apiErrors === 'object') {
        const flat = {};
        Object.entries(apiErrors).forEach(([k, v]) => {
          flat[k] = Array.isArray(v) ? v[0] : v;
        });
        setErrors(flat);
      }
      toast.error(err?.response?.data?.message || 'Failed to update company');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit company</SheetTitle>
          <SheetDescription>Update legal details, contact information, and status.</SheetDescription>
        </SheetHeader>

        <SheetBody>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <FieldGroup label="Company name" required error={errors.name}>
                <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
              </FieldGroup>

              <div className="grid grid-cols-2 gap-3">
                <FieldGroup label="Type" error={errors.type}>
                  <Select value={form.type} onValueChange={(v) => set('type', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPANY_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldGroup>

                <FieldGroup label="Currency" error={errors.currency}>
                  <Select value={form.currency} onValueChange={(v) => set('currency', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldGroup>
              </div>

              <FieldGroup label="Status">
                <Select value={form.is_active} onValueChange={(v) => set('is_active', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Active</SelectItem>
                    <SelectItem value="0">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </FieldGroup>

              <div className="grid grid-cols-2 gap-3">
                <FieldGroup label="Email" error={errors.email}>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                  />
                </FieldGroup>
                <FieldGroup label="Phone" error={errors.phone}>
                  <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} />
                </FieldGroup>
              </div>

              <FieldGroup
                label="Industry"
                error={errors.industry_key}
              >
                <Select
                  value={form.industry_key || DEFAULT_INDUSTRY_KEY}
                  onValueChange={(v) => {
                    const label = INDUSTRY_OPTIONS.find((o) => o.key === v)?.label || v;
                    set('industry_key', v);
                    set('industry', label);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.key} value={opt.key}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldGroup>

              <div className="grid grid-cols-2 gap-3">
                <FieldGroup label="Tax ID" error={errors.tax_id}>
                  <Input value={form.tax_id} onChange={(e) => set('tax_id', e.target.value)} />
                </FieldGroup>
                <FieldGroup label="Registration #" error={errors.registration_number}>
                  <Input
                    value={form.registration_number}
                    onChange={(e) => set('registration_number', e.target.value)}
                  />
                </FieldGroup>
              </div>

              <FieldGroup label="Address line 1" error={errors.address_line1}>
                <Input
                  value={form.address_line1}
                  onChange={(e) => set('address_line1', e.target.value)}
                />
              </FieldGroup>

              <FieldGroup label="Address line 2" error={errors.address_line2}>
                <Input
                  value={form.address_line2}
                  onChange={(e) => set('address_line2', e.target.value)}
                />
              </FieldGroup>

              <div className="grid grid-cols-2 gap-3">
                <FieldGroup label="City">
                  <Input value={form.city} onChange={(e) => set('city', e.target.value)} />
                </FieldGroup>
                <FieldGroup label="State">
                  <Input value={form.state} onChange={(e) => set('state', e.target.value)} />
                </FieldGroup>
                <FieldGroup label="Postal code">
                  <Input
                    value={form.postal_code}
                    onChange={(e) => set('postal_code', e.target.value)}
                  />
                </FieldGroup>
                <FieldGroup label="Country">
                  <Input value={form.country} onChange={(e) => set('country', e.target.value)} />
                </FieldGroup>
              </div>

              <FieldGroup label="Notes" error={errors.notes}>
                <Textarea
                  rows={4}
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  className="resize-none"
                />
              </FieldGroup>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="size-4 animate-spin" /> : 'Save changes'}
                </Button>
              </div>
            </form>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
