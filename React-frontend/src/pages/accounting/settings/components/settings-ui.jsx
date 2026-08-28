import { useMemo } from 'react';
import {
  Building2,
  Box,
  ShieldCheck,
  Zap,
  Palette,
  LayoutTemplate,
  ListTree,
  PanelBottom,
  Settings2,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { SETTINGS_TABS } from '../constants';

export const SETTINGS_INPUT_CLASS = 'h-9 text-sm';
export const SETTINGS_COMBO_CLASS = 'h-9 text-sm';

export const SETTINGS_ICONS = {
  building: Building2,
  footer: PanelBottom,
  box: Box,
  shield: ShieldCheck,
  zap: Zap,
  palette: Palette,
  layout: LayoutTemplate,
  fields: ListTree,
};

export const SETTINGS_SECTION_ICONS = {
  Company: Building2,
  Accounting: Zap,
  Appearance: Sparkles,
  System: Settings2,
};

export function getSettingsTabMeta(tabId) {
  return SETTINGS_TABS.find((t) => t.id === tabId) ?? SETTINGS_TABS[0];
}

export function SettingsIconBox({ icon = 'building', active = false, className, size = 'md' }) {
  const Icon = SETTINGS_ICONS[icon] || Building2;
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-md border transition-colors',
        size === 'sm' ? 'size-6' : 'size-8',
        active
          ? 'border-primary/25 bg-primary/10 text-primary'
          : 'border-border/60 bg-muted/30 text-muted-foreground',
        className,
      )}
    >
      <Icon className={size === 'sm' ? 'size-3' : 'size-3.5'} />
    </span>
  );
}

export function SettingsTabHeader({ tabId }) {
  const tab = getSettingsTabMeta(tabId);
  const Icon = SETTINGS_ICONS[tab.icon] || Building2;

  return (
    <div className="mb-4 flex items-start gap-2.5 pb-3 border-b border-border/60">
      <SettingsIconBox icon={tab.icon} active size="sm" />
      <div className="min-w-0 pt-0.5">
        <h2 className="text-base font-semibold tracking-tight text-foreground">{tab.title || tab.label}</h2>
        {tab.description ? (
          <p className="text-xs text-muted-foreground mt-0.5">{tab.description}</p>
        ) : null}
      </div>
      <Icon className="sr-only" aria-hidden />
    </div>
  );
}

/** Flat section — title + fields, no nested card box. */
export function SettingsFormSection({
  icon: Icon,
  title,
  description,
  children,
  className,
  contentClassName,
}) {
  return (
    <section className={cn('space-y-3 pb-5 border-b border-border/40 last:border-0 last:pb-0', className)}>
      {title || description ? (
        <div className="flex items-center gap-2">
          {Icon ? <Icon className="size-3.5 text-muted-foreground shrink-0" aria-hidden /> : null}
          <div className="min-w-0">
            {title ? <h3 className="text-sm font-medium text-foreground">{title}</h3> : null}
            {description ? (
              <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
            ) : null}
          </div>
        </div>
      ) : null}
      <div className={cn(contentClassName)}>{children}</div>
    </section>
  );
}

/** @deprecated Use SettingsFormSection */
export function SettingsSection({ title, children, className, contentClassName }) {
  return (
    <SettingsFormSection title={title} className={className} contentClassName={contentClassName}>
      {children}
    </SettingsFormSection>
  );
}

export function SettingsFieldGrid({ children, cols = 2, className }) {
  const colClass =
    cols === 1
      ? 'grid-cols-1'
      : cols === 4
        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
        : cols === 3
          ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          : 'grid-cols-1 sm:grid-cols-2';
  return <div className={cn('grid gap-x-4 gap-y-3', colClass, className)}>{children}</div>;
}

export function SettingsFormShell({ formId, onSubmit, children, footer, className, bodyClassName }) {
  return (
    <form id={formId} onSubmit={onSubmit} className={cn('min-w-0', className)}>
      <div className={cn('space-y-5', bodyClassName)}>{children}</div>
      {footer}
    </form>
  );
}

export function SettingsField({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
  className,
  fullWidth = false,
}) {
  return (
    <div className={cn(fullWidth && 'sm:col-span-2 lg:col-span-3 xl:col-span-4', className)}>
      {label ? (
        <Label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground mb-1 block">
          {label}
          {required ? <span className="text-destructive ml-0.5" aria-hidden>*</span> : null}
        </Label>
      ) : null}
      {children}
      {error ? (
        <p className="text-[11px] text-destructive mt-1" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>
      ) : null}
    </div>
  );
}

export function useSettingsFormDirty(baseline, current, extraDirty = false) {
  return useMemo(() => {
    if (extraDirty) return true;
    try {
      return JSON.stringify(baseline) !== JSON.stringify(current);
    } catch {
      return false;
    }
  }, [baseline, current, extraDirty]);
}

export function SettingsStatTile({ icon: Icon, label, value, tone = 'default' }) {
  return (
    <div className="rounded-md border border-border/80 bg-background px-3 py-2">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5">
        {Icon ? <Icon className="size-3 shrink-0" /> : null}
        <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div
        className={cn(
          'text-sm font-semibold tabular-nums truncate',
          tone === 'success' && 'text-emerald-600 dark:text-emerald-400',
        )}
      >
        {value}
      </div>
    </div>
  );
}
