import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { fixedAssetsApi } from '../api/fixed-assets.api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';

const today = () => new Date().toISOString().slice(0, 10);

export function RetireAssetDialog({ assetId, open, onOpenChange, onSuccess }) {
  const [retireDate, setRetireDate] = useState(today());
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!retireDate) {
      toast.error('Retirement date is required');
      return;
    }
    setSaving(true);
    try {
      const res = await fixedAssetsApi.retire(assetId, { retire_date: retireDate });
      toast.success(res.data?.message || 'Asset retired');
      onOpenChange(false);
      onSuccess?.(res.data?.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not retire asset');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Retire asset</DialogTitle>
            <DialogDescription>
              Retiring records disposal with no sale proceeds. A journal entry will be posted to
              remove the asset from the books.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label>
              Retirement date <span className="text-destructive">*</span>
            </Label>
            <DatePicker value={retireDate} onChange={setRetireDate} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={saving}>
              {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
              Retire asset
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
