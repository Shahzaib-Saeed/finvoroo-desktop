import { Fragment } from 'react';
import { cn } from '@/lib/utils';
import { SETTINGS_TABS } from '../constants';
import { SettingsIconBox } from './settings-ui';

export function SettingsSideNav({ activeTab, onChange, className, tabs = SETTINGS_TABS }) {
  let lastSection = null;

  return (
    <nav
      className={cn(
        'rounded-2xl border bg-card p-2 shadow-sm',
        'flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible',
        className,
      )}
    >
      <div className="hidden lg:block px-3 pt-2 pb-3 border-b border-border/60 mb-1">
        <p className="text-xs font-semibold text-foreground">Settings</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">Choose a section to configure</p>
      </div>

      {tabs.map((tab) => {
        const showSection = tab.section && tab.section !== lastSection;
        if (tab.section) lastSection = tab.section;
        const isActive = activeTab === tab.id;

        return (
          <Fragment key={tab.id}>
            {showSection && (
              <span className="hidden lg:block px-3 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
                {tab.section}
              </span>
            )}
            <button
              type="button"
              onClick={() => onChange(tab.id)}
              className={cn(
                'group flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm font-medium whitespace-nowrap transition-all lg:w-full text-left',
                'border border-transparent',
                isActive
                  ? 'bg-primary/[0.06] border-primary/15 text-primary shadow-sm'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
              )}
            >
              <SettingsIconBox
                icon={tab.icon}
                active={isActive}
                className={cn('size-8', !isActive && 'group-hover:bg-muted')}
              />
              <span className="flex flex-col min-w-0">
                <span className="truncate leading-tight">{tab.label}</span>
                {isActive && tab.description ? (
                  <span className="hidden xl:block text-[10px] font-normal text-muted-foreground line-clamp-1 mt-0.5">
                    {tab.description}
                  </span>
                ) : null}
              </span>
              {isActive ? (
                <span className="hidden lg:block ms-auto size-1.5 rounded-full bg-primary shrink-0" />
              ) : null}
            </button>
          </Fragment>
        );
      })}
    </nav>
  );
}
