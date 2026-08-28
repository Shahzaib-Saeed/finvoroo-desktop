import { useState } from 'react';
import { Check, Loader2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Wraps a select/combobox with an inline + control to add options on the form page.
 */
export function QuickAddOptionControl({
  label = 'option',
  onAddOption,
  disabled = false,
  className,
  children,
}) {
  const [addingOpen, setAddingOpen] = useState(false);
  const [newOption, setNewOption] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  if (typeof onAddOption !== 'function') {
    return children ? <div className={className}>{children}</div> : null;
  }

  const handleCancel = () => {
    if (adding) return;
    setAddingOpen(false);
    setNewOption('');
    setAddError('');
  };

  const handleAdd = async () => {
    const next = newOption.trim();
    if (!next) {
      setAddError('Enter an option value.');
      return;
    }
    setAdding(true);
    setAddError('');
    const ok = await onAddOption(next);
    setAdding(false);
    if (ok) {
      setNewOption('');
      setAddingOpen(false);
    } else {
      setAddError('Could not save option. Try again.');
    }
  };

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center gap-2">
        {children ? <div className="flex-1 min-w-0">{children}</div> : null}
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          disabled={disabled}
          onClick={() => {
            if (addingOpen) {
              handleCancel();
            } else {
              setAddingOpen(true);
              setAddError('');
            }
          }}
          title={addingOpen ? 'Close quick add' : `Add ${label} option`}
        >
          {addingOpen ? <X className="size-4" /> : <Plus className="size-4" />}
        </Button>
      </div>
      {addingOpen ? (
        <div className="mt-2 flex items-start gap-2">
          <Input
            className="h-8 text-xs"
            value={newOption}
            onChange={(e) => {
              setNewOption(e.target.value);
              if (addError) setAddError('');
            }}
            placeholder={`Add ${label} option`}
            disabled={adding || disabled}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAdd();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                handleCancel();
              }
            }}
          />
          <Button
            type="button"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={handleAdd}
            disabled={adding || disabled}
            title="Save option"
          >
            {adding ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          </Button>
        </div>
      ) : null}
      {addError ? <p className="text-xs text-destructive mt-1">{addError}</p> : null}
    </div>
  );
}
