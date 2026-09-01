import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export function EmployeePinDialog({
  open,
  error = '',
  submitting = false,
  onSubmit,
  onCancel,
}) {
  const [pin, setPin] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setPin('');
      return undefined;
    }
    const id = window.setTimeout(() => inputRef.current?.focus?.(), 20);
    return () => window.clearTimeout(id);
  }, [open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const digits = String(pin).replace(/\D/g, '');
    if (digits.length < 2) return;
    onSubmit?.(digits);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !submitting) onCancel?.();
      }}
    >
      <DialogContent
        data-pos-no-scan
        data-pharmacy-typing
        className="max-w-sm gap-0 overflow-hidden rounded-2xl p-0"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            if (!submitting) onCancel?.();
          }
        }}
      >
        <form onSubmit={handleSubmit}>
          <DialogHeader className="px-5 pb-2 pt-5">
            <DialogTitle>Employee PIN</DialogTitle>
            <DialogDescription>
              Enter the PIN for the person completing this sale.
            </DialogDescription>
          </DialogHeader>
          <div className="px-5 pb-3">
            <Input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              autoComplete="off"
              name="pos_employee_pin"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, '').slice(0, 8));
              }}
              className="h-12 text-center text-lg tracking-[0.35em]"
              placeholder="••••"
              aria-invalid={!!error}
              disabled={submitting}
            />
            {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
          </div>
          <DialogFooter className="gap-2 border-t px-5 py-3 sm:gap-2">
            <Button type="button" variant="outline" onClick={() => onCancel?.()} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || pin.replace(/\D/g, '').length < 2}>
              {submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Confirm
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
