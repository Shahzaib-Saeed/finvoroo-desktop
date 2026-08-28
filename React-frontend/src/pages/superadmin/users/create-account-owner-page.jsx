import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { superadminApi } from '../api/superadmin.api';
import { PageHeader } from '@/components/ui/PageHeader';
import { setPageTitle } from '@/lib/page-title';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

function FieldGroup({ label, error, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label ? <Label>{label}</Label> : null}
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function SuperAdminCreateAccountOwnerPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [showManualLimits, setShowManualLimits] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    company_limit: '1',
    company_user_limit: '5',
    branch_limit: '5',
    plan_name: '',
    plan_code: '',
    plan_price: '',
    billing_cycle: 'monthly',
  });

  useEffect(() => {
    setPageTitle('Create account owner');
    superadminApi
      .plans()
      .then((res) => {
        const list = Array.isArray(res.data?.data) ? res.data.data : [];
        setPlans(list);
        if (list.length > 0) {
          setSelectedPlanId(list[0].id);
        }
      })
      .catch((err) => {
        toast.error(err?.response?.data?.message || 'Failed to load plans');
      })
      .finally(() => setLoadingPlans(false));
  }, []);

  const set = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    const payload = {
      name: form.name,
      email: form.email,
      password: form.password,
      password_confirmation: form.password_confirmation,
    };

    if (selectedPlanId) {
      payload.plan_id = selectedPlanId;
    } else {
      Object.assign(payload, {
        plan_name: form.plan_name || 'Standard',
        plan_code: form.plan_code || 'STANDARD',
        plan_price: form.plan_price ? Number(form.plan_price) : 0,
        billing_cycle: form.billing_cycle,
        company_limit: Number(form.company_limit),
        company_user_limit: Number(form.company_user_limit),
        branch_limit: Number(form.branch_limit),
      });
    }

    try {
      await superadminApi.createAccountOwner(payload);
      toast.success('Account owner created');
      navigate('/superadmin/users');
    } catch (err) {
      const apiErrors = err?.response?.data?.errors || {};
      if (typeof apiErrors === 'object') {
        setErrors(apiErrors);
      }
      toast.error(err?.response?.data?.message || 'Failed to create account owner');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Create account owner"
        subtitle="Create an approved account owner with a paid plan. Free trials are only for public signup."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/superadmin/users">Back to users</Link>
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <FieldGroup label="Full name" error={errors.name?.[0]}>
              <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
            </FieldGroup>
            <FieldGroup label="Email" error={errors.email?.[0]}>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
              />
            </FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldGroup label="Password" error={errors.password?.[0]}>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  autoComplete="new-password"
                />
              </FieldGroup>
              <FieldGroup label="Confirm password" error={errors.password_confirmation?.[0]}>
                <Input
                  type="password"
                  value={form.password_confirmation}
                  onChange={(e) => set('password_confirmation', e.target.value)}
                  autoComplete="new-password"
                />
              </FieldGroup>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <Label>Select plan</Label>
          {loadingPlans ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => {
                    setSelectedPlanId(plan.id);
                    setShowManualLimits(false);
                  }}
                  className={cn(
                    'rounded-lg border p-4 text-start transition-colors',
                    selectedPlanId === plan.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/40',
                  )}
                >
                  <p className="font-semibold">{plan.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">{plan.description || plan.code}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {plan.company_limit} companies · {plan.company_user_limit} users ·{' '}
                    {plan.branch_limit} branches
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Manual plan limits (optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select a plan above, or define custom limits manually.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setShowManualLimits((v) => !v);
                if (!showManualLimits) {
                  setSelectedPlanId(null);
                }
              }}
            >
              {showManualLimits ? 'Hide manual limits' : 'Use manual limits'}
            </Button>
            {showManualLimits || !selectedPlanId ? (
              <div className="grid gap-4 sm:grid-cols-2">
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
              </div>
            ) : selectedPlan ? (
              <p className="text-sm text-muted-foreground">
                Using plan: <strong>{selectedPlan.name}</strong>
              </p>
            ) : null}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" asChild>
            <Link to="/superadmin/users">Cancel</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : 'Create account owner'}
          </Button>
        </div>
      </form>
    </div>
  );
}
