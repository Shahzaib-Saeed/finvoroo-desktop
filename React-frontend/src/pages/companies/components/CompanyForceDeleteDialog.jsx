import { useEffect, useMemo, useState } from 'react';
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

export function CompanyForceDeleteDialog({ company, open, onOpenChange, onDeleted }) {
  const [confirmation, setConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  const expectedName = company?.name?.trim() ?? '';
  const canDelete = confirmation.trim() === expectedName && expectedName.length > 0;

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
      await companiesApi.forceDelete(company.id, { confirmation: confirmation.trim() });
      onDeleted?.(company);
      onOpenChange(false);
    } catch (err) {
      const data = err?.response?.data;
      setError(
        data?.errors?.confirmation?.[0] ||
          data?.message ||
          'Could not permanently delete company.',
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !deleting && onOpenChange(next)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5 shrink-0" />
            Delete permanently?
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 pt-1 text-left text-sm text-muted-foreground">
              <p>
                This will permanently delete{' '}
                <span className="font-semibold text-foreground">&ldquo;{company?.name}&rdquo;</span>{' '}
                and <strong className="text-foreground">all related data</strong> — invoices,
                transactions, customers, products, and every other record. This cannot be undone.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
            Type the company name exactly as shown to confirm permanent deletion.
          </div>

          <div className="space-y-2">
            <Label htmlFor="company-force-delete-confirmation">
              Company name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="company-force-delete-confirmation"
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
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={!canDelete || deleting}
          >
            {deleting ? <Loader2 className="size-4 animate-spin" /> : null}
            Delete permanently
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
