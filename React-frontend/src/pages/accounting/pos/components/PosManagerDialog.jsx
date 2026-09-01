import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function PosManagerDialog({ open, onOpenChange, onUnlock }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [posPin, setPosPin] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-pos-no-scan className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Manager approval</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Required for high discounts, below-cost prices, refunds, and voids
          </p>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              const pin = posPin.replace(/\D/g, '');
              await onUnlock(pin.length >= 2 ? { pos_pin: pin } : { email, password });
              setPassword('');
              setPosPin('');
            } catch (err) {
              toast.error(err?.response?.data?.message || 'Unlock failed');
            } finally {
              setBusy(false);
            }
          }}
        >
          <div>
            <Label>Manager POS PIN</Label>
            <Input
              data-pos-typing
              type="password"
              inputMode="numeric"
              autoComplete="off"
              className="mt-1 h-11 rounded-xl tracking-[0.25em]"
              value={posPin}
              onChange={(e) => setPosPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
              placeholder="2–8 digits"
            />
          </div>
          <p className="text-center text-xs text-muted-foreground">or email and password</p>
          <div>
            <Label>Manager email</Label>
            <Input
              data-pos-typing
              type="email"
              required={posPin.replace(/\D/g, '').length < 2}
              className="mt-1 h-11 rounded-xl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label>Password</Label>
            <Input
              data-pos-typing
              type="password"
              required={posPin.replace(/\D/g, '').length < 2}
              className="mt-1 h-11 rounded-xl"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            className="h-12 w-full rounded-xl bg-foreground text-background"
            disabled={busy}
          >
            {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Unlock
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
