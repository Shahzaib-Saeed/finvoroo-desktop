import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { investmentsApi } from '../../api/investments.api';

const EMPTY = { name: '', phone: '', email: '', address: '', notes: '' };

export function InvestorFormDialog({ open, onOpenChange, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('An investor needs a name.');
      return;
    }

    setSaving(true);
    try {
      await investmentsApi.createInvestor(form);
      toast.success('Investor added.');
      setForm(EMPTY);
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not save the investor.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New investor</DialogTitle>
          <DialogDescription>
            Their capital and profit share are set up next, on an investment contract.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label htmlFor="investor-name">Name</Label>
            <Input id="investor-name" value={form.name} onChange={set('name')} autoFocus />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="investor-phone">Phone</Label>
              <Input id="investor-phone" value={form.phone} onChange={set('phone')} />
            </div>
            <div>
              <Label htmlFor="investor-email">Email</Label>
              <Input id="investor-email" type="email" value={form.email} onChange={set('email')} />
            </div>
          </div>
          <div>
            <Label htmlFor="investor-address">Address</Label>
            <Input id="investor-address" value={form.address} onChange={set('address')} />
          </div>
          <div>
            <Label htmlFor="investor-notes">Notes</Label>
            <Textarea id="investor-notes" rows={2} value={form.notes} onChange={set('notes')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? <Loader2 className="size-4 animate-spin" /> : 'Save investor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
