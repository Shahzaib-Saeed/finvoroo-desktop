import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { companiesApi } from '../api/companies.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const CONFIRMATION_PHRASE = 'EMPTY TRASH';

export function CompanyEmptyTrashDialog({ count, open, onOpenChange, onEmptied }) {
  const [confirmation, setConfirmation] = useState('');
  const [emptying, setEmptying] = useState(false);
  const [error, setError] = useState(null);

  const canConfirm = confirmation.trim() === CONFIRMATION_PHRASE;

  useEffect(() => {
    if (!open) {
      setConfirmation('');
      setEmptying(false);
      setError(null);
    }
  }, [open]);

  const handleEmpty = async () => {
    if (!canConfirm) return;
    setEmptying(true);
    setError(null);
    try {
      const res = await companiesApi.emptyTrash({ confirmation: CONFIRMATION_PHRASE });
      onEmptied?.(res.data?.data);
      onOpenChange(false);
    } catch (err) {
      const data = err?.response?.data;
      setError(
        data?.errors?.confirmation?.[0] ||
          data?.message ||
          'Could not empty trash.',
      );
    } finally {
      setEmptying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !emptying && onOpenChange(next)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5 shrink-0" />
            Empty trash?
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 pt-1 text-left text-sm text-muted-foreground">
              <p>
                This will permanently delete{' '}
                <strong className="text-foreground">
                  {count} {count === 1 ? 'company' : 'companies'}
                </strong>{' '}
                in trash along with all their business data. This action cannot be undone.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
            Type <strong>{CONFIRMATION_PHRASE}</strong> to confirm.
          </div>

          <div className="space-y-2">
            <Label htmlFor="empty-trash-confirmation">
              Confirmation <span className="text-destructive">*</span>
            </Label>
            <Input
              id="empty-trash-confirmation"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder={CONFIRMATION_PHRASE}
              autoComplete="off"
              disabled={emptying}
              autoFocus
            />
          </div>

          {error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
              {error}
            </div>
          ) : null}
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={emptying}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleEmpty}
            disabled={!canConfirm || emptying}
          >
            {emptying ? <Loader2 className="size-4 animate-spin" /> : null}
            Empty trash
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
