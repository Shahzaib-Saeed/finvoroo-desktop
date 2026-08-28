import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function BulkActionBar({
  count,
  onClear,
  onDelete,
  deleting = false,
  deleteLabel = 'Delete selected',
}) {
  if (!count) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-destructive/25 bg-destructive/5 px-4 py-3">
      <span className="text-sm font-medium">
        {count} selected
      </span>
      <div className="flex flex-wrap gap-2 ms-auto">
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={deleting}
          onClick={onDelete}
        >
          {deleting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Trash2 className="size-4" />
          )}
          {deleteLabel}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onClear}
          disabled={deleting}
        >
          Clear
        </Button>
      </div>
    </div>
  );
}
