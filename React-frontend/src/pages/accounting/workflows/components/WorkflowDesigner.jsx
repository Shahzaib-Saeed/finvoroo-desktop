import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Loader2, Save } from 'lucide-react';
import { FlowCanvas } from './FlowCanvas';
import { HelpTip } from './HelpTip';
import { LivePreview } from './LivePreview';
import { RuleBuilder } from './RuleBuilder';
import { WorkflowSummary } from './WorkflowSummary';
import { MODULES, WIZARD_STEPS } from '../constants';
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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export function WorkflowDesigner({
  form,
  onChange,
  saving,
  isNew,
  onSave,
  onCancel,
  dirty,
}) {
  const [wizardStep, setWizardStep] = useState(0);
  const step = WIZARD_STEPS[wizardStep];

  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const canNext = useMemo(() => {
    if (wizardStep === 0) return Boolean(form.name?.trim() && form.module);
    if (wizardStep === 2) return (form.steps || []).length > 0;
    return true;
  }, [form, wizardStep]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={() => {
              if (dirty && !window.confirm('You have unsaved changes. Leave without saving?')) return;
              onCancel();
            }}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-1"
          >
            <ArrowLeft className="size-3.5" />
            Back to workflows
          </button>
          <h2 className="text-xl font-semibold tracking-tight">
            {isNew ? 'Create approval workflow' : 'Edit approval workflow'}
          </h2>
          <p className="text-sm text-muted-foreground">
            Guided setup — you can jump between steps anytime.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 mr-2">
            <Switch
              id="wf-active"
              checked={!!form.is_active}
              onCheckedChange={(v) => onChange({ ...form, is_active: v })}
            />
            <Label htmlFor="wf-active" className="text-sm">
              {form.is_active ? 'Active' : 'Inactive'}
            </Label>
          </div>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" variant="mono" disabled={saving || !form.name?.trim()} onClick={onSave}>
            {saving ? <Loader2 className="size-4 animate-spin mr-1" /> : <Save className="size-4 mr-1" />}
            {form.is_active ? 'Save & activate' : 'Save draft'}
          </Button>
        </div>
      </div>

      <ol className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {WIZARD_STEPS.map((s, i) => {
          const active = i === wizardStep;
          const done = i < wizardStep;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setWizardStep(i)}
              className={cn(
                'rounded-xl border px-3 py-2.5 text-left transition-colors',
                active && 'border-foreground bg-muted/40',
                !active && 'hover:bg-muted/20',
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'flex size-6 items-center justify-center rounded-full text-[11px] font-semibold',
                    done || active
                      ? 'bg-zinc-950 text-white dark:bg-zinc-200 dark:text-zinc-950'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {done ? <Check className="size-3.5" /> : i + 1}
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{s.title}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{s.subtitle}</div>
                </div>
              </div>
            </button>
          );
        })}
      </ol>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-8 rounded-2xl border bg-background p-4 sm:p-6 min-h-[420px]">
          <div className="mb-5">
            <h3 className="text-lg font-semibold">{step.title}</h3>
            <p className="text-sm text-muted-foreground">{step.subtitle}</p>
          </div>

          {wizardStep === 0 && (
            <div className="space-y-4 max-w-2xl">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Label>Workflow name</Label>
                  <HelpTip>A clear name your team will recognize, e.g. “High-value invoice approval”.</HelpTip>
                </div>
                <Input
                  value={form.name}
                  onChange={(e) => onChange({ ...form, name: e.target.value })}
                  placeholder="e.g. High-value invoice approval"
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Label>Document type</Label>
                  <HelpTip>Which documents this workflow applies to.</HelpTip>
                </div>
                <Select value={form.module} onValueChange={(v) => onChange({ ...form, module: v })}>
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODULES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => onChange({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="Optional — explain when the team should use this workflow"
                />
              </div>
              <div className="space-y-1.5 max-w-xs">
                <div className="flex items-center gap-1.5">
                  <Label>Workflow priority</Label>
                  <HelpTip>
                    Lower numbers win when multiple workflows could match. Use 10 for high-value rules and 100 for defaults.
                  </HelpTip>
                </div>
                <Input
                  type="number"
                  min="1"
                  value={form.priority}
                  onChange={(e) => onChange({ ...form, priority: e.target.value })}
                />
              </div>
            </div>
          )}

          {wizardStep === 1 && (
            <RuleBuilder
              rules={form.rules}
              onChange={(rules) => onChange({ ...form, rules })}
            />
          )}

          {wizardStep === 2 && <FlowCanvas form={form} onChange={onChange} />}

          {wizardStep === 3 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <WorkflowSummary form={form} />
              <div className="rounded-2xl border bg-muted/20 p-4 space-y-3">
                <h4 className="font-semibold text-sm">Ready to publish?</h4>
                <p className="text-sm text-muted-foreground">
                  Active workflows start matching new documents immediately. You can archive anytime.
                </p>
                <div className="flex items-center gap-2">
                  <Switch
                    id="review-active"
                    checked={!!form.is_active}
                    onCheckedChange={(v) => onChange({ ...form, is_active: v })}
                  />
                  <Label htmlFor="review-active">
                    {form.is_active ? 'Activate on save' : 'Save as inactive draft'}
                  </Label>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between border-t pt-4 sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <Button
              type="button"
              variant="outline"
              disabled={wizardStep === 0}
              onClick={() => setWizardStep((s) => Math.max(0, s - 1))}
            >
              <ArrowLeft className="size-4 mr-1" />
              Back
            </Button>
            {wizardStep < WIZARD_STEPS.length - 1 ? (
              <Button
                type="button"
                variant="mono"
                disabled={!canNext}
                onClick={() => setWizardStep((s) => Math.min(WIZARD_STEPS.length - 1, s + 1))}
              >
                Continue
                <ArrowRight className="size-4 ml-1" />
              </Button>
            ) : (
              <Button type="button" variant="mono" disabled={saving || !form.name?.trim()} onClick={onSave}>
                {saving ? <Loader2 className="size-4 animate-spin mr-1" /> : <Check className="size-4 mr-1" />}
                {form.is_active ? 'Activate workflow' : 'Save workflow'}
              </Button>
            )}
          </div>
        </div>

        <div className="xl:col-span-4 space-y-4 xl:sticky xl:top-4 self-start">
          <LivePreview form={form} />
          {wizardStep !== 3 && <WorkflowSummary form={form} />}
        </div>
      </div>
    </div>
  );
}
