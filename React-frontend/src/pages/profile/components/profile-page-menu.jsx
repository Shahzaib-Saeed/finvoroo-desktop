import { cn } from '@/lib/utils';
import { Menubar, MenubarMenu, MenubarTrigger } from '@/components/ui/menubar';

const PROFILE_SECTIONS = [
  { id: 'overview', title: 'Overview' },
  { id: 'account', title: 'Account' },
  { id: 'security', title: 'Security' },
];

export function ProfilePageMenu({ activeSection, onSectionChange }) {
  return (
    <div className="grid">
      <div className="kt-scrollable-x-auto">
        <Menubar className="flex items-stretch gap-3 border-none bg-transparent p-0 h-auto">
          {PROFILE_SECTIONS.map((item) => (
            <MenubarMenu key={item.id}>
              <MenubarTrigger
                type="button"
                onClick={() => onSectionChange(item.id)}
                className={cn(
                  'flex items-center px-3 py-3.5 text-sm text-secondary-foreground',
                  'rounded-none border-b-2 border-transparent bg-transparent!',
                  'hover:text-primary hover:bg-transparent',
                  'focus:text-primary focus:bg-transparent',
                  activeSection === item.id && 'text-primary border-primary',
                )}
              >
                {item.title}
              </MenubarTrigger>
            </MenubarMenu>
          ))}
        </Menubar>
      </div>
    </div>
  );
}

export function profileSectionVisible(activeSection, section) {
  return activeSection === 'overview' || activeSection === section;
}
