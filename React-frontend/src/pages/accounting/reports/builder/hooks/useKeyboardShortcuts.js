import { useEffect } from 'react';

function isTypingTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
}

/**
 * Global keyboard shortcuts for the report builder. `handlers` is a map
 * of { save, undo, redo, run, reset } — any key can be omitted.
 * Mod = Cmd on Mac, Ctrl elsewhere.
 */
export function useKeyboardShortcuts(handlers) {
  useEffect(() => {
    function onKeyDown(e) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      const key = e.key.toLowerCase();

      if (key === 's' && handlers.save) {
        e.preventDefault();
        handlers.save();
        return;
      }

      if (key === 'enter' && handlers.run) {
        e.preventDefault();
        handlers.run();
        return;
      }

      if (key === 'z' && e.shiftKey && handlers.redo) {
        e.preventDefault();
        handlers.redo();
        return;
      }

      if (key === 'z' && handlers.undo) {
        e.preventDefault();
        handlers.undo();
        return;
      }

      if (key === 'y' && handlers.redo) {
        e.preventDefault();
        handlers.redo();
        return;
      }

      // Never hijack Cmd/Ctrl+K, Cmd/Ctrl+F, etc. while the user is typing
      // in an input — only reset is destructive enough to guard here.
      if (key === 'backspace' && e.shiftKey && handlers.reset && !isTypingTarget(document.activeElement)) {
        e.preventDefault();
        handlers.reset();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handlers]);
}
