import { Keyboard } from 'lucide-react';
import { KNOWLEDGE_SHORTCUTS } from '../constants/help-content';
import { KnowledgeKbd, KnowledgeSectionHeader, knowledgeCardClass } from './knowledge-ui';

function isMac() {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform);
}

export function KnowledgeShortcuts() {
  const mac = isMac();

  return (
    <section id="help-shortcuts" className={knowledgeCardClass}>
      <div className="p-4 sm:p-5">
        <KnowledgeSectionHeader
          title="Keyboard shortcuts"
          description="Work faster across the workspace"
        />
        <div className="flex items-center gap-2 mb-4 text-muted-foreground">
          <Keyboard className="size-4" />
          <span className="text-xs">Press shortcuts where supported</span>
        </div>
        <dl className="space-y-3">
          {KNOWLEDGE_SHORTCUTS.map((shortcut) => {
            const keys = mac && shortcut.macKeys ? shortcut.macKeys : shortcut.keys;
            return (
              <div key={shortcut.label} className="flex items-center justify-between gap-3">
                <dt className="text-sm text-muted-foreground">{shortcut.label}</dt>
                <dd className="flex items-center gap-1 shrink-0">
                  {keys.map((key, i) => (
                    <KnowledgeKbd key={`${shortcut.label}-${key}-${i}`}>{key}</KnowledgeKbd>
                  ))}
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
    </section>
  );
}
