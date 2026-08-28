import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { paymentsApi } from '../api/payments.api';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function LinkToAccountDialog({
  open,
  onOpenChange,
  paymentId,
  depositAccounts,
  onSuccess,
}) {
  const [accountId, setAccountId] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!accountId) {
      toast.error('Select a deposit account');
      return;
    }
    setSaving(true);
    try {
      const res = await paymentsApi.linkToAccount(paymentId, Number(accountId));
      toast.success(res.data?.message || 'Payment linked to account');
      onSuccess?.(res.data?.data);
      onOpenChange(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to link payment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Link to account</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label>Deposit account</Label>
            <Select
              value={accountId ? String(accountId) : undefined}
              onValueChange={setAccountId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {depositAccounts.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.label || `${a.code} — ${a.name}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Posts this receipt to the selected bank or cash account in the general ledger.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : 'Link'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
