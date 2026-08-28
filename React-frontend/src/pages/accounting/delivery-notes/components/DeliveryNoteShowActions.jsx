import { Link } from 'react-router';
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Printer,
  Trash2,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function ToolbarDivider() {
  return <div className="hidden sm:block w-px h-6 bg-border shrink-0" aria-hidden />;
}

export function DeliveryNoteShowActions({
  base,
  canConfirm,
  canCancel,
  canDelete,
  onConfirm,
  onCancel,
  onDelete,
  busy = false,
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" asChild>
        <Link to={base}>
          <ArrowLeft className="size-4 mr-1" /> Back
        </Link>
      </Button>

      {(canConfirm || canCancel) && <ToolbarDivider />}

      {canConfirm && (
        <Button
          size="sm"
          disabled={busy}
          onClick={onConfirm}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <CheckCircle2 className="size-4 mr-1" />
          Confirm delivery
        </Button>
      )}

      {canCancel && (
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={onCancel}
          className="border-amber-200 bg-amber-50/50 text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
        >
          <XCircle className="size-4 mr-1" />
          Cancel note
        </Button>
      )}

      <ToolbarDivider />

      <Button variant="outline" size="sm" onClick={() => window.print()}>
        <Printer className="size-4 mr-1" /> Print
      </Button>

      {canDelete && (
        <Button
          variant="destructive"
          size="sm"
          disabled={busy}
          onClick={onDelete}
          className={cn(busy && 'opacity-70')}
        >
          {busy ? (
            <Loader2 className="size-4 mr-1 animate-spin" />
          ) : (
            <Trash2 className="size-4 mr-1" />
          )}
          Delete
        </Button>
      )}
    </div>
  );
}
