import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { superadminApi } from '../../api/superadmin.api';
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
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

function FieldGroup({ label, error, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label ? <Label className="text-sm font-medium">{label}</Label> : null}
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function UserEditSheet({ userId, open, onOpenChange, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    is_active: '1',
    password: '',
    password_confirmation: '',
    plan_name: '',
    plan_code: '',
    plan_price: '',
    billing_cycle: 'monthly',
    company_limit: '1',
    company_user_limit: '5',
    branch_limit: '5',
  });
  const [role, setRole] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open || !userId) return;

    setLoading(true);
    setErrors({});
    superadminApi
      .showUser(userId)
      .then((res) => {
        const row = res.data?.data || {};
        const account = row.account || {};
        setRole(row.role || '');
        setForm({
          name: row.name || '',
          email: row.email || '',
          is_active: String(row.is_active ?? 1),
          password: '',
          password_confirmation: '',
          plan_name: account.plan_name || '',
          plan_code: account.plan_code || '',
          plan_price: account.plan_price != null ? String(account.plan_price) : '',
          billing_cycle: account.billing_cycle || 'monthly',
          company_limit: String(account.company_limit ?? 1),
          company_user_limit: String(account.company_user_limit ?? 5),
          branch_limit: String(account.branch_limit ?? 5),
        });
      })
      .catch((err) => {
        toast.error(err?.response?.data?.message || 'Failed to load user');
        onOpenChange(false);
      })
      .finally(() => setLoading(false));
  }, [open, userId, onOpenChange]);

  const set = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    const payload = {
      name: form.name,
      email: form.email,
      is_active: form.is_active,
    };

    if (form.password) {
      payload.password = form.password;
      payload.password_confirmation = form.password_confirmation;
    }

    if (role === 'company_owner') {
      Object.assign(payload, {
        plan_name: form.plan_name,
        plan_code: form.plan_code,
        plan_price: form.plan_price ? Number(form.plan_price) : 0,
        billing_cycle: form.billing_cycle,
        company_limit: Number(form.company_limit),
        company_user_limit: Number(form.company_user_limit),
        branch_limit: Number(form.branch_limit),
      });
    }

    try {
      await superadminApi.updateUser(userId, payload);
      toast.success('User updated');
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      const apiErrors = err?.response?.data?.errors || {};
      if (typeof apiErrors === 'object') {
        setErrors(apiErrors);
      }
      toast.error(err?.response?.data?.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit user</SheetTitle>
          <SheetDescription>Update account details and plan limits.</SheetDescription>
        </SheetHeader>

        <SheetBody>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <FieldGroup label="Name" error={errors.name?.[0]}>
                <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
              </FieldGroup>

              <FieldGroup label="Email" error={errors.email?.[0]}>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                />
              </FieldGroup>

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

              <FieldGroup label="New password (optional)" error={errors.password?.[0]}>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  autoComplete="new-password"
                />
              </FieldGroup>

              {form.password ? (
                <FieldGroup label="Confirm password" error={errors.password_confirmation?.[0]}>
                  <Input
                    type="password"
                    value={form.password_confirmation}
                    onChange={(e) => set('password_confirmation', e.target.value)}
                    autoComplete="new-password"
                  />
                </FieldGroup>
              ) : null}

              {role === 'company_owner' ? (
                <div className="space-y-4 rounded-lg border border-border p-4">
                  <p className="text-sm font-medium">Plan limits</p>
                  <FieldGroup label="Plan name">
                    <Input
                      value={form.plan_name}
                      onChange={(e) => set('plan_name', e.target.value)}
                    />
                  </FieldGroup>
                  <FieldGroup label="Plan code">
                    <Input
                      value={form.plan_code}
                      onChange={(e) => set('plan_code', e.target.value)}
                    />
                  </FieldGroup>
                  <div className="grid grid-cols-2 gap-3">
                    <FieldGroup label="Company limit">
                      <Input
                        type="number"
                        min={1}
                        value={form.company_limit}
                        onChange={(e) => set('company_limit', e.target.value)}
                      />
                    </FieldGroup>
                    <FieldGroup label="User limit">
                      <Input
                        type="number"
                        min={1}
                        value={form.company_user_limit}
                        onChange={(e) => set('company_user_limit', e.target.value)}
                      />
                    </FieldGroup>
                    <FieldGroup label="Branch limit">
                      <Input
                        type="number"
                        min={1}
                        value={form.branch_limit}
                        onChange={(e) => set('branch_limit', e.target.value)}
                      />
                    </FieldGroup>
                    <FieldGroup label="Billing cycle">
                      <Select
                        value={form.billing_cycle}
                        onValueChange={(v) => set('billing_cycle', v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </FieldGroup>
                  </div>
                </div>
              ) : null}

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
