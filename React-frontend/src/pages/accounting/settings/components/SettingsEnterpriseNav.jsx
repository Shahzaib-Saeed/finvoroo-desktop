import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { SETTINGS_TABS } from '../constants';
import { SETTINGS_ICONS } from './settings-ui';

function buildNavItems(tabs) {
  const items = [];
  let lastSection = null;

  tabs.forEach((tab) => {
    if (tab.section && tab.section !== lastSection) {
      items.push({ type: 'section', title: tab.section });
      lastSection = tab.section;
    }
    items.push({ type: 'tab', id: tab.id, title: tab.label, icon: tab.icon });
  });

  return items;
}

export function SettingsEnterpriseNav({
  activeTab,
  onChange,
  className,
  embedded = false,
  tabs = SETTINGS_TABS,
}) {
  const navItems = useMemo(() => buildNavItems(tabs), [tabs]);

  return (
    <nav
      aria-label="Settings"
      className={cn('flex flex-col', className)}
    >
      {navItems.map((item) => {
        if (item.type === 'section') {
          return (
            <p
              key={`section-${item.title}`}
              className="px-2.5 pt-5 pb-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground first:pt-0"
            >
              {item.title}
            </p>
          );
        }

        const isActive = activeTab === item.id;
        const Icon = SETTINGS_ICONS[item.icon] || SETTINGS_ICONS.building;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-md px-2.5 py-[7px] text-left text-[13px] transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
              isActive
                ? 'bg-muted text-foreground font-medium'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
            )}
          >
            <Icon className="size-3.5 shrink-0 opacity-70" aria-hidden />
            <span className="truncate">{item.title}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function SettingsEnterpriseNavMobile({
  activeTab,
  onChange,
  className,
  tabs = SETTINGS_TABS,
}) {
  return (
    <div className={cn(className)}>
      <label className="sr-only" htmlFor="settings-section-select">
        Settings section
      </label>
      <select
        id="settings-section-select"
        value={activeTab}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground shadow-none outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        {tabs.map((tab) => (
          <option key={tab.id} value={tab.id}>
            {tab.section ? `${tab.section} — ${tab.label}` : tab.label}
          </option>
        ))}
      </select>
    </div>
  );
}
