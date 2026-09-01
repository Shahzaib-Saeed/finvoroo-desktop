import {
  Building2,
  Box,
  ShieldCheck,
  Zap,
  Palette,
  LayoutTemplate,
  ListTree,
  PanelBottom,
  ShoppingCart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SETTINGS_TABS } from '../constants';

const ICONS = {
  building: Building2,
  footer: PanelBottom,
  box: Box,
  shield: ShieldCheck,
  zap: Zap,
  palette: Palette,
  layout: LayoutTemplate,
  fields: ListTree,
  cart: ShoppingCart,
};

/**
 * Profile-default style tab menu (underline active state, like demo PageMenu / NavbarMenu).
 */
export function SettingsPageMenu({ activeTab, onChange, tabs = SETTINGS_TABS }) {
  return (
    <div className="overflow-x-auto kt-scrollable-x-auto -mb-px">
      <div className="flex items-stretch gap-1 min-w-max">
        {tabs.map((tab) => {
          const Icon = ICONS[tab.icon] || Building2;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={cn(
                'inline-flex items-center gap-2 px-3 py-3.5 text-sm font-medium whitespace-nowrap',
                'rounded-none border-b-2 bg-transparent transition-colors',
                'hover:text-primary focus:text-primary focus:outline-none',
                isActive
                  ? 'text-primary border-primary'
                  : 'text-secondary-foreground border-transparent hover:border-primary/30'
              )}
            >
              <Icon className="size-4 shrink-0" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
