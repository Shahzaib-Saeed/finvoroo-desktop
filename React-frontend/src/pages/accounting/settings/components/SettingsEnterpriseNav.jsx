import { cn } from '@/lib/utils';
import { SETTINGS_TABS } from '../constants';
import { SETTINGS_ICONS, SETTINGS_SECTION_ICONS } from './settings-ui';

function buildNavItems() {
  const items = [];
  let lastSection = null;

  SETTINGS_TABS.forEach((tab) => {
    if (tab.section && tab.section !== lastSection) {
      items.push({ type: 'section', title: tab.section });
      lastSection = tab.section;
    }
    items.push({ type: 'tab', id: tab.id, title: tab.label, icon: tab.icon });
  });

  return items;
}

const NAV_ITEMS = buildNavItems();

export function SettingsEnterpriseNav({ activeTab, onChange, className, embedded = false }) {
  return (
    <nav
      aria-label="Settings sections"
      className={cn(
        embedded
          ? 'flex flex-col gap-0.5 py-1 max-h-[calc(100dvh-10rem)] overflow-y-auto'
          : 'sticky top-4 flex flex-col gap-0.5 rounded-xl border border-border/80 bg-card p-2 shadow-sm max-h-[calc(100dvh-6rem)] overflow-y-auto',
        className,
      )}
    >
      {embedded ? (
        <div className="px-2.5 pb-2 pt-1">
          <p className="text-[11px] font-medium text-muted-foreground">Configure workspace</p>
        </div>
      ) : null}
      {NAV_ITEMS.map((item) => {
        if (item.type === 'section') {
          const SectionIcon = SETTINGS_SECTION_ICONS[item.title];
          return (
            <div
              key={`section-${item.title}`}
              className={cn(
                'flex items-center gap-2 px-2.5 pt-3 pb-1',
                embedded ? 'first:pt-0' : 'first:pt-1.5',
              )}
            >
              {SectionIcon ? (
                <SectionIcon className="size-3.5 text-muted-foreground/70 shrink-0" aria-hidden />
              ) : null}
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {item.title}
              </span>
            </div>
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
              'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              isActive
                ? embedded
                  ? 'bg-background text-primary font-medium shadow-sm border border-border/60'
                  : 'bg-primary/10 text-primary font-medium shadow-sm'
                : 'text-muted-foreground hover:bg-background/70 hover:text-foreground',
            )}
          >
            <span
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-md transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted/50 text-muted-foreground',
              )}
            >
              <Icon className="size-3.5" aria-hidden />
            </span>
            <span className="truncate">{item.title}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function SettingsEnterpriseNavMobile({ activeTab, onChange, className }) {
  return (
    <div
      className={cn('flex gap-1.5 overflow-x-auto scrollbar-none -mx-0.5 px-0.5', className)}
      role="tablist"
      aria-label="Settings sections"
    >
      {SETTINGS_TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = SETTINGS_ICONS[tab.icon] || SETTINGS_ICONS.building;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isActive
                ? 'bg-background text-primary shadow-sm border border-border/70'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/60',
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
