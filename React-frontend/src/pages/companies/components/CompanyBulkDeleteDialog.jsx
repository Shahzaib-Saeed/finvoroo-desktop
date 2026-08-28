import { useState } from 'react';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { companiesApi, TRASH_RETENTION_DAYS } from '../api/companies.api';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function CompanyBulkDeleteDialog({ companies, open, onOpenChange, onComplete }) {
  const [deleting, setDeleting] = useState(false);
  const [results, setResults] = useState(null);

  const handleClose = () => {
    if (deleting) return;
    setResults(null);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!companies?.length) return;
    setDeleting(true);
    setResults(null);

    const succeeded = [];
    const failed = [];

    for (const company of companies) {
      try {
        await companiesApi.delete(company.id, { confirmation: company.name });
        succeeded.push(company);
      } catch (err) {
        const message =
          err?.response?.data?.message ||
          err?.response?.data?.errors?.confirmation?.[0] ||
          'Could not move company to trash.';
        failed.push({ company, message });
      }
    }

    setResults({ succeeded, failed });
    setDeleting(false);
    onComplete?.({ succeeded, failed });
  };

  const done = results !== null;

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="size-5 shrink-0" />
            Move {companies.length} {companies.length === 1 ? 'company' : 'companies'} to trash?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-left text-sm text-muted-foreground">
              {!done ? (
                <>
                  <p>
                    Selected companies will be moved to trash for {TRASH_RETENTION_DAYS} days.
                    All business data remains until trash is emptied or the retention period expires.
                  </p>
                  <ul className="max-h-40 overflow-y-auto rounded-md border border-border/60 bg-muted/30 p-3 space-y-1 list-none m-0">
                    {companies.map((c) => (
                      <li key={c.id} className="text-sm font-medium text-foreground">
                        {c.name}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <div className="space-y-2">
                  {results.succeeded.length > 0 ? (
                    <p className="text-green-700">
                      Moved {results.succeeded.length}{' '}
                      {results.succeeded.length === 1 ? 'company' : 'companies'} to trash.
                    </p>
                  ) : null}
                  {results.failed.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-destructive">
                        {results.failed.length} could not be moved to trash:
                      </p>
                      <ul className="max-h-40 overflow-y-auto space-y-2 list-none p-0 m-0">
                        {results.failed.map(({ company, message }) => (
                          <li
                            key={company.id}
                            className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs"
                          >
                            <span className="font-medium text-foreground">{company.name}</span>
                            <span className="block text-muted-foreground mt-0.5">{message}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {!done ? (
            <>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <Button
                type="button"
                variant="destructive"
                disabled={deleting}
                onClick={handleDelete}
              >
                {deleting ? <Loader2 className="size-4 animate-spin" /> : null}
                Move to trash
              </Button>
            </>
          ) : (
            <Button type="button" onClick={handleClose}>
              Close
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
