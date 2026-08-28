import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { companiesApi, TRASH_RETENTION_DAYS } from '../api/companies.api';
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

function extractDeleteError(err) {
  const data = err?.response?.data;
  if (data?.errors?.confirmation?.[0]) {
    return { message: data.errors.confirmation[0] };
  }
  return {
    message: data?.message || 'Could not move company to trash.',
  };
}

export function CompanyDeleteDialog({ company, open, onOpenChange, onDeleted }) {
  const [confirmation, setConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  const expectedName = company?.name?.trim() ?? '';
  const canDelete = useMemo(
    () => confirmation.trim() === expectedName && expectedName.length > 0,
    [confirmation, expectedName],
  );

  useEffect(() => {
    if (!open) {
      setConfirmation('');
      setDeleting(false);
      setError(null);
    }
  }, [open, company?.id]);

  const handleDelete = async () => {
    if (!company?.id || !canDelete) return;
    setDeleting(true);
    setError(null);
    try {
      await companiesApi.delete(company.id, { confirmation: confirmation.trim() });
      onDeleted?.(company);
      onOpenChange(false);
    } catch (err) {
      setError(extractDeleteError(err).message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !deleting && onOpenChange(next)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="size-5 shrink-0" />
            Move company to trash?
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 pt-1 text-left text-sm text-muted-foreground">
              <p>
                You are about to move{' '}
                <span className="font-semibold text-foreground">&ldquo;{company?.name}&rdquo;</span>{' '}
                to trash.
              </p>
              <ul className="list-disc space-y-1.5 pl-5 m-0">
                <li>
                  The company and all its data (invoices, transactions, records) will stay in trash
                  for <strong className="text-foreground">{TRASH_RETENTION_DAYS} days</strong>.
                </li>
                <li>You can restore it anytime before that period ends.</li>
                <li>
                  After {TRASH_RETENTION_DAYS} days, or if you empty trash, everything will be{' '}
                  <strong className="text-foreground">permanently deleted</strong> and cannot be
                  recovered.
                </li>
                <li>The workspace will be deactivated immediately.</li>
              </ul>
            </div>
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
            Type the company name exactly as shown to confirm.
          </div>

          <div className="space-y-2">
            <Label htmlFor="company-delete-confirmation">
              Company name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="company-delete-confirmation"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder={expectedName || 'Company name'}
              autoComplete="off"
              disabled={deleting}
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
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={!canDelete || deleting}
          >
            {deleting ? <Loader2 className="size-4 animate-spin" /> : null}
            Move to trash
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
