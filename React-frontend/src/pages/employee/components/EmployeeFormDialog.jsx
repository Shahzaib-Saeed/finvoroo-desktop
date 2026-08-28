import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { KeyRound, Shield, UserPlus, UserRoundPen } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthStore } from '@/store/authStore';
import { employeesApi } from '../api/employees.api';
import { EMPLOYEE_ROLES, FAST_DIALOG_OVERLAY } from '../constants';

const emptyForm = {
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
  role: 'employee',
  is_active: '1',
  company_id: '',
};

export function EmployeeFormDialog({
  open,
  mode = 'create',
  employee = null,
  onOpenChange,
  onSuccess,
}) {
  const { id: workspaceId } = useParams();
  const activeCompany = useAuthStore((s) => s.activeCompany);
  const isEdit = mode === 'edit';

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [meta, setMeta] = useState(null);
  const [roleOptions, setRoleOptions] = useState(EMPLOYEE_ROLES);
  const [loadingMeta, setLoadingMeta] = useState(false);

  useEffect(() => {
    if (!open) return;

    setErrors({});
    setLoadingMeta(true);

    const loadRoles = employeesApi.meta().then((metaRes) => {
      const data = metaRes?.data?.data || {};
      setMeta(data);
      const fromMeta = (data.assignable_role_options || []).map((r) => ({
        value: r.slug,
        label: r.name,
        id: r.id,
      }));
      const opts = fromMeta.length ? fromMeta : EMPLOYEE_ROLES;
      setRoleOptions(opts);
      return { data, opts };
    });

    if (isEdit && employee) {
      loadRoles
        .then(() => {
          setForm({
            ...emptyForm,
            name: employee.name || '',
            email: employee.email || '',
            role: employee.role || 'employee',
            is_active: employee.is_active ? '1' : '0',
            password: '',
            password_confirmation: '',
            company_id: String(activeCompany?.id || workspaceId || ''),
          });
        })
        .catch((err) => toast.error(err?.response?.data?.message || 'Failed to load roles'))
        .finally(() => setLoadingMeta(false));
      return;
    }

    setForm(emptyForm);
    loadRoles
      .then(({ data, opts }) => {
        const companies = data.companies || [];
        const defaultCompany =
          companies.find((c) => String(c.id) === String(activeCompany?.id || workspaceId)) ||
          companies[0];
        setForm((f) => ({
          ...emptyForm,
          company_id: defaultCompany ? String(defaultCompany.id) : '',
          role: opts[0]?.value || 'employee',
        }));
      })
      .catch((err) => toast.error(err?.response?.data?.message || 'Failed to load form data'))
      .finally(() => setLoadingMeta(false));
  }, [open, isEdit, employee, activeCompany?.id, workspaceId]);

  const companyName =
    meta?.companies?.find((c) => String(c.id) === form.company_id)?.name ||
    activeCompany?.name ||
    '—';

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isEdit && form.password.length < 8) {
      setErrors((err) => ({
        ...err,
        password: 'Password must be at least 8 characters.',
      }));
      return;
    }
    if (isEdit && form.password && form.password.length < 8) {
      setErrors((err) => ({
        ...err,
        password: 'Password must be at least 8 characters.',
      }));
      return;
    }
    if (form.password && form.password !== form.password_confirmation) {
      setErrors((err) => ({
        ...err,
        password_confirmation: 'Passwords do not match.',
      }));
      return;
    }

    setSubmitting(true);
    setErrors({});
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        is_active: form.is_active === '1',
      };

      if (isEdit) {
        if (form.password) {
          payload.password = form.password;
          payload.password_confirmation = form.password_confirmation;
        }
        await employeesApi.update(employee.id, payload);
        toast.success('Employee updated.');
      } else {
        await employeesApi.create({
          ...payload,
          password: form.password,
          password_confirmation: form.password_confirmation,
          company_id: Number(form.company_id),
        });
        toast.success('Employee created.');
      }

      onOpenChange?.(false);
      onSuccess?.();
    } catch (err) {
      const status = err?.response?.status;
      const body = err?.response?.data;
      if (status === 422 && body?.errors) {
        const next = {};
        Object.entries(body.errors).forEach(([k, v]) => {
          next[k] = Array.isArray(v) ? v[0] : v;
        });
        setErrors(next);
        toast.error(body.message || 'Please fix the highlighted fields.');
      } else {
        toast.error(body?.message || `Failed to ${isEdit ? 'update' : 'create'} employee`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange?.(next)}>
      <DialogContent
        className="max-w-lg gap-0 p-0 overflow-hidden duration-100 data-[state=open]:duration-100 data-[state=closed]:duration-75"
        overlayClassName={FAST_DIALOG_OVERLAY}
      >
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[min(90vh,720px)]">
          <DialogHeader className="px-6 pt-6 pb-4 mb-0 border-b border-foreground/[0.08] bg-gradient-to-b from-muted/60 to-muted/30">
            <DialogTitle className="flex items-center gap-2.5 text-base">
              <span className="flex size-9 items-center justify-center rounded-lg border border-foreground/[0.08] bg-background text-foreground">
                {isEdit ? <UserRoundPen className="size-4" /> : <UserPlus className="size-4" />}
              </span>
              {isEdit ? 'Edit employee' : 'Create employee'}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? 'Update profile, role, or reset password for this teammate.'
                : 'Add a teammate and assign their workspace role.'}
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="px-6 py-5 space-y-4 overflow-y-auto">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="emp-name">Full name</Label>
                <Input
                  id="emp-name"
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  placeholder="Jane Doe"
                  disabled={loadingMeta || submitting}
                  aria-invalid={!!errors.name}
                  autoFocus
                  required
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emp-email">Email</Label>
                <Input
                  id="emp-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setField('email', e.target.value)}
                  placeholder="jane@company.com"
                  disabled={loadingMeta || submitting}
                  aria-invalid={!!errors.email}
                  required
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>
            </div>

            <div className="rounded-lg border bg-muted/15 p-3.5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <KeyRound className="size-3.5 text-muted-foreground" />
                {isEdit ? 'Password (optional)' : 'Login password'}
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="emp-password">{isEdit ? 'New password' : 'Password'}</Label>
                  <Input
                    id="emp-password"
                    type="password"
                    value={form.password}
                    onChange={(e) => setField('password', e.target.value)}
                    disabled={loadingMeta || submitting}
                    minLength={isEdit ? undefined : 8}
                    aria-invalid={!!errors.password}
                    required={!isEdit}
                    autoComplete="new-password"
                  />
                  {errors.password ? (
                    <p className="text-xs text-destructive">{errors.password}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {isEdit ? 'Leave blank to keep current.' : 'At least 8 characters.'}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="emp-password-confirm">Confirm</Label>
                  <Input
                    id="emp-password-confirm"
                    type="password"
                    value={form.password_confirmation}
                    onChange={(e) => setField('password_confirmation', e.target.value)}
                    disabled={loadingMeta || submitting}
                    required={!isEdit || !!form.password}
                    autoComplete="new-password"
                  />
                  {errors.password_confirmation && (
                    <p className="text-xs text-destructive">{errors.password_confirmation}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => setField('role', v)}
                  disabled={loadingMeta || submitting}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.role && <p className="text-xs text-destructive">{errors.role}</p>}
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Access comes from this role.{' '}
                  <Link
                    to={`/workspace/${workspaceId}/accounting/permissions?role=${encodeURIComponent(form.role || 'employee')}`}
                    className="inline-flex items-center gap-0.5 font-medium text-foreground underline-offset-2 hover:underline"
                    onClick={() => onOpenChange?.(false)}
                  >
                    <Shield className="size-3" />
                    Customize {roleOptions.find((r) => r.value === form.role)?.label || 'role'}{' '}
                    permissions
                  </Link>
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={form.is_active}
                  onValueChange={(v) => setField('is_active', v)}
                  disabled={loadingMeta || submitting}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Active</SelectItem>
                    <SelectItem value="0">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!isEdit && (
              <div className="space-y-1.5">
                <Label>Company</Label>
                <Input value={companyName} disabled className="bg-muted/40" />
                {errors.company_id && (
                  <p className="text-xs text-destructive">{errors.company_id}</p>
                )}
              </div>
            )}
          </DialogBody>

          <DialogFooter className="px-6 py-4 mt-0 border-t border-foreground/[0.08] bg-muted/20 gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange?.(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="mono" disabled={submitting || loadingMeta}>
              {submitting
                ? isEdit
                  ? 'Saving…'
                  : 'Creating…'
                : isEdit
                  ? 'Save changes'
                  : 'Create employee'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
