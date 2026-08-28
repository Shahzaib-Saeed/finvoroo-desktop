import {
  Bug,
  Download,
  Megaphone,
  Newspaper,
  Shield,
  Sparkles,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { QUICK_ACTIONS } from '../constants/help-content';
import { KnowledgeSectionHeader, knowledgeCardClass } from './knowledge-ui';

const ACTION_ICONS = {
  bug: Bug,
  feature: Sparkles,
  admin: Shield,
  guide: Download,
  releases: Newspaper,
  status: Activity,
};

export function KnowledgeQuickActions({ onAction }) {
  return (
    <section id="help-support" className={knowledgeCardClass}>
      <div className="p-4 sm:p-5">
        <KnowledgeSectionHeader title="Quick actions" description="Support, feedback, and resources" />
        <div className="grid grid-cols-1 gap-1">
          {QUICK_ACTIONS.map((action) => {
            const Icon = ACTION_ICONS[action.id] || Megaphone;
            return (
              <button
                key={action.id}
                type="button"
                onClick={() => onAction?.(action)}
                className={cn(
                  'flex items-start gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-muted/30',
                )}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/40 text-muted-foreground">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="text-sm font-medium text-foreground block">{action.label}</span>
                  <span className="text-xs text-muted-foreground leading-relaxed">{action.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
